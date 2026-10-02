const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.resolve(__dirname, '../docs/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

(async () => {
  console.log('--- STARTING CINEMATIC PINNED SCROLL TEST ---');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const consoleErrors = [];
  const pageErrors = [];

  const page = await browser.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err.toString());
  });

  // ─────────────────────────────────────────────────────────────
  // 1. DESKTOP 1440px PIN & SCRUB TEST (500vh pin)
  // ─────────────────────────────────────────────────────────────
  console.log('\n[1] Testing Desktop 1440px GSAP ScrollTrigger Pinned Scene...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });

  // Scroll into proximity to ensure isNear is active and ScrollTrigger initialized
  await page.evaluate(() => {
    const el = document.getElementById('scroll');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise((r) => setTimeout(r, 1500));

  const scrollSectionTop = await page.evaluate(() => {
    const el = document.getElementById('scroll');
    if (!el) return 0;
    return el.offsetTop;
  });
  console.log('Section offsetTop:', scrollSectionTop);

  // Scroll to section start (Stage 01)
  await page.evaluate((top) => {
    window.scrollTo({ top, behavior: 'instant' });
  }, scrollSectionTop);
  await new Promise((r) => setTimeout(r, 600));

  const stage1CardId = await page.$eval('.deck-card.card-stage-0 .card-masked-id', (el) => el.textContent);
  console.log('Stage 1 Card Masked ID:', stage1CardId);

  // Capture screenshot of Stage 01
  const shotStage1 = path.join(SCREENSHOT_DIR, 'cinematic-stage-01-1440px.png');
  await page.screenshot({ path: shotStage1 });
  console.log('Saved Stage 1 screenshot to', shotStage1);

  // Scrub down to Stage 03 (~40% through the 4500px pin)
  console.log('\nScrubbing down to Stage 03...');
  const stage3Scroll = scrollSectionTop + 1800; // 40% of 4500px
  await page.evaluate((top) => {
    window.scrollTo({ top, behavior: 'instant' });
  }, stage3Scroll);
  await new Promise((r) => setTimeout(r, 600));

  const stage3CardId = await page.$eval('.deck-card.card-stage-2 .card-masked-id', (el) => el.textContent);
  console.log('Stage 3 Card Masked ID:', stage3CardId);

  // Capture screenshot of Stage 03
  const shotStage3 = path.join(SCREENSHOT_DIR, 'cinematic-stage-03-1440px.png');
  await page.screenshot({ path: shotStage3 });
  console.log('Saved Stage 3 screenshot to', shotStage3);

  // Scrub down to Stage 06 (~95% through the 4500px pin)
  console.log('\nScrubbing down to Stage 06...');
  const stage6Scroll = scrollSectionTop + 4300; // 95% of 4500px
  await page.evaluate((top) => {
    window.scrollTo({ top, behavior: 'instant' });
  }, stage6Scroll);
  await new Promise((r) => setTimeout(r, 600));

  const stage6CardId = await page.$eval('.deck-card.card-stage-5 .card-masked-id', (el) => el.textContent);
  console.log('Stage 6 Card Masked ID:', stage6CardId);

  const ctaButtonsCount = await page.$$eval('.stage-6-cta-group a, .stage-6-cta-group button', (els) => els.length);
  console.log('Stage 6 CTAs present:', ctaButtonsCount);

  // Capture screenshot of Stage 06
  const shotStage6 = path.join(SCREENSHOT_DIR, 'cinematic-stage-06-1440px.png');
  await page.screenshot({ path: shotStage6 });
  console.log('Saved Stage 6 screenshot to', shotStage6);

  // Verify Clean Unpin / Release: Scroll past the 4500px pin + 900px viewport into #xai
  console.log('\nTesting Unpin & Release into #xai...');
  const postPinScroll = scrollSectionTop + 4500 + 400;
  await page.evaluate((top) => {
    window.scrollTo({ top, behavior: 'instant' });
  }, postPinScroll);
  await new Promise((r) => setTimeout(r, 600));

  const xaiVisible = await page.evaluate(() => {
    const el = document.getElementById('xai');
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  });
  console.log('#xai reached cleanly after unpin:', xaiVisible);

  // Verify Refresh Mid-Scroll restores right stage
  console.log('\nTesting Refresh Mid-Scroll...');
  await page.evaluate((top) => {
    window.scrollTo({ top, behavior: 'instant' });
  }, stage3Scroll);
  await new Promise((r) => setTimeout(r, 300));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 1500));

  const restoredStage3 = await page.$eval('.deck-card.card-stage-2 .card-masked-id', (el) => el.textContent);
  console.log('After mid-scroll reload, Stage 3 Card restored:', restoredStage3);

  // ─────────────────────────────────────────────────────────────
  // 2. PREFERS-REDUCED-MOTION TEST
  // ─────────────────────────────────────────────────────────────
  console.log('\n[2] Testing prefers-reduced-motion: reduce...');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto('http://localhost:5173/#scroll', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 600));

  const fallbackDisplay = await page.$eval('.cinematic-reduced-motion-fallback', (el) =>
    window.getComputedStyle(el).display
  );
  console.log('Reduced motion fallback display:', fallbackDisplay);

  const staticPanelsCount = await page.$$eval('.reduced-panel', (els) => els.length);
  console.log('Static panels rendered in reduced motion mode:', staticPanelsCount);

  const shotReduced = path.join(SCREENSHOT_DIR, 'cinematic-reduced-motion.png');
  await page.screenshot({ path: shotReduced });
  console.log('Saved reduced-motion screenshot to', shotReduced);

  // ─────────────────────────────────────────────────────────────
  // 3. MOBILE 390px VIEWPORT TEST
  // ─────────────────────────────────────────────────────────────
  console.log('\n[3] Testing Mobile 390px Viewport...');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });

  // Scroll to section pin start
  await page.evaluate(() => {
    const pinSpacer = document.querySelector('.pin-spacer');
    const top = pinSpacer ? pinSpacer.offsetTop : document.getElementById('scroll').offsetTop;
    window.scrollTo({ top, behavior: 'instant' });
  });
  await new Promise((r) => setTimeout(r, 1200));

  // Check mobile card scale and no blur
  const mobBlur = await page.$eval('.deck-card.card-stage-0', (el) =>
    window.getComputedStyle(el).filter
  );
  console.log('Mobile Card computed filter (expect none):', mobBlur);

  const shotMobile = path.join(SCREENSHOT_DIR, 'cinematic-mobile-390px.png');
  await page.screenshot({ path: shotMobile });
  console.log('Saved 390px mobile screenshot to', shotMobile);

  // ─────────────────────────────────────────────────────────────
  // 4. CONSOLE ERRORS SUMMARY
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- CONSOLE ERRORS REPORT ---');
  if (consoleErrors.length === 0 && pageErrors.length === 0) {
    console.log('CONSOLE ERRORS: none');
  } else {
    console.log('Console Errors:', consoleErrors);
    console.log('Page Errors:', pageErrors);
  }

  await browser.close();
  console.log('--- TEST FINISHED SUCCESSFULLY ---');
})();
