# घरभाडा (GharBhada) — Phase 1

काठमाडौंको लागि tenant–landlord घरभाडा digitalization platform। यो **Phase 1** deliverable हो: authentication, property listing (admin approval सहित), search/filter, visit-warning सहितको 4-step booking flow, booking accept/reject, र KMC कर क्याल्कुलेटर।

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS + React Router + React Hook Form + Axios |
| Backend | Node.js + Express + TypeScript + Zod validation + Multer (photo upload) |
| Database | Prisma 7 ORM — PostgreSQL (Supabase) |
| Auth | JWT (7-day expiry) + bcrypt (12 salt rounds) |

## चलाउने तरिका (Local Development)

```bash
# 1. Backend — server/.env मा DATABASE_URL + DIRECT_URL (Supabase Postgres) राख्नुहोस्
cd server
npm install
npx prisma migrate dev                # DB tables बनाउँछ
npm run seed                          # demo accounts + 4 properties
npm run dev                           # → http://localhost:4000

# 2. Frontend (अर्को terminal)
cd client
npm install
npm run dev                           # → http://localhost:5173
```

### Demo Accounts (password: `password123`)

| Role | Email |
|---|---|
| Tenant | tenant@test.com |
| Landlord | landlord@test.com |
| Admin | admin@gharbhada.com |

## Phase 1 मा के-के छ

**Tenant:** दर्ता/लगइन (email वा फोनबाट), property search (वडा १–३२, भाडा दायरा, सुविधा filter), property detail (photos, agreement type badge, masked landlord contact), "के तपाईंले physically कोठा हेर्नुभयो?" warning modal, 4-step booking form (व्यक्तिगत विवरण + नागरिकता फोटो front/back, co-tenants max ३, आपतकालीन सम्पर्क, घोषणा), मेरो बुकिङ dashboard — status अनुसार, accepted भएपछि मात्र landlord को फोन खुल्छ।

**Landlord:** दर्ता/लगइन, property थप्ने (min ३ photos enforced — कोठा/बाथरूम/भवन, min भाडा रु ५,०००, वडा dropdown, ८ सुविधा checkbox, घोषणा), listing हरू admin approval नभएसम्म public हुँदैनन्, booking request accept/reject, खाली/भरिएको toggle, कर घोषणा tab (KMC redirect)।

**Admin (API-level):** listing approve/reject (`PUT /api/properties/:id/verify`)। Admin UI Phase 2 मा।

**साझा:** KMC घरबहाल कर क्याल्कुलेटर (१०%), agreement type auto-detection (रु २०,०००+ → Standard/लिखित अनिवार्य — Muluki Civil Code 2074 धारा ३८६; कम → Simple), नेपाली-primary UI (Mukta font), mobile bottom-nav responsive design।

## API Endpoints

```
POST /api/auth/register        दर्ता (tenant/landlord)
POST /api/auth/login           लगइन (email वा phone)
GET  /api/auth/me              आफ्नो profile
PUT  /api/auth/profile         profile update

GET  /api/properties           public listing (filters: ward, minRent, maxRent, amenities, q)
GET  /api/properties/mine      landlord का आफ्ना listings
GET  /api/properties/:id       detail (landlord phone masked)
POST /api/properties           नयाँ listing (multipart, min 3 photos, landlord only)
PUT  /api/properties/:id       update / खाली-भरिएको toggle
DELETE /api/properties/:id     delete (सक्रिय booking भए block)
PUT  /api/properties/:id/verify  admin approval

POST /api/bookings             booking (multipart, नागरिकता photos अनिवार्य, tenant only)
GET  /api/bookings/tenant      tenant का bookings
GET  /api/bookings/landlord    landlord का booking requests
PUT  /api/bookings/:id/accept  स्वीकार
PUT  /api/bookings/:id/reject  अस्वीकार

GET  /api/tax/calculate?monthlyRent=15000   KMC कर गणना (१०%)
GET  /api/kmc/tax-portal       KMC portal redirect info
```

## Testing

```bash
# Server चालु राखेर:
bash test-e2e.sh    # 25 automated API tests (validation, auth guards, masking, booking flow)
```

## Production Deploy (Vercel + Railway/Render + Supabase)

1. **Database:** ✅ Done — Supabase Postgres मा migrate भइसक्यो (`@prisma/adapter-pg` + `PrismaPg` adapter प्रयोग हुँदैछ)।
2. **Backend (Railway/Render):** `server/` deploy गर्नुहोस्। Env: `DATABASE_URL`, `JWT_SECRET` (लामो random string), `CLIENT_URL` (frontend को URL), `PORT`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`। ✅ Done — photos/citizenship docs अब Supabase Storage मा जान्छन् (ephemeral disk होइन)। Deploy गर्नु अघि एक पटक `npm run setup-storage` चलाएर buckets बनाउनुहोस्।
3. **Frontend (Vercel):** `client/` deploy गर्नुहोस्। Env: `VITE_API_URL` = backend URL। SPA routing को लागि rewrite rule: सबै path → `/index.html`।

## Roadmap — Phase 2 र 3

**Phase 2:** eSewa/Khalti sandbox payment (advance/भाडा), agreement PDF generation (Standard नेपाली+English / Simple नेपाली, auto-fill), फोन OTP (Sparrow SMS), rent receipt PDF, admin dashboard UI (user KYC, listing approval, transaction export), payment webhook + receipt। `.env` मा eSewa sandbox credentials र Payment/Agreement DB tables पहिले नै तयार छन्।

**Phase 3:** ConnectIPS, KMC tax portal API integration (formal agreement पछि), dispute resolution + ward office routing, review system (photos_match rating), earnings chart, SMS reminders, नेपाली/English toggle, digital signature।

## कानूनी आधार

- **Muluki Civil Code 2074, धारा ३८६:** रु २०,०००+ मासिक भाडामा लिखित सम्झौता अनिवार्य — platform ले agreement type auto-detect गर्छ।
- **KMC घरबहाल कर:** बहाल आयको १०% — क्याल्कुलेटर र portal link दुवै dashboard मा।
- **Individual Privacy Act 2075:** नागरिकता photos/details को लागि consent checkboxes; production मा encrypted storage सिफारिस।
- Notice period: 35 दिन (agreement schema मा default)।
