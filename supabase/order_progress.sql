-- =============================================================
--  ให้ลูกค้า (anon) ดูสถานะ "เฉพาะออเดอร์ตัวเอง" ได้ โดยไม่เปิดให้
--  เห็นข้อมูลออเดอร์ของคนอื่น
--
--  หลักการ: ลูกค้ารู้เลขออเดอร์ (UUID) ของตัวเองเท่านั้น (เว็บสร้างให้
--  ตอนกดสั่ง) ฟังก์ชันนี้จะคืนแค่สถานะ + ชื่อผู้รับ + ยอดรวม ของ
--  ออเดอร์ที่ตรงกับ UUID นั้น ๆ  ตาราง orders ยังปิดการอ่านตรงเหมือนเดิม
--
--  วิธีติดตั้ง: เปิด Supabase → SQL Editor → วางทั้งไฟล์นี้ → กด Run
--  (รันครั้งเดียวพอ รันซ้ำก็ไม่พัง)
-- =============================================================

create or replace function public.order_progress(p_id uuid)
returns table (
  status        text,
  customer_name text,
  total         int,
  created_at    timestamptz
)
language sql
security definer
set search_path = public
as $$
  select o.status, o.customer_name, o.total, o.created_at
  from public.orders o
  where o.id = p_id;
$$;

-- อนุญาตให้เรียกใช้ได้ทั้งลูกค้า (anon) และแม่ (authenticated)
revoke all on function public.order_progress(uuid) from public;
grant execute on function public.order_progress(uuid) to anon, authenticated;
