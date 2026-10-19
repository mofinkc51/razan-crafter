# images/

วางรูปไอเทมไว้ในโฟลเดอร์นี้ โดยตั้งชื่อไฟล์ตามชื่อไอเทม

```
images/Zinc Ore.png
images/copper_bar.webp
images/weapons/Falchion V.png   ← แยกโฟลเดอร์ย่อยได้
```

- ไม่สนตัวพิมพ์เล็กใหญ่ และอ่าน `_` หรือ `-` เป็นช่องว่าง
- รองรับ png, jpg, gif, webp, svg
- push ขึ้น `main` แล้ว GitHub Actions จะสร้าง `data/images.json` ให้เอง
- ถ้า deploy แบบ branch (ไม่ใช้ Actions) ให้รัน `node scripts/build-images.mjs` ก่อน commit
- ชื่อไฟล์ไหนไม่ตรงกับไอเทม จะดูได้จากหน้า "สมุดราคา" → ตัวกรอง "ยังไม่มีรูป"

ใส่รูปที่คุณมีสิทธิ์เผยแพร่เท่านั้น เพราะทุกไฟล์ในโฟลเดอร์นี้จะเปิดดูได้แบบสาธารณะบน GitHub Pages
