const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  
  // Wait a little bit to see if any runtime errors are logged
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Page loaded');
  await browser.close();
})();