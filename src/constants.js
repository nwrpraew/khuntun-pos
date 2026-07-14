// ---- หมวดหมู่ (ต้องตรงกับค่า category ในตาราง products) ----
export const CATEGORIES = [
  { key: 'special', label: 'เมนูพิเศษ', color: '#7c3aed' },
  { key: 'hotcoffee', label: 'กาแฟร้อน', color: '#b45309' },
  { key: 'coffee', label: 'Coffee เย็น', color: '#0e7490' },
  { key: 'bearmilk', label: 'Bear Milk ปั่น', color: '#db2777' },
  { key: 'teacocoa', label: 'ชา-โกโก้', color: '#15803d' },
  { key: 'freshmilk', label: 'นมสด', color: '#2563eb' },
  { key: 'smoothie', label: 'น้ำผลไม้ปั่น', color: '#ea580c' },
  { key: 'fried', label: 'ของทอด', color: '#a16207' },
]

export const CATEGORY_LABEL = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.label])
)
export const CATEGORY_COLOR = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.color])
)

// ---- กฎราคา ----
export const BLEND_SURCHARGE = 10 // เปลี่ยนจากเย็นเป็นปั่น
export const EXTRA_SWEET_SURCHARGE = 10 // "หวานมาก"
export const MIN_ORDER = 40 // ยอดขั้นต่ำ
export const DELIVERY_FEE = 10 // ถ้ายอดไม่ถึงขั้นต่ำ

// ---- ตัวเลือกความหวาน ----
export const SWEET_OPTIONS = [
  { key: 'no', label: 'ไม่หวาน', surcharge: 0 },
  { key: 'less', label: 'หวานน้อย', surcharge: 0 },
  { key: 'normal', label: 'หวานปกติ', surcharge: 0 },
  { key: '125', label: 'หวาน 125%', surcharge: 0 },
  { key: 'max', label: 'หวานมาก', surcharge: EXTRA_SWEET_SURCHARGE },
]

// ---- ท็อปปิ้ง (เลือกได้หลายอย่าง) ----
export const TOPPINGS = [
  { key: 'boba', label: 'ไข่มุกบราวน์ชูก้าร์', surcharge: 10 },
  { key: 'jelly', label: 'เยลลี่เม็ดกลมสีแดง', surcharge: 10 },
  { key: 'ovaltine', label: 'โอวัลตินเฟล็ค', surcharge: 10 },
  { key: 'whip', label: 'วิปครีม', surcharge: 15 },
]

// ---- ซอสราด (ของทอด) ----
export const SAUCES = [
  { key: 'ketchup', label: 'ซอสมะเขือเทศ', surcharge: 0 },
  { key: 'mayo', label: 'ซอสมายองเนส', surcharge: 0 },
  { key: 'chili', label: 'ซอสพริก', surcharge: 0 },
  { key: 'none', label: 'ไม่เอาซอส', surcharge: 0 },
]

// ---- ไส้ (พิซซ่าเวียดนาม) ----
export const FILLINGS = [
  { key: 'crab', label: 'ปูอัด', surcharge: 0 },
  { key: 'ham', label: 'แฮม', surcharge: 0 },
  { key: 'sausage', label: 'ไส้กรอก', surcharge: 0 },
]

// ---- เพิ่มชีส (พิซซ่าเวียดนาม) ----
export const CHEESE_SURCHARGE = 20

// ชื่อแบรนด์ร้าน
export const BRAND = 'Khuntun Shop'

// รูปป้ายเมนูประจำหมวด (แบนเนอร์หัวหมวด) — อยู่ใน public/menu/
export const CATEGORY_BANNER = {
  special: '/menu/special.jpg',
  hotcoffee: '/menu/hotcoffee.jpg',
  coffee: '/menu/coffee.jpg',
  bearmilk: '/menu/bearmilk.jpg',
  teacocoa: '/menu/teacocoa.jpg',
  freshmilk: '/menu/freshmilk.jpg',
  smoothie: '/menu/smoothie.jpg',
  fried: '/menu/fried.jpg',
}

// ---- ตัวเลือกอุณหภูมิ ----
export const TEMP_ICED = { key: 'iced', label: 'เย็น', surcharge: 0 }
export const TEMP_BLEND = { key: 'blend', label: 'ปั่น', surcharge: BLEND_SURCHARGE }
export const TEMP_HOT = { key: 'hot', label: 'ร้อน', surcharge: 0 }

export const STATUS = {
  waiting: { key: 'waiting', label: 'รอยืนยัน', color: '#dc2626', next: 'confirmed' },
  confirmed: { key: 'confirmed', label: 'ยืนยันแล้ว', color: '#2563eb', next: 'delivering' },
  delivering: { key: 'delivering', label: 'กำลังส่ง', color: '#d97706', next: 'done' },
  done: { key: 'done', label: 'ส่งแล้ว', color: '#16a34a', next: null },
  cancelled: { key: 'cancelled', label: 'ยกเลิกแล้ว', color: '#6b7280', next: null },
}

// ป้ายบนปุ่ม "ไปสถานะถัดไป" ของแต่ละสถานะ
export const NEXT_LABEL = {
  waiting: '✓ ยืนยันออเดอร์',
  confirmed: '▶ เริ่มไปส่ง',
  delivering: '✓ ส่งแล้ว',
}

export function baht(n) {
  return '฿' + Number(n || 0).toLocaleString('th-TH')
}
