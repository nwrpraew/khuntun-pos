import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase, imageUrl } from '../supabaseClient'
import { BRAND, MIN_ORDER, baht } from '../constants'
import { loadCategories, buildCategoryMaps, bannerUrl } from '../categories'
import {
  unitPrice,
  optionLabels,
  selectionKey,
  computeTotals,
} from '../lib/pricing'
import OptionSheet from './OptionSheet'
import CartView from './CartView'
import OrderTracker from './OrderTracker'
import MyOrders from './MyOrders'
import { loadLastOrder, loadCart, saveCart } from './orderStore'
import { loadShopSettings, computeShopOpen, lineHref, SETTING_KEYS } from '../shopSettings'

export default function CustomerApp() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [activeCat, setActiveCat] = useState('')
  const [sheetProduct, setSheetProduct] = useState(null)
  const [cart, setCart] = useState(() => loadCart())
  const [view, setView] = useState('menu') // menu | cart | done | orders
  const [doneOrder, setDoneOrder] = useState(null)
  const [trackReturn, setTrackReturn] = useState('menu') // กลับไปที่ไหนเมื่อกดออกจากหน้าติดตาม
  const [lastOrder, setLastOrder] = useState(() => loadLastOrder())
  const [toast, setToast] = useState(null)
  const [query, setQuery] = useState('')
  const [settings, setSettings] = useState(null)

  const catRefs = useRef({})
  const scrollingRef = useRef(false)

  async function loadProducts() {
    setLoading(true)
    setLoadError(false)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_available', true)
      .order('sort_order', { ascending: true })
    if (error) {
      setLoadError(true)
    } else {
      setProducts(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadProducts()
    loadCategories().then((cats) => {
      setCategories(cats)
      setActiveCat((prev) => prev || cats[0]?.key || '')
    })
    loadShopSettings().then(setSettings)
  }, [])

  // จำตะกร้าไว้ในเครื่อง (24 ชม.) เผื่อลูกค้าปิดแอปแล้วกลับมาสั่งต่อ
  useEffect(() => { saveCart(cart) }, [cart])

  // สถานะร้านเปิด/ปิด (คำนวณจากเวลาเครื่องลูกค้า) — เช็คซ้ำทุก 1 นาที
  const [nowTick, setNowTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setNowTick((n) => n + 1), 60 * 1000)
    return () => clearInterval(t)
  }, [])
  const shopStatus = useMemo(
    () => (settings ? computeShopOpen(settings) : { open: true, reason: null }),
    [settings, nowTick]
  )
  const closedMsg = settings?.[SETTING_KEYS.closedMsg] || ''
  const contactPhone = settings?.[SETTING_KEYS.contactPhone] || ''
  const contactLine = settings?.[SETTING_KEYS.contactLine] || ''
  const lineUrl = lineHref(contactLine)

  function reorder(order) {
    const items = Array.isArray(order.items) ? order.items : []
    if (items.length === 0) { showToast('ออเดอร์นี้ไม่มีรายละเอียดสำหรับสั่งซ้ำ', 'err'); return }
    const rebuilt = items.map((it, i) => ({
      key: (it.product_id || it.name || 'x') + '|' + (Array.isArray(it.options) ? it.options.join(',') : '') + '|' + (it.note || '') + '|' + i,
      product_id: it.product_id,
      name: it.name,
      category: it.category,
      options: Array.isArray(it.options) ? it.options : [],
      note: it.note || null,
      price: it.price,
      qty: it.qty || 1,
    }))
    setCart(rebuilt)
    setView('cart')
    showToast('ใส่รายการเดิมลงตะกร้าแล้ว ✓', 'ok')
  }

  function showToast(msg, kind = 'warn') {
    setToast({ msg, kind })
    setTimeout(() => setToast(null), 2500)
  }

  const catMaps = useMemo(() => buildCategoryMaps(categories), [categories])

  const grouped = useMemo(() => {
    const m = {}
    for (const c of categories) m[c.key] = []
    for (const p of products) if (m[p.category]) m[p.category].push(p)
    return m
  }, [products, categories])

  function addToCart(product, sel) {
    const price = unitPrice(product, sel)
    const key = selectionKey(product, sel)
    const labels = optionLabels(product, sel)
    setCart((prev) => {
      const idx = prev.findIndex((it) => it.key === key)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + sel.qty }
        return copy
      }
      return [
        ...prev,
        {
          key,
          product_id: product.id,
          name: product.name,
          category: product.category,
          options: labels,
          note: (sel.note || '').trim() || null,
          price,
          qty: sel.qty,
        },
      ]
    })
    setSheetProduct(null)
    showToast('เพิ่มลงตะกร้าแล้ว', 'ok')
  }

  const totals = useMemo(() => computeTotals(cart), [cart])
  const cartCount = cart.reduce((s, it) => s + it.qty, 0)

  // ผลการค้นหาเมนู (ค้นจากชื่อสินค้า)
  const q = query.trim().toLowerCase()
  const searchResults = useMemo(() => {
    if (!q) return null
    return products.filter((p) => (p.name || '').toLowerCase().includes(q))
  }, [q, products])

  // เลื่อนไปหมวดที่กด
  function jumpTo(catKey) {
    setActiveCat(catKey)
    const el = catRefs.current[catKey]
    if (el) {
      scrollingRef.current = true
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setTimeout(() => (scrollingRef.current = false), 600)
    }
  }

  // ---- หน้าติดตามสถานะออเดอร์ (แบบสด) ----
  if (view === 'done' && doneOrder) {
    return (
      <OrderTracker
        orderId={doneOrder.id}
        initial={doneOrder}
        onBackToMenu={() => { setDoneOrder(null); setLastOrder(loadLastOrder()); setView(trackReturn) }}
        onNewOrder={() => { setCart([]); setDoneOrder(null); setLastOrder(null); setView('menu') }}
      />
    )
  }

  // ---- หน้าประวัติออเดอร์ของฉัน (ประวัติในเครื่อง + ค้นด้วยเบอร์) ----
  if (view === 'orders') {
    return (
      <MyOrders
        onBack={() => setView('menu')}
        onOpenOrder={(o) => { setDoneOrder(o); setTrackReturn('orders'); setView('done') }}
        onReorder={reorder}
      />
    )
  }

  // ---- หน้าตะกร้า / ชำระเงิน ----
  if (view === 'cart') {
    return (
      <CartView
        cart={cart}
        setCart={setCart}
        totals={totals}
        onBack={() => setView('menu')}
        onDone={(order) => { setDoneOrder(order); setCart([]); setLastOrder(order); setTrackReturn('menu'); setView('done') }}
        showToast={showToast}
        toast={toast}
        shopOpen={shopStatus.open}
        closedMsg={closedMsg}
      />
    )
  }

  // ---- หน้าเมนู ----
  return (
    <div className="cust">
      {toast && <div className={'toast ' + toast.kind}>{toast.msg}</div>}

      <div className="cust-header">
        <button className="myorders-btn" onClick={() => setView('orders')}>🧾 ออเดอร์ของฉัน</button>
        <h1>ร้านคุณตุ่น ☕</h1>
        <p className="brand-sub">{BRAND}</p>
        <p>สั่งเครื่องดื่ม & ของทอด ส่งถึงบ้าน · เก็บเงินปลายทาง</p>
        {(contactPhone || lineUrl) && (
          <div className="contact-row">
            {contactPhone && <a className="contact-btn" href={`tel:${contactPhone}`}>📞 โทรหาร้าน</a>}
            {lineUrl && <a className="contact-btn line" href={lineUrl} target="_blank" rel="noreferrer">💬 LINE</a>}
          </div>
        )}
      </div>

      {!shopStatus.open && (
        <div className="shop-closed-banner">
          🔴 {closedMsg || (shopStatus.reason === 'hours'
            ? `ตอนนี้ร้านปิดอยู่ค่ะ เปิด ${shopStatus.openTime}–${shopStatus.closeTime} น.`
            : 'ขณะนี้ร้านปิดรับออเดอร์ชั่วคราวค่ะ')}
          <span className="scb-sub">ดูเมนูไว้ก่อนได้ กลับมาสั่งตอนร้านเปิดนะคะ 💛</span>
        </div>
      )}

      <div className="menu-search">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔎 ค้นหาเมนู เช่น ลาเต้ ชาเขียว"
          inputMode="search"
        />
        {query && <button className="ms-clear" onClick={() => setQuery('')} aria-label="ล้าง">×</button>}
      </div>

      <div className="catbar">
        {categories.map((c) => (
          <button
            key={c.key}
            className={'catchip' + (activeCat === c.key ? ' active' : '')}
            onClick={() => jumpTo(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {lastOrder && (
        <button
          className="track-banner"
          onClick={() => { setDoneOrder(lastOrder); setTrackReturn('menu'); setView('done') }}
        >
          📦 ติดตามออเดอร์ล่าสุด
          <span className="go">ดูสถานะ ›</span>
        </button>
      )}

      {loading && <div className="spinner" />}

      {loadError && (
        <div className="empty">
          <p>โหลดเมนูไม่สำเร็จ 😔<br />เน็ตอาจช้า ลองใหม่อีกครั้งนะคะ</p>
          <button className="btn btn-primary" onClick={loadProducts}>ลองใหม่</button>
        </div>
      )}

      {!loading && !loadError && searchResults !== null && (
        <div className="cat-section">
          <div className="cat-title">ผลการค้นหา “{query.trim()}”</div>
          {searchResults.length === 0 ? (
            <div className="empty"><p>ไม่พบเมนูที่ค้นหา 😅<br />ลองพิมพ์ชื่อสั้นลงนะคะ</p></div>
          ) : (
            <div className="grid">
              {searchResults.map((p) => (
                <ProductCard key={p.id} product={p} color={catMaps.color[p.category]} onClick={() => setSheetProduct(p)} />
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && !loadError && searchResults === null && categories.map((c) => {
        const items = grouped[c.key]
        if (!items || items.length === 0) return null
        const banner = bannerUrl(c.banner_url)
        return (
          <div key={c.key} className="cat-section" ref={(el) => (catRefs.current[c.key] = el)}>
            <div className="cat-title" style={{ color: c.color }}>{c.label}</div>
            {banner && (
              <img
                className="cat-banner"
                src={banner}
                alt={c.label}
                loading="lazy"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            )}
            <div className="grid">
              {items.map((p) => (
                <ProductCard key={p.id} product={p} color={catMaps.color[p.category]} onClick={() => setSheetProduct(p)} />
              ))}
            </div>
          </div>
        )
      })}

      {sheetProduct && (
        <OptionSheet
          product={sheetProduct}
          color={catMaps.color[sheetProduct.category]}
          onClose={() => setSheetProduct(null)}
          onAdd={(sel) => addToCart(sheetProduct, sel)}
        />
      )}

      {cartCount > 0 && view === 'menu' && (
        <button className="cartbar" onClick={() => setView('cart')}>
          <span className="count">{cartCount}</span>
          <span>ดูตะกร้า</span>
          <span className="go">{baht(totals.total)} ›</span>
        </button>
      )}
    </div>
  )
}

function ProductCard({ product, color, onClick }) {
  const img = imageUrl(product.image_url)
  const cardColor = color || '#e07a3f'
  const isHot = product.is_hot
  const isBlend = product.is_blend
  return (
    <button className="pcard" onClick={onClick}>
      {img ? (
        <img className="thumb" src={img} alt={product.name} loading="lazy" />
      ) : (
        <div className="thumb" style={{ background: cardColor }}>{product.name.slice(0, 1)}</div>
      )}
      <div className="body">
        <div className="pname">{product.name}</div>
        {isHot && <span className="tag tag-hot">ร้อน</span>}
        {isBlend && <span className="tag tag-blend">ปั่น</span>}
        <div className="pprice">{baht(product.base_price)}</div>
      </div>
    </button>
  )
}
