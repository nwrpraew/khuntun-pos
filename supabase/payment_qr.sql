-- =============================================================
--  ระบบจ่ายเงินผ่าน QR (พร้อมเพย์) + เลือกวิธีจ่าย (เก็บปลายทาง/โอน)
--
--  วิธีติดตั้ง: เปิด Supabase → SQL Editor → วางทั้งไฟล์นี้ → กด Run
--  (รันครั้งเดียวพอ รันซ้ำก็ไม่พัง)
-- =============================================================

-- ---------- 1) เพิ่มคอลัมน์วิธีจ่ายเงินในตาราง orders ----------
--  'cod' = เก็บเงินปลายทาง (ค่าเริ่มต้น) , 'qr' = โอนผ่าน QR
alter table public.orders
  add column if not exists payment_method text not null default 'cod';

-- ---------- 2) ตารางตั้งค่าร้าน (เก็บ path รูป QR ฯลฯ) ----------
create table if not exists public.shop_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

alter table public.shop_settings enable row level security;

-- ลูกค้า (anon) และแม่ (authenticated) อ่านค่าตั้งค่าได้ (เช่น path รูป QR)
drop policy if exists shop_settings_read on public.shop_settings;
create policy shop_settings_read on public.shop_settings
  for select to anon, authenticated
  using (true);

-- เฉพาะแม่ (ล็อกอิน) แก้ไขค่าตั้งค่าได้
drop policy if exists shop_settings_write on public.shop_settings;
create policy shop_settings_write on public.shop_settings
  for all to authenticated
  using (true) with check (true);

-- ---------- 3) อัปเดตฟังก์ชันติดตามสถานะ ให้คืนวิธีจ่ายเงินด้วย ----------
--  (ลูกค้าที่โอนผ่าน QR จะได้เห็น QR ซ้ำในหน้าติดตามออเดอร์)
create or replace function public.order_progress(p_id uuid)
returns table (
  status         text,
  customer_name  text,
  total          int,
  payment_method text,
  created_at     timestamptz
)
language sql
security definer
set search_path = public
as $$
  select o.status, o.customer_name, o.total, o.payment_method, o.created_at
  from public.orders o
  where o.id = p_id;
$$;

revoke all on function public.order_progress(uuid) from public;
grant execute on function public.order_progress(uuid) to anon, authenticated;
