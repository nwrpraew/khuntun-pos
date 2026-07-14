import { useState } from 'react'
import { supabase, imageUrl, PRODUCT_BUCKET } from '../supabaseClient'
import { CATEGORIES } from '../constants'

// ใช้หมวดจาก DB ถ้ามี ไม่งั้น fallback เป็นหมวดเดิม

const FLAGS = [
  { key: 'is_hot', label: 'เมนูร้อน (ล็อกเป็นร้อน)' },
  { key: 'is_blend', label: 'เป็นเมนูปั่นอยู่แล้ว (ล็อกปั่น)' },
  { key: 'blendable', label: 'ลูกค้าเลือกเย็น/ปั่นได้ (ปั่น +10)' },
  { key: 'has_sweet', label: 'มีตัวเลือกความหวาน' },
  { key: 'has_toppings', label: 'มีตัวเลือกท็อปปิ้ง' },
  { key: 'has_dip', label: 'มีตัวเลือกซอสราด (ของทอด)' },
  { key: 'has_filling', label: 'มีตัวเลือกไส้ (ปูอัด/แฮม/ไส้กรอก)' },
  { key: 'has_cheese', label: 'เพิ่มชีสได้ (+20)' },
]

export default function ProductModal({ product, categories, onClose, onSaved }) {
  const cats = (categories && categories.length) ? categories : CATEGORIES
  const isNew = !product
  const [form, setForm] = useState(() => ({
    name: product?.name || '',
    category: product?.category || cats[0].key,
    base_price: product?.base_price ?? 0,
    image_url: product?.image_url || null,
    is_hot: product?.is_hot ?? false,
    is_blend: product?.is_blend ?? false,
    blendable: product?.blendable ?? true,
    has_sweet: product?.has_sweet ?? true,
    has_toppings: product?.has_toppings ?? true,
    has_dip: product?.has_dip ?? false,
    has_filling: product?.has_filling ?? false,
    has_cheese: product?.has_cheese ?? false,
    sort_order: product?.sort_order ?? 500,
  }))
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })) }

  async function uploadImage(file) {
    if (!file) return
    setUploading(true)
    setErr('')
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from(PRODUCT_BUCKET).upload(path, file, {
        upsert: true,
        contentType: file.type || 'image/jpeg',
      })
      if (error) throw error
      set('image_url', path)
    } catch (e) {
      console.error(e)
      setErr('อัปโหลดรูปไม่สำเร็จ ลองใหม่อีกครั้ง')
    }
    setUploading(false)
  }

  async function save() {
    if (!form.name.trim()) { setErr('กรุณาใส่ชื่อเมนู'); return }
    setBusy(true)
    setErr('')
    const payload = {
      name: form.name.trim(),
      category: form.category,
      base_price: Number(form.base_price) || 0,
      image_url: form.image_url,
      is_hot: form.is_hot,
      is_blend: form.is_blend,
      blendable: form.blendable,
      has_sweet: form.has_sweet,
      has_toppings: form.has_toppings,
      has_dip: form.has_dip,
      has_filling: form.has_filling,
      has_cheese: form.has_cheese,
      sort_order: Number(form.sort_order) || 500,
    }
    let error
    if (isNew) {
      ({ error } = await supabase.from('products').insert(payload))
    } else {
      ({ error } = await supabase.from('products').update(payload).eq('id', product.id))
    }
    if (error) {
      console.error(error)
      setErr('บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง')
      setBusy(false)
    } else {
      onSaved()
    }
  }

  const preview = imageUrl(form.image_url)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isNew ? 'เพิ่มเมนูใหม่' : 'แก้ไขเมนู'}</h3>
        <div className="mbody">
          <label>ชื่อเมนู</label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="เช่น ลาเต้เย็น" />

          <label>หมวด</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value)}>
            {cats.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>

          <label>ราคาเริ่มต้น (บาท)</label>
          <input type="number" inputMode="numeric" value={form.base_price} onChange={(e) => set('base_price', e.target.value)} />

          <label>รูปสินค้า</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {preview && <img src={preview} alt="" style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover' }} />}
            <label className="btn btn-lg" style={{ display: 'inline-block' }}>
              {uploading ? 'กำลังอัปโหลด…' : (preview ? 'เปลี่ยนรูป' : 'เลือกรูป')}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => uploadImage(e.target.files?.[0])} />
            </label>
          </div>

          <label>ตัวเลือกที่เมนูนี้มี</label>
          <div className="check-row">
            {FLAGS.map((f) => (
              <button
                key={f.key}
                className={'check' + (form[f.key] ? ' on' : '')}
                onClick={() => set(f.key, !form[f.key])}
                type="button"
              >
                {form[f.key] ? '✓ ' : ''}{f.label}
              </button>
            ))}
          </div>

          <label>ลำดับการแสดง (เลขน้อยขึ้นก่อน)</label>
          <input type="number" inputMode="numeric" value={form.sort_order} onChange={(e) => set('sort_order', e.target.value)} />

          {err && <div className="login-err" style={{ marginTop: 14 }}>{err}</div>}
        </div>
        <div className="mfoot">
          <button className="btn btn-lg" style={{ flex: 1 }} onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary btn-lg" style={{ flex: 2 }} disabled={busy || uploading} onClick={save}>
            {busy ? 'กำลังบันทึก…' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  )
}
