import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';
const TEST_PHONE = '9876543210';
const OTP = process.argv[2];
const LISTING_ID = process.argv[3];

if (!OTP || !LISTING_ID) {
  console.error('Usage: npx ts-node ... <OTP> <LISTING_ID>');
  process.exit(1);
}

async function testAuthenticatedFlow() {
  try {
    console.log('--- Starting Authenticated Buy & Payments Test ---');

    // 1. Verify OTP
    const verifyRes = await axios.post(`${BASE_URL}/auth/otp/verify`, { 
      phone: TEST_PHONE, 
      otp: OTP
    });
    const token = verifyRes.data.data.accessToken;
    const authHeader = { headers: { Authorization: `Bearer ${token}` } };
    console.log('Login successful');

    // 2. Add to Cart
    console.log('\n2. Testing POST /buy/cart...');
    await axios.post(`${BASE_URL}/buy/cart`, { listingId: LISTING_ID }, authHeader);
    console.log('Item added to cart');

    // 3. View Cart
    console.log('\n3. Testing GET /buy/cart...');
    const cartRes = await axios.get(`${BASE_URL}/buy/cart`, authHeader);
    console.log(`Cart has ${cartRes.data.data.length} items`);

    // 4. Create Order
    console.log('\n4. Testing POST /buy/orders...');
    const orderRes = await axios.post(`${BASE_URL}/buy/orders`, {
      address: '456 Buyer Avenue, Bangalore'
    }, authHeader);
    console.log('Order created with ID:', orderRes.data.data.id);
    const orderId = orderRes.data.data.id;

    // 5. Create Razorpay Order
    console.log('\n5. Testing POST /payments/razorpay/create...');
    const rzpRes = await axios.post(`${BASE_URL}/payments/razorpay/create`, { orderId }, authHeader);
    console.log('Razorpay Order ID:', rzpRes.data.data.razorpayOrderId);
    const rzpOrderId = rzpRes.data.data.razorpayOrderId;

    // 6. Verify Payment
    console.log('\n6. Testing POST /payments/razorpay/verify...');
    const payVerifyRes = await axios.post(`${BASE_URL}/payments/razorpay/verify`, {
      razorpayOrderId: rzpOrderId,
      razorpayPaymentId: 'pay_mock_123',
      razorpaySignature: 'sig_mock_123'
    }, authHeader);
    console.log('Payment status:', payVerifyRes.data.data.status);

    // 7. Get Order Detail
    console.log('\n7. Testing GET /buy/orders/:id...');
    const finalOrderRes = await axios.get(`${BASE_URL}/buy/orders/${orderId}`, authHeader);
    console.log('Final Order Status:', finalOrderRes.data.data.status);

    console.log('\n--- Authenticated Buy Flow Completed Successfully ---');
  } catch (error: any) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testAuthenticatedFlow();
