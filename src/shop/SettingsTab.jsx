import { useEffect, useState } from 'react'
import { supabase, imageUrl, PRODUCT_BUCKET, QR_SETTING_KEY, loadPaymentQrPath } from '../supabaseClient'
import { loadShopSettings, saveShopSetting, computeShopOpen, SETTING_KEYS } from '../shopSettings'
import CategoryManager from './CategoryManager'

export default function SettingsTab() {
  const [qrPath, setQrPath] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function load() {
    setLoading(true)
    const path = await loadPaymentQrPath()
    setQrPath(path)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function saveQrPath(path) {
    const { error } = await supabase
      .from('shop_settings')
      .upsert({ key: QR_SETTING_KEY, value: path, updated_at: new Date().toISOString() })
    if (error) throw error
  }

  async function uploadQr(file) {
    if (!file) return
    setUploading(true)
    setErr('')
    setMsg('')
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase()
      const path = `settings/payment-qr-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from(PRODUCT_BUCKET).upload(path, file, {
        upsert: true,
        contentType: file.type || 'image/png',
      })
      if (upErr) throw upErr
      await saveQrPath(path)
      setQrPath(path)
      setMsg('บันทึก QR เรียบร้อยแล้ว ✓ ลูกค้าจะเห็นตอนเลือกโอนจ่าย')
    } catch (e) {
      console.error(e)
      setErr('อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้งนะคะ')
    }
    setUploading(false)
  }

  async function removeQr() {
    if (!window.confirm('เอารูป QR ออกใช่ไหมคะ? ลูกค้าจะเหลือแค่ตัวเลือกเก็บเงินปลายทาง')) return
    setErr('')
    setMsg('')
    try {
      await saveQrPath(null)
      setQrPath(null)
      setMsg('เอารูป QR ออกแล้ว')
    } catch (e) {
      setErr('ลบไม่สำเร็จ ลองใหม่อีกครั้ง')
    }
  }

  const preview = imageUrl(qrPath)

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>ตั้งค่าการจ่ายเงิน</h2>
      <p style={{ color: '#8a7f77', fontSize: 15, marginTop: 4 }}>
        อัปโหลดรูป QR พร้อมเพย์ของร้าน (บันทึกจากแอปธนาคาร) ลูกค้าจะเห็น QR นี้
        เมื่อเลือก “โอนผ่าน QR” ตอนสั่งซื้อ และสแกนจ่ายได้เลย
      </p>

      <div className="qr-setting-card">
        {loading ? (
          <div className="spinner" />
        ) : preview ? (
          <>
            <img className="qr-preview" src={preview} alt="QR พร้อมเพย์ร้าน" />
            <div className="qr-actions">
              <label className="btn btn-lg" style={{ display: 'inline-block' }}>
                {uploading ? 'กำลังอัปโหลด…' : 'เปลี่ยนรูป QR'}
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={(e) => uploadQr(e.target.files?.[0])} />
              </label>
              <button className="btn btn-lg del-order-btn" onClick={removeQr}>เอารูปออก</button>
            </div>
          </>
        ) : (
          <div className="qr-empty">
            <div className="qr-empty-icon">📲</div>
            <p>ยังไม่มีรูป QR<br />อัปโหลดรูป QR พร้อมเพย์เพื่อให้ลูกค้าโอนจ่ายได้</p>
            <label className="btn btn-primary btn-lg" style={{ display: 'inline-block' }}>
              {uploading ? 'กำลังอัปโหลด…' : 'เลือกรูป QR'}
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={(e) => uploadQr(e.target.files?.[0])} />
            </label>
          </div>
        )}

        {msg && <div className="qr-msg ok">{msg}</div>}
        {err && <div className="qr-msg err">{err}</div>}
      </div>

      <ShopStatusCard />

      <CategoryManager />
    </div>
  )
}

function ShopStatusCard() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [f, setF] = useState({
    hoursEnabled: false,
    openTime: '08:00',
    closeTime: '18:00',
    forceClosed: false,
    closedMsg: '',
    contactPhone: '',
    contactLine: '',
  })

  useEffect(() => {
    loadShopSettings().then((s) => {
      setF({
        hoursEnabled: s[SETTING_KEYS.hoursEnabled] === '1',
        openTime: s[SETTING_KEYS.openTime] || '08:00',
        closeTime: s[SETTING_KEYS.closeTime] || '18:00',
        forceClosed: s[SETTING_KEYS.forceClosed] === '1',
        closedMsg: s[SETTING_KEYS.closedMsg] || '',
        contactPhone: s[SETTING_KEYS.contactPhone] || '',
        contactLine: s[SETTING_KEYS.contactLine] || '',
      })
      setLoading(false)
    })
  }, [])

  async function save() {
    setSaving(true)
    setErr('')
    setMsg('')
    try {
      await Promise.all([
        saveShopSetting(SETTING_KEYS.hoursEnabled, f.hoursEnabled ? '1' : '0'),
        saveShopSetting(SETTING_KEYS.openTime, f.openTime),
        saveShopSetting(SETTING_KEYS.closeTime, f.closeTime),
        saveShopSetting(SETTING_KEYS.forceClosed, f.forceClosed ? '1' : '0'),
        saveShopSetting(SETTING_KEYS.closedMsg, f.closedMsg.trim()),
        saveShopSetting(SETTING_KEYS.contactPhone, f.contactPhone.trim()),
        saveShopSetting(SETTING_KEYS.contactLine, f.contactLine.trim()),
      ])
      setMsg('บันทึกเรียบร้อยแล้ว ✓')
    } catch (e) {
      console.error(e)
      setErr('บันทึกไม่สำเร็จ ลองใหม่อีกครั้งนะคะ')
    }
    setSaving(false)
  }

  const preview = computeShopOpen({
    [SETTING_KEYS.hoursEnabled]: f.hoursEnabled ? '1' : '0',
    [SETTING_KEYS.openTime]: f.openTime,
    [SETTING_KEYS.closeTime]: f.closeTime,
    [SETTING_KEYS.forceClosed]: f.forceClosed ? '1' : '0',
  })

  if (loading) return <div className="qr-setting-card"><div className="spinner" /></div>

  return (
    <div style={{ marginTop: 28 }}>
      <h2 style={{ marginTop: 0 }}>สถานะร้าน & การติดต่อ</h2>
      <p style={{ color: '#8a7f77', fontSize: 15, marginTop: 4 }}>
        ตั้งเวลาเปิด-ปิดอัตโนมัติ หรือกดปิดร้านชั่วคราวเมื่อไม่พร้อมรับออเดอร์
      </p>

      <div className="qr-setting-card" style={{ textAlign: 'left' }}>
        <div className={'shop-state-pill ' + (preview.open ? 'open' : 'closed')}>
          {preview.open ? '🟢 ตอนนี้ลูกค้าสั่งได้' : '🔴 ตอนนี้ร้านปิดรับออเดอร์'}
        </div>

        <label className="set-toggle">
          <input type="checkbox" checked={f.forceClosed}
            onChange={(e) => setF({ ...f, forceClosed: e.target.checked })} />
          <span>ปิดร้านชั่วคราวเดี๋ยวนี้ (ทับเวลาเปิด-ปิด)</span>
        </label>

        <label className="set-toggle">
          <input type="checkbox" checked={f.hoursEnabled}
            onChange={(e) => setF({ ...f, hoursEnabled: e.target.checked })} />
          <span>เปิด-ปิดอัตโนมัติตามเวลา</span>
        </label>

        {f.hoursEnabled && (
          <div className="set-hours">
            <div className="field">
              <label>เวลาเปิด</label>
              <input type="time" value={f.openTime} onChange={(e) => setF({ ...f, openTime: e.target.value })} />
            </div>
            <div className="field">
              <label>เวลาปิด</label>
              <input type="time" value={f.closeTime} onChange={(e) => setF({ ...f, closeTime: e.target.value })} />
            </div>
          </div>
        )}

        <div className="field">
          <label>ข้อความตอนร้านปิด (ไม่บังคับ)</label>
          <input value={f.closedMsg} onChange={(e) => setF({ ...f, closedMsg: e.target.value })}
            placeholder="เช่น วันนี้หยุด 1 วันนะคะ พรุ่งนี้เปิดปกติ" />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #ece3d9', margin: '16px 0' }} />

        <div className="field">
          <label>เบอร์โทรร้าน (ให้ลูกค้ากดโทรได้)</label>
          <input value={f.contactPhone} onChange={(e) => setF({ ...f, contactPhone: e.target.value })}
            inputMode="tel" placeholder="เช่น 081-234-5678" />
        </div>
        <div className="field">
          <label>LINE ร้าน (ไอดี เช่น @khuntun หรือวางลิงก์ LINE)</label>
          <input value={f.contactLine} onChange={(e) => setF({ ...f, contactLine: e.target.value })}
            placeholder="@khuntun หรือ https://line.me/..." />
        </div>

        <button className="btn btn-primary btn-lg" style={{ marginTop: 8 }} disabled={saving} onClick={save}>
          {saving ? 'กำลังบันทึก…' : 'บันทึกการตั้งค่า'}
        </button>

        {msg && <div className="qr-msg ok">{msg}</div>}
        {err && <div className="qr-msg err">{err}</div>}
      </div>
    </div>
  )
}
