import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      setErr('อีเมลหรือรหัสผ่านไม่ถูกต้อง ลองใหม่นะคะ')
      setBusy(false)
    }
    // ถ้าสำเร็จ onAuthStateChange จะพาเข้าหน้าออเดอร์เอง
  }

  return (
    <div className="shop">
      <form className="login-box" onSubmit={submit}>
        <h2>ร้านคุณตุ่น</h2>
        <p>Khuntun Shop · เข้าสำหรับร้าน (แม่)</p>
        <label>อีเมล</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" placeholder="อีเมลของร้าน" />
        <label>รหัสผ่าน</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="รหัสผ่าน" />
        {err && <div className="login-err">{err}</div>}
        <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 22 }} disabled={busy || !email || !password}>
          {busy ? 'กำลังเข้า…' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </div>
  )
}
