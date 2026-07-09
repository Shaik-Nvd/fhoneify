const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');

const models = [
    { name: 'huawei-p30-pro', url: 'https://www.cashify.in/sell-old-mobile-phone/used-huawei-p30-pro-8-gb-256-gb' },
    { name: 'huawei-p30-lite', url: 'https://www.cashify.in/sell-old-mobile-phone/used-huawei-p30-lite-6-gb-128-gb' },
    { name: 'huawei-mate-20-pro', url: 'https://www.cashify.in/sell-old-mobile-phone/used-huawei-mate-20-pro-6-gb-128-gb' },
    { name: 'huawei-p20-pro', url: 'https://www.cashify.in/sell-old-mobile-phone/used-huawei-p20-pro-6-gb-128-gb' },
    { name: 'huawei-mate-30-pro', url: 'https://www.cashify.in/sell-old-mobile-phone/used-huawei-mate-30-pro-8-gb-256-gb' }
];

async function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode === 200) {
                res.pipe(fs.createWriteStream(filepath))
                   .on('error', reject)
                   .once('close', () => resolve(filepath));
            } else {
                res.resume();
                reject(new Error(`Request Failed With a Status Code: ${res.statusCode}`));
            }
        });
    });
}

async function scrapeImages() {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    // Stealth settings
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    for (const model of models) {
        console.log(`Processing ${model.name}...`);
        try {
            await page.goto(model.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await new Promise(r => setTimeout(r, 2000));
            
            // Wait for image selector
            const imgSrc = await page.evaluate(() => {
                const img = document.querySelector('img[alt*="Huawei"]');
                return img ? img.src : null;
            });
            
            if (imgSrc && imgSrc.startsWith('http')) {
                const savePath = path.join(__dirname, 'public', 'images', 'models', `${model.name}.png`);
                await downloadImage(imgSrc, savePath);
                console.log(`Saved image for ${model.name}`);
            } else {
                console.log(`No image found for ${model.name}`);
            }
        } catch (e) {
            console.error(`Error on ${model.name}:`, e.message);
        }
    }
    
    await browser.close();
}

scrapeImages().catch(console.error);
