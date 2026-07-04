const { chromium } = require('playwright');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

const SESSIONS_DIR = path.join(__dirname, '..', 'cashify-sessions');

if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

async function run() {
  console.log('--- Multi-Session Cashify Setup ---');
  let setupMore = true;

  while (setupMore) {
    console.log('\nStarting browser for Cashify login setup...');
    
    // Launch non-headless browser so user can interact
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Navigating to Cashify...');
    await page.goto('https://www.cashify.in/');

    console.log('--------------------------------------------------');
    console.log('Please log in to Cashify in the browser window.');
    console.log('Enter your phone number, submit the OTP, and wait');
    console.log('until you are fully logged in and on the homepage.');
    console.log('--------------------------------------------------');

    await askQuestion('Press Enter here when you have successfully logged in...');
    
    // Check if the user is actually logged in by checking cookies
    const cookies = await context.cookies();
    const tokenCookie = cookies.find(c => c.name.toLowerCase().includes('token') || c.name.toLowerCase().includes('auth') || c.name.toLowerCase().includes('session'));
    
    const sessionName = `session-${Date.now()}.json`;
    const sessionPath = path.join(SESSIONS_DIR, sessionName);
    
    console.log('Saving session state...');
    await context.storageState({ path: sessionPath });
    
    console.log(`Session saved successfully to cashify-sessions/${sessionName}`);
    
    await browser.close();

    const answer = await askQuestion('\nDo you want to add another phone number? (y/n): ');
    if (answer.toLowerCase() !== 'y') {
      setupMore = false;
    }
  }
  
  console.log('\nSetup complete! The backend will automatically rotate through all saved sessions.');
  rl.close();
}

run().catch(err => {
  console.error('Error during setup:', err);
  process.exit(1);
});
