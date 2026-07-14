import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import Login from './Login'
import OrdersTab from './OrdersTab'
import MenuTab from './MenuTab'
import SalesTab from './SalesTab'
import SettingsTab from './SettingsTab'

// เสียงเตือนออเดอร์ใหม่ (สร้างด้วย WebAudio ไม่ต้องมีไฟล์เสียง)
// ใช้ AudioContext ตัวเดียวร่วมกัน — ปลดล็อกครั้งเดียวตอนแม่กดปุ่มเปิดเสียง
let sharedCtx = null
function getCtx() {
  try {
    if (!sharedCtx) sharedCtx = new (window.AudioContext || window.webkitAudioContext)()
    if (sharedCtx.state === 'suspended') sharedCtx.resume()
    return sharedCtx
  } catch (e) { return null }
}

// เล่นโน้ต 1 ตัว
function tone(ctx, freq, start, len, vol, type = 'sine') {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  osc.connect(gain)
  gain.connect(ctx.destination)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(vol, start + 0.03)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + len - 0.02)
  osc.start(start)
  osc.stop(start + len)
}

// ตัวช่วยสร้างชุดโน้ตซ้ำหลายรอบ
function rep(freqs, rounds, len, vol, type) {
  const out = []
  for (let r = 0; r < rounds; r++) for (const f of freqs) out.push({ f, d: len, v: vol, type })
  return out
}

// รายการเสียงแจ้งเตือนให้แม่เลือก
export const SOUNDS = [
  { key: 'classic', label: '🔔 ระฆังดังยาว', build: () => rep([988, 1319], 5, 0.32, 0.85, 'sine') },
  { key: 'doorbell', label: '🚪 กริ่งประตู ติ๊งต่อง', build: () => [
      { f: 659, d: 0.45, v: 0.85, type: 'sine' },
      { f: 523, d: 0.75, v: 0.85, type: 'sine' },
      { f: 659, d: 0.45, v: 0.85, type: 'sine' },
      { f: 523, d: 0.85, v: 0.85, type: 'sine' },
    ] },
  { key: 'bell', label: '✨ กระดิ่งสดใส', build: () => rep([784, 988, 1319], 3, 0.16, 0.8, 'sine') },
  { key: 'soft', label: '🎐 เบา นุ่ม', build: () => rep([880, 1109], 4, 0.24, 0.5, 'triangle') },
  { key: 'alert', label: '⏰ เตือนถี่ (เร่งด่วน)', build: () => rep([1175, 880], 6, 0.14, 0.8, 'square') },
]

// ปลุก AudioContext ให้ตื่นอยู่เสมอเมื่อจอกลับมาแสดงผล/ได้โฟกัส
// (จอค้างไว้ทั้งวัน เบราว์เซอร์จะสั่งหลับเป็นระยะ — ตัวนี้คอยปลุกไว้ก่อน)
if (typeof window !== 'undefined') {
  const wake = () => { if (sharedCtx && sharedCtx.state !== 'running') sharedCtx.resume().catch(() => {}) }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake() })
  window.addEventListener('focus', wake)
  window.addEventListener('pageshow', wake)
}

// เล่นชุดโน้ตต่อเนื่อง
function playNotes(ctx, notes) {
  let t = ctx.currentTime + 0.03
  for (const n of notes) {
    tone(ctx, n.f, t, n.d, n.v ?? 0.85, n.type ?? 'sine')
    t += n.d
  }
}

// เล่นเสียงเตือนตามที่แม่เลือก
// สำคัญ: resume() ทำงานแบบ async — ต้องรอให้ context ตื่นก่อน "แล้วค่อย" ตั้งเวลาโน้ต
// ไม่งั้นพอจอค้างไว้นานจน context หลับ (suspended/interrupted) เสียงจะเงียบ
function playSound(key) {
  const ctx = getCtx()
  if (!ctx) return
  const snd = SOUNDS.find((s) => s.key === key) || SOUNDS[0]
  const fire = () => { try { playNotes(ctx, snd.build()) } catch (e) { /* ไม่มีเสียงก็ไม่เป็นไร */ } }
  if (ctx.state === 'running') {
    fire()
  } else {
    // suspended (ทั่วไป) หรือ interrupted (iOS หลัง lock/สลับแอป) → ปลุกก่อนแล้วค่อยเล่น
    ctx.resume().then(fire).catch(() => {})
  }
}

export default function ShopApp() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [tab, setTab] = useState('orders')
  const [soundReady, setSoundReady] = useState(false)
  const [soundChoice, setSoundChoice] = useState(() => {
    try { return localStorage.getItem('khuntun_sound') || 'classic' } catch (e) { return 'classic' }
  })
  // ใช้ ref ให้ตัวรับออเดอร์ realtime เห็นค่าเสียงล่าสุดเสมอ
  const soundRef = useRef(soundChoice)
  useEffect(() => { soundRef.current = soundChoice }, [soundChoice])

  // ปลดล็อกเสียง + เล่นตัวอย่างเสียงที่เลือก ให้แม่รู้ว่าเสียงทำงานแล้ว
  function enableSound() {
    playSound(soundChoice)
    setSoundReady(true)
  }

  // เปลี่ยนเสียง + เล่นตัวอย่าง + จำค่าไว้
  function changeSound(key) {
    setSoundChoice(key)
    try { localStorage.setItem('khuntun_sound', key) } catch (e) { /* ไม่เป็นไร */ }
    playSound(key)
    setSoundReady(true)
  }

  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersError, setOrdersError] = useState(false)
  const [alert, setAlert] = useState(null)
  const seenIds = useRef(new Set())

  // ---- auth ----
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  async function loadOrders() {
    setOrdersLoading(true)
    setOrdersError(false)
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) setOrdersError(true)
    else {
      setOrders(data || [])
      seenIds.current = new Set((data || []).map((o) => o.id))
    }
    setOrdersLoading(false)
  }

  // ---- โหลดออเดอร์ + subscribe realtime (เฉพาะเมื่อล็อกอินแล้ว) ----
  useEffect(() => {
    if (!session) return
    loadOrders()

    const channel = supabase
      .channel('orders-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        const o = payload.new
        if (seenIds.current.has(o.id)) return
        seenIds.current.add(o.id)
        setOrders((prev) => [o, ...prev])
        playSound(soundRef.current)
        setAlert(`ออเดอร์ใหม่จาก ${o.customer_name}!`)
        setTimeout(() => setAlert(null), 6000)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        const o = payload.new
        setOrders((prev) => prev.map((x) => (x.id === o.id ? o : x)))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'orders' }, (payload) => {
        const id = payload.old?.id
        if (!id) return
        seenIds.current.delete(id)
        setOrders((prev) => prev.filter((x) => x.id !== id))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [session])

  async function updateStatus(id, newStatus) {
    // อัปเดตทันทีบนจอ (optimistic) แล้วค่อยเขียนกลับ
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o)))
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id)
    if (error) {
      alertReload()
      loadOrders() // sync กลับถ้าพลาด
    }
  }
  function alertReload() {
    setAlert('อัปเดตไม่สำเร็จ เน็ตอาจช้า กำลังโหลดใหม่…')
    setTimeout(() => setAlert(null), 4000)
  }

  // บันทึกข้อความ/ลิงก์ที่แม่พิมพ์ส่งลูกค้าในออเดอร์นั้นๆ (ลูกค้าเห็นในหน้าติดตาม)
  async function updateShopMessage(id, message) {
    const clean = (message || '').trim() || null
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, shop_message: clean } : o)))
    const { error } = await supabase.from('orders').update({ shop_message: clean }).eq('id', id)
    if (error) {
      alertReload()
      loadOrders()
      return false
    }
    setAlert(clean ? 'ส่งข้อความให้ลูกค้าแล้ว ✓' : 'ลบข้อความแล้ว')
    setTimeout(() => setAlert(null), 3000)
    return true
  }

  async function deleteOrder(id) {
    if (!window.confirm('ต้องการลบออเดอร์นี้ถาวรใช่ไหม? (ลบแล้วกู้คืนไม่ได้)')) return
    const prev = orders
    // ลบออกจากจอทันที (optimistic)
    setOrders((cur) => cur.filter((o) => o.id !== id))
    seenIds.current.delete(id)
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (error) {
      setOrders(prev) // ลบไม่สำเร็จ คืนค่ากลับ
      alertReload()
    }
  }

  if (authLoading) {
    return <div className="loading-full"><div className="spinner" /><div>กำลังโหลด…</div></div>
  }

  if (!session) {
    return <Login />
  }

  const waitingCount = orders.filter((o) => o.status !== 'done' && o.status !== 'cancelled').length

  return (
    <div className="shop">
      {alert && <div className="alert-banner">🔔 {alert}</div>}

      <div className="shop-top">
        <h1>ร้านคุณตุ่น</h1>
        <span style={{ fontSize: 14, opacity: .85 }}>Khuntun Shop</span>
        <span className="spacer" />
        <button className={'sound-btn' + (soundReady ? ' on' : '')} onClick={enableSound}>
          {soundReady ? '🔔 เสียงเปิดอยู่' : '🔕 แตะเปิดเสียง'}
        </button>
        <select
          className="sound-select"
          value={soundChoice}
          onChange={(e) => changeSound(e.target.value)}
          title="เลือกเสียงแจ้งเตือน (แตะเพื่อฟังตัวอย่าง)"
        >
          {SOUNDS.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
        <button className="logout-btn" onClick={() => supabase.auth.signOut()}>ออกจากระบบ</button>
      </div>

      <div className="tabbar">
        <button className={'tabbtn' + (tab === 'orders' ? ' active' : '')} onClick={() => setTab('orders')}>
          ออเดอร์{waitingCount > 0 && <span className="badge">{waitingCount}</span>}
        </button>
        <button className={'tabbtn' + (tab === 'menu' ? ' active' : '')} onClick={() => setTab('menu')}>เมนู</button>
        <button className={'tabbtn' + (tab === 'sales' ? ' active' : '')} onClick={() => setTab('sales')}>ยอดขาย</button>
        <button className={'tabbtn' + (tab === 'settings' ? ' active' : '')} onClick={() => setTab('settings')}>ตั้งค่า</button>
      </div>

      <div className="shop-body">
        {tab === 'orders' && (
          <OrdersTab
            orders={orders}
            loading={ordersLoading}
            error={ordersError}
            onReload={loadOrders}
            onUpdateStatus={updateStatus}
            onDeleteOrder={deleteOrder}
            onSendMessage={updateShopMessage}
          />
        )}
        {tab === 'menu' && <MenuTab />}
        {tab === 'sales' && <SalesTab orders={orders} />}
        {tab === 'settings' && <SettingsTab />}
      </div>
    </div>
  )
}
