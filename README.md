# 🏥 MediFind 2.0
> **Intelligent Medicine Availability, Proximity Search & Emergency Pharmacy Discovery Platform**

[![Node.js Version](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF.svg)](https://vitejs.dev/)
[![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini%202.5%20Flash-8E75B2.svg)](https://deepmind.google/technologies/gemini/)
[![Socket.IO](https://img.shields.io/badge/RealTime-Socket.IO-010101.svg)](https://socket.io/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20%2B%20Mongoose-47A248.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📌 Overview

**MediFind** is a full-stack emergency healthcare and medicine discovery web application that bridges the gap between patients, verified pharmacies, and healthcare information. 

Instead of calling multiple pharmacies during medical emergencies, users can instantly discover medicine availability, compare live prices, check distances via geolocation, hold medicines with **30-minute reservation holds**, place delivery orders, upload prescriptions, and ask questions to **MediFind AI** powered by **Google Gemini 2.5 Flash**.

---

## 🌟 Key Features

### 👤 Patient / Customer
- **AI-Assisted Natural Language Search**: Search symptoms, brand names, or active salts in everyday language (e.g., *"Find paracetamol under ₹50 near me"*).
- **Proximity & Emergency Discovery**: Find open pharmacies within custom radii (5–50 km) with Haversine GPS distance calculation and 24/7 emergency tags.
- **Smart Pharmacy Comparison Matrix**: Compare options side-by-side by *Best Match*, *Nearest Distance*, *Lowest Price*, and *Highest Rating*.
- **30-Minute Counter Reservation**: Lock stock instantly with a 6-digit pickup code and automatic countdown timer.
- **Transactional Cart & Multi-Item Orders**: Place delivery orders (Standard or Priority Emergency Dispatch) with atomic MongoDB stock deduction.
- **Prescription Upload**: Securely upload doctor prescriptions (Cloudinary storage / Multer fallback) for pharmacist review.
- **Interactive Map View**: Visual pharmacy discovery powered by Leaflet.js with live pulsing location pins.
- **Real-Time Order Tracking & Direct Chat**: Track order lifecycle updates via WebSockets and chat directly with pharmacists.

### 🏢 Pharmacy Partner Dashboard
- **Live Inventory & Batch Management**: Real-time stock updates, price modification, batch numbers, and expiry date monitoring.
- **Order & Reservation Dispatch Queue**: Accept, prepare, and advance orders with live patient notification broadcasts.
- **Prescription Verification**: Review uploaded prescriptions, verify validity, and attach medicines directly to customer orders.
- **Demand Forecasting & Inventory Analytics**: Velocity-based consumption tracking, stockout estimation, and reorder urgency metrics.
- **Pharmacist AI Restock Advisor**: Actionable automated restock recommendations based on low-stock thresholds and high-demand medicines.

### 🛡️ System Administration
- **Pharmacy Verification & License Approval**: Multi-point validation before pharmacies are visible in public search results.
- **Platform Analytics**: Total revenue, platform order volume, active users, search metrics, and demand distributions.
- **Security Audit Logs**: Track authentication attempts, permission violations, and administrative state changes.

### 🤖 MediFind AI Subsystem
Dual-pipeline hybrid AI engine combining LLM natural language understanding with strictly grounded clinical databases:
```
                              User Prompt
                                   │
                                   ▼
                         ┌───────────────────┐
                         │  Google Gemini    │
                         │ (gemini-2.5-flash)│
                         └─────────┬─────────┘
                                   │
                           Intent Detection
                                   │
                 ┌─────────────────┴─────────────────┐
                 │                                   │
                 ▼                                   ▼
       [ Medicine / Pharmacy ]               [ General Question ]
                 │                                   │
                 ▼                                   ▼
      ┌─────────────────────┐             ┌─────────────────────┐
      │  Grounded Database  │             │  Safety-Aware       │
      │  & Monograph Lookup │             │  Gemini Answer      │
      └──────────┬──────────┘             └──────────┬──────────┘
                 │                                   │
                 └─────────────────┬─────────────────┘
                                   │
                                   ▼
                          Structured Response
                         (with Medical Advice
                          Safety Disclaimer)
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18.3, Vite, Tailwind CSS, Lucide Icons, Leaflet / React-Leaflet, Axios, Socket.IO Client |
| **Backend** | Node.js, Express.js (RESTful Architecture), Socket.IO (WebSockets) |
| **AI / NLP** | Google Gemini (`gemini-2.5-flash`), Rule-Based NLP Fallback Engine |
| **Database** | MongoDB with Mongoose (with automated High-Performance Local JSON DB fallback) |
| **File Storage** | Cloudinary API with local Multer disk fallback |
| **Security** | JWT (JSON Web Tokens), Bcrypt.js, CORS Origin Guards, Express Error Handler |
| **Deployment** | Render (Express & Socket.IO Server), Vercel (Vite Frontend SPA) |

---

## 📂 Project Structure

```text
MediFind/
├── client/                     # Vite + React Frontend
│   ├── src/
│   │   ├── components/         # Navbar, ChatDrawer, MapView, Footer, etc.
│   │   ├── context/            # AuthContext, SocketContext
│   │   ├── pages/              # Home, Search, Pharmacy, Admin, Login, Register
│   │   ├── services/           # api.js, aiApi.js
│   │   └── config.js           # Runtime URL resolution
│   ├── .env.example            # Client environment blueprint
│   └── package.json
├── config/                     # Database connection & MongoDB config
├── controllers/                # Request handlers (auth, ai, medicines, orders, etc.)
├── middleware/                 # Auth verification, role RBAC, validators, error handler
├── models/                     # Mongoose Schemas (User, Medicine, Order, Reservation, etc.)
├── routes/                     # REST API route definitions & Swagger /docs
├── services/                   # AI service (Gemini), Medicine search grounded logic
├── tests/                      # Automated integration test suite (api.test.js)
├── utils/                      # Expiry worker, Demand forecasting, Local DB fallback, Audit logger
├── server.js                   # Express server & Socket.IO initialization
├── render.yaml                 # Render cloud deployment blueprint
├── .env.example                # Backend environment blueprint
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: Local MongoDB instance or free MongoDB Atlas cluster *(Optional: local JSON database operates automatically if MongoDB is not provided)*
- **Google Gemini API Key**: Free API key from [Google AI Studio](https://aistudio.google.com/)

---

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/shriparna14/MediFind.git
cd MediFind

# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

---

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/medifind
JWT_SECRET=your_super_secret_jwt_key_2026
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173
GEMINI_API_KEY=your_google_gemini_api_key

# Optional: Cloudinary configuration for prescription cloud storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Create a `client/.env` file:

```env
VITE_API_URL=http://localhost:5000
```

---

### 3. Seed Database with Demo Accounts

```bash
npm run seed
```

This populates verified pharmacies, medicine catalogs, batch numbers, orders, and initial accounts.

#### 🔑 Pre-Seeded Test Credentials

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Customer** | `customer@medifind.com` | `password123` | Verified Patient Account |
| **Pharmacy 1** | `pharmacy@medifind.com` | `password123` | Apollo Pharmacy (Indiranagar, Bengaluru) |
| **Pharmacy 2** | `city@medifind.com` | `password123` | City Medicos (Koramangala, Bengaluru) |
| **Admin** | `admin@medifind.com` | `password123` | System Administrator Dashboard |

---

### 4. Run Development Servers

```bash
# Terminal 1: Start Backend API (runs on port 5000 with nodemon)
npm run dev

# Terminal 2: Start Frontend (runs on port 5173 with Vite)
cd client
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🧪 Automated Testing

MediFind includes an automated end-to-end API test suite validating security guards, multi-item transactions, AI intent extraction, monograph retrieval, general AI queries, and demand forecasting.

```bash
# Start backend server in one terminal:
npm run dev

# Run automated tests in a second terminal:
npm test
```

### Test Coverage Highlights:
- ✅ **Admin Public Signup Guard**: Verifies that public registration attempts with `role: "admin"` are strictly rejected with `403 Forbidden`.
- ✅ **Authentication**: Customer and pharmacy token generation and session profiles.
- ✅ **N+1 Query Prevention**: Medicine search populates pharmacy relationships efficiently.
- ✅ **AI Natural Language Discovery**: Verifies parameter extraction (salt, price ceiling, emergency flag).
- ✅ **AI Pharmacology Monograph**: Educational drug precautions and medical disclaimers.
- ✅ **AI General Conversational Reasoning**: Verifies Gemini answer pipeline for non-inventory health/knowledge queries.
- ✅ **Multi-Factor Pharmacy Comparison**: Evaluates rating, distance, price, and live stock scoring.
- ✅ **Atomic Checkout & 30-Minute Hold**: Stock decrement and automatic expiry release.
- ✅ **Demand Forecasting**: Sales velocity calculation and stockout alert generation.

---

## 📡 API Endpoints Overview

Interactive web documentation is accessible at `http://localhost:5000/docs` or via `/api/docs`.

### Key Endpoints:
- `POST /api/auth/register` — Register a customer or pharmacy account.
- `POST /api/auth/login` — Authenticate and receive JWT bearer token.
- `POST /api/ai/chat` — Natural language AI search, drug monograph info, or general AI answer.
- `GET /api/medicines/search` — Filter medicines by keyword, category, price, radius, and coordinates.
- `GET /api/pharmacies/compare` — Compare pharmacies offering a specific medicine side-by-side.
- `POST /api/orders` — Create multi-item order with atomic stock reduction.
- `POST /api/reservations` — Create 30-minute hold reservation with 6-digit pickup code.
- `POST /api/prescriptions` — Upload prescription document for pharmacist review.
- `GET /api/pharmacies/demand-prediction` — Velocity-based inventory stockout predictions.
- `GET /api/health` — Service health and database status probe.

---

## 🌐 Production Deployment

### Backend (Render)
1. Create a **Web Service** pointing to the repository root.
2. Build Command: `npm run build` *(or `npm install`)*.
3. Start Command: `npm start`.
4. Add Environment Variables:
   - `MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, `CLIENT_URL=https://your-app.vercel.app`

### Frontend (Vercel)
1. Import repository and set **Root Directory** to `client`.
2. Framework Preset: `Vite`.
3. Add Environment Variable:
   - `VITE_API_URL=https://your-backend.onrender.com`

---

## 📄 License

This project is licensed under the **MIT License**.
