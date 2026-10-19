# Razan Craft Ledger

เครื่องคำนวณต้นทุนคราฟที่ NPC Razan ในเกม 12Tails Online (sv.TalesOfTails)
เป็นเว็บ static ล้วน ไม่ต้องมี backend จึง host บน GitHub Pages ได้เลย

- 504 สูตร ครบ 12 อาชีพ + Material, Trinket, Special
- แตกสูตรย่อยหลายชั้นอัตโนมัติ เลือกได้ทีละชิ้นว่าจะคราฟเองหรือซื้อ (Auto เลือกทางที่ถูกกว่าให้)
- ใส่ราคา Jil ได้ทุกไอเทม สรุปต้นทุนรวม ต่อชิ้น รายการที่ต้องซื้อ และกำไรถ้าใส่ราคาขาย
- รายการคราฟ รวมวัตถุดิบหลายสูตรเป็นรายการเดียว
- ส่งออก/นำเข้าราคาและรูปเป็นไฟล์ .zip

## โครงสร้าง

```
index.html               หน้าเว็บ
assets/app.css           สไตล์
assets/app.js            โค้ดทั้งหมด (ไม่มี build step)
data/recipes.js          ข้อมูลสูตร
data/images.json         สร้างอัตโนมัติจากโฟลเดอร์ images/ (อย่าแก้เอง)
data/image-urls.json     กำหนดรูปจาก URL เองได้ (ดูด้านล่าง)
images/                  วางรูปไอเทมที่นี่
scripts/build-images.mjs สร้าง data/images.json
.github/workflows/       deploy ขึ้น GitHub Pages
```

## Deploy ขึ้น GitHub Pages

1. สร้าง repo ใหม่บน GitHub แล้ว push โฟลเดอร์นี้ขึ้น branch `main`
   ```bash
   git remote add origin https://github.com/<user>/razan-craft-ledger.git
   git push -u origin main
   ```
2. ไปที่ **Settings → Pages → Build and deployment → Source** เลือก **GitHub Actions**
3. รอ Actions ทำงานเสร็จ เว็บจะอยู่ที่ `https://<user>.github.io/razan-craft-ledger/`

ไม่อยากใช้ Actions ก็เลือก Source เป็น **Deploy from a branch** (`main` / root) ได้ แต่ต้องรัน `node scripts/build-images.mjs` เองทุกครั้งที่เพิ่มรูป

## รูปไอเทม มี 3 แหล่ง (เรียงตามลำดับความสำคัญ)

1. **รูปที่อัปโหลดในหน้าเว็บ** เก็บใน IndexedDB ของเบราว์เซอร์นั้น เห็นแค่คุณ
2. **ไฟล์ในโฟลเดอร์ `images/`** ทุกคนที่เปิดเว็บเห็น ดู `images/README.md`
3. **`data/image-urls.json`** ผูกชื่อไอเทมกับ path หรือ URL เอง
   ```json
   { "Zinc Ore": "https://example.com/my-icons/zinc-ore.png", "Copper Bar": "images/misc/cb.png" }
   ```

ขั้นตอนที่สะดวกที่สุด: อัปโหลดรูปในหน้าเว็บ → กด **ส่งออกแพ็ก .zip** → แตกไฟล์ แล้วคัดลอกโฟลเดอร์ `images/` ในนั้นมาวางทับใน repo → commit แล้ว push

## ข้อมูลของผู้ใช้

ราคา โหมดคราฟ/ซื้อ และรายการคราฟเก็บใน `localStorage` ของแต่ละเบราว์เซอร์ ไม่มีการส่งข้อมูลออกไปที่ไหน
ย้ายเครื่องหรือแชร์ให้เพื่อนได้ด้วยปุ่ม **ส่งออกแพ็ก .zip / นำเข้าแพ็ก .zip** ในหน้าสมุดราคา

## แก้สูตร

แก้ใน `data/recipes.js` ได้ตรงๆ แต่ละแถวมีรูปแบบนี้
`["ชื่อไอเทม", "หมวด", "กลุ่ม", "W|A|C|ว่าง", "s|w", [["วัตถุดิบ", จำนวน], ...]]`
(หมวด: Wolf, Bison, …, Material, Trinket, Special · s = จาก simulator, w = จาก wiki)

## แหล่งข้อมูล

- สูตรคราฟ: [tailstailssimulator.online/crafting](https://www.tailstailssimulator.online/crafting)
- สูตร Material เพิ่มเติม: [12TailsOnline Wiki (TH) · Razan](https://12tailsonline.fandom.com/th/wiki/Razan#Material)

เว็บนี้เป็นเครื่องมือที่แฟนเกมทำขึ้น ไม่มีส่วนเกี่ยวข้องกับผู้พัฒนาหรือผู้ให้บริการเกม 12Tails Online
