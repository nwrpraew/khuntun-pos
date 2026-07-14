-- =============================================================
--  ประวัติสั่งซื้อ + แนบสลิปย้อนหลัง
--
--  ทำ 2 อย่าง:
--   1) ให้ลูกค้าค้นออเดอร์ย้อนหลัง "ด้วยเบอร์โทร" ได้ (orders_by_phone)
--   2) ให้แนบ/เปลี่ยนสลิปได้แม้ปิดออเดอร์ (done) ไปแล้ว
--      — ยังกันเฉพาะออเดอร์ที่ถูก "ยกเลิก" (cancelled) เท่านั้น
--
--  วิธีติดตั้ง: เปิด Supabase → SQL Editor → วางทั้งไฟล์นี้ → กด Run
--  (รันครั้งเดียวพอ รันซ้ำก็ไม่พัง)
-- =============================================================

-- ---------- 1) index ช่วยค้นด้วยเบอร์โทรให้ไว ----------
create index if not exists orders_phone_idx
  on public.orders (phone, created_at desc);

-- ---------- 2) แนบสลิปได้ตลอด (แม้ปิดออเดอร์แล้ว) ----------
--  เดิมบล็อกทั้ง done และ cancelled — ตอนนี้ปล่อยให้แนบตอน done ได้
--  (ลูกค้าบางคนโอนช้า/ลืมแนบ อยากให้ส่งสลิปตามหลังได้)
create or replace function public.attach_slip(p_id uuid, p_url text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.orders
  set slip_url = p_url
  where id = p_id
    and status <> 'cancelled';
$$;

revoke all on function public.attach_slip(uuid, text) from public;
grant execute on function public.attach_slip(uuid, text) to anon, authenticated;

-- ---------- 3) ค้นออเดอร์ย้อนหลังด้วยเบอร์โทร ----------
--  ลูกค้า (anon) อ่านตาราง orders ตรง ๆ ไม่ได้ จึงผ่านฟังก์ชันนี้แทน
--  คืนเฉพาะออเดอร์ที่เบอร์ตรงกัน เรียงใหม่ล่าสุดก่อน จำกัด 30 รายการ
--  (พอสำหรับให้ลูกค้าดูประวัติ/กดเข้าไปแนบสลิปย้อนหลัง)
create or replace function public.orders_by_phone(p_phone text)
returns table (
  id             uuid,
  status         text,
  customer_name  text,
  total          int,
  payment_method text,
  slip_url       text,
  items          jsonb,
  created_at     timestamptz
)
language sql
security definer
set search_path = public
as $$
  select o.id, o.status, o.customer_name, o.total,
         o.payment_method, o.slip_url, o.items, o.created_at
  from public.orders o
  where o.phone = trim(p_phone)
  order by o.created_at desc
  limit 30;
$$;

revoke all on function public.orders_by_phone(text) from public;
grant execute on function public.orders_by_phone(text) to anon, authenticated;
