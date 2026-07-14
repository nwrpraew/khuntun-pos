import { useMemo, useState } from 'react'
import { baht } from '../constants'

// ช่วงเวลาย้อนหลังที่ให้แม่เลือกดู
const RANGES = [
  { key: 1, label: 'วันนี้' },
  { key: 7, label: '7 วัน' },
  { key: 30, label: '30 วัน' },
]

// เช็คว่าออเดอร์อยู่ในช่วง N วันล่าสุดไหม (นับรวมวันนี้)
// days = 1 → เฉพาะวันนี้, days = 7 → วันนี้ + 6 วันก่อนหน้า
function withinDays(iso, days) {
  const d = new Date(iso)
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (days - 1))
  return d >= start
}

export default function SalesTab({ orders }) {
  const [range, setRange] = useState(1)

  const stats = useMemo(() => {
    const inRange = orders.filter((o) => withinDays(o.created_at, range) && o.status !== 'cancelled')
    let sales = 0, drink = 0, fried = 0, delivered = 0
    const bestMap = {}
    for (const o of inRange) {
      sales += o.total || 0
      if (o.status === 'done') delivered += 1
      const items = Array.isArray(o.items) ? o.items : []
      for (const it of items) {
        const line = (it.price || 0) * (it.qty || 0)
        if (it.category === 'fried') fried += line
        else drink += line
        bestMap[it.name] = (bestMap[it.name] || 0) + (it.qty || 0)
      }
    }
    const best = Object.entries(bestMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
    return { count: inRange.length, sales, drink, fried, delivered, best }
  }, [orders, range])

  const rangeLabel = RANGES.find((r) => r.key === range)?.label || 'วันนี้'

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>ยอดขาย</h2>

      <div className="sales-range">
        {RANGES.map((r) => (
          <button
            key={r.key}
            className={'sales-range-btn' + (range === r.key ? ' active' : '')}
            onClick={() => setRange(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="stat-grid">
        <div className="stat"><div className="label">ยอดขายรวม</div><div className="value">{baht(stats.sales)}</div></div>
        <div className="stat"><div className="label">จำนวนออเดอร์</div><div className="value">{stats.count}</div></div>
        <div className="stat"><div className="label">ส่งสำเร็จแล้ว</div><div className="value">{stats.delivered}</div></div>
        <div className="stat"><div className="label">ยอดเครื่องดื่ม</div><div className="value">{baht(stats.drink)}</div></div>
        <div className="stat"><div className="label">ยอดของทอด</div><div className="value">{baht(stats.fried)}</div></div>
      </div>

      <div className="best-list">
        <h3>เมนูขายดี ({rangeLabel})</h3>
        {stats.best.length === 0 ? (
          <div style={{ padding: '12px 0', color: '#8a7f77' }}>ยังไม่มีข้อมูลในช่วงนี้</div>
        ) : (
          stats.best.map(([name, qty], i) => (
            <div className="best-row" key={name}>
              <span>{i + 1}. {name}</span>
              <span style={{ fontWeight: 700 }}>{qty} แก้ว/ที่</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
