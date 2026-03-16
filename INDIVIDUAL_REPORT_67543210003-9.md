# รายงานรายบุคคล — Final Lab Set 2

## 1. ข้อมูลผู้จัดทำ

| รายการ | ข้อมูล |
|--------|--------|
| ชื่อ-นามสกุล | ปรานต์ มีเดช |
| รหัสนักศึกษา | 67543210003-9 |
| Section | 1|
| GitHub Username | ernst52 |

---

## 2. ส่วนที่รับผิดชอบ

- เพิ่ม Register API ใน Auth Service
- พัฒนา User Service สำหรับจัดการโปรไฟล์ผู้ใช้
- แยกฐานข้อมูลออกเป็น 3 ชุด (auth-db, task-db, user-db)
- ปรับ Docker Compose สำหรับ Multi-Database Architecture
- ปรับ Frontend เพิ่ม Register Form และ Profile Page

---

## 3. สิ่งที่ได้ลงมือพัฒนาด้วยตนเอง

- เพิ่ม `POST /api/auth/register` ใน `auth-service/src/routes/auth.js` พร้อม bcrypt hash และ logEvent
- เขียน `user-service` ทั้งหมด ได้แก่ `index.js`, `db/db.js`, `routes/users.js`, `middleware/authMiddleware.js`, `middleware/jwtUtils.js`
- เขียน `GET /api/users/me` ที่ auto-create profile จาก JWT data หากยังไม่มีใน user_profiles
- เขียน `GET /api/users/` สำหรับ admin ดู users ทั้งหมด
- แยก `db/init.sql` ออกเป็น `db/auth.sql`, `db/task.sql`, `db/user.sql`
- ปรับ `docker-compose.yml` เพิ่ม auth-db, task-db, user-db แทน postgres ตัวเดียว
- ปรับ `nginx/nginx.conf` เพิ่ม location `/api/users/`
- ปรับ `frontend/index.html` เพิ่ม tab switcher, register form และแก้ `loadProfile()`

---

## 4. ปัญหาที่พบและวิธีการแก้ไข

| ปัญหา | วิธีการแก้ไข |
|-------|-------------|
| `npm ci` ล้มเหลวใน user-service เพราะไม่มี `package-lock.json` | รัน `npm install` ใน user-service ก่อน build |
| Database ไม่ start เพราะ `init.sql` เป็น directory ไม่ใช่ไฟล์ | สร้างไฟล์ `db/auth.sql`, `db/task.sql`, `db/user.sql` ให้ถูกต้อง |
| `GET /api/tasks/` return 500 เพราะ JOIN กับ `users` table ที่อยู่ใน auth-db | ลบ JOIN ออก เนื่องจากแต่ละ service มี DB แยกกัน |
| `/api/users/me` return 404 เพราะยังไม่มีแถวใน `user_profiles` | เพิ่ม auto-create profile ใน `/me` route หากไม่พบข้อมูล |
| Role ไม่แสดงใน Profile page เพราะ `user_profiles` ไม่มี column `role` | ใช้ `currentUser.role` จาก JWT แทน |
| Register form ใช้ `reg-name` แต่ `doRegister()` อ่าน `reg-username` | แก้ HTML input id ให้ตรงกัน |

---

## 5. สิ่งที่ได้เรียนรู้จากงานนี้

- เข้าใจการออกแบบ Database per Service ใน Microservices และผลกระทบต่อ Cross-service Query
- เข้าใจว่าเมื่อแยก DB แล้วไม่สามารถใช้ Foreign Key ข้าม Service ได้ ต้องใช้ user_id จาก JWT แทน
- เรียนรู้การ Auto-provision ข้อมูลเมื่อ Service ใหม่ถูกเรียกครั้งแรก
- เข้าใจการ Debug Microservices ด้วย `docker logs` และการตรวจสอบ DB โดยตรงด้วย `psql`
- เรียนรู้การจัดการ nginx routing สำหรับหลาย Service

---

## 6. แนวทางที่ต้องการพัฒนาต่อ

- เพิ่ม `PUT /api/users/me` สำหรับแก้ไขโปรไฟล์
- Deploy ขึ้น Railway และทดสอบ end-to-end บน Cloud
- เพิ่ม Refresh Token เพื่อจัดการ Session ที่หมดอายุ
- ปรับปรุง Log Dashboard ให้ Filter และ Search ได้