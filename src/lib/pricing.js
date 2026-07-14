import {
  SWEET_OPTIONS,
  TOPPINGS,
  SAUCES,
  FILLINGS,
  CHEESE_SURCHARGE,
  TEMP_ICED,
  TEMP_BLEND,
  TEMP_HOT,
} from '../constants'

// สร้างตัวเลือกเริ่มต้นของสินค้าเมื่อเปิด bottom sheet
export function defaultSelection(product) {
  let temp = null
  if (product.is_hot) temp = 'hot'
  else if (product.is_blend) temp = 'blend' // เมนูที่ปั่นอยู่แล้ว ล็อกเป็นปั่น
  else if (product.blendable) temp = 'iced' // เลือกเย็น/ปั่นได้ เริ่มที่เย็น
  return {
    temp,
    sweet: product.has_sweet ? 'normal' : null,
    toppings: [],
    filling: product.has_filling ? 'crab' : null,
    cheese: false,
    sauce: product.has_dip ? 'ketchup' : null,
    note: '',
    qty: 1,
  }
}

function tempMeta(key) {
  if (key === 'hot') return TEMP_HOT
  if (key === 'blend') return TEMP_BLEND
  if (key === 'iced') return TEMP_ICED
  return null
}

// ราคาต่อ 1 หน่วย ตามตัวเลือก (ยังไม่คูณจำนวน)
export function unitPrice(product, sel) {
  let price = product.base_price
  const t = tempMeta(sel.temp)
  if (t) price += t.surcharge
  const sw = SWEET_OPTIONS.find((s) => s.key === sel.sweet)
  if (sw) price += sw.surcharge
  for (const key of sel.toppings || []) {
    const top = TOPPINGS.find((x) => x.key === key)
    if (top) price += top.surcharge
  }
  if (product.has_cheese && sel.cheese) price += CHEESE_SURCHARGE
  return price
}

// สร้าง array ของ label ตัวเลือก สำหรับแสดงใต้ชื่อ
export function optionLabels(product, sel) {
  const out = []
  const t = tempMeta(sel.temp)
  if (t) out.push(t.label)
  if (sel.sweet) {
    const sw = SWEET_OPTIONS.find((s) => s.key === sel.sweet)
    if (sw) out.push(sw.label)
  }
  for (const key of sel.toppings || []) {
    const top = TOPPINGS.find((x) => x.key === key)
    if (top) out.push('+' + top.label)
  }
  if (sel.filling) {
    const f = FILLINGS.find((x) => x.key === sel.filling)
    if (f) out.push('ไส้' + f.label)
  }
  if (product.has_cheese && sel.cheese) out.push('+ชีส')
  if (sel.sauce) {
    const s = SAUCES.find((x) => x.key === sel.sauce)
    if (s) out.push(s.label)
  }
  return out
}

// ลายเซ็นของตัวเลือก ใช้รวมรายการที่เหมือนกันในตะกร้า
export function selectionKey(product, sel) {
  return [
    product.id,
    sel.temp || '-',
    sel.sweet || '-',
    (sel.toppings || []).slice().sort().join(','),
    sel.filling || '-',
    sel.cheese ? 'cheese' : '-',
    sel.sauce || '-',
    (sel.note || '').trim() || '-',
  ].join('|')
}

export function computeTotals(cart) {
  const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0)
  const deliveryFee = subtotal > 0 && subtotal < 40 ? 10 : 0
  return { subtotal, deliveryFee, total: subtotal + deliveryFee }
}
