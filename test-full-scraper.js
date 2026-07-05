const { scrapeCashifyPrice } = require('./server/modules/quote/cashifyScraper.ts');
// Actually, this is TypeScript, I should use ts-node or just hit the API endpoint using fetch.
const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:5000/api/quote/cashify-price', {
      brand: 'Apple',
      model: 'Apple iPhone 15',
      storage: '256GB',
      answers: {
        calls: 'no',
        screen: 'broken',
        body: 'flawless',
        functional: ['battery'],
        accessories: [],
        warranty: '11+'
      }
    });
    console.log(res.data);
  } catch (e) {
    console.error(e.message);
  }
}
test();
