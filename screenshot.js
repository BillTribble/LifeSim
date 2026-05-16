import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('http://localhost:5173/LifeSim/');
  
  // Wait for 15 seconds to let the simulation run
  await new Promise(resolve => setTimeout(resolve, 15000));
  
  await page.screenshot({ path: 'screenshot.png' });
  await browser.close();
  console.log("Screenshot taken.");
  process.exit(0);
})();