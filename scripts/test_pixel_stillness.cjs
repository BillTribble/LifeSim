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
    await page.setViewport({ width: 1280, height: 720 });

    const errors = [];
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error' && !text.includes('Cross-Origin-Opener-Policy') && !text.includes('favicon')) {
        errors.push(text);
      }
    });
    page.on('pageerror', err => errors.push(err.toString()));

    console.log('Navigating to http://localhost:8080/LifeSim/ ...');
    await page.goto('http://localhost:8080/LifeSim/', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for engine and setters
    await page.waitForFunction(() => !!window.__LIFESIM_ENGINE__ && !!window.__LIFESIM_SETTERS__, { timeout: 15000 });
    console.log('Engine and Setters initialized.');

    // 1. Establish plant growth
    console.log('Allowing creatures to establish with accelerated timeScale & growthSpeed for 4.0s...');
    await page.evaluate(() => {
      window.__LIFESIM_SETTERS__.setTimeScale(4.0);
      window.__LIFESIM_SETTERS__.setGrowthSpeed(1.0);
    });
    await new Promise(r => setTimeout(r, 4000));

    // Freeze biological growth and camera rotation so ONLY the 4 wind dials move the creatures
    console.log('Freezing biological growth & camera rotation (growthSpeed=0, timeScale=0, rotationSpeed=0)...');
    await page.evaluate(() => {
      const set = window.__LIFESIM_SETTERS__;
      if (set) {
        set.setTimeScale(0);
        set.setGrowthSpeed(0);
        set.setRotationSpeed(0);
        set.setRotationSpeedY(0);
        set.setOverallMovement(0.0);
        set.setShimmer(0.0);
        set.setWavy(0.0);
        set.setBranchMovement(0.0);
      }
      const eng = window.__LIFESIM_ENGINE__;
      if (eng) {
        eng.timeScale = 0;
        eng.growthSpeed = 0;
        eng.rotationSpeed = 0;
        eng.rotationSpeedY = 0;
        eng.overallMovement = 0.0;
        eng.shimmer = 0.0;
        eng.wavy = 0.0;
        eng.branchMovement = 0.0;
        if (eng.lod) {
          eng.lod.mode = 0;
          eng.lod.tier = 0;
        }
        if (eng.controls) {
          eng.controls.autoRotate = false;
          eng.controls.enableDamping = false;
          eng.controls.update();
          eng.controls.enableDamping = true;
        }
      }
    });
    await new Promise(r => setTimeout(r, 1500));

    // Helper to compute exact WebGL pixel diff
    async function computePixelDiff(delayMs = 600) {
      return await page.evaluate(async (delay) => {
        const engine = window.__LIFESIM_ENGINE__;
        const canvas = engine.renderer.domElement;
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        const width = canvas.width;
        const height = canvas.height;
        const p1 = new Uint8Array(width * height * 4);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, p1);
        await new Promise(r => setTimeout(r, delay));
        const p2 = new Uint8Array(width * height * 4);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, p2);
        let diffPixels = 0;
        for (let i = 0; i < p1.length; i += 4) {
          if (p1[i] !== p2[i] || p1[i+1] !== p2[i+1] || p1[i+2] !== p2[i+2] || p1[i+3] !== p2[i+3]) {
            diffPixels++;
          }
        }
        const totalPixels = width * height;
        return {
          diffPixels,
          totalPixels,
          diffRatio: diffPixels / totalPixels
        };
      }, delayMs);
    }

    // ==========================================
    // Phase 1: All 4 Wind Dials = 0 -> 0 Pixels Changed (0.0000%)
    // ==========================================
    console.log('\n--- Test 1: All 4 Wind Dials = 0 (Total Stillness) ---');
    const stillResult = await computePixelDiff(1000);
    console.log(`Stillness (all dials = 0): ${stillResult.diffPixels} / ${stillResult.totalPixels} pixels changed (${(stillResult.diffRatio * 100).toFixed(4)}%)`);
    if (stillResult.diffPixels !== 0) {
      console.error(`FAILED: Expected 0 pixel diff when dials are 0, got ${stillResult.diffPixels} (${(stillResult.diffRatio * 100).toFixed(4)}%)!`);
      process.exit(1);
    }
    console.log('PASS: Absolute stillness verified (EXACTLY 0 pixel diff across 1.0s).');

    // ==========================================
    // Phase 2: BRANCH_MOVE = 1.5 alone (> 10,000 pixels changed purely from GPU branch movement)
    // ==========================================
    console.log('\n--- Test 2: BRANCH_MOVE = 1.5 Alone (GPU Branch Movement) ---');
    await page.evaluate(() => {
      const set = window.__LIFESIM_SETTERS__;
      if (set) {
        set.setBranchMovement(1.5);
        set.setOverallMovement(1.2);
        set.setShimmer(0.0);
        set.setWavy(0.0);
      }
      const eng = window.__LIFESIM_ENGINE__;
      if (eng) {
        eng.branchMovement = 1.5;
        eng.overallMovement = 1.2;
        eng.shimmer = 0.0;
        eng.wavy = 0.0;
      }
    });
    await new Promise(r => setTimeout(r, 600));

    const branchResult = await computePixelDiff(600);
    console.log(`BRANCH_MOVE alone: ${branchResult.diffPixels} / ${branchResult.totalPixels} pixels changed (${(branchResult.diffRatio * 100).toFixed(2)}%)`);
    if (branchResult.diffPixels <= 10000) {
      console.error(`FAILED: Expected > 10,000 pixels changed from BRANCH_MOVE alone, got ${branchResult.diffPixels}!`);
      process.exit(1);
    }
    console.log(`PASS: BRANCH_MOVE alone verified (${branchResult.diffPixels.toLocaleString()} pixels changed > 10,000 threshold purely from GPU branch movement).`);

    // ==========================================
    // Phase 3: WAVY = 1.5 alone (> 10,000 pixels changed purely from GPU wavy undulation)
    // ==========================================
    console.log('\n--- Test 3: WAVY = 1.5 Alone (GPU Wavy Undulation) ---');
    await page.evaluate(() => {
      const set = window.__LIFESIM_SETTERS__;
      if (set) {
        set.setWavy(1.5);
        set.setOverallMovement(1.2);
        set.setShimmer(0.0);
        set.setBranchMovement(0.0);
      }
      const eng = window.__LIFESIM_ENGINE__;
      if (eng) {
        eng.wavy = 1.5;
        eng.overallMovement = 1.2;
        eng.shimmer = 0.0;
        eng.branchMovement = 0.0;
      }
    });
    await new Promise(r => setTimeout(r, 600));

    const wavyResult = await computePixelDiff(600);
    console.log(`WAVY alone: ${wavyResult.diffPixels} / ${wavyResult.totalPixels} pixels changed (${(wavyResult.diffRatio * 100).toFixed(2)}%)`);
    if (wavyResult.diffPixels <= 10000) {
      console.error(`FAILED: Expected > 10,000 pixels changed from WAVY alone, got ${wavyResult.diffPixels}!`);
      process.exit(1);
    }
    console.log(`PASS: WAVY alone verified (${wavyResult.diffPixels.toLocaleString()} pixels changed > 10,000 threshold purely from GPU wavy undulation).`);

    // ==========================================
    // Phase 4: SHIMMER = 1.5 alone (> 5,000 pixels changed purely from GPU shimmer & flutter)
    // ==========================================
    console.log('\n--- Test 4: SHIMMER = 1.5 Alone (GPU Shimmer & Flutter) ---');
    await page.evaluate(() => {
      const set = window.__LIFESIM_SETTERS__;
      if (set) {
        set.setShimmer(1.5);
        set.setOverallMovement(1.2);
        set.setWavy(0.0);
        set.setBranchMovement(0.0);
      }
      const eng = window.__LIFESIM_ENGINE__;
      if (eng) {
        eng.shimmer = 1.5;
        eng.overallMovement = 1.2;
        eng.wavy = 0.0;
        eng.branchMovement = 0.0;
      }
    });
    await new Promise(r => setTimeout(r, 600));

    const shimmerResult = await computePixelDiff(600);
    console.log(`SHIMMER alone: ${shimmerResult.diffPixels} / ${shimmerResult.totalPixels} pixels changed (${(shimmerResult.diffRatio * 100).toFixed(2)}%)`);
    if (shimmerResult.diffPixels <= 5000) {
      console.error(`FAILED: Expected > 5,000 pixels changed from SHIMMER alone, got ${shimmerResult.diffPixels}!`);
      process.exit(1);
    }
    console.log(`PASS: SHIMMER alone verified (${shimmerResult.diffPixels.toLocaleString()} pixels changed > 5,000 threshold purely from GPU shimmer & flutter).`);

    console.log('\n========================================');
    console.log('ALL PUPPETEER ISOLATED DIAL TESTS PASSED!');
    console.log('========================================');

    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Puppeteer run error:', err);
    if (browser) await browser.close();
    process.exit(1);
  }
})();
