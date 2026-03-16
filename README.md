# ENGSE207 Software Architecture — Final Lab Set 2
## Microservices Scale-Up + Cloud Deployment (Railway)

| | |
|---|---|
| **วิชา** | ENGSE207 Software Architecture |
| **งาน** | Final Lab — ชุดที่ 2 |
| **รูปแบบ** | งานสอบปฏิบัติกลุ่ม 2 คน |
| **สมาชิก 1** | นายสิริ รัตนรินทร์ รหัส 67543210024-5 |
| **สมาชิก 2** | นายปรานต์ มีเดช รหัส 67543210003-9 |

---

## สารบัญ

1. [URL ของทุก Service บน Railway](#1-url-ของทุก-service-บน-railway)
2. [Project Overview](#2-project-overview)
3. [Architecture Diagram](#3-architecture-diagram)
4. [3 Services และ 3 Databases](#4-3-services-และ-3-databases)
5. [Gateway Strategy](#5-gateway-strategy)
6. [วิธีรัน Local ด้วย Docker Compose](#6-วิธีรัน-local-ด้วย-docker-compose)
7. [วิธี Deploy ขึ้น Railway](#7-วิธี-deploy-ขึ้น-railway)
8. [Environment Variables](#8-environment-variables)
9. [วิธีทดสอบด้วย curl และ Postman](#9-วิธีทดสอบด้วย-curl-และ-postman)
10. [Known Limitations](#10-known-limitations)

---

## 1. URL ของทุก Service บน Railway

| Service | URL |
|---|---|
| **Auth Service** | https://auth-service-production-2f4d.up.railway.app |
| **Task Service** | https://task-service-production-793b.up.railway.app |
| **User Service** | https://user-task-production.up.railway.app |

---

## 2. Project Overview

Set 2 เป็นการต่อยอดจาก Set 1 โดยตรง โดยมีการเปลี่ยนแปลงหลัก 3 อย่าง

**Set 1 → Set 2:**

| | Set 1 | Set 2 |
|---|---|---|
| Register | ❌ Seed Users only | ✅ มี Register API |
| Services | Auth + Task + Log | Auth + Task + User |
| Database | 1 Shared DB | 3 แยก DB (Database-per-Service) |
| Deploy | Local + HTTPS | Railway Cloud |
| Gateway | Nginx local | Frontend เรียก URL ตรง (Option A) |

**สิ่งที่พัฒนาเพิ่มจาก Set 1:**
- เพิ่ม `POST /api/auth/register` ใน Auth Service
- เพิ่ม User Service สำหรับจัดการ profile
- แยก DB เป็น auth-db, task-db, user-db
- Deploy ทุก service ขึ้น Railway

---

## 3. Architecture Diagram

```
Internet / Browser / Postman
    │
    ├──▶ https://auth-service-production-2f4d.up.railway.app
    │         │
    │         ▼
    │    ┌─────────────────┐     ┌──────────────┐
    │    │  Auth Service   │────▶│   auth-db    │
    │    │  POST /register │     │  users table │
    │    │  POST /login    │     │  logs  table │
    │    │  GET  /verify   │     └──────────────┘
    │    │  GET  /me       │
    │    └─────────────────┘
    │
    ├──▶ https://task-service-production-793b.up.railway.app
    │         │
    │         ▼
    │    ┌─────────────────┐     ┌──────────────┐
    │    │  Task Service   │────▶│   task-db    │
    │    │  GET    /tasks  │     │  tasks table │
    │    │  POST   /tasks  │     │  logs  table │
    │    │  PUT    /tasks  │     └──────────────┘
    │    │  DELETE /tasks  │
    │    │  [JWT required] │
    │    └─────────────────┘
    │
    └──▶ https://user-task-production.up.railway.app
              │
              ▼
         ┌─────────────────┐     ┌──────────────────────┐
         │  User Service   │────▶│      user-db         │
         │  GET  /users/me │     │  user_profiles table │
         │  PUT  /users/me │     │  logs  table         │
         │  GET  /users    │     └──────────────────────┘
         │  [JWT required] │
         └─────────────────┘

JWT_SECRET ใช้ร่วมกันทุก service
user_id ใช้เป็น logical reference ระหว่าง databases
```

### Request Flow — Register → Login → Create Task

```
1. Browser ──POST /api/auth/register──▶ Auth Service
2. Auth Service ──INSERT INTO users──▶ auth-db
3. Auth Service ──jwt.sign({ sub, email, role })──▶ return JWT

4. Browser ──POST /api/tasks + Bearer token──▶ Task Service
5. Task Service ──jwt.verify(token, JWT_SECRET)──▶ valid
6. Task Service ──INSERT INTO tasks WHERE user_id = sub──▶ task-db

7. Browser ──GET /api/users/me + Bearer token──▶ User Service
8. User Service ──jwt.verify(token, JWT_SECRET)──▶ valid
9. User Service ──SELECT/INSERT user_profiles WHERE user_id = sub──▶ user-db
```

---

## 4. 3 Services และ 3 Databases

### Database-per-Service Pattern

ใน Set 2 แต่ละ service มี database เป็นของตัวเอง ไม่แชร์กัน

**auth-db** — เก็บข้อมูล authentication
```
users table: id, username, email, password_hash, role, created_at, last_login
logs  table: id, level, event, user_id, message, meta, created_at
```

**task-db** — เก็บข้อมูล tasks
```
tasks table: id, user_id, title, description, status, priority, created_at, updated_at
logs  table: id, level, event, user_id, message, meta, created_at
```

**user-db** — เก็บข้อมูล profile
```
user_profiles table: id, user_id, username, email, role, display_name, bio, avatar_url, updated_at
logs          table: id, level, event, user_id, message, meta, created_at
```

### การเชื่อมโยงข้อมูลระหว่าง Databases

ไม่มี Foreign Key ข้าม database ใน Set 2 ใช้ **logical reference** แทน

```
auth-db.users.id = 1
task-db.tasks.user_id = 1      ← logical reference
user-db.user_profiles.user_id = 1  ← logical reference
```

`user_id` ที่ใช้ใน task-db และ user-db คือค่าเดียวกับ `auth-db.users.id` โดย service แต่ละตัวอ่านค่านี้จาก JWT payload (`sub`)

---

## 5. Gateway Strategy

เลือก **Option A — Frontend เรียก URL ของแต่ละ service โดยตรง**

```javascript
// frontend/config.js
window.APP_CONFIG = {
  AUTH_URL: 'https://auth-service-production-2f4d.up.railway.app',
  TASK_URL: 'https://task-service-production-793b.up.railway.app',
  USER_URL: 'https://user-task-production.up.railway.app'
};
```

**เหตุผลที่เลือก Option A:**
- ง่ายที่สุดและเหมาะกับเวลาสอบที่จำกัด
- ไม่ต้อง deploy Nginx เพิ่มบน Railway
- ลด complexity และจุดที่อาจเกิด error
- Railway ให้ HTTPS ทุก service อยู่แล้ว ไม่จำเป็นต้องมี TLS termination แยก

**ข้อจำกัดของ Option A:**
- Frontend ต้องรู้ URL ของทุก service
- ถ้า URL เปลี่ยนต้องแก้ config.js และ redeploy frontend

**ข้อกำหนดที่ปฏิบัติตามครบ:**
- JWT_SECRET เหมือนกันทุก service ✅
- Task Service ปฏิเสธ request ที่ไม่มี JWT → 401 ✅
- User Service ปฏิเสธ request ที่ไม่มี JWT → 401 ✅
- GET /api/users เป็น admin only ✅
- Auth Service ทำงานได้โดยไม่ต้องมี JWT สำหรับ register, login, health ✅

---

## 6. วิธีรัน Local ด้วย Docker Compose

### ขั้นตอนที่ 1 — Clone และเข้าโฟลเดอร์

```bash
git clone <your-repo-url>
cd engse207-final-lab2-675432100039-675432100245
```

### ขั้นตอนที่ 2 — สร้างไฟล์ .env

```bash
cp .env.example .env
```

### ขั้นตอนที่ 3 — Build และ Start

```bash
docker compose up --build
```

รอจนเห็น log:
```
[auth-db] Tables initialized ✅
[auth-service] Running on port 3001
[task-db] Tables initialized ✅
[task-service] Running on port 3002
[user-db] Tables initialized ✅
[user-service] Running on port 3003
```

### ขั้นตอนที่ 4 — ทดสอบ Local

| Service | URL |
|---|---|
| Auth | http://localhost:3001 |
| Task | http://localhost:3002 |
| User | http://localhost:3003 |

### Reset ฐานข้อมูล

```bash
docker compose down -v
docker compose up --build
```

---

## 7. วิธี Deploy ขึ้น Railway

### Auth Service

1. Railway → **New Project** → **Deploy from GitHub** → เลือก repo
2. Settings → **Root Directory** = `auth-service`
3. เพิ่ม **PostgreSQL** → ตั้งชื่อ `auth-db`
4. Variables → เพิ่ม environment variables
5. Settings → Networking → **Generate Domain**

### Task Service

1. ใน Project เดียวกัน → **+ New** → **GitHub Repo**
2. Settings → **Root Directory** = `task-service`
3. เพิ่ม **PostgreSQL** → ตั้งชื่อ `task-db`
4. Variables → เพิ่ม environment variables
5. Generate Domain

### User Service

1. **+ New** → **GitHub Repo**
2. Settings → **Root Directory** = `user-service`
3. เพิ่ม **PostgreSQL** → ตั้งชื่อ `user-db`
4. Variables → เพิ่ม environment variables
5. Generate Domain

---

## 8. Environment Variables

### Auth Service
```env
DATABASE_URL   = ${{Postgres.DATABASE_URL}}
JWT_SECRET     = engse207-super-secret-set2-2024
JWT_EXPIRES_IN = 1h
PORT           = 3001
NODE_ENV       = production
```

### Task Service
```env
DATABASE_URL = ${{Postgres.DATABASE_URL}}
JWT_SECRET   = engse207-super-secret-set2-2024
PORT         = 3002
NODE_ENV     = production
```

### User Service
```env
DATABASE_URL = ${{Postgres.DATABASE_URL}}
JWT_SECRET   = engse207-super-secret-set2-2024
PORT         = 3003
NODE_ENV     = production
```

> ⚠️ JWT_SECRET ต้องเหมือนกันทุก service เพื่อให้ verify token ได้

---

## 9. วิธีทดสอบด้วย curl และ Postman

### Register
```bash
curl -X POST https://auth-service-production-2f4d.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"testuser@example.com","password":"123456"}'
```

### Login → เก็บ token
```bash
TOKEN=$(curl -s -X POST https://auth-service-production-2f4d.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"123456"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
```

### Auth Me
```bash
curl https://auth-service-production-2f4d.up.railway.app/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### Get Profile
```bash
curl https://user-task-production.up.railway.app/api/users/me \
  -H "Authorization: Bearer $TOKEN"
```

### Update Profile
```bash
curl -X PUT https://user-task-production.up.railway.app/api/users/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"display_name":"Test User","bio":"Hello from Set 2"}'
```

### Create Task
```bash
curl -X POST https://task-service-production-793b.up.railway.app/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"My first cloud task","description":"Deploy on Railway","status":"TODO","priority":"high"}'
```

### Get Tasks
```bash
curl https://task-service-production-793b.up.railway.app/api/tasks \
  -H "Authorization: Bearer $TOKEN"
```

### Test 401 (ไม่มี JWT)
```bash
curl https://task-service-production-793b.up.railway.app/api/tasks
```

### Test admin-only (403/200)
```bash
# Member token → 403
curl https://user-task-production.up.railway.app/api/users \
  -H "Authorization: Bearer $TOKEN"

# Admin token → 200
ADMIN_TOKEN=$(curl -s -X POST https://auth-service-production-2f4d.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lab.local","password":"adminpass"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

curl https://user-task-production.up.railway.app/api/users \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 10. Known Limitations

**No Foreign Key ข้าม Database**
ใน Database-per-Service pattern ไม่สามารถมี Foreign Key constraint ข้าม database ได้ ดังนั้น `user_id` ใน task-db และ user-db เป็นแค่ logical reference ไม่มี referential integrity enforcement หาก user ถูกลบออกจาก auth-db ข้อมูลใน task-db และ user-db จะยังคงอยู่

**No Register for Admin**
Register API จะสร้าง user ด้วย role `member` เสมอ การสร้าง admin ต้องทำผ่าน SQL query โดยตรงใน Railway database console

**No Refresh Token**
JWT หมดอายุใน 1 ชั่วโมง user ต้อง login ใหม่ ไม่มี silent refresh mechanism

**Profile Auto-Create**
User Service สร้าง profile อัตโนมัติเมื่อเรียก GET /api/users/me ครั้งแรก ซึ่งอาจทำให้ response ครั้งแรกช้ากว่าปกติเล็กน้อย

**No Cross-Service Communication**
Services ไม่ติดต่อกันโดยตรง (ยกเว้น log) ข้อมูลระหว่าง service เชื่อมกันผ่าน JWT payload เท่านั้น ทำให้ถ้า user เปลี่ยน username ใน auth-db ข้อมูลใน user-db จะไม่ sync อัตโนมัติ

**Log Service ถูกลบออก**
Set 2 ไม่มี Log Service แล้ว frontend logs.html จาก Set 1 จะไม่ทำงานบน Set 2 เพราะไม่มี `/api/logs/` endpoint





<img src="screenshots/aaa.jpg" width=200%>