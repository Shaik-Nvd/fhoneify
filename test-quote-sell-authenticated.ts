import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';
const TEST_PHONE = '9988776655';
const OTP = process.argv[2];
const DEVICE_ID = process.argv[3];
const ESTIMATE = parseInt(process.argv[4], 10);

if (!OTP || !DEVICE_ID || !ESTIMATE) {
  console.error('Usage: npx ts-node ... <OTP> <DEVICE_ID> <ESTIMATE>');
  process.exit(1);
}

async function testAuthenticatedFlow() {
  try {
    console.log('--- Starting Authenticated Quote & Sell Test ---');

    // 1. Verify OTP
    const verifyRes = await axios.post(`${BASE_URL}/auth/otp/verify`, { 
      phone: TEST_PHONE, 
      otp: OTP
    });
    const token = verifyRes.data.data.accessToken;
    const authHeader = { headers: { Authorization: `Bearer ${token}` } };
    console.log('Login successful');

    // 2. Create Quote (Authenticated)
    console.log('\n2. Testing POST /quote (Authenticated)...');
    const quoteRes = await axios.post(`${BASE_URL}/quote`, {
      deviceId: DEVICE_ID,
      condition: 'excellent',
      storage: '128GB'
    }, authHeader);
    console.log('Quote saved with ID:', quoteRes.data.data.quoteId);
    const quoteId = quoteRes.data.data.quoteId;

    // 3. Get Saved Quote
    console.log('\n3. Testing GET /quote/:id...');
    const getQuoteRes = await axios.get(`${BASE_URL}/quote/${quoteId}`, authHeader);
    console.log('Fetched Quote Price:', getQuoteRes.data.data.estimated_price);

    // 4. Create Listing (Sell)
    console.log('\n4. Testing POST /sell/listings...');
    const listingRes = await axios.post(`${BASE_URL}/sell/listings`, {
      deviceId: DEVICE_ID,
      condition: 'excellent',
      askingPrice: ESTIMATE, // Exactly at estimate
      city: 'Mumbai',
      description: 'Test listing from automated test',
      images: ['https://example.com/phone.jpg']
    }, authHeader);
    console.log('Listing created with ID:', listingRes.data.data.id);
    const listingId = listingRes.data.data.id;

    // 5. Get My Listings
    console.log('\n5. Testing GET /sell/listings/me...');
    const myListingsRes = await axios.get(`${BASE_URL}/sell/listings/me`, authHeader);
    console.log(`Found ${myListingsRes.data.data.length} listings`);

    // 6. Schedule Pickup
    console.log('\n6. Testing POST /sell/schedule...');
    const pickupRes = await axios.post(`${BASE_URL}/sell/schedule`, {
      listingId,
      pickupDate: '2026-06-01',
      timeSlot: '10:00 AM - 01:00 PM',
      address: '123 Test Street, Mumbai'
    }, authHeader);
    console.log('Pickup scheduled, Notification ID:', pickupRes.data.data.id);

    // 7. Get My Pickups
    console.log('\n7. Testing GET /sell/pickups...');
    const myPickupsRes = await axios.get(`${BASE_URL}/sell/pickups`, authHeader);
    console.log(`Found ${myPickupsRes.data.data.length} scheduled pickups`);

    console.log('\n--- Authenticated Flow Test Completed Successfully ---');
  } catch (error: any) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testAuthenticatedFlow();
