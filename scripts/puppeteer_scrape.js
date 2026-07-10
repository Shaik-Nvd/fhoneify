const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const url = 'https://www.cashify.in/sell-old-mobile-phone/used-apple-iphone-17';

(async () => {
  console.log('Launching Puppeteer to bypass Cloudflare...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(url, { waitUntil: 'networkidle2' });
  
  console.log('Page loaded. Checking for Next.js state...');
  
  // Extract Next.js state object
  const state = await page.evaluate(() => {
    const script = document.querySelector('#__NEXT_DATA__');
    return script ? script.textContent : null;
  });
  
  if (state) {
    const data = JSON.parse(state);
    // Print a truncated version of the pageProps that might contain the price
    const pageProps = data.props?.pageProps;
    if (pageProps) {
        console.log("Price Info:");
        // Let's dump the first level keys to see what's there
        console.log(Object.keys(pageProps));
        
        // If there's a specific product detail, print it
        if (pageProps.productDetails) {
            console.log("Product Details Found");
            console.log("Base Price:", pageProps.productDetails.basePrice);
            console.log("Max Price:", pageProps.productDetails.maxPrice);
        }
    } else {
        console.log("No pageProps found.");
    }
  } else {
    console.log("Could not find __NEXT_DATA__ - possibly still blocked by Cloudflare or a different architecture.");
  }
  
  await browser.close();
})();
