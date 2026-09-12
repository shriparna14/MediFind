const express = require('express');
const router = express.Router();

const API_DOCS_SPEC = {
  title: 'MediFind 2.0 API Specification',
  version: '2.0.0',
  description: 'RESTful API for Medicine Discovery, Real-Time Proximity Search, Reservations, Orders, and MediFind AI Assistant.',
  baseUrl: 'http://localhost:5000/api',
  endpoints: [
    {
      group: 'Authentication & Security',
      routes: [
        { method: 'POST', path: '/api/auth/register', desc: 'Register customer or pharmacy account (admin registration is blocked)' },
        { method: 'POST', path: '/api/auth/login', desc: 'Authenticate user and return JWT bearer token' },
        { method: 'GET', path: '/api/auth/me', desc: 'Get authenticated user session profile' }
      ]
    },
    {
      group: 'MediFind AI Subsystem',
      routes: [
        { method: 'POST', path: '/api/ai/chat', desc: 'Natural language discovery intent parsing, drug monographs, and real grounded pharmacy options' },
        { method: 'GET', path: '/api/ai/search?q={query}', desc: 'Natural language search query with auto-extracted radius and category' },
        { method: 'GET', path: '/api/ai/inventory-advice', desc: 'AI restock priority recommendations for pharmacy owner' }
      ]
    },
    {
      group: 'Medicine Inventory & Proximity Search',
      routes: [
        { method: 'GET', path: '/api/medicines/search', desc: 'Search medicines with keyword, category, price filter, sorting, and pagination' },
        { method: 'GET', path: '/api/medicines/:id', desc: 'Get specific medicine details and pharmacy information' },
        { method: 'POST', path: '/api/medicines', desc: 'Add new medicine with batch and expiry tracking (Pharmacy owner)' },
        { method: 'PUT', path: '/api/medicines/:id', desc: 'Update medicine stock and price (Pharmacy owner)' },
        { method: 'DELETE', path: '/api/medicines/:id', desc: 'Remove medicine from catalog (Pharmacy owner)' }
      ]
    },
    {
      group: 'Orders & Multi-Item Checkout',
      routes: [
        { method: 'POST', path: '/api/orders', desc: 'Atomic multi-item checkout transaction with standard or emergency dispatch' },
        { method: 'GET', path: '/api/orders/my', desc: 'Get active and past orders for patient' },
        { method: 'GET', path: '/api/orders/pharmacy', desc: 'Get dispatch queue for pharmacy' },
        { method: 'PUT', path: '/api/orders/:id/status', desc: 'Advance order lifecycle status (PLACED -> PHARMACY_ACCEPTED -> PREPARING -> READY -> OUT_FOR_DELIVERY -> DELIVERED)' }
      ]
    },
    {
      group: 'Reservations (30-Minute Counter Hold)',
      routes: [
        { method: 'POST', path: '/api/reservations', desc: 'Create 30-minute stock hold reservation with pickup code and atomic deduction' },
        { method: 'GET', path: '/api/reservations/my', desc: 'Get active pickup holds for patient' },
        { method: 'GET', path: '/api/reservations/pharmacy', desc: 'Get counter hold queue for pharmacy' },
        { method: 'PUT', path: '/api/reservations/:id/status', desc: 'Update hold status (accepted, ready_for_pickup, completed, cancelled)' }
      ]
    },
    {
      group: 'Prescriptions & Verification Vault',
      routes: [
        { method: 'POST', path: '/api/prescriptions', desc: 'Upload digital prescription file (JPEG, PNG, WEBP, PDF, max 5MB)' },
        { method: 'GET', path: '/api/prescriptions/my', desc: 'Get user uploaded prescriptions' },
        { method: 'GET', path: '/api/prescriptions/pharmacy', desc: 'Get pending prescriptions for pharmacy review' },
        { method: 'PUT', path: '/api/prescriptions/:id/status', desc: 'Approve or reject prescription with reason' },
        { method: 'GET', path: '/api/prescriptions/file/:filename', desc: 'Secure authorized prescription file streaming' }
      ]
    },
    {
      group: 'Pharmacy Discovery & Comparison',
      routes: [
        { method: 'GET', path: '/api/pharmacies/nearby', desc: 'Find verified pharmacies with live stock within radius' },
        { method: 'GET', path: '/api/pharmacies/compare?name={medName}', desc: 'Side-by-side pharmacy comparison for a medicine' },
        { method: 'GET', path: '/api/pharmacies/:id/inventory', desc: 'Get full inventory of specific pharmacy with low-stock filters' },
        { method: 'GET', path: '/api/pharmacies/demand-prediction', desc: 'Demand forecast and 30-day velocity projections' }
      ]
    },
    {
      group: 'Verified Reviews & Notifications',
      routes: [
        { method: 'POST', path: '/api/reviews', desc: 'Post verified review after order/reservation completion' },
        { method: 'GET', path: '/api/reviews/pharmacy/:id', desc: 'Get reviews for a pharmacy' },
        { method: 'GET', path: '/api/notifications', desc: 'Get real-time notification alerts for logged in user' },
        { method: 'PUT', path: '/api/notifications/read-all', desc: 'Mark all notifications as read' }
      ]
    }
  ]
};

// Return JSON Documentation Specification
router.get('/json', (req, res) => {
  res.json(API_DOCS_SPEC);
});

// Serve Interactive Visual HTML Documentation
router.get('/', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MediFind 2.0 API Documentation</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=IBM+Plex+Mono:wght@500;600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #fafaf8;
      --card-bg: #ffffff;
      --pine: #2f5d50;
      --pine-dark: #1c3b31;
      --pine-light: #f3f7f5;
      --amber: #c88a3d;
      --text: #1c2320;
      --text-muted: #64748b;
      --border: #e7e5dd;
    }
    body {
      margin: 0;
      padding: 0;
      background-color: var(--bg);
      color: var(--text);
      font-family: 'Inter', sans-serif;
      line-height: 1.5;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      padding-bottom: 24px;
      border-bottom: 1.5px solid var(--border);
      margin-bottom: 32px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      background: var(--pine-light);
      border: 1px solid #c5dbd3;
      color: var(--pine);
      border-radius: 9999px;
      font-size: 11px;
      font-family: 'IBM Plex Mono', monospace;
      font-weight: 600;
      margin-bottom: 12px;
    }
    h1 {
      font-family: 'Fraunces', serif;
      font-size: 32px;
      margin: 0 0 8px 0;
      color: var(--pine-dark);
    }
    p.desc {
      color: var(--text-muted);
      margin: 0;
      font-size: 14px;
    }
    .group-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.02);
    }
    .group-title {
      font-family: 'Fraunces', serif;
      font-size: 18px;
      color: var(--pine-dark);
      margin: 0 0 16px 0;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border);
    }
    .endpoint {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px dashed var(--border);
    }
    .endpoint:last-child {
      border-bottom: none;
    }
    .method {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      text-transform: uppercase;
      min-width: 50px;
      text-align: center;
    }
    .method.get { background: #e0f2fe; color: #0369a1; }
    .method.post { background: #dcfce7; color: #15803d; }
    .method.put { background: #fef3c7; color: #b45309; }
    .method.delete { background: #fee2e2; color: #b91c1c; }
    .path {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 12px;
      font-weight: 600;
      color: var(--text);
    }
    .route-desc {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">MEDIFIND 2.0 API • SWAGGER SPECIFICATION</div>
      <h1>MediFind 2.0 RESTful API</h1>
      <p class="desc">${API_DOCS_SPEC.description} Base URL: <code>http://localhost:5000/api</code></p>
    </div>

    ${API_DOCS_SPEC.endpoints.map(group => `
      <div class="group-card">
        <h3 class="group-title">${group.group}</h3>
        ${group.routes.map(r => `
          <div class="endpoint">
            <span class="method ${r.method.toLowerCase()}">${r.method}</span>
            <div style="flex: 1;">
              <div class="path">${r.path}</div>
              <div class="route-desc">${r.desc}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `).join('')}
  </div>
</body>
</html>
  `;
  res.send(html);
});

module.exports = router;
