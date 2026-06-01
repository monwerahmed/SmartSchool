# SmartSchool System — API

> Multi-tenant school management backend with RBAC, academic management, attendance, results, library, file uploads, and payment integration.

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v4.18-000000?logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v17+-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-v7+-2D3748?logo=prisma)](https://prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Features

| Module | Highlights |
|---|---|
| **Multi-Tenancy** | Complete data isolation per institution via `institutionId` |
| **RBAC** | 9 roles · Resource-Action permissions · In-memory cache (5-min TTL) |
| **Academic** | Classes · Sections · Subjects · Class-Subject junction with per-class mark config |
| **Enrollment** | Academic year tracking · Section transfer · Roll number management |
| **Attendance** | Single & bulk entry · Daily summaries · Monthly section reports |
| **Results** | Exam creation · Bulk result entry · Auto grading (BD system) · GPA · Merit lists |
| **Library** | Librarian management · Book catalog · Borrow/return · Auto fine on overdue |
| **Uploads** | Profile photo & document upload/delete via Cloudinary (Multer) |
| **Payments** | SSLCommerz integration · IPN webhook · Transaction log |
| **OTP** | Bcrypt-hashed OTP flow for username & password changes |

---

## Tech Stack

- **Runtime:** Node.js v18+ · ES Modules
- **Framework:** Express.js v4.18
- **Database:** PostgreSQL v17+ via Prisma ORM v7+
- **Auth:** JWT (access + refresh tokens)
- **Validation:** Zod
- **File Storage:** Cloudinary + Multer
- **Security:** bcrypt · helmet · cors · rate limiting

---

## Quick Start

```bash
git clone https://github.com/ASGSHOP/Apars_School_Management_Backend
cd Apars_School_Management_Backend
npm install
cp .env.example .env        # fill in your credentials
npx prisma generate
npx prisma migrate dev
node prisma/seeds.js        # seeds roles, permissions, demo data
npm run dev                 # http://localhost:9090
```

**Default demo credentials**
```
Email:    admin@demo.com
Password: admin123
```

---

## Environment Variables

```env
NODE_ENV=development
PORT=9090
DATABASE_URL="postgresql://user:pass@localhost:5432/school_db?schema=public"

JWT_SECRET=<min-32-char-random-secret>
JWT_EXPIRES_IN=1d
REFRESH_TOKEN_SECRET=<min-32-char-random-secret>
REFRESH_TOKEN_EXPIRES_IN=7d

ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
BCRYPT_SALT_ROUNDS=10

CLOUDINARY_CLOUD_NAME=<your_cloud_name>
CLOUDINARY_API_KEY=<your_api_key>
CLOUDINARY_API_SECRET=<your_api_secret>

SSLCOMMERZ_STORE_ID=<your_store_id>
SSLCOMMERZ_STORE_PASSWORD=<your_store_password>
SSLCOMMERZ_IS_LIVE=false
```

> ⚠️ Never commit `.env`. Use 64+ char secrets and `BCRYPT_SALT_ROUNDS=12` in production.

---

## Project Structure

```
prisma/
├── schema.prisma
├── migrations/
└── seeds.js

src/
├── app/
│   ├── config/
│   ├── error/
│   ├── middlewares/
│   │   ├── auth.js               # JWT verification
│   │   ├── permission.js         # RBAC enforcement
│   │   ├── multer.js             # Cloudinary upload handling
│   │   ├── validateRequest.js    # Zod middleware
│   │   └── globalErrorHandler.js
│   └── modules/
│       ├── academicClass/        # Classes + Class-Subject junction
│       ├── attendance/
│       ├── auth/
│       ├── guardian/
│       ├── institute/
│       ├── librarian/            # (library module)
│       ├── otp/
│       ├── payment/
│       ├── principal/
│       ├── result/               # Subjects + Exams + Results
│       ├── section/
│       ├── student/              # Includes enrollment sub-routes
│       ├── teacher/
│       ├── upload/
│       └── user/
├── routes/
├── app.js
└── server.js
```

Each module follows: `constants → utils → validation → service → controller → routes`

---

## API Reference

**Base URL:** `http://localhost:9090/api/v1`

All protected routes require: `Authorization: Bearer <token>`

**Role abbreviations:** `SA` = SUPER_ADMIN · `AD` = ADMIN · `PR` = PRINCIPAL · `VP` = VICE_PRINCIPAL · `TE` = TEACHER · `ST` = STUDENT · `GU` = GUARDIAN · `LI` = LIBRARIAN · `AC` = ACCOUNTANT

---

### Auth · `/api/auth`

| Method | Endpoint | Access |
|---|---|---|
| POST | `/login` | Public |
| POST | `/logout` | Any authenticated |

### OTP · `/api/auth/otp`

| Method | Endpoint | Notes |
|---|---|---|
| POST | `/request` | `{ purpose: "CHANGE_USERNAME" \| "CHANGE_PASSWORD" }` · All roles |
| POST | `/change-username` | `{ otp, newUsername }` · All roles |
| POST | `/change-password` | `{ otp, newPassword }` · All roles |

---

### Users · `/api/users`

| Method | Endpoint | Access |
|---|---|---|
| POST | `/create-user` | Public (initial setup) |
| POST | `/create-super-admin` | Public (initial setup) |
| POST | `/create-admin` | SA |
| POST | `/create-principal` | SA · AD |
| GET | `/users` |  Unguarded — restrict before production |

---

### Institutions · `/api/institutions`

| Method | Endpoint | Access |
|---|---|---|
| POST | `/` | SA |
| GET | `/` | SA |
| GET | `/:id` | Any authenticated |
| PATCH | `/:id` | Any authenticated + UPDATE permission |
| PATCH | `/:id/status` | SA |
| GET | `/:id/stats` | Any authenticated |

---

### Academic Classes · `/api/academic-classes`

| Method | Endpoint | Access |
|---|---|---|
| POST | `/` | SA · AD · PR |
| GET | `/` | SA · AD · PR · VP · TE · ST · PARENT |
| GET | `/:id` | SA · AD · PR · VP · TE · ST · PARENT |
| PATCH | `/:id` | SA · AD · PR |
| DELETE | `/:id` | SA · AD · PR |
| POST | `/:classId/subjects` | SA · AD · PR — bulk assign subjects |
| GET | `/:classId/subjects` | SA · AD · PR · VP · TE · ST · PARENT |
| PATCH | `/subjects/:classSubjectId` | SA · AD · PR — update marks/config |
| DELETE | `/subjects/:classSubjectId` | SA · AD · PR |
| POST | `/subjects/:classSubjectId/assign-teacher` | SA · AD · PR |
| DELETE | `/subjects/:classSubjectId/remove-teacher` | SA · AD · PR |

---

### Sections · `/api/sections`

| Method | Endpoint | Access |
|---|---|---|
| POST | `/` | SA · AD · PR |
| GET | `/` | SA · AD · PR · VP · TE |
| GET | `/:id` | SA · AD · PR · VP · TE |
| PATCH | `/:id` | SA · AD · PR |
| DELETE | `/:id` | SA · AD |

---

### Students · `/api/students`

| Method | Endpoint | Access |
|---|---|---|
| POST | `/` | SA · AD · PR |
| GET | `/` | SA · AD · PR · VP · TE |
| GET | `/me` | ST (own profile) |
| GET | `/:id` | SA · AD · PR · VP · TE · ST |
| PATCH | `/:id` | SA · AD · PR |
| PATCH | `/:id/status` | SA · AD |
| POST | `/:id/enroll` | SA · AD · PR |
| GET | `/:id/enrollments` | SA · AD · PR · VP · TE · ST |
| PATCH | `/enrollments/:enrollId` | SA · AD · PR |

---

### Teachers · `/api/teachers`

| Method | Endpoint | Access |
|---|---|---|
| POST | `/` | SA · AD · PR |
| GET | `/` | SA · AD · PR · VP |
| GET | `/me` | TE (own profile) |
| GET | `/:id` | SA · AD · PR · VP |
| PATCH | `/:id` | SA · AD · PR |
| PATCH | `/:id/status` | SA · AD |
| GET | `/:teacherId/subjects` | SA · AD · PR · VP · TE |

---

### Guardians · `/api/guardians`

| Method | Endpoint | Access |
|---|---|---|
| POST | `/` | SA · AD · PR |
| GET | `/` | SA · AD · PR · VP · TE |
| GET | `/me` | GU (own profile) |
| GET | `/:id` | SA · AD · PR · VP · TE |
| PATCH | `/:id` | SA · AD · PR |
| PATCH | `/:id/status` | SA · AD |
| POST | `/:id/link-student` | SA · AD · PR |
| GET | `/:id/students` | SA · AD · PR · VP · TE |
| PATCH | `/:guardianId/students/:studentId` | SA · AD · PR |
| DELETE | `/:guardianId/students/:studentId` | SA · AD · PR |

---

### Attendance · `/api/attendance`

| Method | Endpoint | Notes |
|---|---|---|
| POST | `/` | Single entry · SA · AD · PR · VP · TE |
| POST | `/bulk` | Full section · SA · AD · PR · VP · TE |
| GET | `/today/summary` | SA · AD · PR · VP |
| GET | `/` | `?sectionId=&date=` · SA · AD · PR · VP · TE |
| GET | `/student/:studentId` | `?startDate=&endDate=` · + ST · PARENT |
| GET | `/section/:sectionId/report` | `?month=&year=` · SA · AD · PR · VP · TE |
| PATCH | `/:id` | SA · AD · PR |

---

### Results · `/api/results`

**Subjects**

| Method | Endpoint | Access |
|---|---|---|
| POST | `/subjects` | SA · AD · PR |
| GET | `/subjects` | SA · AD · PR · VP · TE · ST · PARENT |
| GET | `/subjects/:id` | SA · AD · PR · VP · TE · ST · PARENT |

**Exams**

| Method | Endpoint | Notes |
|---|---|---|
| POST | `/exams` | SA · AD · PR |
| GET | `/exams` | `?sectionId=&academicYear=` · All roles |
| GET | `/exams/:id` | All roles |
| PATCH | `/exams/update/:id` | SA · AD · PR |
| DELETE | `/exams/delete/:id` | SA · AD · PR |

**Results & Reports**

| Method | Endpoint | Notes |
|---|---|---|
| POST | `/` | Single entry · SA · AD · PR · TE |
| POST | `/bulk` | Bulk by examSubject · SA · AD · PR · TE |
| GET | `/` | `?examId=&studentId=&sectionId=` · All roles |
| GET | `/:id` | All roles |
| PATCH | `/:id` | SA · AD · PR · TE |
| GET | `/student/:studentId/exam/:examId` | Report card · All roles |
| GET | `/section/:sectionId/exam/:examId` | Merit list · SA · AD · PR · VP · TE |
| GET | `/exam/:examId/subject/:subjectId/analysis` | Subject analytics · SA · AD · PR · VP · TE |

---

### Library · `/api/library`

**Stats & Librarians**

| Method | Endpoint | Access |
|---|---|---|
| GET | `/stats` | SA · AD · PR · LI |
| GET | `/me` | LI (own profile) |
| POST | `/librarians` | SA · AD |
| GET | `/librarians` | SA · AD · PR |
| GET | `/librarians/:id` | SA · AD · PR |
| PATCH | `/librarians/:id` | SA · AD |
| PATCH | `/librarians/:id/status` | SA · AD |

**Categories**

| Method | Endpoint | Access |
|---|---|---|
| POST | `/categories` | SA · AD · LI |
| GET | `/categories` | All authenticated roles |
| PATCH | `/categories/:id` | SA · AD · LI |
| DELETE | `/categories/:id` | SA · AD |

**Books**

| Method | Endpoint | Access |
|---|---|---|
| POST | `/books` | SA · AD · LI |
| GET | `/books` | All authenticated roles |
| GET | `/books/:id` | All authenticated roles |
| PATCH | `/books/:id` | SA · AD · LI |
| PATCH | `/books/:id/copies` | SA · AD · LI — add/adjust copies |
| DELETE | `/books/:id` | SA · AD |

**Borrows & Fines**

| Method | Endpoint | Notes |
|---|---|---|
| POST | `/borrows` | Issue book · SA · AD · LI |
| GET | `/borrows` | `?status=&bookId=&studentId=` · SA · AD · PR · LI |
| GET | `/borrows/:id` | Includes live overdue projection · SA · AD · PR · LI |
| PATCH | `/borrows/:borrowId/return` | Auto-creates fine if overdue · SA · AD · LI |
| GET | `/borrows/student/:studentId` | `?status=&page=&limit=` · SA · AD · PR · LI · TE |
| GET | `/fines` | `?status=&studentId=` · SA · AD · PR · LI |
| PATCH | `/fines/:id` | Mark PAID or WAIVED · SA · AD · LI |

---

### File Uploads · `/api/uploads`

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/me` | Own photo + document URLs · All roles |
| POST | `/profile-photo` | `form-data: profilePhoto` · All roles |
| POST | `/document` | `form-data: documentFile, documentType` · All roles |
| POST | `/both` | `form-data: profilePhoto + documentFile + documentType` · All roles |
| DELETE | `/profile-photo` | Removes from Cloudinary + DB · All roles |
| DELETE | `/document` | Removes from Cloudinary + DB · All roles |
| GET | `/:userType` | `student\|teacher\|guardian\|librarian` · `?page=&limit=&hasPhoto=&hasDocument=` · SA · AD · PR · VP |
| GET | `/:userType/:id` | Single user's files · SA · AD · PR · VP |

---

### Payments · `/api/payment`

| Method | Endpoint | Access | Notes |
|---|---|---|---|
| POST | `/initiate` | ST · PARENT · AC | Starts SSLCommerz session |
| POST | `/success` | Public — gateway only | No auth middleware |
| POST | `/fail` | Public — gateway only | No auth middleware |
| POST | `/cancel` | Public — gateway only | No auth middleware |
| POST | `/ipn` | Public — webhook | Background IPN from SSLCommerz |

---

## Architecture

```
Client
  → API Gateway (CORS · Helmet · Rate Limiting)
  → auth.js       (JWT verification)
  → permission.js (RBAC + in-memory cache)
  → Router → Controller → Service → Prisma → PostgreSQL
```

**Key design decisions:**

- **Shared-DB multi-tenancy** — all queries scoped by `institutionId`
- **In-memory permission cache** — `Map<userId, permissions>` with 5-min TTL; reduces DB hits by ~90%
- **Class-Subject junction** — reuse subjects across classes with per-class mark overrides
- **OTP security** — stored as bcrypt hashes; `@@unique([userId, purpose])` enforces one active OTP per purpose
- **Payment callbacks unauthenticated** — `/success`, `/fail`, `/cancel`, `/ipn` are called directly by SSLCommerz, not the user's browser

---

## Roles & Permissions

| Role | Scope |
|---|---|
| `SUPER_ADMIN` | Full system — manages institutions |
| `ADMIN` | Full institution access |
| `PRINCIPAL` / `VICE_PRINCIPAL` | Academic + staff management |
| `TEACHER` | Attendance · Results (own classes) |
| `STUDENT` | Own profile · Results · Attendance |
| `GUARDIAN` | Linked student data |
| `LIBRARIAN` | Books · Borrows · Fines |
| `ACCOUNTANT` | Payment initiation |

Permissions are resource-action pairs stored in DB and cached per user:
`VIEW · CREATE · UPDATE · DELETE · MANAGE`

---

## Database Migrations

```bash
npx prisma generate                         # Regenerate client after schema changes
npx prisma migrate dev --name <name>        # Create + apply migration (dev)
npx prisma migrate deploy                   # Apply to production
npx prisma migrate status                   # Check state
```

---

## Deployment Checklist

- [ ] `NODE_ENV=production`
- [ ] JWT secrets 64+ chars, unique per environment
- [ ] `BCRYPT_SALT_ROUNDS=12`
- [ ] `ALLOWED_ORIGINS` set to production frontend URL
- [ ] `SSLCOMMERZ_IS_LIVE=true` with live credentials
- [ ] SSL/HTTPS configured
- [ ] `npx prisma migrate deploy` run against production DB
- [ ] Lock down open user routes (`GET /users`, `POST /create-user`, `POST /create-super-admin`)
- [ ] Automated DB backups configured
- [ ] Rate limiting + monitoring enabled

---

## Contributing

```bash
git checkout -b feature/<name>
git commit -m "feat(<scope>): <description>"
git push origin feature/<name>
# open Pull Request
```

Types: `feat` · `fix` · `docs` · `refactor` · `test` · `chore`

---

## License

MIT © SmartSchool System

*Built for the Bangladesh Education System*
