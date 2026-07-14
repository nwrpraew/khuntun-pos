import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // ช่วยให้ debug ง่ายตอน deploy ถ้าลืมตั้ง env
  console.error(
    'ยังไม่ได้ตั้งค่า VITE_SUPABASE_URL หรือ VITE_SUPABASE_ANON_KEY — ตรวจไฟล์ .env หรือ Environment Variables บน Vercel'
  )
}

export const supabase = createClient(url || 'http://localhost', anonKey || 'public-anon-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

export const PRODUCT_BUCKET = 'product-images'

// bucket เก็บรูปสลิปโอนเงินที่ลูกค้าอัปโหลดกลับมาให้ร้าน
export const SLIP_BUCKET = 'order-slips'

// key ในตาราง shop_settings ที่เก็บ path รูป QR พร้อมเพย์ของร้าน
export const QR_SETTING_KEY = 'payment_qr_url'

// ดาวน์โหลดรูป (เช่น QR) — ดึงเป็น blob เพื่อบังคับ save แม้รูปอยู่คนละโดเมน
// ถ้าโหลดไม่ได้ (เน็ต/CORS) จะเปิดรูปในแท็บใหม่ให้กดค้างเซฟเอง
export async function downloadImage(url, filename = 'qr.png') {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const objUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(objUrl), 1500)
  } catch (e) {
    window.open(url, '_blank')
  }
}

// อ่าน path รูป QR ล่าสุดจากตาราง shop_settings (คืน null ถ้ายังไม่ตั้ง)
export async function loadPaymentQrPath() {
  const { data, error } = await supabase
    .from('shop_settings')
    .select('value')
    .eq('key', QR_SETTING_KEY)
    .maybeSingle()
  if (error) return null
  return data?.value || null
}

// แปลง path ในตาราง products.image_url ให้เป็น URL เต็มสำหรับแสดงรูป
export function imageUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  const { data } = supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(path)
  return data?.publicUrl || null
}

// แปลง path รูปสลิป (orders.slip_url) ให้เป็น URL เต็มสำหรับแสดงรูป
export function slipUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  const { data } = supabase.storage.from(SLIP_BUCKET).getPublicUrl(path)
  return data?.publicUrl || null
}

// อัปโหลดรูปสลิปของลูกค้า แล้วผูกกับออเดอร์ผ่านฟังก์ชัน attach_slip
// คืน path ที่เก็บใน bucket ถ้าสำเร็จ (โยน error ถ้าพลาด)
export async function uploadSlip(orderId, file) {
  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${orderId}/${Date.now()}.${ext}`
  const { error: upErr } = await supabase.storage
    .from(SLIP_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' })
  if (upErr) throw upErr
  const { error: rpcErr } = await supabase.rpc('attach_slip', { p_id: orderId, p_url: path })
  if (rpcErr) throw rpcErr
  return path
}
