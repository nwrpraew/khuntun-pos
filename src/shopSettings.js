import { supabase } from './supabaseClient'

// ---- คีย์ทั้งหมดในตาราง shop_settings (key/value) ----
export const SETTING_KEYS = {
  qr: 'payment_qr_url',
  hoursEnabled: 'hours_enabled',   // '1' = เปิด/ปิดตามเวลา, อื่น ๆ = ไม่ใช้
  openTime: 'open_time',           // 'HH:MM'
  closeTime: 'close_time',         // 'HH:MM'
  forceClosed: 'force_closed',     // '1' = สั่งปิดร้านชั่วคราว (ทับเวลาเปิด)
  closedMsg: 'closed_msg',         // ข้อความตอนปิดร้าน
  contactPhone: 'contact_phone',   // เบอร์โทรร้าน
  contactLine: 'contact_line',     // ไอดี LINE หรือลิงก์ LINE
}

// อ่านค่าตั้งค่าร้านทั้งหมดเป็น object { key: value }
export async function loadShopSettings() {
  const { data, error } = await supabase.from('shop_settings').select('key, value')
  if (error) return {}
  const map = {}
  for (const row of data || []) map[row.key] = row.value
  return map
}

// บันทึกค่าตั้งค่าหนึ่งคีย์
export async function saveShopSetting(key, value) {
  const { error } = await supabase
    .from('shop_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() })
  if (error) throw error
}

// คำนวณสถานะร้านเปิด/ปิด จากค่าตั้งค่า + เวลาปัจจุบันของเครื่องลูกค้า
// คืน { open: boolean, reason: 'force'|'hours'|null, openTime, closeTime }
export function computeShopOpen(settings, now = new Date()) {
  const s = settings || {}
  if (s[SETTING_KEYS.forceClosed] === '1') return { open: false, reason: 'force' }
  if (s[SETTING_KEYS.hoursEnabled] !== '1') return { open: true, reason: null }
  const open = s[SETTING_KEYS.openTime]
  const close = s[SETTING_KEYS.closeTime]
  if (!open || !close) return { open: true, reason: null }
  const [oh, om] = open.split(':').map(Number)
  const [ch, cm] = close.split(':').map(Number)
  if ([oh, om, ch, cm].some((n) => Number.isNaN(n))) return { open: true, reason: null }
  const cur = now.getHours() * 60 + now.getMinutes()
  const o = oh * 60 + om
  const c = ch * 60 + cm
  let isOpen
  if (c > o) isOpen = cur >= o && cur < c
  else isOpen = cur >= o || cur < c // ร้านเปิดข้ามเที่ยงคืน
  return { open: isOpen, reason: isOpen ? null : 'hours', openTime: open, closeTime: close }
}

// แปลงไอดี LINE เป็นลิงก์เปิดแอป LINE ได้ (รับได้ทั้งลิงก์เต็มและไอดี)
export function lineHref(raw) {
  if (!raw) return null
  const v = String(raw).trim()
  if (!v) return null
  if (v.startsWith('http')) return v
  if (v.startsWith('@')) return 'https://line.me/R/ti/p/' + encodeURIComponent(v)
  return 'https://line.me/ti/p/~' + encodeURIComponent(v)
}
