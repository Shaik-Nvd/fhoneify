import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';
const TEST_PHONE = '9876543210'; // Buyer test phone

async function testBuyAndPayments() {
  try {
    console.log('--- Starting Buy & Payments Module Test ---');

    // 1. Get Listings
    console.log('\n1. Testing GET /buy/listings...');
    const listingsRes = await axios.get(`${BASE_URL}/buy/listings`);
    console.log(`Fetched ${listingsRes.data.data.listings.length} listings`);
    const listingId = listingsRes.data.data.listings[0].id;

    // 2. Login as Buyer
    console.log('\n2. Logging in as Buyer...');
    await axios.post(`${BASE_URL}/auth/otp/send`, { phone: TEST_PHONE });
    
    console.log('Please check server logs for OTP and run:');
    console.log(`npx ts-node -r tsconfig-paths/register src/test-buy-payments-authenticated.ts <OTP> ${listingId}`);

    console.log('\n--- Buy Module Basic Test Done ---');
  } catch (error: any) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testBuyAndPayments();
