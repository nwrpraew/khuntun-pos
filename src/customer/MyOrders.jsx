import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { baht } from '../constants'
import { loadOrderHistory } from './orderStore'

// ป้ายสถานะ (ให้ลูกค้าอ่านเข้าใจง่าย)
const STATUS_LABEL = {
  waiting: 'รอร้านยืนยัน',
  confirmed: 'ร้านรับออเดอร์แล้ว',
  delivering: 'กำลังไปส่ง',
  done: 'ส่งถึงแล้ว',
  cancelled: 'ยกเลิกแล้ว',
}

function fmtDate(o) {
  const ms = o.created_at ? Date.parse(o.created_at) : o.ts
  if (!ms) return ''
  try {
    return new Date(ms).toLocaleString('th-TH', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    })
  } catch (e) { return '' }
}

// สรุปรายการสั้น ๆ จาก items (ถ้ามี) เช่น "ลาเต้ +2 รายการ"
function itemSummary(o) {
  const items = Array.isArray(o.items) ? o.items : null
  if (!items || items.length === 0) return null
  const first = items[0]?.name || 'รายการ'
  const more = items.length - 1
  return more > 0 ? `${first} +อีก ${more} รายการ` : first
}

function OrderRow({ o, onOpen, onReorder }) {
  const label = STATUS_LABEL[o.status] || 'ส่งออเดอร์แล้ว'
  const summary = itemSummary(o)
  const canReorder = Array.isArray(o.items) && o.items.length > 0
  return (
    <div className="hist-row-wrap">
      <button className="hist-row" onClick={() => onOpen(o)}>
        <div className="hist-main">
          <div className="hist-top">
            <span className={'hist-status s-' + (o.status || 'waiting')}>{label}</span>
            <span className="hist-date">{fmtDate(o)}</span>
          </div>
          {summary && <div className="hist-items">{summary}</div>}
          <div className="hist-bottom">
            <span>{o.payment_method === 'qr' ? '📲 โอนผ่าน QR' : '💵 ปลายทาง'}</span>
            {o.total != null && <span className="hist-total">{baht(o.total)}</span>}
            {o.payment_method === 'qr' && !o.slip_url && o.status !== 'cancelled' && (
              <span className="hist-need-slip">ยังไม่ได้แนบสลิป</span>
            )}
          </div>
        </div>
        <span className="hist-go">›</span>
      </button>
      {canReorder && onReorder && (
        <button className="hist-reorder" onClick={() => onReorder(o)}>🔁 สั่งเหมือนเดิม</button>
      )}
    </div>
  )
}

export default function MyOrders({ onOpenOrder, onBack, onReorder }) {
  const [history, setHistory] = useState([])
  const [phone, setPhone] = useState('')
  const [results, setResults] = useState(null) // null = ยังไม่ค้น, [] = ค้นแล้วไม่เจอ
  const [searching, setSearching] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => { setHistory(loadOrderHistory()) }, [])

  async function search() {
    const p = phone.trim()
    if (!p) { setErr('กรุณากรอกเบอร์โทรที่ใช้สั่งนะคะ'); return }
    setErr(null)
    setSearching(true)
    try {
      const { data, error } = await supabase.rpc('orders_by_phone', { p_phone: p })
      if (error) throw error
      setResults(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      setErr('ค้นหาไม่สำเร็จ เน็ตอาจช้า ลองใหม่อีกครั้งนะคะ')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <button className="back-btn" onClick={onBack}>‹</button>
        <h2>ออเดอร์ของฉัน</h2>
      </div>

      {/* ค้นด้วยเบอร์โทร (ดูได้แม้เปลี่ยนเครื่อง/ล้างประวัติ) */}
      <div className="hist-search">
        <div className="hist-search-label">🔎 ค้นออเดอร์ด้วยเบอร์โทร</div>
        <div className="hist-search-row">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="เบอร์ที่ใช้ตอนสั่ง เช่น 08x-xxx-xxxx"
            onKeyDown={(e) => { if (e.key === 'Enter') search() }}
          />
          <button className="btn btn-primary" disabled={searching} onClick={search}>
            {searching ? 'กำลังค้น…' : 'ค้นหา'}
          </button>
        </div>
        {err && <div className="slip-err" style={{ marginTop: 6 }}>{err}</div>}
      </div>

      {results !== null && (
        <div className="hist-section">
          <div className="hist-section-title">ผลการค้นหาเบอร์ {phone.trim()}</div>
          {results.length === 0 ? (
            <div className="hist-empty">ไม่พบออเดอร์ของเบอร์นี้ ลองตรวจเลขอีกครั้งนะคะ</div>
          ) : (
            results.map((o) => <OrderRow key={o.id} o={o} onOpen={onOpenOrder} onReorder={onReorder} />)
          )}
        </div>
      )}

      {/* ประวัติในเครื่องนี้ */}
      <div className="hist-section">
        <div className="hist-section-title">ประวัติในเครื่องนี้</div>
        {history.length === 0 ? (
          <div className="hist-empty">ยังไม่มีประวัติสั่งซื้อในเครื่องนี้</div>
        ) : (
          history.map((o) => <OrderRow key={o.id} o={o} onOpen={onOpenOrder} onReorder={onReorder} />)
        )}
      </div>

      <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={onBack}>
        กลับไปดูเมนู
      </button>
      <div style={{ height: 24 }} />
    </div>
  )
}
