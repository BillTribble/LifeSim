const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 4000)); // wait for canvas to render something
  
  await page.screenshot({ path: 'test_screenshot.png' });
  console.log('Screenshot saved to test_screenshot.png');
  const stats = fs.statSync('test_screenshot.png');
  console.log('Screenshot size:', stats.size);
  
  await browser.close();
})();