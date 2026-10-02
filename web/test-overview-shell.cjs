const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.resolve('d:/muletrace/docs/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

(async () => {
  console.log('--- STARTING APP SHELL & OVERVIEW SCREEN AUDIT ---');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('response', (res) => {
    if (res.status() >= 400) {
      console.log('HTTP ERROR:', res.status(), res.url());
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 1. DESKTOP 1440px — LOADED STATE AUDIT
  // ─────────────────────────────────────────────────────────────
  console.log('\n[1] Testing Desktop 1440px Loaded State (?state=loaded)...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/overview?state=loaded', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));

  // Check presence of Shell elements
  const wordmark = await page.$eval('.shell-brand-name', (el) => el.textContent.trim());
  const activeNav = await page.$eval('.shell-nav-link.active', (el) => el.textContent.trim());
  const footerText = await page.$eval('.shell-footer', (el) => el.textContent.trim());

  console.log('Wordmark:', wordmark);
  console.log('Active Nav Item:', activeNav);
  console.log('Footer Preview:', footerText.slice(0, 60));

  // Check KPI numbers loaded
  const kpiCount = await page.$$eval('.kpi-card', (els) => els.length);
  const capitalAtRisk = await page.$eval('.kpi-val.signal-val', (el) => el.textContent.trim());
  const priorityAlertsCount = await page.$$eval('.alert-row', (els) => els.length);

  console.log(`KPI cards rendered: ${kpiCount}`);
  console.log(`Capital at Risk (amber signal): ${capitalAtRisk}`);
  console.log(`Priority Alerts rendered: ${priorityAlertsCount}`);

  // Screenshot Desktop Loaded State
  const shotDesktopLoaded = path.join(SCREENSHOT_DIR, 'overview-loaded-1440px.png');
  await page.screenshot({ path: shotDesktopLoaded });
  console.log('Saved loaded state screenshot to', shotDesktopLoaded);

  // ─────────────────────────────────────────────────────────────
  // 2. DESKTOP 1440px — EMPTY STATE AUDIT
  // ─────────────────────────────────────────────────────────────
  console.log('\n[2] Testing Desktop 1440px Empty State (?state=empty)...');
  await page.goto('http://localhost:5173/overview?state=empty', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));

  const emptyHeading = await page.$eval('.empty-heading', (el) => el.textContent.trim());
  const heroButtonText = await page.$eval('.btn-hero-demo', (el) => el.textContent.trim());
  const ghostVisible = await page.$eval('.empty-network-ghost', (el) => !!el);

  console.log('Empty state heading:', emptyHeading);
  console.log('Hero Action Button:', heroButtonText);
  console.log('Illustrative ghost network rendered:', ghostVisible);

  const shotDesktopEmpty = path.join(SCREENSHOT_DIR, 'overview-empty-1440px.png');
  await page.screenshot({ path: shotDesktopEmpty });
  console.log('Saved empty state screenshot to', shotDesktopEmpty);

  // Test "Use demo dataset" click action
  console.log('Clicking "Use demo dataset"...');
  await page.click('.btn-hero-demo');
  await new Promise((r) => setTimeout(r, 1500));

  // Verify toast appears
  const toastText = await page.$eval('[role="status"]', (el) => el.textContent.trim()).catch(() => 'none');
  console.log('Toast notification rendered:', toastText);

  // ─────────────────────────────────────────────────────────────
  // 3. MOBILE 390px — LOADED & EMPTY STATES AUDIT
  // ─────────────────────────────────────────────────────────────
  console.log('\n[3] Testing Mobile 390px Viewport...');
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await page.goto('http://localhost:5173/overview?state=loaded', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));

  const shotMobileLoaded = path.join(SCREENSHOT_DIR, 'overview-loaded-390px.png');
  await page.screenshot({ path: shotMobileLoaded });
  console.log('Saved 390px mobile loaded state to', shotMobileLoaded);

  // Test mobile drawer toggle
  console.log('Testing Mobile Drawer Toggle...');
  await page.click('.shell-mobile-toggle');
  await new Promise((r) => setTimeout(r, 400));

  const isDrawerOpen = await page.$eval('.shell-sidebar', (el) => el.classList.contains('drawer-open'));
  console.log('Mobile Drawer open state:', isDrawerOpen);

  const shotMobileDrawer = path.join(SCREENSHOT_DIR, 'overview-mobile-drawer-390px.png');
  await page.screenshot({ path: shotMobileDrawer });
  console.log('Saved 390px mobile drawer to', shotMobileDrawer);

  // Close drawer
  await page.click('.shell-drawer-close');
  await new Promise((r) => setTimeout(r, 300));

  // Mobile Empty State
  await page.goto('http://localhost:5173/overview?state=empty', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));

  const shotMobileEmpty = path.join(SCREENSHOT_DIR, 'overview-empty-390px.png');
  await page.screenshot({ path: shotMobileEmpty });
  console.log('Saved 390px mobile empty state to', shotMobileEmpty);

  // ─────────────────────────────────────────────────────────────
  // 4. PREFERS-REDUCED-MOTION AUDIT
  // ─────────────────────────────────────────────────────────────
  console.log('\n[4] Testing prefers-reduced-motion: reduce...');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/overview?state=loaded', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));

  const shotReducedMotion = path.join(SCREENSHOT_DIR, 'overview-reduced-motion-1440px.png');
  await page.screenshot({ path: shotReducedMotion });
  console.log('Saved reduced motion screenshot to', shotReducedMotion);

  // ─────────────────────────────────────────────────────────────
  // 5. TEST ALL NAVIGATION ITEMS
  // ─────────────────────────────────────────────────────────────
  console.log('\n[5] Verifying all navigation links...');
  const navTargets = [
    { name: 'Alerts', selector: 'a[href="/alerts"]', expectText: 'Alert' },
    { name: 'Investigate', selector: 'a[href="/workspace"]', expectText: 'Investigate' },
    { name: 'Freezes', selector: 'a[href="/freezes"]', expectText: 'Freeze' },
    { name: 'Cases', selector: 'a[href="/cases"]', expectText: 'Case' },
    { name: 'Data', selector: 'a[href="/data"]', expectText: 'Data' },
    { name: 'How it works', selector: 'a[href="/patterns"]', expectText: 'Pattern' },
    { name: 'Replay', selector: 'a[href="/replay"]', expectText: 'Replay' },
    { name: 'Rules', selector: 'a[href="/rules"]', expectText: 'Rule' },
    { name: 'Accuracy', selector: 'a[href="/performance"]', expectText: 'Accuracy' },
    { name: 'Activity log', selector: 'a[href="/audit"]', expectText: 'Activity' },
  ];

  for (const item of navTargets) {
    const exists = await page.$(item.selector);
    console.log(`Nav item ${item.name} (${item.selector}): ${exists ? 'EXISTS' : 'MISSING'}`);
  }

  // Test Search ⌘K trigger
  console.log('\n[6] Testing ⌘K Command Palette...');
  await page.click('.shell-search-trigger');
  await new Promise((r) => setTimeout(r, 400));
  const paletteOpen = await page.$eval('[cmdk-root]', (el) => !!el).catch(() => false);
  console.log('Command Palette opened via trigger:', paletteOpen);

  // Press ESC to close
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 300));
  const paletteClosed = await page.$eval('[cmdk-root]', (el) => false).catch(() => true);
  console.log('Command Palette closed via ESC:', paletteClosed);

  // ─────────────────────────────────────────────────────────────
  // 7. CONSOLE ERRORS SUMMARY
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- CONSOLE ERRORS REPORT ---');
  if (consoleErrors.length === 0 && pageErrors.length === 0) {
    console.log('CONSOLE ERRORS: none');
  } else {
    console.log('Console Errors:', consoleErrors);
    console.log('Page Errors:', pageErrors);
  }

  await browser.close();
  console.log('\n--- AUDIT COMPLETED SUCCESSFULLY ---');
})();
