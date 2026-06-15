import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api/auth';
const TEST_PHONE = '9876543210';
const OTP = process.argv[2];

if (!OTP) {
  console.error('Please provide OTP as argument');
  process.exit(1);
}

async function testAuth() {
  try {
    console.log('--- Starting Full Auth Module Test ---');

    // 1. Verify OTP
    console.log('1. Testing POST /otp/verify...');
    const verifyRes = await axios.post(`${BASE_URL}/otp/verify`, { 
      phone: TEST_PHONE, 
      otp: OTP
    });
    console.log('Response:', verifyRes.data);
    const { accessToken, refreshToken } = verifyRes.data.data;

    // 2. Get Me
    console.log('\n2. Testing GET /me...');
    const meRes = await axios.get(`${BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log('Response:', meRes.data);

    // 3. Refresh Token
    console.log('\n3. Testing POST /refresh...');
    const refreshRes = await axios.post(`${BASE_URL}/refresh`, { refreshToken });
    console.log('Response:', refreshRes.data);
    const newAccessToken = refreshRes.data.data.accessToken;

    // 4. Logout
    console.log('\n4. Testing POST /logout...');
    const logoutRes = await axios.post(`${BASE_URL}/logout`, {}, {
      headers: { Authorization: `Bearer ${newAccessToken}` }
    });
    console.log('Response:', logoutRes.data);

    console.log('\n--- Full Auth Module Test Completed Successfully ---');
  } catch (error: any) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testAuth();
