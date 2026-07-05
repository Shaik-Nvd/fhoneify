const axios = require('axios');

async function test() {
  try {
    const r = await axios.get('https://www.cashify.in/sell-old-mobile-phone/used-apple-iphone-12', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' }
    });
    const html = r.data;
    console.log(html.substring(0, 1000));
    console.log("Includes challenge?", html.includes('challenge'));
  } catch (e) {
    console.error(e.message);
  }
}
test();
