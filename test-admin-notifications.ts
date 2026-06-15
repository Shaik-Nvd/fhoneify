import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';
const ADMIN_PHONE = '9000000000'; // Admin test phone from seed

async function testAdmin() {
  try {
    console.log('--- Starting Admin & Notifications Module Test ---');

    // 1. Login as Admin
    console.log('\n1. Logging in as Admin...');
    await axios.post(`${BASE_URL}/auth/otp/send`, { phone: ADMIN_PHONE });
    
    console.log('Please check server logs for OTP and run:');
    console.log(`npx ts-node -r tsconfig-paths/register src/test-admin-authenticated.ts <OTP>`);

  } catch (error: any) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testAdmin();
