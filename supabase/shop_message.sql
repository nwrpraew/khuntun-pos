-- =============================================================
--  ช่องข้อความ/ลิงก์จากร้านถึงลูกค้า (แม่พิมพ์เอง ลูกค้าเห็นในหน้าติดตาม)
--  รันไฟล์นี้ครั้งเดียวใน Supabase SQL Editor
-- =============================================================

-- 1) เพิ่มคอลัมน์เก็บข้อความ/ลิงก์ที่แม่พิมพ์ส่งลูกค้าในออเดอร์นั้นๆ
alter table public.orders
  add column if not exists shop_message text;

-- 2) แก้ order_progress ให้คืนค่า shop_message ด้วย
--    (ลูกค้า anon เรียก RPC นี้ในหน้าติดตามสถานะ จึงจะเห็นข้อความจากร้าน)
drop function if exists public.order_progress(uuid);

create function public.order_progress(p_id uuid)
returns table (
  status         text,
  customer_name  text,
  total          int,
  payment_method text,
  slip_url       text,
  shop_message   text,
  created_at     timestamptz
)
language sql
security definer
set search_path = public
as $$
  select o.status, o.customer_name, o.total, o.payment_method, o.slip_url, o.shop_message, o.created_at
  from public.orders o
  where o.id = p_id;
$$;

revoke all on function public.order_progress(uuid) from public;
grant execute on function public.order_progress(uuid) to anon, authenticated;
