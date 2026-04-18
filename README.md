# HealthyAI Fullstack

Monorepo structure:
- `frontend`: React + Vite + Framer Motion for multi-page UI with smooth transitions.
- `backend`: Node.js + Express + MongoDB + OpenAI for API and AI customer support.
- `admin`: reserved folder for future standalone admin app.

Backend folder layout:
- `backend/config`
- `backend/controllers`
- `backend/middlewares`
- `backend/models`
- `backend/routes`
- `backend/server.js`

## 1) Requirements

- Node.js 18+
- MongoDB (local or Atlas)

## 2) Environment variables

### Backend

Create `backend/.env` from `backend/.env.example`.

Required keys:
- `MONGODB_URI`
- `JWT_SECRET`
- `OPENAI_API_KEY` (optional, fallback AI reply is used if empty)

### Frontend

Create `frontend/.env` from `frontend/.env.example`.

## 3) Run backend

```bash
cd backend
npm install
npm start dev
```

## 4) Run frontend

```bash
cd frontend
npm install
npm run dev
```

Default URLs:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## Demo accounts

- Customer: register from `/register`
- Admin (seeded):
  - Email: `admin@booking.com`
  - Password: `12345sau`

## Main pages mapped from Figma

- `/login`: authentication landing
- `/register`: membership registration
- `/dashboard`: patient dashboard
- `/doctors`: doctor booking with QR payment modal
- `/diagnosis`: AI diagnosis chat workspace
- `/records`: electronic medical records
- `/admin/dashboard`: admin overview
- `/admin/doctors`: doctor management list
- `/admin/doctors/:id`: doctor profile detail
