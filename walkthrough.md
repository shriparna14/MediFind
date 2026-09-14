# MediFind - System Overview & Architecture

MediFind is an intelligent medicine availability finder and emergency pharmacy discovery platform.

## Key Features
- **Intelligent LLM Medicine Discovery**: Powered by Google Gemini (`gemini-2.5-flash`) for conversational natural language query parsing combined with multi-factor grounded search over real pharmacy inventory.
- **Proximity & Emergency Search**: Geolocation-based distance calculation, open-now filtering, and 24/7 emergency pharmacy tags.
- **Cart & Multi-Item Checkout**: Transactional multi-item ordering and 30-minute reservation holds with secure pickup codes.
- **Pharmacy Inventory Dashboard**: Live stock management, restock alerts, expiry tracking, and demand analytics.
- **Security**: JWT authentication, role authorization, prescription validation, strict CORS, and MongoDB transactional safety.

## Getting Started

### 1. Environment Setup
Create a `.env` file in the root directory following `.env.example`:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
GEMINI_API_KEY=your_gemini_api_key
```

### 2. Install & Run
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install && cd ..

# Seed database
npm run seed

# Run automated tests
npm test

# Start backend server
npm run dev

# Start frontend dev server
cd client && npm run dev
```

### 3. Deploy on Render

Create the backend as a Web Service from the repository root, or deploy the
included `render.yaml` blueprint. Use these settings if configuring it
manually:

```text
Root Directory: .
Build Command: npm run build
Start Command: npm start
Health Check Path: /api/health
```

Set `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, and the Cloudinary/Gemini
variables in Render's environment settings. For a separately deployed Vite
frontend, set `VITE_API_URL` to the complete backend URL, for example
`https://medifind-backend.onrender.com`; do not append `/api` twice.
