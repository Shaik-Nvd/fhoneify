const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('http://localhost:5000/api/quote/cashify-price', {
      brand: 'Apple',
      model: 'Apple iPhone 14',
      storage: '128GB',
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
    console.error(e.response ? e.response.data : e.message);
  }
}
test();
