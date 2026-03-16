# รายงานรายบุคคล — Final Lab Set 2

## 1. ข้อมูลผู้จัดทำ

| รายการ | ข้อมูล |
|--------|--------|
| ชื่อ-นามสกุล | นายสิริ รัตนรินทร์ |
| รหัสนักศึกษา | 67543210024-5 |
| Section | 2 |
| GitHub Username | siri-se |

---

## 2. ส่วนที่รับผิดชอบ

- Deploy Auth Service, Task Service และ User Service พร้อม Database แต่ละตัวขึ้น Railway
- ตั้งค่า Environment Variables บน Railway ให้ถูกต้องทุก service
- ทดสอบ Test Cases T1–T10 บน Cloud URL จริง
- จัดทำ README.md, TEAM_SPLIT.md และ INDIVIDUAL_REPORT
- ถ่าย Screenshots ประกอบการส่งงาน

---

## 3. สิ่งที่ได้ลงมือพัฒนาด้วยตนเอง

### Railway Deployment

นำโค้ดที่เพื่อน (นายปรานต์) พัฒนาไว้ขึ้น Railway โดยทำ 3 service ครบ

- สร้าง Railway Project และเชื่อมต่อกับ GitHub Repository
- กำหนด Root Directory ให้แต่ละ service ถูกต้อง (`auth-service`, `task-service`, `user-service`)
- เพิ่ม PostgreSQL Plugin และเชื่อมต่อ `DATABASE_URL` ให้แต่ละ service
- Generate Domain ให้ทุก service

### แก้ปัญหาระหว่าง Deploy

- พบว่า `db.js` ทุก service ยังใช้ `DB_HOST` แบบ local Docker อยู่ ทำให้ connect ไม่ได้บน Railway แก้ไขโดยเพิ่ม logic รองรับ `DATABASE_URL` เมื่อ deploy บน Cloud
- พบว่า Nginx ชี้ไปที่ `user-service:3004` แต่ service รันที่ port 3003 แก้ nginx.conf ให้ถูกต้อง
- พบว่า `user_profiles` table ขาด column `display_name` แก้ไข `db/user.sql` และ reset database

### Integration Testing บน Cloud

ทดสอบ T1–T10 ครบทุกข้อบน Railway URL จริง ด้วย Postman

---

## 4. ปัญหาที่พบและวิธีการแก้ไข

| ปัญหา | วิธีการแก้ไข |
|-------|-------------|
| auth-service บน Railway ขึ้น `ENOTFOUND auth-db` | แก้ `db.js` ทุก service ให้ใช้ `DATABASE_URL` เมื่อมีการตั้งค่าบน Railway |
| JWT invalid signature ตอนทดสอบ task-service | token ที่ใช้มาจาก local ซึ่งใช้ JWT_SECRET ต่างกัน แก้โดย login ใหม่บน Railway แล้วใช้ token นั้น |
| GET /api/users/ ได้ 500 Server error | query ดึง `created_at` แต่ตาราง `user_profiles` ไม่มี column นั้น แก้เป็น `updated_at` แทน |
| Nginx 502 ตอนเรียก /api/users/ | nginx.conf ชี้ไปที่ port 3004 แต่ user-service รันที่ 3003 แก้ port ให้ตรง |
| admin login ไม่ได้บน Railway | Railway ไม่มี seed users ต้อง register แล้วแก้ role เป็น admin ผ่าน Railway Database Query |

---

## 5. สิ่งที่ได้เรียนรู้จากงานนี้

แต่ละ service มี DB แยกกัน ทำให้ไม่สามารถ JOIN ข้าม database ได้ ต้องใช้ `user_id` จาก JWT เป็น logical reference แทน

Cloud environment ต่างจาก local อย่างมาก ต้องใช้ `DATABASE_URL` + SSL แทน `DB_HOST/PORT` และแต่ละ service ต้อง init schema ได้เองตอน start

`JWT_SECRET` ต้องเหมือนกันทุก service เพราะทุก service verify token เอง ถ้าต่างกันแม้แค่ตัวเดียวจะ verify ไม่ผ่าน

---

## 6. ส่วนที่ยังไม่สมบูรณ์หรืออยากปรับปรุง

- **Log Service** ถูกตัดออกใน Set 2 ทำให้ `logs.html` ไม่ทำงาน อยากปรับปรุงให้แต่ละ service มี logging ของตัวเองแบบ lightweight เหมือน Set 1
- **Admin user** ต้องสร้างผ่าน SQL query โดยตรง อยากเพิ่ม seed script สำหรับ admin บน Railway
- **Frontend config.js** ต้องแก้ URL ด้วยมือทุกครั้งที่ redeploy อยากทำให้ dynamic มากขึ้น
- **Cross-service data consistency** ถ้า user ถูกลบจาก auth-db ข้อมูลใน task-db และ user-db จะยังคงอยู่ อยากเพิ่ม cleanup mechanism
