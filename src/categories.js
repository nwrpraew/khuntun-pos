// โหลด/จัดการ "หมวดหมู่เมนู" จากฐานข้อมูล (ตาราง categories)
// มี fallback เป็นหมวดเดิมใน constants เผื่อยังไม่ได้รัน SQL หรือเน็ตหลุด
import { supabase, PRODUCT_BUCKET } from './supabaseClient'
import { CATEGORIES as DEFAULT_CATEGORIES } from './constants'

export { DEFAULT_CATEGORIES }

// โหลดหมวดหมู่ทั้งหมด เรียงตาม sort_order
// คืน array ของ { key, label, color, banner_url, sort_order }
// ถ้าโหลดไม่ได้/ตารางยังไม่มี → คืนหมวดเดิมเป็น fallback
export async function loadCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error || !data || data.length === 0) {
    // fallback: แปลงหมวดเดิมให้อยู่ในรูปเดียวกัน
    return DEFAULT_CATEGORIES.map((c, i) => ({
      key: c.key,
      label: c.label,
      color: c.color,
      banner_url: `/menu/${c.key}.jpg`,
      sort_order: (i + 1) * 10,
    }))
  }
  return data
}

// สร้าง map ช่วยค้นหา label / color จาก key
export function buildCategoryMaps(categories) {
  const label = {}
  const color = {}
  const banner = {}
  for (const c of categories) {
    label[c.key] = c.label
    color[c.key] = c.color
    banner[c.key] = c.banner_url
  }
  return { label, color, banner }
}

// แปลง path แบนเนอร์เป็น URL เต็ม
// - path ที่ขึ้นต้น http → ใช้ตรง ๆ
// - path ที่ขึ้นต้น / → ไฟล์ static ในโฟลเดอร์ public (เช่น /menu/coffee.jpg)
// - อื่น ๆ → รูปที่อัปโหลดไว้ใน bucket product-images
export function bannerUrl(path) {
  if (!path) return null
  if (path.startsWith('http') || path.startsWith('/')) return path
  const { data } = supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(path)
  return data?.publicUrl || null
}

// สร้าง key ใหม่สำหรับหมวดที่เพิ่งเพิ่ม (ตัวอ้างอิงถาวร ไม่ต้องสื่อความหมาย)
export function newCategoryKey() {
  return 'cat_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}
