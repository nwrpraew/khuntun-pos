import { SWEET_OPTIONS, SAUCES } from '../constants'

const SWEET_SET = new Set(SWEET_OPTIONS.map((s) => s.label))
const SAUCE_SET = new Set(SAUCES.map((s) => s.label))

// จัดสี "แท็ก" ตัวเลือกในออเดอร์ เพื่อให้แม่ทำตามได้ไม่พลาด
export function tagClass(label) {
  if (label.startsWith('+')) return 'top'          // ท็อปปิ้ง/ชีส — เขียว
  if (label.startsWith('ไส้')) return 'dip'        // ไส้ — ม่วง
  if (SAUCE_SET.has(label)) return 'dip'           // ซอสราด — ม่วง
  if (label === 'ร้อน') return 'temp'              // ร้อน — แดง
  if (label === 'เย็น') return 'cold'              // เย็น — น้ำเงิน
  if (label === 'ปั่น') return 'blend'             // ปั่น — ชมพู
  if (SWEET_SET.has(label)) return 'sweet'         // ความหวาน — ส้ม
  return 'sweet'
}
