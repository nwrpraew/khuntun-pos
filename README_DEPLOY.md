# ร้านคุณตุ่น — คู่มือติดตั้งและขึ้นระบบ (ทีละขั้น)

ระบบสั่งเครื่องดื่ม & ของทอดออนไลน์ 2 ฝั่ง
- `/` = ฝั่งลูกค้า (เปิดบนมือถือ ไม่ต้องล็อกอิน)
- `/shop` = ฝั่งแม่ (เปิดบน iPad ต้องล็อกอิน)

เทคโนโลยี: React + Vite (frontend) · Supabase (ฐานข้อมูล + Realtime + Storage + Auth) · Vercel (deploy)

---

## สิ่งที่ต้องมีก่อนเริ่ม
- บัญชี [Supabase](https://supabase.com) (ฟรี)
- บัญชี [Vercel](https://vercel.com) (ฟรี)
- บัญชี [GitHub](https://github.com) (สำหรับต่อกับ Vercel — ง่ายสุด)
- Node.js 18+ ถ้าอยากลองรันในเครื่องก่อน (ไม่บังคับ)

---

## ขั้นที่ 1 — สร้างโปรเจกต์ Supabase
1. เข้า https://supabase.com → **New project**
2. ตั้งชื่อ เช่น `khuntun-shop` เลือก Region ใกล้ไทยที่สุด (**Southeast Asia (Singapore)**)
3. ตั้ง **Database Password** แล้วเก็บไว้ (ไม่ต้องใช้บ่อย แต่อย่าลืม)
4. กด **Create new project** รอสักครู่จนขึ้นเขียว

## ขั้นที่ 2 — รัน SQL สร้างตาราง + ความปลอดภัย + เมนู
1. เมนูซ้าย → **SQL Editor** → **New query**
2. เปิดไฟล์ `supabase/schema.sql` ในโปรเจกต์นี้ คัดลอกทั้งหมดมาวาง → กด **Run**
   - ไฟล์นี้จะสร้างตาราง `products`, `orders`, ตั้ง Row Level Security, เปิด Realtime และสร้าง Storage bucket `product-images` ให้อัตโนมัติ
3. เปิด **New query** อีกอัน → วางเนื้อหาไฟล์ `supabase/seed.sql` ทั้งหมด → **Run**
   - ไฟล์นี้จะใส่เมนูจริงทั้งหมดของร้าน (เครื่องดื่ม + ของทอด)
4. ตรวจว่าเมนูเข้าแล้ว: เมนูซ้าย → **Table Editor** → เปิดตาราง `products` ควรเห็นรายการเมนู

> ถ้าต้องการอัปเดตเมนูใหม่ทั้งหมดในอนาคต รัน `seed.sql` ซ้ำได้ (มันจะล้างตาราง products แล้วใส่ใหม่ — ไม่กระทบออเดอร์)

## ขั้นที่ 3 — ตรวจ Storage bucket
- เมนูซ้าย → **Storage** ควรเห็น bucket ชื่อ **product-images** และเป็น **Public**
- ถ้าไม่มี ให้กด **New bucket** ชื่อ `product-images` แล้วติ๊ก **Public bucket**
- (ปกติ schema.sql สร้างให้แล้ว ขั้นนี้แค่ตรวจ)

## ขั้นที่ 4 — สร้างบัญชีล็อกอินให้แม่
ฝั่ง `/shop` ต้องล็อกอินด้วยอีเมล + รหัสผ่าน
1. เมนูซ้าย → **Authentication** → **Users** → **Add user** → **Create new user**
2. ใส่ **Email** (เช่น `mae@khuntun.shop` — ใช้อีเมลอะไรก็ได้ที่จำง่าย) และ **Password** ที่ตั้งเอง
3. ติ๊ก **Auto Confirm User** (สำคัญ! เพื่อให้ล็อกอินได้เลยโดยไม่ต้องยืนยันอีเมล) → **Create user**
4. รหัสนี้แหละที่แม่จะใช้เข้าหน้า `/shop`

> อยากปิดไม่ให้ใครสมัครเองเพิ่ม: **Authentication → Providers → Email** ปิด **Allow new users to sign up**

## ขั้นที่ 5 — เอาค่า API ของ Supabase
- เมนูซ้าย → **Project Settings** → **API**
- คัดลอก 2 ค่านี้ไว้:
  - **Project URL** → จะใช้เป็น `VITE_SUPABASE_URL`
  - **anon public** key → จะใช้เป็น `VITE_SUPABASE_ANON_KEY`

---

## ขั้นที่ 6 — (ไม่บังคับ) ลองรันในเครื่องก่อน
```bash
npm install
cp .env.example .env      # แล้วแก้ค่าในไฟล์ .env ให้เป็นค่าจริงจากขั้นที่ 5
npm run dev
```
เปิด http://localhost:5173/ (ลูกค้า) และ http://localhost:5173/shop (แม่)

---

## ขั้นที่ 7 — ขึ้น Vercel
วิธีง่ายสุด (ผ่าน GitHub):
1. อัปโค้ดขึ้น GitHub repo ใหม่ (เช่น `khuntun-shop`)
2. เข้า https://vercel.com → **Add New → Project** → เลือก repo นั้น
3. Vercel จะตรวจเจอ Vite อัตโนมัติ (Framework Preset = **Vite**, Build = `npm run build`, Output = `dist`)
4. กด **Environment Variables** ใส่ 2 ตัว:

   | Name | Value |
   |------|-------|
   | `VITE_SUPABASE_URL` | Project URL จากขั้นที่ 5 |
   | `VITE_SUPABASE_ANON_KEY` | anon public key จากขั้นที่ 5 |

5. กด **Deploy** รอจนเสร็จ จะได้ลิงก์ เช่น `https://khuntun-shop.vercel.app`

> ไฟล์ `vercel.json` ในโปรเจกต์นี้ตั้ง rewrite ให้ทุก path ชี้ไป index.html แล้ว — ทำให้เปิด `/shop` ตรง ๆ ได้โดยไม่ 404

> แก้ env ทีหลังได้ที่ **Project → Settings → Environment Variables** (แก้แล้วต้อง **Redeploy**)

---

## ขั้นที่ 8 — แยกลิงก์ 2 ฝั่ง และส่งให้ลูกค้า

หลัง deploy จะได้โดเมนเดียว เช่น `https://khuntun-shop.vercel.app` แล้วแยกด้วย path:

| ใคร | ลิงก์ | เปิดที่ |
|-----|------|--------|
| **ลูกค้า** | `https://khuntun-shop.vercel.app/` | มือถือลูกค้า |
| **แม่ (ร้าน)** | `https://khuntun-shop.vercel.app/shop` | iPad ของร้าน |

**บน iPad ของแม่:** เปิด `/shop` ใน Safari → กดปุ่มแชร์ → **เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)** จะได้ไอคอนเปิดเต็มจอเหมือนแอป และล็อกอินค้างไว้ (ไม่ต้องพิมพ์รหัสทุกครั้ง)

### ส่งลิงก์ร้านให้ลูกค้าผ่าน LINE
มี 2 วิธี:

1. **แชร์ลิงก์ตรง ๆ (ง่ายสุด)**
   - ส่งข้อความในกลุ่ม/แชทลูกค้าว่า: “สั่งเครื่องดื่มร้านคุณตุ่นได้ที่ 👉 https://khuntun-shop.vercel.app/ เก็บเงินปลายทางค่ะ”
   - ปักหมุด/ตั้งเป็นข้อความต้อนรับได้

2. **ตั้ง Rich Menu ใน LINE Official Account (ดูมืออาชีพขึ้น)**
   - สมัคร LINE Official Account ที่ https://www.linebiz.com/th/ (มีแพ็กฟรี)
   - เข้า **LINE Official Account Manager** → **Rich menu** → **Create**
   - ออกแบบปุ่มใหญ่ ๆ เช่น “🛒 สั่งเครื่องดื่ม”
   - ตั้ง Action ของปุ่มเป็น **Link (เปิด URL)** ใส่ `https://khuntun-shop.vercel.app/`
   - เปิดใช้งาน Rich menu — ลูกค้าที่แอดร้านจะเห็นปุ่มค้างด้านล่างแชท กดแล้วเข้าเว็บสั่งได้เลย
   - แนะนำ: ตั้งข้อความตอบรับอัตโนมัติ (Greeting) แนบลิงก์ด้วย

> อย่าเอาลิงก์ `/shop` ไปให้ลูกค้า — ให้เฉพาะ iPad ของร้าน ลูกค้าเข้าไม่ได้อยู่แล้วเพราะต้องล็อกอิน แต่กันไว้ดีกว่า

---

## กฎราคา/ตัวเลือกที่ระบบคิดให้อัตโนมัติ
- เมนูที่ปั่นได้ เลือก “ปั่น” → **+10 บาท**
- ความหวาน “หวานมาก” → **+10 บาท**
- ท็อปปิ้ง: ไข่มุกบราวน์ชูก้าร์ **+10**, เยลลี่ **+10**, โอวัลตินเฟล็ค **+10**, วิปครีม **+15**
- ยอดสั่งไม่ถึง **40 บาท** → คิดค่าส่ง **+10 บาท** (แสดงในตะกร้า)
- ของทอด (ตามโปสเตอร์ร้าน): เปาะเปี๊ยะทอด 50, กุยช่ายทอด 50, ปูอัดชุบแป้งทอด 50, พิซซ่าเวียดนาม 50 (**เพิ่มชีส +20**)
  - เลือกซอสราด: ซอสมะเขือเทศ / ซอสมายองเนส / ซอสพริก / ไม่เอาซอส
  - พิซซ่าเวียดนามเลือกไส้: ปูอัด / แฮม / ไส้กรอก

---

## โครงไฟล์
```
.
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
├── .env.example
├── public/
│   └── cup.svg
├── supabase/
│   ├── schema.sql          # ตาราง + RLS + realtime + storage
│   └── seed.sql            # เมนูจริงทั้งหมด
└── src/
    ├── main.jsx            # router: / และ /shop
    ├── supabaseClient.js
    ├── constants.js        # หมวด/ตัวเลือก/กฎราคา
    ├── styles.css
    ├── lib/
    │   └── pricing.js      # คำนวณราคา/รวมตะกร้า
    ├── customer/           # ฝั่งลูกค้า (/)
    │   ├── CustomerApp.jsx
    │   ├── OptionSheet.jsx
    │   └── CartView.jsx
    └── shop/               # ฝั่งแม่ (/shop)
        ├── ShopApp.jsx     # auth + realtime + tabs
        ├── Login.jsx
        ├── OrdersTab.jsx
        ├── MenuTab.jsx
        ├── ProductModal.jsx
        ├── SalesTab.jsx
        └── tagClass.js
```

---

## แก้ปัญหาที่พบบ่อย
- **เปิดเว็บแล้วขึ้น error เรื่อง env / โหลดเมนูไม่ได้** → ยังไม่ได้ตั้ง `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` บน Vercel หรือใส่ผิด แก้แล้ว Redeploy
- **แม่ล็อกอินไม่ได้** → ยังไม่ได้ติ๊ก Auto Confirm User ตอนสร้าง user (ขั้นที่ 4) ให้ลบแล้วสร้างใหม่พร้อมติ๊ก
- **ออเดอร์ไม่เด้งเข้า iPad** → ตรวจว่าได้รัน `schema.sql` ครบ (ส่วนเปิด Realtime) และ iPad ต่อเน็ตอยู่
- **อัปโหลดรูปไม่ได้** → ตรวจว่า bucket `product-images` เป็น Public และรัน policy ใน schema.sql แล้ว
```
```
