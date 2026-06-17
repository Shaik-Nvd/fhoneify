const https = require('https');

const urls = [
  'https://m.media-amazon.com/images/I/71X8kEQD-wL._SX679_.jpg',
  'https://m.media-amazon.com/images/I/51L8W6d-DNL._SX300_SY300_QL70_FMwebp_.jpg',
  'https://images.samsung.com/is/image/samsung/p6pim/in/sm-s911bzebins/gallery/in-galaxy-s23-s911-sm-s911bzebins-534863388?$650_519_PNG$',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Samsung_Galaxy_S23_Ultra_-_Phantom_Black.jpg/800px-Samsung_Galaxy_S23_Ultra_-_Phantom_Black.jpg'
];

urls.forEach(url => {
  https.get(url, (res) => {
    console.log(`${url} : ${res.statusCode}`);
  }).on('error', (e) => {
    console.error(e);
  });
});
