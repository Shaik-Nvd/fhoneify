import { chromium } from 'playwright';

async function testPdf() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(`
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .header { background-color: #e6eaf2; padding: 10px; font-weight: bold; border: 1px solid #c2c9d6; }
          .table { width: 100%; border-collapse: collapse; }
          .table td { border: 1px solid #c2c9d6; padding: 8px; }
          .label { color: #5a6b8c; font-weight: bold; }
          .value { color: #0033a0; }
        </style>
      </head>
      <body>
        <div class="header">Scenario Details &amp; Automation Selection Matrix</div>
        <table class="table">
          <tr>
            <td class="label">Calls Functional:</td>
            <td class="value">Yes</td>
            <td class="label">Screen Original:</td>
            <td class="value">Yes</td>
          </tr>
        </table>
      </body>
    </html>
  `);
  await page.pdf({ path: 'test_playwright.pdf', format: 'A4' });
  await browser.close();
  console.log('PDF generated');
}

testPdf().catch(console.error);
