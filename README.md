<div align="center">

# 🏥 MediFind 2.0
### Intelligent Medicine Availability, Proximity Search & Emergency Pharmacy Discovery Platform

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini_2.5_Flash-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=black)](https://render.com/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

<p align="center">
  <b>A full-stack, AI-powered healthcare ecosystem that connects patients with nearby verified pharmacies in real time.</b>
</p>

</div>

---

## 📑 Table of Contents
- [📌 Overview & Problem Statement](#-overview--problem-statement)
- [✨ Key Features](#-key-features)
  - [👤 Patient / Customer](#-patient--customer)
  - [🏬 Pharmacy Partner](#-pharmacy-partner)
  - [🛡️ System Administrator](#️-system-administrator)
  - [🤖 MediFind AI Subsystem](#-medifind-ai-subsystem)
- [🏗️ System Architecture](#️-system-architecture)
- [🧠 AI & Demand Forecasting Engine](#-ai--demand-forecasting-engine)
- [💻 Tech Stack](#-tech-stack)
- [📁 Codebase Directory Structure](#-codebase-directory-structure)
- [🔑 Pre-Seeded Test Credentials](#-pre-seeded-test-credentials)
- [🚀 Local Development Setup](#-local-development-setup)
- [🧪 Automated Integration Testing](#-automated-integration-testing)
- [📡 API Documentation](#-api-documentation)
- [🌐 Cloud Deployment (Render + Vercel)](#-cloud-deployment-render--vercel)
- [🔒 Security & Reliability Features](#-security--reliability-features)
- [📄 License](#-license)

---

## 📌 Overview & Problem Statement

Finding prescribed medicines during medical emergencies often turns into a stressful race against time. Patients and caregivers frequently face:
1. **Critical Inventory Blind Spots:** Calling or visiting multiple physical chemist shops only to find the medicine is out of stock.
2. **Emergency Night Hours:** Uncertainty over which nearby pharmacies are open 24/7 or offer emergency dispatch.
3. **Price Discrepancies:** Lack of transparency regarding generic alternatives and fair medicine prices.
4. **Prescription Processing Delays:** Manual queue times at pharmacy counters.

**MediFind** resolves these challenges through an integrated real-time platform with **natural-language AI intent discovery**, **live GPS proximity tracking**, **side-by-side pharmacy comparison**, **30-minute reservation holds with pickup verification**, and **multi-item delivery checkout**.

---

## ✨ Key Features

### 👤 Patient / Customer
* 🔍 **Natural Language AI Search:** Search via everyday queries (e.g., *"Need paracetamol under ₹50 near me"*, *"Tablets for sudden acidity"*).
* 📍 **Live Proximity & Map Navigation:** Interactive **Leaflet.js** map with pulsing GPS markers, route estimation, and distance calculation via the Haversine formula.
* ⚖️ **4-Way Pharmacy Comparison Matrix:** Rank matching pharmacies side-by-side by:
  * **Best Match** (Weighted composite score: distance, price, rating, stock)
  * **Nearest** (Sorted by distance in km)
  * **Lowest Price** (Sorted by lowest unit price in ₹)
  * **Highest Rated** (Sorted by pharmacy star rating)
* ⏱️ **30-Minute Counter Reservation:** Lock inventory immediately with a unique **6-digit alphanumeric pickup PIN** and automated countdown release worker.
* 🛒 **Multi-Item Cart & Checkout:** Atomic transactional checkout with choice between **Standard Delivery** and **Priority Emergency Dispatch**.
* 📄 **Prescription Upload:** Securely upload prescription files (Cloudinary cloud storage with local Multer fallback) for pharmacist verification.
* 💬 **Real-Time Order Tracking & Live Chat:** Instant status updates via WebSockets and direct chat communication with pharmacy staff.

### 🏬 Pharmacy Partner
* 📦 **Live Inventory & Batch Tracking:** Manage stock quantities, prices, discounts, batch numbers, and expiry dates.
* 📋 **Dispatch & Pickup Queue:** Live dashboard for incoming emergency orders and counter pickup holds.
* 🩺 **Prescription Verification Workflow:** Review uploaded doctor prescriptions and link verified medicines directly to customer orders.
* 📊 **Demand Forecasting & Inventory Analytics:** Velocity-based consumption analysis estimating days-to-stockout and reorder thresholds.
* 💡 **AI Restock Priority Advisor:** Automated restock recommendations pinpointing high-demand medicines running critically low.

### 🛡️ System Administrator
* 🏢 **Pharmacy Verification & Licensing:** Review pharmacy licenses and approve verified shops before they appear in public search results.
* 📈 **Platform-Wide Analytics:** Total revenue, order completion volume, active users, search metrics, and demand distributions.
* 📜 **Security Audit Logging:** Immutable audit logs capturing logins, access attempts, and administrative actions.

### 🤖 MediFind AI Subsystem
Dual-pipeline hybrid architecture powered by **Google Gemini 2.5 Flash**:
1. **Clinical Intent Extraction:** Extracts active salts, category filters, price ceilings, emergency flags, and radius constraints from natural language.
2. **Grounded Inventory & Monograph Verification:** Matches extracted parameters against verified live pharmacy stock and clinical pharmacology monographs (uses, precautions, and mandatory medical disclaimers).
3. **Safety-Aware Conversational Assistant:** Answers general health, pharmacy, and technological questions without making unauthorized medical diagnoses.

---

## 🏗️ System Architecture

```text
 ┌────────────────────────────────────────────────────────────────────────┐
 │                           PATIENT / PHARMACY UI                        │
 │           React 18.3 SPA (Vite) + Tailwind CSS + Lucide Icons          │
 └──────────────────┬─────────────────────────────────┬───────────────────┘
                    │ REST API Requests               │ WebSocket Events
                    ▼                                 ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      EXPRESS.JS BACKEND SERVER                         │
 │        Node.js REST API  •  Socket.IO Server  •  JWT Auth Guards       │
 └──────┬──────────────┬──────────────┬──────────────┬─────────────┬──────┘
        │              │              │              │             │
        ▼              ▼              ▼              ▼             ▼
 ┌─────────────┐┌─────────────┐┌─────────────┐┌─────────────┐┌─────────────┐
 │  MongoDB /  ││   Google    ││  Cloudinary ││  30-Minute  ││   Demand    │
 │  Local JSON ││ Gemini 2.5  ││ Prescription││   Expiry    ││ Forecasting │
 │   Store     ││  Flash API  ││   Storage   ││   Worker    ││   Engine    │
 └─────────────┘└─────────────┘└─────────────┘└─────────────┘└─────────────┘
```

---

## 🧠 AI & Demand Forecasting Engine

### 1. Dual-Pipeline AI Intent Flow

```
                           User Query
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Google Gemini 2.5    │
                    │   Flash Model        │
                    └──────────┬───────────┘
                               │
                       Intent Detection
                               │
             ┌─────────────────┴─────────────────┐
             │                                   │
             ▼                                   ▼
    [ Medicine / Pharmacy ]              [ General Question ]
             │                                   │
             ▼                                   ▼
    ┌─────────────────┐                 ┌─────────────────┐
    │ Grounded Search │                 │  Safety-Aware   │
    │  & Monograph    │                 │  Gemini Answer  │
    └────────┬────────┘                 └────────┬────────┘
             │                                   │
             └─────────────────┬─────────────────┘
                               │
                               ▼
                       Structured Response
                  (+ Safety Medical Disclaimer)
```

### 2. Velocity-Based Demand Forecasting
The inventory analytics module computes daily consumption velocity over a 30-day historical window:

$$\text{Daily Sales Velocity} = \frac{\sum \text{Quantity Sold in Window}}{\text{Lookback Window (Days)}}$$

$$\text{Estimated Days to Stockout} = \frac{\text{Current Available Stock}}{\text{Daily Sales Velocity}}$$

* **🚨 Critical Alert:** $\text{Days to Stockout} \le 3$
* **⚠️ Warning Alert:** $3 < \text{Days to Stockout} \le 7$
* **✅ Healthy Stock:** $\text{Days to Stockout} > 7$

---

## 💻 Tech Stack

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18.3.1 | Component-driven Single Page Application |
| **Build Tool** | Vite 8.x | High-speed bundling, HMR, and optimization |
| **Styling** | Tailwind CSS + Lucide Icons | Responsive modern design system |
| **Mapping & GPS** | Leaflet.js / React-Leaflet | Open-source interactive map without billing API limits |
| **Backend Runtime** | Node.js (v18+) | Server-side JavaScript runtime |
| **Web Framework** | Express.js 4.x | RESTful API routing, middleware, and error handling |
| **Real-Time Events** | Socket.IO 4.8 | Bidirectional WebSockets for live chat, stock & order tracking |
| **AI / LLM** | Google Gemini (`gemini-2.5-flash`) | Natural language intent extraction & general Q&A |
| **Database** | MongoDB Atlas + Mongoose 8.x | Document database with replica set transaction support |
| **Offline Resilience** | High-Performance Local JSON Store | Dual-database engine ensuring zero crash if MongoDB is offline |
| **File Storage** | Cloudinary API + Multer | Cloud prescription document uploads with local fallback |
| **Security** | JWT, Bcrypt.js, Strict CORS | Token authentication, password hashing, and origin guards |

---

## 📁 Codebase Directory Structure

```text
MediFind/
├── client/                     # Vite + React Frontend SPA
│   ├── src/
│   │   ├── components/         # Navbar, ChatDrawer, MapContainer, PharmacyComparison, etc.
│   │   ├── context/            # AuthContext, SocketContext, CartContext
│   │   ├── pages/              # LandingPage, AuthPages, CustomerDashboard, PharmacyDashboard, AdminDashboard
│   │   ├── services/           # api.js (Axios API instance), aiApi.js (AI endpoints)
│   │   ├── config.js           # Runtime API and Socket URL resolver
│   │   ├── App.jsx             # Route definitions & state providers
│   │   └── main.jsx            # Application entry point
│   ├── .env.example            # Client environment blueprint
│   └── package.json
├── config/                     # Database connection & MongoDB config
├── controllers/                # Request handlers (auth, ai, medicines, orders, reservations, etc.)
├── middleware/                 # Auth verification, RBAC, validators, error handler
├── models/                     # Mongoose Schemas (User, Medicine, Order, Reservation, Review, etc.)
├── routes/                     # REST route controllers & Swagger /docs specification
├── services/                   # AI service (Gemini), Grounded medicine search engine
├── tests/                      # Automated integration test suite (api.test.js)
├── utils/                      # Expiry worker, Demand forecasting, Local DB fallback, Audit logger
├── server.js                   # Express server & Socket.IO initialization
├── render.yaml                 # Render cloud deployment blueprint
├── .env.example                # Backend environment blueprint
└── package.json
```

---

## 🔑 Pre-Seeded Test Credentials

The database automatically seeds on startup with demo accounts ready for immediate evaluation:

| Role | Email | Password | Location / Purpose |
| :--- | :--- | :--- | :--- |
| **Customer** | `customer@medifind.com` | `password123` | Koramangala, Bengaluru (Patient Account) |
| **Pharmacy 1** | `pharmacy@medifind.com` | `password123` | Apollo Pharmacy (Indiranagar, Bengaluru - 24/7 Emergency) |
| **Pharmacy 2** | `city@medifind.com` | `password123` | City Medicos (Koramangala, Bengaluru - Verified Partner) |
| **Admin** | `admin@medifind.com` | `password123` | System Administrator Dashboard |

---

## 🚀 Local Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (v9 or higher)
- [Google Gemini API Key](https://aistudio.google.com/) *(Free tier)*

### Step 1: Clone the Repository
```bash
git clone https://github.com/shriparna14/MediFind.git
cd MediFind
```

### Step 2: Configure Environment Variables

Create `.env` in the root directory:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/medifind
JWT_SECRET=your_jwt_secret_key_2026
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173
GEMINI_API_KEY=your_gemini_api_key

# Optional: Cloudinary configuration for cloud prescription storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Create `client/.env`:
```env
VITE_API_URL=http://localhost:5000
```

### Step 3: Install Dependencies
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### Step 4: Seed Database
```bash
npm run seed
```

### Step 5: Start Development Servers
```bash
# Terminal 1: Start Express API server (port 5000)
npm run dev

# Terminal 2: Start Vite React application (port 5173)
cd client
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 🧪 Automated Integration Testing

MediFind includes an automated test runner validating security guards, authentication, N+1 query prevention, AI intent parsing, multi-item order transactions, 30-minute reservation holds, and demand forecasting:

```bash
# Start backend in one terminal:
npm run dev

# Execute the test suite in a second terminal:
npm test
```

### Test Suite Highlights:
- ✅ **Security Guard:** Rejects public admin registration attempts with `403 Forbidden`.
- ✅ **Authentication:** Validates JWT generation and session retrieval for customers and pharmacies.
- ✅ **Database Population:** Verifies medicine search populates related pharmacy data (N+1 query fix).
- ✅ **AI Intent Discovery:** Validates LLM extraction of keyword, category, price limit, and emergency flag.
- ✅ **Pharmacology Monograph:** Verifies medical precautions and disclaimer formatting.
- ✅ **General AI Query:** Verifies conversational answer generation for general knowledge prompts.
- ✅ **Pharmacy Comparison:** Tests side-by-side multi-factor scoring (distance, price, rating, stock).
- ✅ **Atomic Order Transaction:** Verifies stock decrement during multi-item checkout.
- ✅ **Reservation Hold & Expiry Worker:** Verifies 30-minute hold creation and pickup PIN generation.
- ✅ **Demand Forecasting:** Calculates sales velocity and reorder urgency metrics.

---

## 📡 API Documentation

Interactive Swagger-style API documentation is available at `http://localhost:5000/docs` or via `/api/docs`.

### Key Endpoints:

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register customer or pharmacy account *(admin registration is blocked)* |
| `POST` | `/api/auth/login` | Public | Authenticate user and return JWT bearer token |
| `GET` | `/api/auth/me` | Authenticated | Retrieve authenticated user profile session |
| `POST` | `/api/ai/chat` | Public | Natural language intent extraction, grounded medicine discovery & general Q&A |
| `GET` | `/api/ai/search?q={query}` | Public | AI-assisted search with auto-extracted parameters |
| `GET` | `/api/ai/inventory-advice` | Pharmacy | AI restock priority recommendations for pharmacy owners |
| `GET` | `/api/medicines/search` | Public | Search medicine inventory with filters, coordinates, and pagination |
| `GET` | `/api/pharmacies/compare` | Public | Compare pharmacies offering a specific medicine |
| `POST` | `/api/orders` | Customer | Atomic multi-item checkout transaction |
| `POST` | `/api/reservations` | Customer | Create 30-minute counter hold with 6-digit pickup code |
| `POST` | `/api/prescriptions` | Customer | Upload prescription document (Cloudinary / Multer) |
| `GET` | `/api/pharmacies/demand-prediction` | Pharmacy | Velocity-based inventory stockout predictions |
| `GET` | `/api/admin/stats` | Admin | Platform-wide metrics and analytics |
| `GET` | `/api/health` | Public | System health check and database status probe |

---

## 🌐 Cloud Deployment (Render + Vercel)

### Backend Deployment (Render)
1. Link your GitHub repository to [Render](https://render.com/).
2. Create a **Web Service** with:
   - **Root Directory:** `.`
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
3. Set **Environment Variables** in Render:
   - `MONGODB_URI` = `<your-mongodb-atlas-uri>`
   - `JWT_SECRET` = `<your-jwt-secret>`
   - `GEMINI_API_KEY` = `<your-gemini-api-key>`
   - `CLIENT_URL` = `https://your-app.vercel.app`

### Frontend Deployment (Vercel)
1. Import your GitHub repository to [Vercel](https://vercel.com/).
2. Set **Root Directory** to `client`.
3. Framework Preset: **Vite**.
4. Set **Environment Variables** in Vercel:
   - `VITE_API_URL` = `https://your-backend.onrender.com`
5. Deploy.

---

## 🔒 Security & Reliability Features

* 🛡️ **Role-Based Access Control (RBAC):** Strict middleware guards verifying roles (`customer`, `pharmacy`, `admin`).
* 🚫 **Admin Registration Guard:** Public signup endpoint explicitly rejects `role: "admin"` to prevent privilege escalation.
* ⚛️ **Atomic Stock Decrement:** MongoDB sessions/transactions ensure inventory counts are never oversold under concurrent checkout contention.
* ⏰ **Automated Expiry Worker:** Background cron running every 60 seconds automatically releases abandoned reservations after 30 minutes.
* 🌐 **Strict CORS Configuration:** Origin whitelisting rejecting unauthorized cross-origin requests.
* 💾 **Dual-Database Fail-Safe:** Built-in high-performance local JSON fallback ensures the app operates smoothly even during database connectivity drops.

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
