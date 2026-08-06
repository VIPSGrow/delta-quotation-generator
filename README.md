# Quotation Generator PWA

A mobile-first Progressive Web App (PWA) for generating quotations, built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma ORM**, and **SQLite**.

## ✨ Features

- 🔐 **Authentication** — JWT-based login with username/password (bcrypt hashed), protected routes.
- 📦 **Item Master** — Full CRUD for items (name, unit, default price).
- 📝 **Quotation Creation** — Dynamic rows, live amount calculation (`Qty × Price`), auto grand total.
- 🗂 **Quotation History** — List of saved quotations with totals and dates.
- 🖨 **PDF / Print** — WhatsApp-friendly, print-ready quotation document (browser Print → Save as PDF).
- 📱 **PWA** — Add to Home Screen, mobile-first responsive UI.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18.17+ or v20+)
- npm

### 1. Install dependencies

```bash
cd quotation-generator
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` (already provided) and set a strong `JWT_SECRET`:

```bash
# .env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-long-random-secret"
```

### 3. Set up the database (SQLite)

```bash
npx prisma migrate dev --name init
# or, without migrations:
npx prisma db push
```

### 4. Seed default admin user & sample items

```bash
npm run db:seed
```

### 5. Run the dev server

```bash
npm run dev
```

Open **http://localhost:3000** and log in with:

- **Username:** `admin`
- **Password:** `admin123`

### 6. Production build

```bash
npm run build
npm start
```

## 📁 Project Structure

```
.
├── app/
│   ├── api/
│   │   ├── auth/login/route.ts        # Login + session check
│   │   ├── auth/logout/route.ts       # Logout
│   │   ├── items/route.ts             # Item list/create
│   │   ├── items/[id]/route.ts        # Item get/update/delete
│   │   ├── quotations/route.ts        # Quote list/create
│   │   └── quotations/[id]/route.ts   # Quote get/delete
│   ├── layout.tsx                     # Root layout
│   ├── manifest.ts                    # PWA manifest
│   ├── page.tsx                       # Redirect to /login or /dashboard
│   ├── login/page.tsx                 # Login page
│   ├── dashboard/page.tsx             # Dashboard
│   ├── items/page.tsx                 # Item CRUD UI
│   ├── quotations/
│   │   ├── page.tsx                   # History list
│   │   ├── create/page.tsx            # Dynamic quotation form
│   │   └── [id]/page.tsx              # Printable quotation view
├── components/
│   ├── AuthGuard.tsx                  # Client-side auth guard
│   ├── NavBar.tsx                     # Navigation bar
│   └── PrintButton.tsx                # Print/PDF button
├── lib/
│   ├── db.ts                          # Prisma client singleton
│   ├── jwt.ts                         # JWT sign/verify (jose)
│   ├── auth.ts                        # Session helpers
│   └── api-auth.ts                    # API route auth helper
├── prisma/
│   ├── schema.prisma                 # Database schema
│   └── seed.ts                       # Seed script
├── middleware.ts                     # Route protection
└── public/icons/icon.svg            # PWA icon
```

## 🔐 Security Notes

- Passwords are hashed with `bcryptjs`.
- JWT stored in an HttpOnly cookie (7-day expiry).
- `JWT_SECRET` must be changed from the default in production.
- All API routes and pages verify the session.

## 📝 Notes

- The quotation PDF is generated via the browser's **Print → Save as PDF** (print styles are included).
- `prisma/dev.db` is gitignored; recreate it on a fresh server with `prisma migrate dev` + `prisma db seed`.
