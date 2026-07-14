import { useEffect, useMemo, useState } from 'react'
import { supabase, imageUrl } from '../supabaseClient'
import { baht } from '../constants'
import { loadCategories, buildCategoryMaps } from '../categories'
import ProductModal from './ProductModal'

export default function MenuTab() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [modal, setModal] = useState(null) // null | 'new' | productObject
  const [busyId, setBusyId] = useState(null)

  const catMaps = useMemo(() => buildCategoryMaps(categories), [categories])

  async function load() {
    setLoading(true)
    const [{ data }, cats] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true }),
      loadCategories(),
    ])
    setProducts(data || [])
    setCategories(cats)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function toggleAvailable(p) {
    setBusyId(p.id)
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_available: !x.is_available } : x)))
    const { error } = await supabase.from('products').update({ is_available: !p.is_available }).eq('id', p.id)
    if (error) load()
    setBusyId(null)
  }

  async function remove(p) {
    if (!window.confirm(`ต้องการลบเมนู "${p.name}" ออกถาวรใช่ไหม?`)) return
    const { error } = await supabase.from('products').delete().eq('id', p.id)
    if (!error) setProducts((prev) => prev.filter((x) => x.id !== p.id))
    else alert('ลบไม่สำเร็จ ลองใหม่อีกครั้ง')
  }

  const shown = filter === 'all' ? products : products.filter((p) => p.category === filter)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>จัดการเมนู</h2>
        <button className="btn btn-primary btn-lg" style={{ marginLeft: 'auto' }} onClick={() => setModal('new')}>+ เพิ่มเมนูใหม่</button>
      </div>

      <div className="filterbar">
        <button className={'fchip' + (filter === 'all' ? ' active' : '')} onClick={() => setFilter('all')}>ทั้งหมด</button>
        {categories.map((c) => (
          <button key={c.key} className={'fchip' + (filter === c.key ? ' active' : '')} onClick={() => setFilter(c.key)}>{c.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="spinner" />
      ) : shown.length === 0 ? (
        <div className="loading-full">ยังไม่มีเมนูในหมวดนี้</div>
      ) : (
        shown.map((p) => {
          const img = imageUrl(p.image_url)
          const color = catMaps.color[p.category] || '#e07a3f'
          return (
            <div className={'mrow' + (p.is_available ? '' : ' off')} key={p.id}>
              {img ? (
                <img className="mthumb" src={img} alt="" />
              ) : (
                <div className="mthumb" style={{ background: color }}>{p.name.slice(0, 1)}</div>
              )}
              <div>
                <div className="mname">{p.name}</div>
                <div className="mmeta">{catMaps.label[p.category]} · {baht(p.base_price)}</div>
              </div>
              <div className="mact">
                <button
                  className={'toggle ' + (p.is_available ? 'on' : 'off')}
                  disabled={busyId === p.id}
                  onClick={() => toggleAvailable(p)}
                >
                  {p.is_available ? 'เปิดขาย' : 'ปิดขาย'}
                </button>
                <button className="icon-btn" onClick={() => setModal(p)}>แก้ไข</button>
                <button className="icon-btn del" onClick={() => remove(p)}>ลบ</button>
              </div>
            </div>
          )
        })
      )}

      {modal && (
        <ProductModal
          product={modal === 'new' ? null : modal}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}
