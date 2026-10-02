const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.resolve(__dirname, '../docs/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

(async () => {
  console.log('--- STARTING XAI, SAR, AND CTA SECTIONS TEST ---');

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
  // 1. DESKTOP 1440px
  // ─────────────────────────────────────────────────────────────
  console.log('\n[1] Testing Desktop 1440px...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });

  // Scroll to XAI Section (#xai)
  console.log('Navigating to #xai...');
  await page.waitForSelector('#xai', { timeout: 10000 });
  await page.evaluate(() => {
    const el = document.getElementById('xai');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });

  // Wait for the staggered reveal progression to complete (1.8s)
  await new Promise((r) => setTimeout(r, 2000));

  // Verify visual elements in XAI
  const xaiTitle = await page.$eval('#xai .head-title', (el) => el.textContent);
  console.log('XAI Title:', xaiTitle);

  const xaiScore = await page.$eval('.xai-score-num', (el) => el.textContent);
  console.log('XAI Primary Score:', xaiScore);

  const factorRows = await page.$$('.factor-row');
  console.log('Found factor rows:', factorRows.length);

  // Take screenshot of XAI Section at 1440px
  const xaiShot1440 = path.join(SCREENSHOT_DIR, 'xai-section-1440px.png');
  const xaiElement = await page.$('#xai');
  await xaiElement.screenshot({ path: xaiShot1440 });
  console.log('Saved screenshot:', xaiShot1440);

  // Test Factor Click Interaction: click 2nd factor (Hourly Velocity)
  console.log('\nClicking 2nd factor (Hourly Velocity)...');
  await factorRows[1].click();
  await new Promise((r) => setTimeout(r, 600));

  const activeTag = await page.$eval('.active-factor-tag', (el) => el.textContent);
  console.log('Active Factor Tag in Evidence Card:', activeTag);

  const activeEvidenceSummary = await page.$eval('.evidence-summary-text', (el) => el.textContent);
  console.log('Active Evidence Summary snippet:', activeEvidenceSummary.slice(0, 60) + '...');

  // Click 4th factor (Retained Balance)
  console.log('Clicking 4th factor (Retained Balance)...');
  await factorRows[3].click();
  await new Promise((r) => setTimeout(r, 600));
  const retainedTag = await page.$eval('.active-factor-tag', (el) => el.textContent);
  console.log('Active Factor Tag after 4th click:', retainedTag);

  // Scroll to SAR Section (#sar)
  console.log('\nNavigating to #sar...');
  await page.waitForSelector('#sar', { timeout: 10000 });
  await page.evaluate(() => {
    const el = document.getElementById('sar');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise((r) => setTimeout(r, 800));

  // Verify Empty/Ready State with Generate button
  const sarBtn = await page.$('.generate-sar-btn');
  if (sarBtn) {
    console.log('Found "Generate SAR Draft (Ring fan_1)" button. Clicking...');
    await sarBtn.click();

    // Check loading indicator appears
    await new Promise((r) => setTimeout(r, 400));
    const isLoading = await page.$('.sar-loading-card');
    console.log('SAR loading card present:', !!isLoading);

    // Wait for compilation to complete into Success state
    await page.waitForSelector('.sar-paper-surface', { timeout: 8000 });
    console.log('SAR warm paper surface successfully rendered!');

    // Check Header
    const paperHeader = await page.$eval('.header-badge', (el) => el.textContent.trim());
    console.log('SAR Paper Header:', paperHeader);

    // Check Watermark
    const watermark = await page.$eval('.sar-draft-watermark', (el) => el.textContent.trim());
    console.log('Watermark text:', watermark);

    // Check paper background color
    const paperBg = await page.$eval('.sar-paper-surface', (el) =>
      window.getComputedStyle(el).backgroundColor
    );
    console.log('SAR Paper computed background-color:', paperBg); // Expect rgb(237, 232, 223) == #EDE8DF

    // Test Copy button
    console.log('Testing Copy action...');
    const copyBtn = await page.$('.sar-btn-group button:first-child');
    if (copyBtn) {
      await copyBtn.click();
      await new Promise((r) => setTimeout(r, 300));
      const btnText = await page.evaluate((btn) => btn.textContent, copyBtn);
      console.log('Copy button text after click:', btnText.trim());
    }

    // Capture SAR Section screenshot at 1440px
    const sarShot1440 = path.join(SCREENSHOT_DIR, 'sar-section-1440px.png');
    const sarElement = await page.$('#sar');
    await sarElement.screenshot({ path: sarShot1440 });
    console.log('Saved screenshot:', sarShot1440);
  }

  // Scroll to Final CTA Section (#cta)
  console.log('\nNavigating to #cta...');
  await page.waitForSelector('#cta', { timeout: 10000 });
  await page.evaluate(() => {
    const el = document.getElementById('cta');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });

  // Wait for 3 beats sequential reveal
  await new Promise((r) => setTimeout(r, 1200));

  const beats = await page.$$eval('.beat-line', (els) => els.map((e) => e.textContent.trim()));
  console.log('Revealed Beats:', beats);

  // Check 12% ghosted hero network opacity
  const ghostOpacity = await page.$eval('.cta-ghost-network', (el) =>
    window.getComputedStyle(el).opacity
  );
  console.log('Ghosted Hero Network computed opacity:', ghostOpacity);

  // Check primary button
  const ctaBtnText = await page.$eval('.hero-cta-btn', (el) => el.textContent.trim());
  console.log('Hero CTA Button text:', ctaBtnText);

  // Check footer disclaimer
  const disclaimerText = await page.$eval('.footer-rule-notice', (el) => el.textContent.trim());
  console.log('Footer disclaimer text:', disclaimerText);

  // Capture CTA Section screenshot at 1440px
  const ctaShot1440 = path.join(SCREENSHOT_DIR, 'cta-section-1440px.png');
  const ctaElement = await page.$('#cta');
  await ctaElement.screenshot({ path: ctaShot1440 });
  console.log('Saved screenshot:', ctaShot1440);

  // ─────────────────────────────────────────────────────────────
  // 2. PREFERS-REDUCED-MOTION TEST
  // ─────────────────────────────────────────────────────────────
  console.log('\n[2] Testing prefers-reduced-motion: reduce...');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto('http://localhost:5173/#xai', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    const el = document.getElementById('xai');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });

  // Verify all elements are revealed immediately without timer delays
  await new Promise((r) => setTimeout(r, 200));
  const revealedCount = await page.$$eval('.revealed', (els) => els.length);
  console.log('Number of revealed elements under reduced motion immediately:', revealedCount);

  const reducedShot = path.join(SCREENSHOT_DIR, 'xai-sar-cta-reduced-motion.png');
  await page.screenshot({ path: reducedShot });
  console.log('Saved reduced-motion screenshot:', reducedShot);

  // ─────────────────────────────────────────────────────────────
  // 3. MOBILE 390px VIEWPORT TEST
  // ─────────────────────────────────────────────────────────────
  console.log('\n[3] Testing Mobile 390px Viewport (iPhone 12/13/14)...');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await page.goto('http://localhost:5173/#xai', { waitUntil: 'networkidle2' });

  await page.evaluate(() => {
    const el = document.getElementById('xai');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise((r) => setTimeout(r, 1600));

  // Check mobile accordion presence
  const accordionItems = await page.$$('.accordion-item');
  console.log('Mobile Accordion items found:', accordionItems.length);

  // Check mobile entity list presence
  const entityItems = await page.$$('.entity-item');
  console.log('Mobile Entity List items found:', entityItems.length);

  // Click "View Full Interactive Topology Cut" button
  const switchToGraphBtn = await page.$('.switch-to-graph-btn');
  if (switchToGraphBtn) {
    console.log('Clicking "View Full Interactive Topology Cut" button...');
    await switchToGraphBtn.click();
    await new Promise((r) => setTimeout(r, 400));
  }

  // Scroll down to SAR in mobile
  await page.evaluate(() => {
    const el = document.getElementById('sar');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise((r) => setTimeout(r, 600));

  // Click Generate SAR on mobile
  const mobSarBtn = await page.$('.generate-sar-btn');
  if (mobSarBtn) {
    await mobSarBtn.click();
    await page.waitForSelector('.sar-paper-surface', { timeout: 8000 });
  }

  // Scroll to CTA in mobile
  await page.evaluate(() => {
    const el = document.getElementById('cta');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise((r) => setTimeout(r, 1000));

  const mobileShot = path.join(SCREENSHOT_DIR, 'xai-sar-cta-390px.png');
  await page.screenshot({ path: mobileShot, fullPage: false });
  console.log('Saved 390px mobile screenshot:', mobileShot);

  // ─────────────────────────────────────────────────────────────
  // 4. CONSOLE ERROR SUMMARY
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
