import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';
const TEST_PHONE = '9988776655'; // Seller test phone

async function testQuoteAndSell() {
  try {
    console.log('--- Starting Quote & Sell Module Test ---');

    // 1. Get Devices
    console.log('\n1. Testing GET /quote/devices...');
    const devicesRes = await axios.get(`${BASE_URL}/quote/devices`);
    console.log(`Fetched ${devicesRes.data.data.length} devices`);
    const deviceId = devicesRes.data.data[0].id;

    // 2. Create Quote (Unauthenticated)
    console.log('\n2. Testing POST /quote (Unauthenticated)...');
    const quoteRes = await axios.post(`${BASE_URL}/quote`, {
      deviceId,
      condition: 'excellent',
      storage: '128GB'
    });
    console.log('Quote Estimate:', quoteRes.data.data.estimatedPrice);
    const estimate = quoteRes.data.data.estimatedPrice;

    // 3. Login to test Sell module
    console.log('\n3. Logging in to test Sell module...');
    await axios.post(`${BASE_URL}/auth/otp/send`, { phone: TEST_PHONE });
    
    // In a real test we'd get the OTP, here we'll assume the user is already seeded
    // and we'll just use a direct login mock if needed, but let's try to get OTP from logs
    console.log('Please check server logs for OTP and run:');
    console.log(`npx ts-node -r tsconfig-paths/register src/test-quote-sell-authenticated.ts <OTP> ${deviceId} ${estimate}`);

    console.log('\n--- Quote Module Basic Test Done ---');
  } catch (error: any) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testQuoteAndSell();
