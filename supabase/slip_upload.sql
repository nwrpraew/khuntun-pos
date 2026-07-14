-- =============================================================
--  ให้ลูกค้าอัปโหลด "สลิปโอนเงิน" กลับมาให้ร้านได้
--
--  วิธีติดตั้ง: เปิด Supabase → SQL Editor → วางทั้งไฟล์นี้ → กด Run
--  (รันครั้งเดียวพอ รันซ้ำก็ไม่พัง)
-- =============================================================

-- ---------- 1) เพิ่มคอลัมน์เก็บ path รูปสลิปในตาราง orders ----------
alter table public.orders
  add column if not exists slip_url text;

-- ---------- 2) Storage bucket สำหรับสลิป (อ่านได้สาธารณะ) ----------
insert into storage.buckets (id, name, public)
values ('order-slips', 'order-slips', true)
on conflict (id) do update set public = true;

-- ใครก็เปิดดูรูปสลิปได้ (แม่เปิดในหน้าออเดอร์)
drop policy if exists "order slips public read" on storage.objects;
create policy "order slips public read" on storage.objects
  for select to public
  using (bucket_id = 'order-slips');

-- ลูกค้า (anon) และแม่ (authenticated) อัปโหลดสลิปได้
drop policy if exists "order slips public upload" on storage.objects;
create policy "order slips public upload" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'order-slips');

-- ---------- 3) ฟังก์ชันให้ลูกค้าแนบสลิปกับออเดอร์ตัวเอง ----------
--  (ลูกค้าเป็น anon แก้ orders ตรง ๆ ไม่ได้ จึงผ่านฟังก์ชันนี้แทน
--   แนบได้เฉพาะออเดอร์ที่ "ยังไม่ปิด" เพื่อกันแก้ของเก่า)
create or replace function public.attach_slip(p_id uuid, p_url text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.orders
  set slip_url = p_url
  where id = p_id
    and status not in ('done', 'cancelled');
$$;

revoke all on function public.attach_slip(uuid, text) from public;
grant execute on function public.attach_slip(uuid, text) to anon, authenticated;

-- ---------- 4) อัปเดตฟังก์ชันติดตามสถานะ ให้คืน slip_url ด้วย ----------
--  (หน้าติดตามของลูกค้าจะได้รู้ว่าอัปโหลดสลิปไปแล้วหรือยัง)
--  ต้อง drop ก่อน เพราะเป็นการเพิ่มคอลัมน์ที่คืนค่า (เปลี่ยน return type)
drop function if exists public.order_progress(uuid);

create function public.order_progress(p_id uuid)
returns table (
  status         text,
  customer_name  text,
  total          int,
  payment_method text,
  slip_url       text,
  created_at     timestamptz
)
language sql
security definer
set search_path = public
as $$
  select o.status, o.customer_name, o.total, o.payment_method, o.slip_url, o.created_at
  from public.orders o
  where o.id = p_id;
$$;

revoke all on function public.order_progress(uuid) from public;
grant execute on function public.order_progress(uuid) to anon, authenticated;
