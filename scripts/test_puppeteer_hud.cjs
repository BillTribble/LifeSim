const puppeteer = require('puppeteer-core');

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    const errors = [];

    page.on('console', msg => {
      const text = msg.text();
      // Ignore non-fatal browser origin/header warnings
      if (msg.type() === 'error' && !text.includes('Cross-Origin-Opener-Policy') && !text.includes('favicon')) {
        errors.push(text);
      }
    });

    page.on('pageerror', err => {
      errors.push(err.toString());
    });

    console.log('Navigating to http://localhost:8080/LifeSim/ ...');
    await page.goto('http://localhost:8080/LifeSim/', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait 3s for simulation canvas & UI initialization
    await new Promise(r => setTimeout(r, 3000));

    // Click the "INTERFACE" button to open HUD and expand controls area
    console.log('Clicking INTERFACE button to open HUD...');
    const clicked = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.title === 'HUD Interface' || b.innerText.includes('INTERFACE'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    console.log('INTERFACE button clicked:', clicked);

    // Wait 2s for HUD expansion transition
    await new Promise(r => setTimeout(r, 2000));

    // Check DOM for WIND & MOTION section and the 4 dials
    const content = await page.content();
    
    const hasWindMotion = content.includes('WIND &amp; MOTION') || content.includes('WIND & MOTION');
    const hasShimmer = content.includes('SHIMMER');
    const hasWavy = content.includes('WAVY');
    const hasBranchMove = content.includes('BRANCH_MOVE');
    const hasMovement = content.includes('MOVEMENT');
    const hasLfoHeader = content.includes('LFO (MOVEMENT)');
    const hasLfoSpeed = content.includes('LFO_SPEED');
    const hasLfoDepth = content.includes('LFO_DEPTH');
    const hasLfoRand = content.includes('LFO_RAND');
    const hasLfoMeter = content.includes('lfo-action-meter') && (content.includes('LFO +') || content.includes('LFO &#43;'));
    const hasRandMeter = content.includes('lfo-random-meter') && (content.includes('CYC RAND') || content.includes('RAND'));

    console.log('HUD Wind & Motion Elements Check:');
    console.log(' - Section header "WIND & MOTION":', hasWindMotion);
    console.log(' - Dial "SHIMMER":', hasShimmer);
    console.log(' - Dial "WAVY":', hasWavy);
    console.log(' - Dial "BRANCH_MOVE":', hasBranchMove);
    console.log(' - Dial "MOVEMENT":', hasMovement);
    console.log(' - Section header "LFO (MOVEMENT)":', hasLfoHeader);
    console.log(' - Dial "LFO_SPEED":', hasLfoSpeed);
    console.log(' - Dial "LFO_DEPTH":', hasLfoDepth);
    console.log(' - Dial "LFO_RAND":', hasLfoRand);
    console.log(' - Vertical Meter "LFO +":', hasLfoMeter);
    console.log(' - Vertical Meter "CYC RAND":', hasRandMeter);

    // Check for runtime exceptions or WebGL shader errors
    const shaderOrRuntimeErrors = errors.filter(e => 
      e.includes('Shader') || 
      e.includes('WebGL') || 
      e.includes('Uncaught') || 
      e.includes('SyntaxError') || 
      e.includes('ReferenceError')
    );

    if (shaderOrRuntimeErrors.length > 0) {
      console.error('Fatal WebGL or runtime errors detected:', shaderOrRuntimeErrors);
      process.exit(1);
    }

    if (!hasWindMotion || !hasShimmer || !hasWavy || !hasBranchMove || !hasMovement || !hasLfoHeader || !hasLfoSpeed || !hasLfoDepth || !hasLfoRand || !hasLfoMeter || !hasRandMeter) {
      console.error('Failed: One or more wind motion / LFO elements missing in rendered HTML!');
      process.exit(1);
    }

    console.log('ALL PUPPETEER CHECKS PASSED: Page loaded cleanly without WebGL/runtime errors and all Wind & Motion + LFO controls are rendered.');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Puppeteer run error:', err);
    if (browser) await browser.close();
    process.exit(1);
  }
})();
