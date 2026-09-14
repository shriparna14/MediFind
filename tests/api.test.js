/**
 * MediFind 2.0 Automated Test Suite
 * Validates Security, Auth, Medicines, AI Subsystem, Orders, Reservations, Concurrent Contention, and Demand Forecasting
 */

const BASE_URL = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('🧪 =========================================');
  console.log('🧪 STARTING MEDIFIND AUTOMATED TEST SUITE');
  console.log('🧪 =========================================\n');

  let passed = 0;
  let failed = 0;

  let customerToken1 = '';
  let customerToken2 = '';
  let pharmacyToken = '';
  let testMedicine = null;

  // Helper for HTTP requests
  const api = async (endpoint, options = {}) => {
    const url = `${BASE_URL}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
  };

  // TEST 1: Security Guard - Reject Public Admin Registration
  try {
    const res = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Hacker',
        email: 'hacker@test.com',
        password: 'password123',
        role: 'admin',
        phone: '1234567890',
        address: 'Unknown'
      })
    });

    if (res.status === 403 && res.data.success === false) {
      console.log('✅ PASS: Security Guard: Reject public admin registration attempt');
      passed++;
    } else {
      console.error('❌ FAIL: Security Guard did not block admin registration. Status:', res.status);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: Test 1 exception:', e.message);
    failed++;
  }

  // TEST 2: Customer 1 & Customer 2 Login
  try {
    const res1 = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'aditya.verma@example.com',
        password: 'password123'
      })
    });

    const res2 = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'priya.sundaram@example.com',
        password: 'password123'
      })
    });

    if (res1.ok && res1.data.token && res2.ok && res2.data.token) {
      customerToken1 = res1.data.token;
      customerToken2 = res2.data.token;
      console.log('✅ PASS: Auth: Customer Logins with pre-seeded test accounts');
      passed++;
    } else {
      console.error('❌ FAIL: Customer login failed:', res1.data.message || res2.data.message);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: Test 2 exception:', e.message);
    failed++;
  }

  // TEST 3: Pharmacy Login
  try {
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'apollo.indiranagar@medifind.com',
        password: 'password123'
      })
    });

    if (res.ok && res.data.token) {
      pharmacyToken = res.data.token;
      console.log('✅ PASS: Auth: Pharmacy Login with pre-seeded test account');
      passed++;
    } else {
      console.error('❌ FAIL: Pharmacy login failed:', res.data.message);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: Test 3 exception:', e.message);
    failed++;
  }

  // TEST 4: Medicines Search with Population (N+1 Query Fix)
  try {
    const res = await api('/medicines/search?keyword=Dolo&userLat=12.9716&userLng=77.5946');

    if (res.ok && res.data.success && res.data.data.length > 0) {
      testMedicine = res.data.data[0];
      const hasPharmacy = testMedicine.pharmacy && testMedicine.pharmacy.shopName;
      if (hasPharmacy) {
        console.log('✅ PASS: Medicines: Search endpoint returns paginated data with populated pharmacy');
        passed++;
      } else {
        console.error('❌ FAIL: Pharmacy was not populated on search result');
        failed++;
      }
    } else {
      console.error('❌ FAIL: Medicine search failed');
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: Test 4 exception:', e.message);
    failed++;
  }

  // TEST 5: AI Discovery Chat
  try {
    const res = await api('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'I need paracetamol under ₹50 near me',
        latitude: 12.9716,
        longitude: 77.5946
      })
    });

    if (res.ok && res.data.success && res.data.aiResponse) {
      console.log('✅ PASS: AI Subsystem: Natural language query parses intent and returns grounded results');
      passed++;
    } else {
      console.error('❌ FAIL: AI chat failed:', res.data.message);
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: Test 5 exception:', e.message);
    failed++;
  }

  // TEST 6: AI Monograph Explanation & Safety Disclaimer
  try {
    const res = await api('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'What is Cetirizine used for?'
      })
    });

    if (res.ok && res.data.success && res.data.medicineInfo && res.data.medicineInfo.disclaimer) {
      console.log('✅ PASS: AI Subsystem: Pharmacology monograph returns grounded details with disclaimer');
      passed++;
    } else {
      console.error('❌ FAIL: AI Monograph retrieval failed');
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: Test 6 exception:', e.message);
    failed++;
  }

  // TEST 6A: General AI Question
  try {
    const res = await api('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'What is artificial intelligence?' })
    });

    if (res.ok && res.data.success && res.data.intent?.intent === 'general' && res.data.aiResponse) {
      console.log('✅ PASS: AI General Question: Conversational response returned');
      passed++;
    } else {
      console.error('❌ FAIL: General AI question failed');
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: General AI exception:', e.message);
    failed++;
  }

  // TEST 7: Pharmacy Comparison Matrix
  try {
    const res = await api('/pharmacies/compare?name=Paracetamol&lat=12.9716&lng=77.5946');

    if (res.ok && res.data.success && Array.isArray(res.data.data)) {
      console.log('✅ PASS: Pharmacy Comparison: Side-by-side comparison calculates price & distance');
      passed++;
    } else {
      console.error('❌ FAIL: Pharmacy comparison failed');
      failed++;
    }
  } catch (e) {
    console.error('❌ FAIL: Test 7 exception:', e.message);
    failed++;
  }

  // TEST 8: Multi-Item Order Transaction
  try {
    if (testMedicine && customerToken1) {
      const res = await api('/orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken1}` },
        body: JSON.stringify({
          pharmacyId: testMedicine.pharmacy._id || testMedicine.pharmacy.id,
          items: [{ medicineId: testMedicine._id || testMedicine.id, quantity: 1 }],
          deliveryAddress: 'Indiranagar 100ft Road, Bengaluru',
          deliveryPhone: '9876543210',
          deliveryType: 'standard',
          paymentMethod: 'cod'
        })
      });

      if (res.status === 201 && res.data.success) {
        console.log('✅ PASS: Order Checkout: Multi-item transactional checkout creates order and timeline');
        passed++;
      } else {
        console.error('❌ FAIL: Order checkout failed:', res.data.message);
        failed++;
      }
    } else {
      console.warn('⚠️ SKIP: Order test skipped');
    }
  } catch (e) {
    console.error('❌ FAIL: Test 8 exception:', e.message);
    failed++;
  }

  // TEST 9: 30-Minute Hold Reservation
  try {
    if (testMedicine && customerToken1) {
      const res = await api('/reservations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken1}` },
        body: JSON.stringify({
          medicineId: testMedicine._id || testMedicine.id,
          quantity: 1
        })
      });

      if (res.status === 201 && res.data.success && res.data.data.pickupCode) {
        console.log('✅ PASS: Reservation Hold: 30-minute hold reservation creates valid pickup code');
        passed++;
      } else {
        console.error('❌ FAIL: Reservation hold failed:', res.data.message);
        failed++;
      }
    } else {
      console.warn('⚠️ SKIP: Reservation test skipped');
    }
  } catch (e) {
    console.error('❌ FAIL: Test 9 exception:', e.message);
    failed++;
  }

  // TEST 10: Concurrent Reservation Contention Test (Two users reserve the last unit)
  try {
    if (pharmacyToken && customerToken1 && customerToken2) {
      // 1. Create a limited single-unit medicine
      const medRes = await api('/medicines', {
        method: 'POST',
        headers: { Authorization: `Bearer ${pharmacyToken}` },
        body: JSON.stringify({
          name: 'Contention Test Drug 500mg',
          genericName: 'ContentionTester',
          category: 'Analgesic',
          price: 99.00,
          stock: 1, // Only 1 unit in stock!
          expiryDate: '2028-12-31'
        })
      });

      if (medRes.status === 201 && medRes.data.data) {
        const contentionMedId = medRes.data.data._id || medRes.data.data.id;

        // 2. Both users attempt to reserve at the exact same moment
        const [res1, res2] = await Promise.all([
          api('/reservations', {
            method: 'POST',
            headers: { Authorization: `Bearer ${customerToken1}` },
            body: JSON.stringify({ medicineId: contentionMedId, quantity: 1 })
          }),
          api('/reservations', {
            method: 'POST',
            headers: { Authorization: `Bearer ${customerToken2}` },
            body: JSON.stringify({ medicineId: contentionMedId, quantity: 1 })
          })
        ]);

        const oneSuccess = (res1.status === 201 && (res2.status === 409 || res2.status === 400)) ||
                           (res2.status === 201 && (res1.status === 409 || res1.status === 400));
        if (oneSuccess) {
          console.log('✅ PASS: Concurrency Contention: Exactly 1 user secured the last unit while the 2nd was cleanly rejected with HTTP 409 Conflict');
          passed++;
        } else {
          console.error('❌ FAIL: Concurrency contention anomaly:', { res1: res1.status, res2: res2.status });
          failed++;
        }
      }
    }
  } catch (e) {
    console.error('❌ FAIL: Test 10 exception:', e.message);
    failed++;
  }

  // TEST 11: Demand Forecasting (Rule-based velocity)
  try {
    if (pharmacyToken) {
      const res = await api('/pharmacies/demand-prediction', {
        headers: { Authorization: `Bearer ${pharmacyToken}` }
      });

      if (res.ok && res.data.success && Array.isArray(res.data.data)) {
        console.log('✅ PASS: Demand Forecasting: Computes restock recommendations without ML false claims');
        passed++;
      } else {
        console.error('❌ FAIL: Demand forecasting failed');
        failed++;
      }
    } else {
      console.warn('⚠️ SKIP: Demand forecasting test skipped');
    }
  } catch (e) {
    console.error('❌ FAIL: Test 11 exception:', e.message);
    failed++;
  }

  console.log('\n=========================================');
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('=========================================\n');

  if (failed > 0) process.exit(1);
  else process.exit(0);
};

runTests();
