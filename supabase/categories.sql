-- =============================================================
--  หมวดหมู่เมนูแบบแก้ไขได้เอง (เพิ่ม/แก้/ลบหมวดจากหน้าตั้งค่า)
--
--  วิธีติดตั้ง: เปิด Supabase → SQL Editor → วางทั้งไฟล์นี้ → กด Run
--  (รันครั้งเดียวพอ รันซ้ำก็ไม่พัง — seed ใช้ on conflict do nothing
--   จึงไม่ทับค่าที่แม่แก้ไปแล้ว)
-- =============================================================

-- ---------- 1) ตารางหมวดหมู่ ----------
--  key = ตัวอ้างอิงถาวร (ตรงกับ products.category) ห้ามเปลี่ยนหลังมีเมนูผูกแล้ว
create table if not exists public.categories (
  key        text primary key,
  label      text not null,                 -- ชื่อหมวดที่โชว์ (แก้ได้)
  color      text not null default '#e07a3f',-- สีประจำหมวด
  banner_url text,                           -- path รูปแบนเนอร์ (/menu/x.jpg หรือใน bucket)
  sort_order int  not null default 0,        -- ลำดับการแสดง (น้อยขึ้นก่อน)
  created_at timestamptz not null default now()
);

create index if not exists categories_sort_idx on public.categories (sort_order);

alter table public.categories enable row level security;

-- ลูกค้า (anon) และแม่ (authenticated) อ่านหมวดหมู่ได้
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories
  for select to anon, authenticated
  using (true);

-- เฉพาะแม่ (ล็อกอิน) เพิ่ม/แก้/ลบหมวดได้
drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories
  for all to authenticated
  using (true) with check (true);

-- ---------- 2) ใส่หมวดเดิม 8 หมวด (ครั้งแรก) ----------
insert into public.categories (key, label, color, banner_url, sort_order) values
  ('special',   'เมนูพิเศษ',      '#7c3aed', '/menu/special.jpg',   10),
  ('hotcoffee', 'กาแฟร้อน',       '#b45309', '/menu/hotcoffee.jpg', 20),
  ('coffee',    'Coffee เย็น',    '#0e7490', '/menu/coffee.jpg',    30),
  ('bearmilk',  'Bear Milk ปั่น', '#db2777', '/menu/bearmilk.jpg',  40),
  ('teacocoa',  'ชา-โกโก้',       '#15803d', '/menu/teacocoa.jpg',  50),
  ('freshmilk', 'นมสด',           '#2563eb', '/menu/freshmilk.jpg', 60),
  ('smoothie',  'น้ำผลไม้ปั่น',   '#ea580c', '/menu/smoothie.jpg',  70),
  ('fried',     'ของทอด',         '#a16207', '/menu/fried.jpg',     80)
on conflict (key) do nothing;
