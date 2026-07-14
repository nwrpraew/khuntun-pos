import { useEffect, useState } from 'react'
import { supabase, PRODUCT_BUCKET } from '../supabaseClient'
import { loadCategories, bannerUrl, newCategoryKey } from '../categories'

// จัดการหมวดหมู่เมนู: เพิ่ม / แก้ชื่อ-สี-แบนเนอร์ / เรียงลำดับ / ลบ
export default function CategoryManager() {
  const [cats, setCats] = useState([])
  const [counts, setCounts] = useState({}) // จำนวนเมนูในแต่ละหมวด (กันลบหมวดที่มีเมนู)
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState(null)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function load() {
    setLoading(true)
    const [list, { data: prods }] = await Promise.all([
      loadCategories(),
      supabase.from('products').select('category'),
    ])
    const c = {}
    for (const p of prods || []) c[p.category] = (c[p.category] || 0) + 1
    setCounts(c)
    setCats(list)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function flash(m, isErr = false) {
    if (isErr) { setErr(m); setMsg('') } else { setMsg(m); setErr('') }
    setTimeout(() => { setMsg(''); setErr('') }, 3000)
  }

  // แก้ค่าใน state ทันที (ยังไม่บันทึกลง DB จนกดบันทึก)
  function setField(key, field, value) {
    setCats((prev) => prev.map((c) => (c.key === key ? { ...c, [field]: value } : c)))
  }

  async function saveOne(cat) {
    if (!cat.label.trim()) { flash('กรุณาใส่ชื่อหมวด', true); return }
    setBusyKey(cat.key)
    setErr(''); setMsg('')
    const { error } = await supabase.from('categories').upsert({
      key: cat.key,
      label: cat.label.trim(),
      color: cat.color || '#e07a3f',
      banner_url: cat.banner_url,
      sort_order: cat.sort_order,
    })
    setBusyKey(null)
    if (error) { console.error(error); flash('บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง', true) }
    else flash('บันทึกหมวด "' + cat.label.trim() + '" แล้ว ✓')
  }

  async function uploadBanner(cat, file) {
    if (!file) return
    setBusyKey(cat.key)
    setErr(''); setMsg('')
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
      const path = `banners/${cat.key}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from(PRODUCT_BUCKET).upload(path, file, {
        upsert: true,
        contentType: file.type || 'image/jpeg',
      })
      if (upErr) throw upErr
      // บันทึก path แบนเนอร์ลง DB เลย (ให้เห็นผลทันที)
      const { error } = await supabase.from('categories').update({ banner_url: path }).eq('key', cat.key)
      if (error) throw error
      setField(cat.key, 'banner_url', path)
      flash('อัปโหลดแบนเนอร์แล้ว ✓')
    } catch (e) {
      console.error(e)
      flash('อัปโหลดแบนเนอร์ไม่สำเร็จ ลองใหม่', true)
    }
    setBusyKey(null)
  }

  async function addCategory() {
    const maxSort = cats.reduce((m, c) => Math.max(m, c.sort_order || 0), 0)
    const cat = { key: newCategoryKey(), label: 'หมวดใหม่', color: '#e07a3f', banner_url: null, sort_order: maxSort + 10 }
    setBusyKey('new')
    setErr(''); setMsg('')
    const { error } = await supabase.from('categories').insert(cat)
    setBusyKey(null)
    if (error) { console.error(error); flash('เพิ่มหมวดไม่สำเร็จ', true) }
    else { setCats((prev) => [...prev, cat]); flash('เพิ่มหมวดใหม่แล้ว แก้ชื่อได้เลย ✓') }
  }

  async function move(cat, dir) {
    const sorted = [...cats].sort((a, b) => a.sort_order - b.sort_order)
    const i = sorted.findIndex((c) => c.key === cat.key)
    const j = i + dir
    if (j < 0 || j >= sorted.length) return
    const a = sorted[i], b = sorted[j]
    const sa = a.sort_order, sb = b.sort_order
    setBusyKey(cat.key)
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from('categories').update({ sort_order: sb }).eq('key', a.key),
      supabase.from('categories').update({ sort_order: sa }).eq('key', b.key),
    ])
    setBusyKey(null)
    if (e1 || e2) { flash('สลับลำดับไม่สำเร็จ', true); return }
    setCats((prev) => prev.map((c) =>
      c.key === a.key ? { ...c, sort_order: sb } : c.key === b.key ? { ...c, sort_order: sa } : c
    ))
  }

  async function remove(cat) {
    const n = counts[cat.key] || 0
    if (n > 0) {
      flash(`หมวด "${cat.label}" มีเมนูอยู่ ${n} รายการ ต้องย้าย/ลบเมนูก่อนถึงจะลบหมวดได้`, true)
      return
    }
    if (!window.confirm(`ลบหมวด "${cat.label}" ใช่ไหมคะ?`)) return
    setBusyKey(cat.key)
    const { error } = await supabase.from('categories').delete().eq('key', cat.key)
    setBusyKey(null)
    if (error) { console.error(error); flash('ลบไม่สำเร็จ ลองใหม่', true) }
    else { setCats((prev) => prev.filter((c) => c.key !== cat.key)); flash('ลบหมวดแล้ว') }
  }

  const sorted = [...cats].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>จัดการหมวดหมู่เมนู</h2>
        <button className="btn btn-primary btn-lg" style={{ marginLeft: 'auto' }}
          disabled={busyKey === 'new'} onClick={addCategory}>+ เพิ่มหมวด</button>
      </div>
      <p style={{ color: '#8a7f77', fontSize: 15, marginTop: 4 }}>
        แก้ชื่อ สี และรูปแบนเนอร์ของแต่ละหมวดได้ · ใช้ลูกศรเพื่อจัดลำดับการแสดงในหน้าลูกค้า
      </p>

      {msg && <div className="qr-msg ok">{msg}</div>}
      {err && <div className="qr-msg err">{err}</div>}

      {loading ? (
        <div className="spinner" />
      ) : (
        <div className="cat-list">
          {sorted.map((cat, idx) => {
            const banner = bannerUrl(cat.banner_url)
            const busy = busyKey === cat.key
            const n = counts[cat.key] || 0
            return (
              <div className="cat-edit-card" key={cat.key}>
                <div className="cat-edit-top">
                  <div className="cat-move">
                    <button className="cat-move-btn" disabled={idx === 0 || busy} onClick={() => move(cat, -1)}>▲</button>
                    <button className="cat-move-btn" disabled={idx === sorted.length - 1 || busy} onClick={() => move(cat, 1)}>▼</button>
                  </div>
                  <input
                    className="cat-name-input"
                    value={cat.label}
                    onChange={(e) => setField(cat.key, 'label', e.target.value)}
                    placeholder="ชื่อหมวด"
                  />
                  <input
                    className="cat-color-input"
                    type="color"
                    value={cat.color || '#e07a3f'}
                    onChange={(e) => setField(cat.key, 'color', e.target.value)}
                    title="สีประจำหมวด"
                  />
                </div>

                <div className="cat-edit-banner">
                  {banner ? (
                    <img className="cat-banner-thumb" src={banner} alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  ) : (
                    <div className="cat-banner-thumb empty" style={{ background: cat.color || '#e07a3f' }}>ไม่มีรูป</div>
                  )}
                  <label className="btn" style={{ display: 'inline-block' }}>
                    {busy ? 'กำลังทำ…' : 'เปลี่ยนแบนเนอร์'}
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={(e) => uploadBanner(cat, e.target.files?.[0])} />
                  </label>
                </div>

                <div className="cat-edit-foot">
                  <span className="cat-count">{n > 0 ? `${n} เมนู` : 'ไม่มีเมนู'}</span>
                  <button className="btn del-order-btn" disabled={busy || n > 0} onClick={() => remove(cat)}>ลบหมวด</button>
                  <button className="btn btn-primary" disabled={busy} onClick={() => saveOne(cat)}>บันทึก</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
