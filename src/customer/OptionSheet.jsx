import { useMemo, useState } from 'react'
import { imageUrl } from '../supabaseClient'
import {
  SWEET_OPTIONS,
  TOPPINGS,
  SAUCES,
  FILLINGS,
  CATEGORY_COLOR,
  baht,
} from '../constants'
import { defaultSelection, unitPrice } from '../lib/pricing'

// แผ่นเลือกตัวเลือก (bottom sheet)
export default function OptionSheet({ product, color: catColor, onClose, onAdd }) {
  const [sel, setSel] = useState(() => defaultSelection(product))
  const price = useMemo(() => unitPrice(product, sel), [product, sel])
  const img = imageUrl(product.image_url)
  const color = catColor || CATEGORY_COLOR[product.category] || '#e07a3f'

  function toggleTopping(key) {
    setSel((s) => {
      const has = s.toppings.includes(key)
      return { ...s, toppings: has ? s.toppings.filter((k) => k !== key) : [...s.toppings, key] }
    })
  }

  // แสดงตัวเลือกอุณหภูมิเฉพาะเมนูที่เลือกเย็น/ปั่นได้
  const showTemp = product.blendable && !product.is_hot && !product.is_blend

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          {img ? (
            <img src={img} alt={product.name} />
          ) : (
            <div className="noimg" style={{ background: color }}>{product.name.slice(0, 1)}</div>
          )}
          <div>
            <div className="st-name">{product.name}</div>
            <div style={{ color: '#8a7f77' }}>เริ่มต้น {baht(product.base_price)}</div>
          </div>
          <button className="sheet-close" onClick={onClose} aria-label="ปิด">×</button>
        </div>

        <div className="sheet-body">
          {/* อุณหภูมิ */}
          {showTemp && (
            <div className="opt-group">
              <h4>ประเภท</h4>
              <div className="opt-row">
                <button className={'opt' + (sel.temp === 'iced' ? ' sel' : '')} onClick={() => setSel({ ...sel, temp: 'iced' })}>เย็น</button>
                <button className={'opt' + (sel.temp === 'blend' ? ' sel' : '')} onClick={() => setSel({ ...sel, temp: 'blend' })}>
                  ปั่น <span className="plus">+10</span>
                </button>
              </div>
            </div>
          )}
          {product.is_hot && (
            <div className="opt-group"><h4>ประเภท</h4><div className="opt-row"><button className="opt sel" disabled>ร้อน</button></div></div>
          )}
          {product.is_blend && (
            <div className="opt-group"><h4>ประเภท</h4><div className="opt-row"><button className="opt sel" disabled>ปั่น</button></div></div>
          )}

          {/* ความหวาน */}
          {product.has_sweet && (
            <div className="opt-group">
              <h4>ความหวาน</h4>
              <div className="opt-row">
                {SWEET_OPTIONS.map((o) => (
                  <button key={o.key} className={'opt' + (sel.sweet === o.key ? ' sel' : '')} onClick={() => setSel({ ...sel, sweet: o.key })}>
                    {o.label}{o.surcharge > 0 && <span className="plus">+{o.surcharge}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ท็อปปิ้ง */}
          {product.has_toppings && (
            <div className="opt-group">
              <h4>ท็อปปิ้ง (เลือกได้หลายอย่าง)</h4>
              <div className="opt-row">
                {TOPPINGS.map((o) => (
                  <button key={o.key} className={'opt' + (sel.toppings.includes(o.key) ? ' sel' : '')} onClick={() => toggleTopping(o.key)}>
                    {o.label}<span className="plus">+{o.surcharge}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ไส้ (พิซซ่าเวียดนาม) */}
          {product.has_filling && (
            <div className="opt-group">
              <h4>เลือกไส้</h4>
              <div className="opt-row">
                {FILLINGS.map((o) => (
                  <button key={o.key} className={'opt' + (sel.filling === o.key ? ' sel' : '')} onClick={() => setSel({ ...sel, filling: o.key })}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* เพิ่มชีส */}
          {product.has_cheese && (
            <div className="opt-group">
              <h4>เพิ่มพิเศษ</h4>
              <div className="opt-row">
                <button className={'opt' + (sel.cheese ? ' sel' : '')} onClick={() => setSel({ ...sel, cheese: !sel.cheese })}>
                  เพิ่มชีส<span className="plus">+20</span>
                </button>
              </div>
            </div>
          )}

          {/* ซอสราด */}
          {product.has_dip && (
            <div className="opt-group">
              <h4>ซอสราด</h4>
              <div className="opt-row">
                {SAUCES.map((o) => (
                  <button key={o.key} className={'opt' + (sel.sauce === o.key ? ' sel' : '')} onClick={() => setSel({ ...sel, sauce: o.key })}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* หมายเหตุแยกรายแก้ว */}
          <div className="opt-group">
            <h4>หมายเหตุแก้วนี้ (ถ้ามี)</h4>
            <textarea
              className="item-note"
              value={sel.note}
              onChange={(e) => setSel((s) => ({ ...s, note: e.target.value }))}
              placeholder="เช่น หวานน้อยพิเศษ / ไม่ใส่หลอด / แยกน้ำแข็ง"
              rows={2}
            />
          </div>

          {/* จำนวน */}
          <div className="qty-row">
            <span style={{ fontWeight: 600 }}>จำนวน</span>
            <button className="qty-btn" onClick={() => setSel((s) => ({ ...s, qty: Math.max(1, s.qty - 1) }))}>−</button>
            <span className="qty-num">{sel.qty}</span>
            <button className="qty-btn" onClick={() => setSel((s) => ({ ...s, qty: s.qty + 1 }))}>＋</button>
          </div>
        </div>

        <div className="sheet-foot">
          <button className="btn btn-primary btn-block btn-lg" onClick={() => onAdd(sel)}>
            เพิ่มลงตะกร้า · {baht(price * sel.qty)}
          </button>
        </div>
      </div>
    </div>
  )
}
