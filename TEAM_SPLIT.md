# TEAM_SPLIT.md

## Team Members
- 67543210003-9 นาย ปรานต์ มีเดช
- 67543210024-5 นาย สิริ รัตนรินทร์


## Work Allocation
### Student 1: นาย ปรานต์ มีเดช

- รับผิดชอบ **Auth Service** ทั้งหมด
  - เพิ่ม `POST /api/auth/register` ใหม่จาก Set 1
  - `POST /api/auth/login`, `GET /api/auth/verify`, `GET /api/auth/me`
  - ปรับ `db.js` ให้รองรับ `DATABASE_URL` สำหรับ Railway
- รับผิดชอบ **Task Service** ทั้งหมด
  - CRUD Tasks + JWT middleware
  - ปรับ `db.js` ให้รองรับ `DATABASE_URL`
- รับผิดชอบ **User Service** (สร้างใหม่ทั้งหมด)
  - `GET /api/users/me` พร้อม auto-create profile
  - `PUT /api/users/me`
  - `GET /api/users` (admin only)
- รับผิดชอบ **DB Schema** ของทุก service
  - `auth-service/init.sql`, `task-service/init.sql`, `user-service/init.sql`
- รับผิดชอบ **docker-compose.yml** สำหรับ local testing
- รับผิดชอบ **Dockerfile** ของทุก service

### Student 2: นาย สิริ รัตนรินทร์

- รับผิดชอบ **Deploy ขึ้น Railway** ทั้ง 3 services
  - Auth Service + auth-db
  - Task Service + task-db
  - User Service + user-db
  - ตั้งค่า Environment Variables ทุก service
  - Generate Domain ทุก service
- รับผิดชอบ **Integration Testing บน Cloud**
  - ทดสอบ T1–T10 ทุกข้อบน Railway URL จริง
  - ทดสอบ Register, Login, JWT flow end-to-end
  - ทดสอบ 401, 403 scenarios
- รับผิดชอบ **README.md** และ **TEAM_SPLIT.md**
- รับผิดชอบ **Screenshots** ทุกรูป

## Shared Responsibilities

- ทดสอบ Test Cases บางข้อร่วมกัน
- Debug ปัญหาที่เกิดขึ้นระหว่าง deploy
- Architecture diagram และภาพรวมระบบ

## Reason for Work Split

แบ่งงานตาม skill และบทบาทที่ถนัด โดย Student 1 รับผิดชอบด้าน Development เขียน code ทุกส่วนตั้งแต่ service logic จนถึง DB schema ส่วน Student 2 รับผิดชอบด้าน Cloud Deployment และ Testing นำ code ที่ Student 1 เขียนไป deploy บน Railway และทดสอบ end-to-end บน Cloud จริง

การแบ่งแบบนี้ทำให้งานไหลต่อเนื่องกัน Student 1 พัฒนาและทดสอบ local ก่อน จากนั้น Student 2 นำขึ้น Cloud และทดสอบในสภาพแวดล้อมจริง

## Integration Notes

1. **JWT_SECRET** — ค่าเดียวกันที่ Student 1 กำหนดใน code และ Student 2 ตั้งใน Railway Variables
2. **DATABASE_URL pattern** — Student 1 เขียน `db.js` ให้รองรับ `DATABASE_URL` เพื่อให้ Student 2 สามารถ deploy บน Railway ได้
3. **Railway URLs** — Student 2 นำ URL จาก Railway มาใส่ใน `frontend/config.js` และ README

