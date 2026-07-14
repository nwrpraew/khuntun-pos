-- =============================================================
--  ร้านคุณตุ่น — เมนูจริงทั้งหมด (seed data)
--  รันหลังไฟล์ schema.sql
--  ปลอดภัยที่จะรันซ้ำ: ล้างเมนูเดิมก่อน (ไม่กระทบ orders)
-- =============================================================
truncate table public.products;

insert into public.products
  (name, category, base_price, is_hot, is_blend, blendable, has_sweet, has_toppings, has_dip, sort_order)
values
-- ---------- เมนูพิเศษ (มัทฉะ) — ปั่นได้ ----------
('มัทฉะสตรอว์เบอร์รี่','special',75,false,false,true ,true ,true ,false,1),
('มัทฉะส้ม'          ,'special',70,false,false,true ,true ,true ,false,2),
('มัทฉะมะพร้าว'      ,'special',70,false,false,true ,true ,true ,false,3),
('มัทฉะโอริโอ้'      ,'special',70,false,false,true ,true ,true ,false,4),

-- ---------- กาแฟร้อน — ล็อกร้อน ----------
('อเมริกาโน่ร้อน','hotcoffee',55,true,false,false,true,false,false,10),
('มอคค่าร้อน'    ,'hotcoffee',55,true,false,false,true,false,false,11),
('เอสเปรสโซ่ร้อน','hotcoffee',55,true,false,false,true,false,false,12),
('ลาเต้ร้อน'     ,'hotcoffee',55,true,false,false,true,false,false,13),
('คาปูชิโน่ร้อน' ,'hotcoffee',55,true,false,false,true,false,false,14),

-- ---------- Coffee เย็น — ปั่นได้ ----------
('อเมริกาโน่'         ,'coffee',60,false,false,true,true,true,false,20),
('อเมริกาโน่ลองช็อต'  ,'coffee',60,false,false,true,true,true,false,21),
('ออเรนจ์กาโน่'       ,'coffee',60,false,false,true,true,true,false,22),
('แบล็คโกโก้'         ,'coffee',60,false,false,true,true,true,false,23),
('เอสเปรสโซ่'         ,'coffee',60,false,false,true,true,true,false,24),
('คาปูชิโน่'          ,'coffee',60,false,false,true,true,true,false,25),
('ลาเต้'              ,'coffee',60,false,false,true,true,true,false,26),
('มอคค่า'             ,'coffee',60,false,false,true,true,true,false,27),
('คาราเมลมัคคิอาโต้'  ,'coffee',70,false,false,true,true,true,false,28),
('ชาไทยลาเต้กาแฟ'     ,'coffee',70,false,false,true,true,true,false,29),
('ชาเขียวลาเต้กาแฟ'   ,'coffee',70,false,false,true,true,true,false,30),

-- ---------- Bear Milk (นมหมีปั่น) — ปั่นทั้งหมด ----------
('นมหมีปั่น'        ,'bearmilk',55,false,true,false,true,true,false,40),
('คาราเมล'          ,'bearmilk',60,false,true,false,true,true,false,41),
('โอวัลตินภูเขาไฟ'  ,'bearmilk',65,false,true,false,true,true,false,42),
('โกโก้'            ,'bearmilk',65,false,true,false,true,true,false,43),
('น้ำผึ้ง'          ,'bearmilk',70,false,true,false,true,true,false,44),
('โอริโอ้'          ,'bearmilk',60,false,true,false,true,true,false,45),
('บราวน์ชูก้า'      ,'bearmilk',55,false,true,false,true,true,false,46),
('ไวท์มอลต์'        ,'bearmilk',70,false,true,false,true,true,false,47),
('สีชมพู'           ,'bearmilk',55,false,true,false,true,true,false,48),
('ชาไทย'            ,'bearmilk',60,false,true,false,true,true,false,49),
('ชาเขียว'          ,'bearmilk',60,false,true,false,true,true,false,50),
('ชาไต้หวัน'        ,'bearmilk',60,false,true,false,true,true,false,51),
('เนสวีต้า'         ,'bearmilk',70,false,true,false,true,true,false,52),

-- ---------- ชา-โกโก้ — ปั่นได้ ----------
('ชาไทย'            ,'teacocoa',50,false,false,true,true,true,false,60),
('ชาเขียว'          ,'teacocoa',50,false,false,true,true,true,false,61),
('มัทฉะลาเต้'       ,'teacocoa',65,false,false,true,true,true,false,62),
('โกโก้มิ้นท์'      ,'teacocoa',65,false,false,true,true,true,false,63),
('โกโก้'            ,'teacocoa',50,false,false,true,true,true,false,64),
('ดาร์กโกโก้'       ,'teacocoa',65,false,false,true,true,true,false,65),
('ชาดำเย็น'         ,'teacocoa',45,false,false,true,true,true,false,66),
('ชามะนาว'          ,'teacocoa',50,false,false,true,true,true,false,67),
('โกโก้ไม่ใส่นม'    ,'teacocoa',45,false,false,true,true,true,false,68),
('ชาเขียวไม่ใส่นม'  ,'teacocoa',45,false,false,true,true,true,false,69),
('ชานมไต้หวัน'      ,'teacocoa',50,false,false,true,true,true,false,70),
('เพียวมัทฉะ'       ,'teacocoa',60,false,false,true,true,true,false,71),

-- ---------- นมสด — ปั่นได้ (บางเมนูปั่นอยู่แล้ว) ----------
('นมสด'                ,'freshmilk',40,false,false,true ,true,true,false,80),
('นมชมพู'              ,'freshmilk',45,false,false,true ,true,true,false,81),
('นมสดบราวน์ชูก้า'     ,'freshmilk',50,false,false,true ,true,true,false,82),
('นมสดคาราเมล'         ,'freshmilk',55,false,false,true ,true,true,false,83),
('ไวท์มอลต์'           ,'freshmilk',55,false,false,true ,true,true,false,84),
('นมสดมิ้นท์'          ,'freshmilk',55,false,false,true ,true,true,false,85),
('นมสดภูเขาไฟ'         ,'freshmilk',50,false,false,true ,true,true,false,86),
('โอวัลตินภูเขาไฟ'     ,'freshmilk',55,false,false,true ,true,true,false,87),
('โอริโอ้ปั่น'         ,'freshmilk',50,false,true ,false,true,true,false,88),
('เนสวิต้าปั่น'        ,'freshmilk',60,false,true ,false,true,true,false,89),
('สตรอเบอร์รี่มิดไนท์' ,'freshmilk',55,false,false,true ,true,true,false,90),
('สตรอเบอร์รี่สมูตตี้' ,'freshmilk',60,false,true ,false,true,true,false,91),

-- ---------- น้ำผลไม้ปั่น — ปั่นทั้งหมด (ยกเว้นที่ระบุ) ----------
('น้ำมะม่วงปั่น'                 ,'smoothie',50,false,true ,false,true,true,false,100),
('M-150 ปีโป้ปั่น'               ,'smoothie',50,false,true ,false,true,true,false,101),
('โยเกิร์ตปีโป้ปั่น'             ,'smoothie',50,false,true ,false,true,true,false,102),
('นมสดปีโป้ปั่นสตอเบอรี่'        ,'smoothie',50,false,true ,false,true,true,false,103),
('ยาคูลปีโป้ปั่น'                ,'smoothie',50,false,true ,false,true,true,false,104),
('อาโวคาโดนมสดน้ำผึ้งปั่น'       ,'smoothie',70,false,true ,false,true,true,false,105),
('น้ำส้มปั่น'                    ,'smoothie',50,false,true ,false,true,true,false,106),
('น้ำมะพร้าวนมสดปั่น'            ,'smoothie',50,false,true ,false,true,true,false,107),
('น้ำมะพร้าวปั่นไม่ใส่นม'        ,'smoothie',50,false,true ,false,true,true,false,108),
('น้ำมะพร้าว+ชาไทย'              ,'smoothie',60,false,true ,false,true,true,false,109),
('น้ำมะพร้าว+ชาเขียว'            ,'smoothie',60,false,true ,false,true,true,false,110),
('น้ำมะพร้าว+โกโก้'              ,'smoothie',60,false,true ,false,true,true,false,111),
('น้ำมะพร้าว+กาแฟ'              ,'smoothie',70,false,true ,false,true,true,false,112),
('น้ำมะพร้าว+มัทฉะ'             ,'smoothie',70,false,true ,false,true,true,false,113),
('น้ำแตงโมปั่น'                  ,'smoothie',50,false,true ,false,true,true,false,114),
('กล้วยหอมนมสดปั่น'             ,'smoothie',50,false,true ,false,true,true,false,115),
('กล้วยหอมนมสดปั่น+ชาเขียว'     ,'smoothie',55,false,true ,false,true,true,false,116),
('กล้วยหอมนมสดปั่น+ชาไทย'       ,'smoothie',55,false,true ,false,true,true,false,117),
('กล้วยหอมนมสดปั่น+โกโก้'       ,'smoothie',55,false,true ,false,true,true,false,118),
('น้ำมะนาวปั่น'                  ,'smoothie',50,false,true ,false,true,true,false,119),
('น้ำมะนาวคั้น'                  ,'smoothie',50,false,false,false,true,true,false,120),
('น้ำมะนาว+น้ำผึ้ง'             ,'smoothie',60,false,false,false,true,true,false,121);

-- ---------- ของทอด — เลือกไส้/ซอส/ชีสได้ (ตามโปสเตอร์ร้าน) ----------
insert into public.products
  (name, category, base_price, is_hot, is_blend, blendable, has_sweet, has_toppings, has_dip, has_filling, has_cheese, sort_order)
values
('เปาะเปี๊ยะทอด'    ,'fried',50,false,false,false,false,false,true ,false,false,140),
('กุยช่ายทอด'      ,'fried',50,false,false,false,false,false,true ,false,false,141),
('ปูอัดชุบแป้งทอด' ,'fried',50,false,false,false,false,false,true ,false,false,142),
('พิซซ่าเวียดนาม'  ,'fried',50,false,false,false,false,false,true ,true ,true ,143);
