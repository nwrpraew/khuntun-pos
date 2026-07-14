// จัดการ "ออเดอร์ล่าสุด" ของลูกค้าในเครื่อง (localStorage)
// ใช้ร่วมกันระหว่างหน้าตะกร้า กับ หน้าติดตามสถานะ

const LAST_ORDER_KEY = 'khuntun_last_order'
// เก็บออเดอร์ล่าสุดไว้ให้ติดตามได้นาน 24 ชม.
const MAX_AGE_MS = 24 * 60 * 60 * 1000

// ประวัติสั่งซื้อในเครื่องนี้ (เก็บหลายออเดอร์ ไว้ให้ลูกค้าย้อนดู/แนบสลิปทีหลัง)
const HISTORY_KEY = 'khuntun_order_history'
const HISTORY_MAX = 30                       // เก็บย้อนหลังไม่เกิน 30 ออเดอร์
const HISTORY_MAX_AGE_MS = 60 * 24 * 60 * 60 * 1000 // เก็บนาน 60 วัน

// สร้าง UUID ฝั่งลูกค้า (เพื่อให้รู้เลขออเดอร์ตัวเองโดยไม่ต้องอ่านจากฐานข้อมูล)
export function newOrderId() {
  try {
    if (crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  } catch (e) { /* ใช้ fallback ด้านล่าง */ }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function saveLastOrder(order) {
  try {
    localStorage.setItem(LAST_ORDER_KEY, JSON.stringify({ ...order, ts: Date.now() }))
  } catch (e) { /* จำไม่ได้ก็ไม่เป็นไร */ }
}

// คืนออเดอร์ล่าสุดถ้ายังไม่เกิน 24 ชม. ไม่งั้นคืน null
export function loadLastOrder() {
  try {
    const raw = localStorage.getItem(LAST_ORDER_KEY)
    if (!raw) return null
    const o = JSON.parse(raw)
    if (!o?.id || !o?.ts || Date.now() - o.ts > MAX_AGE_MS) return null
    return o
  } catch (e) { return null }
}

export function clearLastOrder() {
  try { localStorage.removeItem(LAST_ORDER_KEY) } catch (e) { /* ไม่เป็นไร */ }
}

// ---------- ประวัติสั่งซื้อในเครื่อง ----------

// เพิ่มออเดอร์ลงประวัติ (เรียกตอนสั่งซื้อสำเร็จ) — ใหม่สุดอยู่บน ไม่ซ้ำ id
export function addOrderToHistory(order) {
  try {
    const list = loadOrderHistory()
    const without = list.filter((o) => o.id !== order.id)
    const next = [{ ...order, ts: Date.now() }, ...without].slice(0, HISTORY_MAX)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  } catch (e) { /* จำไม่ได้ก็ไม่เป็นไร */ }
}

// คืนประวัติสั่งซื้อในเครื่อง (ตัดรายการที่เก่ากว่า 60 วันทิ้ง)
export function loadOrderHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const list = JSON.parse(raw)
    if (!Array.isArray(list)) return []
    const cutoff = Date.now() - HISTORY_MAX_AGE_MS
    return list.filter((o) => o?.id && (!o.ts || o.ts > cutoff))
  } catch (e) { return [] }
}

// ---------- ตะกร้าค้างไว้ในเครื่อง (จำไว้แม้ปิดแอป) ----------

const CART_KEY = 'khuntun_cart'
const CART_MAX_AGE_MS = 24 * 60 * 60 * 1000 // จำตะกร้าไว้ 24 ชม.

export function saveCart(cart) {
  try {
    if (!Array.isArray(cart) || cart.length === 0) {
      localStorage.removeItem(CART_KEY)
      return
    }
    localStorage.setItem(CART_KEY, JSON.stringify({ cart, ts: Date.now() }))
  } catch (e) { /* จำไม่ได้ก็ไม่เป็นไร */ }
}

export function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY)
    if (!raw) return []
    const o = JSON.parse(raw)
    if (!o?.ts || Date.now() - o.ts > CART_MAX_AGE_MS) return []
    return Array.isArray(o.cart) ? o.cart : []
  } catch (e) { return [] }
}

export function clearCart() {
  try { localStorage.removeItem(CART_KEY) } catch (e) { /* ไม่เป็นไร */ }
}
