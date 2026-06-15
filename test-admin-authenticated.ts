import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';
const ADMIN_PHONE = '9000000000';
const OTP = process.argv[2];

if (!OTP) {
  console.error('Usage: npx ts-node ... <OTP>');
  process.exit(1);
}

async function testAuthenticatedFlow() {
  try {
    console.log('--- Starting Authenticated Admin Test ---');

    // 1. Verify OTP
    const verifyRes = await axios.post(`${BASE_URL}/auth/otp/verify`, { 
      phone: ADMIN_PHONE, 
      otp: OTP
    });
    const token = verifyRes.data.data.accessToken;
    const authHeader = { headers: { Authorization: `Bearer ${token}` } };
    console.log('Admin login successful');

    // 2. Get Analytics
    console.log('\n2. Testing GET /admin/analytics...');
    const analyticsRes = await axios.get(`${BASE_URL}/admin/analytics`, authHeader);
    console.log('Analytics:', JSON.stringify(analyticsRes.data.data, null, 2));

    // 3. Get Orders
    console.log('\n3. Testing GET /admin/orders...');
    const ordersRes = await axios.get(`${BASE_URL}/admin/orders`, authHeader);
    console.log(`Fetched ${ordersRes.data.data.length} orders`);

    // 4. Get Listings
    console.log('\n4. Testing GET /admin/listings...');
    const listingsRes = await axios.get(`${BASE_URL}/admin/listings`, authHeader);
    console.log(`Fetched ${listingsRes.data.data.length} listings`);
    const listingId = listingsRes.data.data[0].id;

    // 5. Approve Listing
    console.log(`\n5. Testing PATCH /admin/listings/${listingId}/approve...`);
    await axios.patch(`${BASE_URL}/admin/listings/${listingId}/approve`, {}, authHeader);
    console.log('Listing approved');

    // 6. Get Fraud Listings
    console.log('\n6. Testing GET /admin/fraud...');
    const fraudRes = await axios.get(`${BASE_URL}/admin/fraud`, authHeader);
    console.log(`Found ${fraudRes.data.data.length} fraud flagged listings`);

    // 7. Get Notifications
    console.log('\n7. Testing GET /notifications...');
    const notifRes = await axios.get(`${BASE_URL}/notifications`, authHeader);
    console.log(`Found ${notifRes.data.data.length} notifications`);

    console.log('\n--- Admin & Notifications Flow Test Completed Successfully ---');
  } catch (error: any) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testAuthenticatedFlow();
