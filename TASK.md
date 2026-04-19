# LMS SaaS MVP — Build Plan (Next.js + Nest.js + Supabase + AWS S3 + SES)

---

## STEP 1 — Project Setup ✅ *Completed*

### Backend (Nest.js)

* Create project:

  ```bash
  nest new lms-backend
  ```
* Install dependencies:

  ```bash
  npm install @nestjs/config @nestjs/jwt passport passport-jwt bcrypt prisma @prisma/client
  ```
* Setup Prisma:

  ```bash
  npx prisma init
  ```


---

### Frontend (Next.js)

* Create project:

  ```bash
  npx create-next-app@latest lms-frontend
  ```
* Install dependencies:

  ```bash
  npm install axios zustand react-hook-form
  ```

---

## STEP 2 — Database Setup (Supabase) ✅ *Completed*

* Create project in Supabase
* Copy PostgreSQL connection string

### Configure Prisma (`schema.prisma`)

* Add models:

```prisma
model Institute {
  id        String   @id @default(uuid())
  name      String
  subdomain String   @unique
  users     User[]
  courses   Course[]
}

model User {
  id           String   @id @default(uuid())
  name         String
  email        String   @unique
  password     String
  role         String
  instituteId  String
  institute    Institute @relation(fields: [instituteId], references: [id])
}

model Course {
  id          String   @id @default(uuid())
  name        String
  instituteId String
  subjects    Subject[]
}

model Subject {
  id       String   @id @default(uuid())
  name     String
  courseId String
  contents Content[]
}

model Content {
  id        String @id @default(uuid())
  title     String
  type      String
  fileUrl   String
  subjectId String
}

model Enrollment {
  id        String @id @default(uuid())
  studentId String
  courseId  String
}

model Exam {
  id        String @id @default(uuid())
  title     String
  courseId  String
  duration  Int
}

model Question {
  id       String @id @default(uuid())
  examId   String
  question String
  options  Json
  answer   String
}

model Result {
  id        String @id @default(uuid())
  studentId String
  examId    String
  score     Int
}
```

* Run:

```bash
npx prisma migrate dev
```

---

## STEP 3 — Auth System (JWT) ✅ *Completed*

### Backend

* Implement:

  * Register (Institute + Admin)
  * Login
  * Password hashing (bcrypt)
  * JWT token generation

* Create:

  * AuthModule
  * AuthService
  * AuthController

---

## STEP 4 — Role-Based Access ✅ *Completed*

Roles:

* SUPER_ADMIN

* ADMIN

INSTITUTION_ADMIN 
TEACHER

* STUDENT

* Create Guard:

  * RoleGuard

* Protect routes

---

## STEP 5 — Multi-Tenant Logic ✅ *Completed*

* Every request must include:

  * `institute_id` (from JWT)

* Apply filter in all queries:

```ts
where: { instituteId: user.instituteId }
```

---

## STEP 6 — Institute Module ✅ *Completed*

* Create institute on signup
* Generate subdomain:

  * example: `/institute-name`

---

## STEP 7 — User Management

### Features:

* Create student
* Bulk upload (CSV)
* Assign role

### APIs:

* POST /users
* GET /users
* DELETE /users

---

## STEP 8 — Course Module

### APIs:

* POST /courses
* GET /courses
* PUT /courses
* DELETE /courses

---

## STEP 9 — Subject Module

* Add subjects under course

### APIs:

* POST /subjects
* GET /subjects

---

## STEP 10 — Content Upload (AWS S3)

Use Amazon S3

### Setup:

* Create S3 bucket
* Install:

```bash
npm install @aws-sdk/client-s3
```

### Backend:

* Upload API:

  * Accept file
  * Upload to S3
  * Store URL in DB

### Content Types:

* Video
* PDF

---

## STEP 11 — Student Enrollment

* Assign students to course

### API:

* POST /enroll

---

## STEP 12 — Exam System (Basic)

### Features:

* Create exam
* Add MCQ questions
* Timer
* Auto evaluation

### APIs:

* POST /exams
* POST /questions
* POST /submit

---

## STEP 13 — Result System

* Calculate score
* Store result

### API:

* GET /results

---

## STEP 14 — Frontend Auth

* Login page
* Store JWT (localStorage)
* Protect routes

---

## STEP 15 — Admin Dashboard UI

Pages:

* Dashboard
* Users
* Courses
* Subjects
* Content
* Exams

---

## STEP 16 — Student Dashboard

Pages:

* My Courses
* Watch Content
* Take Exam
* View Results

---

## STEP 17 — File Upload UI

* Upload video/pdf
* Show preview

---

## STEP 18 — Email System (AWS SES)

Use Amazon SES

### Setup:

* Verify domain/email
* Install SDK

### Use Cases:

* Student login credentials
* Notifications

---

## STEP 19 — Basic UI Polish

* Clean layout
* Simple navigation
* Mobile responsiveness (basic)

---

## STEP 20 — Testing

* Test all flows:

  * Admin creates course
  * Student logs in
  * Student takes exam

---

## FINAL OUTPUT

You should now have:

* Multi-tenant LMS
* Admin + Student panels
* Course + content system
* Basic exam system
* File storage (S3)
* Email system (SES)

---

## IMPORTANT RULES

* Do NOT add extra features
* Do NOT delay for perfection
* Do NOT build mobile app now
* Do NOT implement custom domain now

---

## SUCCESS CRITERIA

You are DONE when:

* You can demo to institute in 10 minutes
* Student can:

  * Login
  * Watch class
  * Take test

---

END.
