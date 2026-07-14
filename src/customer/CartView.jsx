import { useEffect, useState } from 'react'
import { supabase, imageUrl, loadPaymentQrPath, downloadImage } from '../supabaseClient'
import { MIN_ORDER, DELIVERY_FEE, baht } from '../constants'
import { newOrderId, saveLastOrder, addOrderToHistory } from './orderStore'

// จำข้อมูลลูกค้าไว้ในเครื่อง (เครื่องเดิม/เบราว์เซอร์เดิม) เพื่อไม่ต้องกรอกใหม่ทุกครั้ง
const CUSTOMER_KEY = 'khuntun_customer'
function loadSavedCustomer() {
  try {
    const raw = localStorage.getItem(CUSTOMER_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (e) { return null }
}

export default function CartView({ cart, setCart, totals, onBack, onDone, showToast, toast, shopOpen = true, closedMsg }) {
  const saved = loadSavedCustomer()
  const [form, setForm] = useState({
    name: saved?.name || '',
    phone: saved?.phone || '',
    address: saved?.address || '',
    note: '', // หมายเหตุไม่จำ เพราะเปลี่ยนทุกออเดอร์
  })
  const [remembered, setRemembered] = useState(!!saved)
  const [submitting, setSubmitting] = useState(false)
  const [payMethod, setPayMethod] = useState('cod') // 'cod' = เก็บปลายทาง, 'qr' = โอนผ่าน QR
  const [qrPath, setQrPath] = useState(null)
  const [step, setStep] = useState('items') // 'items' = ดูรายการ, 'checkout' = กรอกข้อมูล+ชำระเงิน

  // โหลดรูป QR พร้อมเพย์ของร้าน (ถ้าแม่ตั้งไว้) เพื่อโชว์ตอนเลือกโอนจ่าย
  useEffect(() => {
    let alive = true
    loadPaymentQrPath().then((p) => { if (alive) setQrPath(p) })
    return () => { alive = false }
  }, [])

  // เลื่อนขึ้นบนสุดทุกครั้งที่เปิดตะกร้า/สลับขั้น (กันค้างตำแหน่งเลื่อนจากหน้าเมนู)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [step])
  const qrImg = imageUrl(qrPath)

  function forgetCustomer() {
    try { localStorage.removeItem(CUSTOMER_KEY) } catch (e) { /* ไม่เป็นไร */ }
    setForm({ name: '', phone: '', address: '', note: '' })
    setRemembered(false)
  }

  function setQty(key, delta) {
    setCart((prev) =>
      prev
        .map((it) => (it.key === key ? { ...it, qty: it.qty + delta } : it))
        .filter((it) => it.qty > 0)
    )
  }

  const canSubmit =
    cart.length > 0 &&
    form.name.trim() &&
    form.phone.trim() &&
    form.address.trim() &&
    !submitting

  async function submit() {
    if (!shopOpen) {
      showToast(closedMsg || 'ขณะนี้ร้านปิดรับออเดอร์ชั่วคราวค่ะ', 'err')
      return
    }
    if (!canSubmit) {
      showToast('กรุณากรอกชื่อ เบอร์ และที่อยู่ให้ครบ', 'err')
      return
    }
    setSubmitting(true) // กันกดซ้ำ
    try {
      // เช็คว่าเมนูในตะกร้ายังเปิดขายอยู่ไหม (กันเมนูถูกปิดระหว่างสั่ง)
      const ids = [...new Set(cart.map((it) => it.product_id))]
      const { data: fresh, error: checkErr } = await supabase
        .from('products')
        .select('id, name, is_available')
        .in('id', ids)
      if (checkErr) throw checkErr

      const availableIds = new Set((fresh || []).filter((p) => p.is_available).map((p) => p.id))
      const soldOut = cart.filter((it) => !availableIds.has(it.product_id))
      if (soldOut.length > 0) {
        const names = soldOut.map((it) => it.name).join(', ')
        setCart((prev) => prev.filter((it) => availableIds.has(it.product_id)))
        showToast(`ขออภัย เมนู "${names}" เพิ่งปิดขาย ระบบนำออกให้แล้ว`, 'err')
        setSubmitting(false)
        return
      }

      const items = cart.map((it) => ({
        product_id: it.product_id,
        name: it.name,
        category: it.category,
        options: it.options,
        note: it.note || null,
        price: it.price,
        qty: it.qty,
      }))

      // สร้างเลขออเดอร์ฝั่งลูกค้า เพื่อให้ลูกค้าติดตามสถานะออเดอร์ตัวเองได้
      const orderId = newOrderId()
      const payload = {
        id: orderId,
        customer_name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        note: form.note.trim() || null,
        items,
        subtotal: totals.subtotal,
        delivery_fee: totals.deliveryFee,
        total: totals.total,
        status: 'waiting',
        payment_method: qrImg ? payMethod : 'cod',
      }

      const { error } = await supabase.from('orders').insert(payload)
      if (error) throw error

      // จำข้อมูลลูกค้าไว้ในเครื่องสำหรับครั้งถัดไป
      try {
        localStorage.setItem(CUSTOMER_KEY, JSON.stringify({
          name: payload.customer_name,
          phone: payload.phone,
          address: payload.address,
        }))
      } catch (e) { /* จำไม่ได้ก็ไม่เป็นไร */ }

      // จำออเดอร์ล่าสุดไว้ให้กลับมาติดตามสถานะได้ (24 ชม.)
      saveLastOrder({
        id: orderId,
        customer_name: payload.customer_name,
        address: payload.address,
        total: payload.total,
      })

      // บันทึกลงประวัติสั่งซื้อในเครื่อง (ไว้ให้ย้อนดู/แนบสลิปทีหลัง)
      addOrderToHistory({
        id: orderId,
        customer_name: payload.customer_name,
        phone: payload.phone,
        total: payload.total,
        payment_method: payload.payment_method,
        status: 'waiting',
        items,
      })

      onDone({
        id: orderId,
        customer_name: payload.customer_name,
        address: payload.address,
        subtotal: payload.subtotal,
        delivery_fee: payload.delivery_fee,
        total: payload.total,
        payment_method: payload.payment_method,
      })
    } catch (e) {
      console.error(e)
      showToast('ส่งออเดอร์ไม่สำเร็จ เน็ตอาจช้า ลองกดอีกครั้งนะคะ', 'err')
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      {toast && <div className={'toast ' + toast.kind}>{toast.msg}</div>}

      <div className="page-head">
        <button className="back-btn" onClick={step === 'checkout' ? () => setStep('items') : onBack}>‹</button>
        <h2>{step === 'checkout' ? 'ยืนยันออเดอร์' : 'ตะกร้าของฉัน'}</h2>
      </div>

      {cart.length === 0 ? (
        <div className="empty">
          <p>ยังไม่มีสินค้าในตะกร้า</p>
          <button className="btn btn-primary" onClick={onBack}>เลือกเมนู</button>
        </div>
      ) : step === 'items' ? (
        <>
          {cart.map((it) => (
            <div className="citem" key={it.key}>
              <div style={{ flex: 1 }}>
                <div className="ci-name">{it.name}</div>
                {it.options.length > 0 && (
                  <ul className="ci-opts">
                    {it.options.map((opt, i) => (
                      <li key={i}>{opt}</li>
                    ))}
                  </ul>
                )}
                {it.note && <div className="ci-note">📝 {it.note}</div>}
                <div className="ci-price">{baht(it.price * it.qty)}</div>
              </div>
              <div className="ci-qty">
                <button className="mini-btn" onClick={() => setQty(it.key, -1)}>−</button>
                <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{it.qty}</span>
                <button className="mini-btn" onClick={() => setQty(it.key, +1)}>＋</button>
              </div>
            </div>
          ))}

          {totals.deliveryFee > 0 && (
            <div className="notice">
              ยอดสั่งยังไม่ถึง {baht(MIN_ORDER)} จึงมีค่าส่ง {baht(DELIVERY_FEE)}
              <br />สั่งเพิ่มอีก {baht(MIN_ORDER - totals.subtotal)} เพื่อส่งฟรี
            </div>
          )}

          <div className="summary">
            <div className="row"><span>ยอดรวมสินค้า</span><span>{baht(totals.subtotal)}</span></div>
            <div className="row"><span>ค่าส่ง</span><span>{totals.deliveryFee > 0 ? baht(totals.deliveryFee) : 'ฟรี'}</span></div>
            <div className="row total"><span>ยอดที่ต้องชำระ</span><span>{baht(totals.total)}</span></div>
          </div>

          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: 520, margin: '0 auto', background: '#fff', borderTop: '1px solid #ece3d9', padding: '12px 16px calc(12px + env(safe-area-inset-bottom))' }}>
            <button className="btn btn-primary btn-block btn-lg" onClick={() => setStep('checkout')}>
              ถัดไป · กรอกข้อมูลจัดส่ง
            </button>
          </div>
          <div style={{ height: 90 }} />
        </>
      ) : (
        <>
          <div className="summary">
            <div className="row total"><span>ยอดที่ต้องชำระ</span><span>{baht(totals.total)}</span></div>
          </div>

          <h3 style={{ padding: '8px 16px 0', margin: 0 }}>ข้อมูลจัดส่ง</h3>
          {remembered && (
            <div className="remember-hint">
              ✓ กรอกข้อมูลเดิมให้แล้ว ตรวจสอบได้เลยค่ะ
              <button type="button" onClick={forgetCustomer}>ล้างข้อมูล</button>
            </div>
          )}
          <div className="field">
            <label>ชื่อผู้รับ <span className="req">*</span></label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label>เบอร์โทร <span className="req">*</span></label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" placeholder="08x-xxx-xxxx" />
          </div>
          <div className="field">
            <label>บ้านเลขที่ / ที่อยู่ + จุดสังเกต <span className="req">*</span></label>
            <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="เช่น บ้านเลขที่ 42/1 ซอย 3 บ้านหลังคาสีฟ้า ตรงข้ามร้านชำ" />
          </div>
          <div className="field">
            <label>หมายเหตุถึงร้าน</label>
            <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="เช่น หวานน้อยทุกแก้ว / โทรก่อนถึง" />
          </div>

          <h3 style={{ padding: '8px 16px 0', margin: 0 }}>วิธีชำระเงิน</h3>
          {qrImg ? (
            <div className="paybox">
              <button
                type="button"
                className={'payopt' + (payMethod === 'cod' ? ' active' : '')}
                onClick={() => setPayMethod('cod')}
              >
                <span className="payopt-radio" />
                <span className="payopt-body">
                  <span className="payopt-title">💵 เก็บเงินปลายทาง</span>
                  <span className="payopt-sub">จ่ายเงินสดกับร้านตอนรับของ</span>
                </span>
              </button>
              <button
                type="button"
                className={'payopt' + (payMethod === 'qr' ? ' active' : '')}
                onClick={() => setPayMethod('qr')}
              >
                <span className="payopt-radio" />
                <span className="payopt-body">
                  <span className="payopt-title">📲 โอนผ่าน QR พร้อมเพย์</span>
                  <span className="payopt-sub">สแกนจ่ายก่อน แล้วเก็บสลิปไว้ให้ร้าน</span>
                </span>
              </button>

              {payMethod === 'qr' && (
                <div className="qr-pay">
                  <img className="qr-pay-img" src={qrImg} alt="QR พร้อมเพย์ร้านคุณตุ่น" />
                  <div className="qr-pay-amount">ยอดโอน {baht(totals.total)}</div>
                  <button
                    type="button"
                    className="btn btn-lg qr-dl-btn"
                    onClick={() => downloadImage(qrImg, 'qr-khuntun.png')}
                  >
                    ⬇ บันทึกรูป QR
                  </button>
                  <div className="qr-pay-hint">
                    สแกน QR ด้วยแอปธนาคารเพื่อโอน แล้วกดยืนยันสั่งซื้อ
                    <br />รบกวนเก็บสลิปไว้แสดงให้ร้านตอนรับของนะคะ
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '8px 16px 4px', color: '#8a7f77', fontSize: 14 }}>
              💵 ชำระเงินสดปลายทางกับร้านเมื่อรับสินค้า
            </div>
          )}

          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: 520, margin: '0 auto', background: '#fff', borderTop: '1px solid #ece3d9', padding: '12px 16px calc(12px + env(safe-area-inset-bottom))' }}>
            {!shopOpen && (
              <div className="closed-note">🔴 {closedMsg || 'ขณะนี้ร้านปิดรับออเดอร์ชั่วคราว'}</div>
            )}
            <button className="btn btn-primary btn-block btn-lg" disabled={!canSubmit || !shopOpen} onClick={submit}>
              {submitting ? 'กำลังส่งออเดอร์…' : !shopOpen ? 'ร้านปิดรับออเดอร์ชั่วคราว' : `ยืนยันสั่งซื้อ · ${baht(totals.total)}`}
            </button>
          </div>
          <div style={{ height: 90 }} />
        </>
      )}
    </div>
  )
}
