import { useEffect, useRef, useState } from 'react'
import { supabase, imageUrl, slipUrl, loadPaymentQrPath, downloadImage, uploadSlip } from '../supabaseClient'
import { baht } from '../constants'
import { clearLastOrder } from './orderStore'

// ขั้นสถานะที่ลูกค้าเห็น (เรียงตามลำดับ)
const STEPS = [
  { key: 'waiting', title: 'ส่งออเดอร์แล้ว', desc: 'รอร้านคุณตุ่นยืนยันออเดอร์', icon: '📝' },
  { key: 'confirmed', title: 'ร้านรับออเดอร์แล้ว', desc: 'กำลังเตรียมของให้อยู่นะคะ', icon: '👍' },
  { key: 'delivering', title: 'กำลังไปส่ง', desc: 'ร้านออกไปส่งถึงบ้านแล้ว', icon: '🛵' },
  { key: 'done', title: 'ส่งถึงแล้ว', desc: 'ขอบคุณที่อุดหนุนค่ะ 💛', icon: '🎉' },
]
const STEP_INDEX = { waiting: 0, confirmed: 1, delivering: 2, done: 3 }

// แปลงข้อความจากร้านเป็นชิ้นๆ โดยทำ URL ให้กดได้ (ลิงก์เปิดแท็บใหม่)
// ใช้ regex คนละตัวสำหรับ split (มี flag g) กับ test (ไม่มี g) กันบั๊ก lastIndex
const URL_SPLIT_RE = /(https?:\/\/[^\s]+)/g
const URL_TEST_RE = /^https?:\/\/[^\s]+$/
function renderShopMessage(text) {
  return String(text).split(URL_SPLIT_RE).map((part, i) => {
    if (URL_TEST_RE.test(part)) {
      return (
        <a key={i} href={part} target="_blank" rel="noreferrer noopener">{part}</a>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export default function OrderTracker({ orderId, initial, onBackToMenu, onNewOrder }) {
  const [status, setStatus] = useState('waiting')
  const [info, setInfo] = useState(initial || null)
  const [loaded, setLoaded] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [payMethod, setPayMethod] = useState(initial?.payment_method || 'cod')
  const [qrPath, setQrPath] = useState(null)
  const [slipPath, setSlipPath] = useState(initial?.slip_url || null)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState(null)
  const [shopMessage, setShopMessage] = useState(initial?.shop_message || null)
  const fileRef = useRef(null)
  const timerRef = useRef(null)

  async function fetchStatus() {
    if (!orderId) return
    const { data, error } = await supabase.rpc('order_progress', { p_id: orderId })
    if (error) return // เน็ตสะดุด เดี๋ยวรอบหน้าลองใหม่
    const row = Array.isArray(data) ? data[0] : data
    if (!row) { setNotFound(true); setLoaded(true); return }
    setStatus(row.status)
    setInfo((prev) => ({ ...prev, customer_name: row.customer_name, total: row.total }))
    if (row.payment_method) setPayMethod(row.payment_method)
    if (row.slip_url) setSlipPath(row.slip_url)
    setShopMessage(row.shop_message || null)
    setLoaded(true)
  }

  async function onPickSlip(e) {
    const file = e.target.files && e.target.files[0]
    if (fileRef.current) fileRef.current.value = '' // เคลียร์เพื่อให้เลือกไฟล์เดิมซ้ำได้
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setUploadErr('กรุณาเลือกไฟล์รูปภาพนะคะ')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadErr('รูปใหญ่เกินไป (เกิน 8MB) รบกวนถ่ายใหม่หรือย่อรูปก่อนค่ะ')
      return
    }
    setUploadErr(null)
    setUploading(true)
    try {
      const path = await uploadSlip(orderId, file)
      setSlipPath(path)
    } catch (err) {
      console.error(err)
      setUploadErr('อัปโหลดสลิปไม่สำเร็จ เน็ตอาจช้า ลองใหม่อีกครั้งนะคะ')
    } finally {
      setUploading(false)
    }
  }

  // โหลดรูป QR ของร้าน (ใช้แสดงซ้ำถ้าออเดอร์นี้เลือกโอนผ่าน QR)
  useEffect(() => {
    let alive = true
    loadPaymentQrPath().then((p) => { if (alive) setQrPath(p) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    fetchStatus()
    // ถามสถานะซ้ำทุก 8 วินาที (หยุดเมื่อจบ/ยกเลิก)
    timerRef.current = setInterval(fetchStatus, 8000)
    // กลับมาที่แท็บนี้เมื่อไหร่ เช็คทันที
    const onFocus = () => fetchStatus()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(timerRef.current)
      window.removeEventListener('focus', onFocus)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  // หยุดถามซ้ำเมื่อจบงานแล้ว
  useEffect(() => {
    if ((status === 'done' || status === 'cancelled') && timerRef.current) {
      clearInterval(timerRef.current)
    }
  }, [status])

  const cancelled = status === 'cancelled'
  const activeIndex = STEP_INDEX[status] ?? 0
  const qrImg = imageUrl(qrPath)
  const slipImg = slipUrl(slipPath)
  // โชว์ช่องแนบสลิปเมื่อจ่ายผ่าน QR (แนบย้อนหลังได้แม้ปิดออเดอร์แล้ว) ยกเว้นออเดอร์ที่ถูกยกเลิก
  const showSlipBox = payMethod === 'qr' && !cancelled

  return (
    <div className="page">
      <div className="track-wrap">
        {cancelled ? (
          <>
            <div className="track-badge cancel">✕</div>
            <h2 style={{ margin: '0 0 6px' }}>ออเดอร์ถูกยกเลิก</h2>
            <p style={{ color: '#8a7f77', fontSize: 16 }}>
              ขออภัยค่ะ ร้านยกเลิกออเดอร์นี้ (อาจของหมดหรืออยู่นอกพื้นที่ส่ง)
              <br />รบกวนติดต่อร้านคุณตุ่นโดยตรงนะคะ
            </p>
          </>
        ) : (
          <>
            <div className="track-badge">{STEPS[activeIndex].icon}</div>
            <h2 style={{ margin: '0 0 6px' }}>{STEPS[activeIndex].title}</h2>
            <p style={{ color: '#8a7f77', fontSize: 16 }}>{STEPS[activeIndex].desc}</p>

            <div className="track-line">
              {STEPS.map((s, i) => {
                const state = i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'todo'
                return (
                  <div className={'track-step ' + state} key={s.key}>
                    <div className="dot">{state === 'done' ? '✓' : i + 1}</div>
                    <div className="tstep-body">
                      <div className="tstep-title">{s.title}</div>
                      <div className="tstep-desc">{s.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {shopMessage && (
          <div className="shop-msg-box">
            <div className="shop-msg-title">💬 ข้อความจากร้านคุณตุ่น</div>
            <div className="shop-msg-body">{renderShopMessage(shopMessage)}</div>
          </div>
        )}

        {info && (
          <div className="summary" style={{ textAlign: 'left', borderRadius: 14, marginTop: 18 }}>
            {info.customer_name && (
              <div className="row"><span>ผู้รับ</span><span>{info.customer_name}</span></div>
            )}
            {info.address && (
              <div className="row"><span>ที่อยู่</span><span style={{ textAlign: 'right', maxWidth: 220 }}>{info.address}</span></div>
            )}
            {info.total != null && (
              <div className="row total">
                <span>{payMethod === 'qr' ? 'โอนผ่าน QR' : 'เก็บเงินปลายทาง'}</span>
                <span>{baht(info.total)}</span>
              </div>
            )}
          </div>
        )}

        {payMethod === 'qr' && qrImg && status !== 'done' && !cancelled && (
          <div className="qr-pay" style={{ marginTop: 16 }}>
            <div className="qr-pay-label">📲 สแกนจ่ายผ่าน QR พร้อมเพย์</div>
            <img className="qr-pay-img" src={qrImg} alt="QR พร้อมเพย์ร้านคุณตุ่น" />
            {info?.total != null && <div className="qr-pay-amount">ยอดโอน {baht(info.total)}</div>}
            <button type="button" className="btn btn-lg qr-dl-btn" onClick={() => downloadImage(qrImg, 'qr-khuntun.png')}>
              ⬇ บันทึกรูป QR
            </button>
            <div className="qr-pay-hint">ยังไม่ได้โอน? สแกนได้เลย แล้วเก็บสลิปไว้ให้ร้านนะคะ</div>
          </div>
        )}

        {showSlipBox && (
          <div className="slip-box">
            <div className="slip-label">🧾 แนบสลิปโอนเงินให้ร้าน</div>
            {slipImg ? (
              <>
                <a href={slipImg} target="_blank" rel="noreferrer">
                  <img className="slip-thumb" src={slipImg} alt="สลิปที่อัปโหลด" />
                </a>
                <div className="slip-ok">✓ ส่งสลิปให้ร้านแล้ว ขอบคุณค่ะ</div>
              </>
            ) : (
              <div className="slip-hint">โอนแล้วถ่ายรูปสลิป แล้วแนบส่งให้ร้านตรวจได้เลยค่ะ</div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={onPickSlip}
            />
            <button
              type="button"
              className="btn btn-lg slip-btn"
              disabled={uploading}
              onClick={() => fileRef.current && fileRef.current.click()}
            >
              {uploading ? 'กำลังส่งสลิป…' : slipImg ? '↻ เปลี่ยนรูปสลิป' : '📤 อัปโหลดสลิป'}
            </button>
            {uploadErr && <div className="slip-err">{uploadErr}</div>}
          </div>
        )}

        {!loaded && <p style={{ color: '#b3a99f', fontSize: 14, marginTop: 12 }}>กำลังเช็คสถานะ…</p>}
        {notFound && (
          <p style={{ color: '#b3a99f', fontSize: 14, marginTop: 12 }}>ไม่พบออเดอร์นี้แล้ว (อาจถูกลบไปแล้ว)</p>
        )}

        {(status === 'done' || cancelled) && (
          <button
            className="btn btn-primary btn-block btn-lg"
            style={{ marginTop: 20 }}
            onClick={() => { clearLastOrder(); onNewOrder() }}
          >
            สั่งใหม่ / กลับหน้าเมนู
          </button>
        )}
        <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={onBackToMenu}>
          กลับไปดูเมนู
        </button>
      </div>
    </div>
  )
}
