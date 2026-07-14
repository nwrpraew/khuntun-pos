-- =============================================================
--  ร้านคุณตุ่น — Supabase schema
--  รันไฟล์นี้ทั้งไฟล์ใน  Supabase Dashboard > SQL Editor > New query
--  (รันได้ซ้ำอย่างปลอดภัย — ใช้ IF NOT EXISTS / DROP POLICY IF EXISTS)
-- =============================================================

create extension if not exists "pgcrypto";

-- ---------- ตาราง products ----------
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  name_en      text,
  category     text not null,                 -- special/hotcoffee/coffee/bearmilk/teacocoa/freshmilk/smoothie/fried
  base_price   int  not null default 0,
  image_url    text,                          -- path ใน bucket product-images หรือ URL เต็ม
  is_hot       boolean not null default false,-- เมนูร้อน (ล็อกอุณหภูมิ)
  is_blend     boolean not null default false,-- เมนูที่เป็น "ปั่น" อยู่แล้ว (ล็อก)
  blendable    boolean not null default false,-- เลือกเย็น/ปั่นได้ (ปั่น +10)
  has_sweet    boolean not null default true, -- มีตัวเลือกความหวาน
  has_toppings boolean not null default true, -- มีตัวเลือกท็อปปิ้ง
  has_dip      boolean not null default false,-- มีตัวเลือกซอสราด (ของทอด)
  has_filling  boolean not null default false,-- มีตัวเลือกไส้ (ปูอัด/แฮม/ไส้กรอก)
  has_cheese   boolean not null default false,-- เพิ่มชีสได้ (+20)
  is_available boolean not null default true, -- เปิด-ปิดขายรายวัน
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category, sort_order);

-- ---------- ตาราง orders ----------
create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone         text not null,
  address       text not null,
  note          text,
  items         jsonb not null,               -- [{product_id,name,category,options[],price,qty}]
  subtotal      int not null default 0,
  delivery_fee  int not null default 0,
  total         int not null default 0,
  status        text not null default 'waiting', -- waiting/confirmed/delivering/done/cancelled
  created_at    timestamptz not null default now()
);

create index if not exists orders_status_idx on public.orders (status, created_at desc);

-- =============================================================
--  Row Level Security (RLS)
-- =============================================================
alter table public.products enable row level security;
alter table public.orders   enable row level security;

-- ----- products -----
-- ลูกค้า (ไม่ล็อกอิน = anon): อ่านเฉพาะเมนูที่เปิดขาย
drop policy if exists products_read_public on public.products;
create policy products_read_public on public.products
  for select to anon
  using (is_available = true);

-- แม่ (ล็อกอินแล้ว = authenticated): อ่านได้ทุกเมนู (รวมที่ปิดขาย)
drop policy if exists products_read_auth on public.products;
create policy products_read_auth on public.products
  for select to authenticated
  using (true);

-- แม่: เพิ่ม/แก้ไข/ลบเมนูได้
drop policy if exists products_write_auth on public.products;
create policy products_write_auth on public.products
  for all to authenticated
  using (true) with check (true);

-- ----- orders -----
-- ลูกค้า: สร้างออเดอร์ใหม่ได้อย่างเดียว (insert)
drop policy if exists orders_insert_public on public.orders;
create policy orders_insert_public on public.orders
  for insert to anon
  with check (status = 'waiting');

-- แม่: เห็นและจัดการออเดอร์ได้ทั้งหมด
drop policy if exists orders_all_auth on public.orders;
create policy orders_all_auth on public.orders
  for all to authenticated
  using (true) with check (true);

-- =============================================================
--  เปิด Realtime บนตาราง orders (ออเดอร์ใหม่เด้งเข้า iPad แม่)
-- =============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;

-- =============================================================
--  Storage bucket สำหรับรูปสินค้า (public read)
-- =============================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- ใครก็อ่านรูปได้
drop policy if exists "product images public read" on storage.objects;
create policy "product images public read" on storage.objects
  for select to public
  using (bucket_id = 'product-images');

-- เฉพาะแม่ (ล็อกอิน) อัปโหลด/แก้ไข/ลบรูปได้
drop policy if exists "product images auth write" on storage.objects;
create policy "product images auth write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images');

drop policy if exists "product images auth update" on storage.objects;
create policy "product images auth update" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images');

drop policy if exists "product images auth delete" on storage.objects;
create policy "product images auth delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images');
