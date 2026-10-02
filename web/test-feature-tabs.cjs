const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.resolve(__dirname, '../docs/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

(async () => {
  console.log('--- STARTING FEATURE TABS SECTION TEST ---');

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

  // 1. Desktop 1440px
  console.log('\n[1] Testing Desktop 1440px...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/#features', { waitUntil: 'networkidle2' });

  // Wait for feature section to be rendered
  await page.waitForSelector('#features', { timeout: 10000 });
  await page.evaluate(() => {
    const el = document.getElementById('features');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise((r) => setTimeout(r, 1200));

  // Take screenshot of 01 DETECT
  const shot1440Detect = path.join(SCREENSHOT_DIR, 'feature-tabs-1440px-detect.png');
  await page.screenshot({ path: shot1440Detect, fullPage: false });
  console.log('Saved screenshot 1440px DETECT to', shot1440Detect);

  // Click on a different pattern chip in DETECT (e.g. cycle or cluster)
  console.log('Testing chip selection in DETECT panel...');
  const chips = await page.$$('.detect-chip');
  if (chips.length > 1) {
    await chips[1].click(); // Click cycle
    await new Promise((r) => setTimeout(r, 600));
  }

  // Click TRACE tab (02)
  console.log('Selecting TRACE tab (02)...');
  await page.click('#feature-tab-trace');
  await new Promise((r) => setTimeout(r, 800));

  // Hover on a node in TRACE to test tooltip
  const traceNodes = await page.$$('.node-group');
  if (traceNodes.length > 0) {
    await traceNodes[0].hover();
    await new Promise((r) => setTimeout(r, 300));
  }

  const shot1440Trace = path.join(SCREENSHOT_DIR, 'feature-tabs-1440px-trace.png');
  await page.screenshot({ path: shot1440Trace, fullPage: false });
  console.log('Saved screenshot 1440px TRACE to', shot1440Trace);

  // Click a node to test 25% opacity receding of unrelated nodes
  if (traceNodes.length > 1) {
    await traceNodes[1].click();
    await new Promise((r) => setTimeout(r, 400));
  }

  // Click EXPLAIN tab (03)
  console.log('Selecting EXPLAIN tab (03)...');
  await page.click('#feature-tab-explain');
  await new Promise((r) => setTimeout(r, 800));

  const shot1440Explain = path.join(SCREENSHOT_DIR, 'feature-tabs-1440px-explain.png');
  await page.screenshot({ path: shot1440Explain, fullPage: false });
  console.log('Saved screenshot 1440px EXPLAIN to', shot1440Explain);

  // Click REPORT tab (04)
  console.log('Selecting REPORT tab (04)...');
  await page.click('#feature-tab-report');
  await new Promise((r) => setTimeout(r, 800));

  const shot1440Report = path.join(SCREENSHOT_DIR, 'feature-tabs-1440px-report.png');
  await page.screenshot({ path: shot1440Report, fullPage: false });
  console.log('Saved screenshot 1440px REPORT to', shot1440Report);

  // Test keyboard navigation (ArrowUp, ArrowDown, Home, End)
  console.log('Testing WAI-ARIA keyboard navigation...');
  await page.focus('#feature-tab-report');
  await page.keyboard.press('ArrowUp');
  await new Promise((r) => setTimeout(r, 300));
  const activeAfterUp = await page.evaluate(() => {
    const active = document.querySelector('.feature-tab-btn.is-active');
    return active ? active.id : null;
  });
  console.log('Active tab after ArrowUp:', activeAfterUp);

  // 2. Prefers-reduced-motion test
  console.log('\n[2] Testing with prefers-reduced-motion: reduce...');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto('http://localhost:5173/#features', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    const el = document.getElementById('features');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise((r) => setTimeout(r, 800));

  const shotReduced = path.join(SCREENSHOT_DIR, 'feature-tabs-1440px-reduced-motion.png');
  await page.screenshot({ path: shotReduced, fullPage: false });
  console.log('Saved screenshot Reduced Motion to', shotReduced);

  // 3. Mobile 390px test
  console.log('\n[3] Testing Mobile 390px...');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:5173/#features', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#features', { timeout: 10000 });
  await page.evaluate(() => {
    const el = document.getElementById('features');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise((r) => setTimeout(r, 1200));

  const featEl = await page.$('#features');
  const shot390 = path.join(SCREENSHOT_DIR, 'feature-tabs-390px.png');
  if (featEl) {
    await featEl.screenshot({ path: shot390 });
  } else {
    await page.screenshot({ path: shot390, fullPage: false });
  }
  console.log('Saved screenshot Mobile 390px to', shot390);

  // 4. Dimensions & Layout Verification
  console.log('\n--- VERIFYING ARCHITECTURAL SPECIFICATIONS ---');
  const specs = await page.evaluate(() => {
    const tabsList = document.querySelector('.feature-tabs-list');
    const stage = document.querySelector('.feature-stage-container');
    const tabs = [...document.querySelectorAll('.feature-tab-btn')];
    const ticks = document.querySelectorAll('.stage-corner');
    const headerStrip = document.querySelector('.stage-title-mono');
    const openAppBtn = document.querySelector('.open-in-app-btn');

    return {
      tabsCount: tabs.length,
      ticksCount: ticks.length,
      headerStripText: headerStrip ? headerStrip.innerText : null,
      hasOpenAppBtn: !!openAppBtn,
      tabsRole: tabsList ? tabsList.getAttribute('role') : null,
      tabsOrientation: tabsList ? tabsList.getAttribute('aria-orientation') : null,
      tabAriaRoles: tabs.map((t) => ({
        id: t.id,
        role: t.getAttribute('role'),
        selected: t.getAttribute('aria-selected'),
        controls: t.getAttribute('aria-controls'),
      })),
    };
  });

  console.log('Specs result:', JSON.stringify(specs, null, 2));

  // Summary
  console.log('\nConsole Errors:', consoleErrors.length > 0 ? consoleErrors.join('\n') : 'none');
  console.log('Page Errors:', pageErrors.length > 0 ? pageErrors.join('\n') : 'none');

  await browser.close();
  console.log('\n--- TEST COMPLETE ---');
})();
