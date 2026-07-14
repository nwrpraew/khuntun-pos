import { useMemo, useState } from 'react'
import { STATUS, NEXT_LABEL, baht } from '../constants'
import { slipUrl } from '../supabaseClient'

const PRIORITY = { waiting: 0, confirmed: 1, delivering: 2, done: 3, cancelled: 4 }

// ออเดอร์ที่ "จบแล้ว" (ส่งแล้ว/ยกเลิก) — เอาไปยุบไว้ในกล่องล่าง
function isFinished(o) {
  return o.status === 'done' || o.status === 'cancelled'
}

// เช็คว่าออเดอร์นี้เป็นของ "วันนี้" ไหม (ใช้ซ่อนออเดอร์ที่เสร็จแล้วของวันก่อนๆ)
function isToday(iso) {
  const d = new Date(iso)
  const n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}

function timeStr(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

export default function OrdersTab({ orders, loading, error, onReload, onUpdateStatus, onDeleteOrder, onSendMessage }) {
  const [showDone, setShowDone] = useState(false)

  const sorted = useMemo(() => {
    return [...orders].sort((a, b) => {
      const pa = PRIORITY[a.status] ?? 9
      const pb = PRIORITY[b.status] ?? 9
      if (pa !== pb) return pa - pb
      return new Date(b.created_at) - new Date(a.created_at)
    })
  }, [orders])

  const active = useMemo(() => sorted.filter((o) => !isFinished(o)), [sorted])
  // ออเดอร์ที่เสร็จแล้ว: แสดงเฉพาะของวันนี้ พอผ่านวันไปแล้วให้หายไปเอง
  const finished = useMemo(() => sorted.filter((o) => isFinished(o) && isToday(o.created_at)), [sorted])

  if (loading) {
    return <div className="loading-full"><div className="spinner" /><div>กำลังโหลดออเดอร์…</div></div>
  }
  if (error) {
    return (
      <div className="loading-full">
        <div>โหลดออเดอร์ไม่สำเร็จ (เน็ตอาจช้า)</div>
        <button className="btn btn-primary btn-lg" style={{ marginTop: 16 }} onClick={onReload}>ลองใหม่</button>
      </div>
    )
  }
  if (sorted.length === 0) {
    return <div className="loading-full">ยังไม่มีออเดอร์ 🕓<br />ออเดอร์ใหม่จะเด้งขึ้นมาที่นี่เอง</div>
  }

  return (
    <div className="orders-wrap">
      {/* ---- บรรทัดที่ 1: ออเดอร์ใหม่ / กำลังทำ ---- */}
      <div className="orders-section-head">
        <span className="oss-title">🔥 ออเดอร์ใหม่ / กำลังทำ</span>
        <span className="oss-count">{active.length}</span>
      </div>
      {active.length === 0 ? (
        <div className="orders-empty">ไม่มีออเดอร์ที่ต้องทำแล้ว เยี่ยมมากค่ะ 🎉</div>
      ) : (
        <div className="order-grid">
          {active.map((o) => (
            <OrderCard key={o.id} order={o} onUpdateStatus={onUpdateStatus} onDeleteOrder={onDeleteOrder} onSendMessage={onSendMessage} />
          ))}
        </div>
      )}

      {/* ---- บรรทัดที่ 2: ออเดอร์ที่เสร็จแล้ว (ยุบ/กางได้) ---- */}
      {finished.length > 0 && (
        <>
          <button
            className={'orders-section-head oss-toggle' + (showDone ? ' open' : '')}
            onClick={() => setShowDone((v) => !v)}
          >
            <span className="oss-title">✅ ออเดอร์ที่เสร็จแล้ว</span>
            <span className="oss-count">{finished.length}</span>
            <span className="oss-chevron">{showDone ? 'ซ่อน ▲' : 'ดู ▼'}</span>
          </button>
          {showDone && (
            <div className="order-grid">
              {finished.map((o) => (
                <OrderCard key={o.id} order={o} onUpdateStatus={onUpdateStatus} onDeleteOrder={onDeleteOrder} onSendMessage={onSendMessage} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function OrderCard({ order, onUpdateStatus, onDeleteOrder, onSendMessage }) {
  const st = STATUS[order.status] || STATUS.waiting
  const items = Array.isArray(order.items) ? order.items : []
  const canCancel = order.status === 'waiting' || order.status === 'confirmed'
  const slipImg = order.payment_method === 'qr' ? slipUrl(order.slip_url) : null

  const [msg, setMsg] = useState(order.shop_message || '')
  const [saving, setSaving] = useState(false)
  const [msgOpen, setMsgOpen] = useState(false)
  // ถ้าข้อความในฐานข้อมูลเปลี่ยน (เช่น sync จากเครื่องอื่น) ให้ช่องพิมพ์ตามค่าล่าสุด
  const savedMsg = order.shop_message || ''
  const dirty = msg.trim() !== savedMsg.trim()

  async function sendMsg() {
    if (!onSendMessage || saving) return
    setSaving(true)
    await onSendMessage(order.id, msg)
    setSaving(false)
  }

  function cancelOrder() {
    if (window.confirm(`ยกเลิกออเดอร์ของ ${order.customer_name} ใช่ไหมคะ?`)) {
      onUpdateStatus(order.id, 'cancelled')
    }
  }

  return (
    <div className={'ocard st-' + order.status}>
      <div className="ocard-head">
        <span className="cust-name">{order.customer_name}</span>
        <span className="stpill" style={{ background: st.color }}>{st.label}</span>
        <span className="time">{timeStr(order.created_at)}</span>
      </div>

      <div className="ocard-info">
        <div>📞 <a className="call" href={`tel:${order.phone}`}>{order.phone}</a></div>
        <div>📍 {order.address}</div>
        {order.note && <div className="ocard-note">📝 {order.note}</div>}
      </div>

      <div className="oitems">
        {items.map((it, i) => (
          <div className="oitem" key={i}>
            <div className="oi-top">
              <span className="oi-qty">×{it.qty}</span>
              <span className="oi-name">{it.name}</span>
            </div>
            {it.options && it.options.length > 0 && (
              <ul className="oi-opts">
                {it.options.map((opt, j) => (
                  <li key={j}>{opt}</li>
                ))}
              </ul>
            )}
            {it.note && <div className="oi-note">📝 {it.note}</div>}
          </div>
        ))}
      </div>

      <div className="ocard-foot">
        <div className={'cod' + (order.payment_method === 'qr' ? ' pay-qr' : '')}>
          {order.payment_method === 'qr' ? '📲 โอนผ่าน QR' : '💵 เก็บเงินปลายทาง'}
          <b>{baht(order.total)}</b>
          {order.delivery_fee > 0 && (
            <span style={{ fontSize: 14 }}>(รวมค่าส่ง {baht(order.delivery_fee)})</span>
          )}
        </div>

        {order.payment_method === 'qr' && (
          slipImg ? (
            <a className="slip-view" href={slipImg} target="_blank" rel="noreferrer">
              <img className="slip-view-thumb" src={slipImg} alt="สลิปโอนเงินจากลูกค้า" />
              <span>🧾 ลูกค้าแนบสลิปแล้ว · แตะดูรูปใหญ่</span>
            </a>
          ) : (
            <div className="slip-none">🧾 ลูกค้ายังไม่ได้แนบสลิป</div>
          )
        )}

        {st.next ? (
          <div className="order-actions">
            <button
              className="status-btn"
              style={{ background: STATUS[st.next].color }}
              onClick={() => onUpdateStatus(order.id, st.next)}
            >
              {NEXT_LABEL[order.status] || 'ถัดไป'}
            </button>
            {canCancel && (
              <button className="cancel-btn" onClick={cancelOrder}>
                ✕ ยกเลิกออเดอร์
              </button>
            )}
          </div>
        ) : order.status === 'cancelled' ? (
          <div className="cancelled-tag">✕ ยกเลิกแล้ว</div>
        ) : (
          <div className="done-tag">✓ ส่งเรียบร้อยแล้ว</div>
        )}

        {onSendMessage && (
          <div className={'send-msg' + (savedMsg ? ' has-msg' : '')}>
            {!msgOpen && !savedMsg ? (
              <button className="send-msg-toggle" onClick={() => setMsgOpen(true)}>
                💬 ส่งลิงก์ / ข้อความให้ลูกค้า
              </button>
            ) : (
              <>
                <div className="send-msg-label">💬 ข้อความ / ลิงก์ถึงลูกค้า (ลูกค้าเห็นในหน้าติดตาม)</div>
                <textarea
                  className="send-msg-input"
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  placeholder="เช่น วางลิงก์สะสมแต้ม โปรโมชั่น หรือข้อความถึงลูกค้าได้เลยค่ะ"
                  rows={2}
                />
                <div className="send-msg-actions">
                  <button className="send-msg-btn" disabled={saving || !dirty} onClick={sendMsg}>
                    {saving ? 'กำลังส่ง…' : savedMsg ? '↻ อัปเดตข้อความ' : '📤 ส่งให้ลูกค้า'}
                  </button>
                  {savedMsg && (
                    <button
                      className="send-msg-clear"
                      disabled={saving}
                      onClick={() => { setMsg(''); onSendMessage(order.id, '') }}
                    >
                      ✕ ลบ
                    </button>
                  )}
                </div>
                {savedMsg && !dirty && <div className="send-msg-ok">✓ ส่งให้ลูกค้าแล้ว</div>}
              </>
            )}
          </div>
        )}

        {onDeleteOrder && (
          <button className="del-order-btn" onClick={() => onDeleteOrder(order.id)}>
            🗑 ลบออเดอร์นี้
          </button>
        )}
      </div>
    </div>
  )
}
