const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function testProblemSection() {
  console.log('--- STARTING PROBLEM SECTION TEST ---');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const consoleLogs = [];
  const consoleErrors = [];
  const pageErrors = [];

  const page = await browser.newPage();

  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    consoleLogs.push(`[${type}] ${text}`);
    if (type === 'error') {
      consoleErrors.push(text);
    }
  });

  page.on('pageerror', err => {
    pageErrors.push(err.toString());
  });

  const screenshotsDir = path.join(__dirname, '..', 'docs', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // 1. DESKTOP 1440px: Motion ON (Reduced Motion OFF)
  console.log('\n[1] Testing Desktop 1440px with Motion ON...');
  await page.setViewport({ width: 1440, height: 950 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);

  await page.goto('http://localhost:5173/welcome', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  // Scroll smoothly down to the problem section
  console.log('Scrolling to #problem section...');
  await page.evaluate(() => {
    const el = document.getElementById('problem');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
  await new Promise(r => setTimeout(r, 1500)); // wait for 1.2s animation to play

  // Verify headline text
  const headlineTexts = await page.evaluate(() => {
    const line1 = document.querySelector('.headline-line.line-1')?.textContent?.trim();
    const line2 = document.querySelector('.headline-line.line-2')?.textContent?.trim();
    return { line1, line2 };
  });
  console.log('Headline detected:', headlineTexts);

  // Take screenshot of 1440px in Network view
  const pNet1440 = path.join(screenshotsDir, 'problem-section-1440px-network.png');
  const problemElement = await page.$('#problem');
  if (problemElement) {
    await problemElement.screenshot({ path: pNet1440 });
    console.log(`Saved screenshot 1440px Network to ${pNet1440}`);
  }

  // Toggle to Transaction view via keyboard or click
  console.log('Toggling to TRANSACTION VIEW...');
  await page.click('#tab-transaction');
  await new Promise(r => setTimeout(r, 1400));

  const pTx1440 = path.join(screenshotsDir, 'problem-section-1440px-transaction.png');
  if (problemElement) {
    await problemElement.screenshot({ path: pTx1440 });
    console.log(`Saved screenshot 1440px Transaction to ${pTx1440}`);
  }

  // Toggle back to Network view
  console.log('Toggling back to NETWORK VIEW...');
  await page.click('#tab-network');
  await new Promise(r => setTimeout(r, 1400));

  // 2. REDUCED MOTION TEST: Reduced motion ON
  console.log('\n[2] Testing with prefers-reduced-motion: reduce...');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.reload({ waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    const el = document.getElementById('problem');
    if (el) {
      el.scrollIntoView({ behavior: 'auto', block: 'center' });
    }
  });
  await new Promise(r => setTimeout(r, 800));

  const pReduced1440 = path.join(screenshotsDir, 'problem-section-1440px-reduced-motion.png');
  const problemReducedEl = await page.$('#problem');
  if (problemReducedEl) {
    await problemReducedEl.screenshot({ path: pReduced1440 });
    console.log(`Saved screenshot 1440px Reduced Motion to ${pReduced1440}`);
  }

  // 3. MOBILE 390px Viewport
  console.log('\n[3] Testing Mobile 390px (iPhone 14 standard)...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));

  await page.evaluate(() => {
    const nav = document.querySelector('.navbar-root');
    if (nav) nav.style.display = 'none';
    const el = document.getElementById('problem');
    if (el) {
      el.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  });
  await new Promise(r => setTimeout(r, 1600));

  const pMobile390Net = path.join(screenshotsDir, 'problem-section-390px-network.png');
  const problemMobileEl = await page.$('#problem');
  if (problemMobileEl) {
    await problemMobileEl.screenshot({ path: pMobile390Net });
    console.log(`Saved screenshot 390px Network to ${pMobile390Net}`);
  }

  // Mobile Transaction View
  await page.click('#tab-transaction');
  await new Promise(r => setTimeout(r, 1400));

  const pMobile390Tx = path.join(screenshotsDir, 'problem-section-390px-transaction.png');
  if (problemMobileEl) {
    await problemMobileEl.screenshot({ path: pMobile390Tx });
    console.log(`Saved screenshot 390px Transaction to ${pMobile390Tx}`);
  }

  // Check table contents & node count
  const auditReport = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.problem-ledger-table tbody tr')).map(tr => ({
      time: tr.querySelector('.cell-time')?.textContent,
      from: tr.querySelector('.cell-from')?.textContent,
      to: tr.querySelector('.cell-to')?.textContent,
      amount: tr.querySelector('.cell-amount')?.textContent,
      channel: tr.querySelector('.cell-channel')?.textContent,
    }));
    const caption = document.querySelector('.problem-caption-text')?.textContent?.trim();
    const provenance = document.querySelector('.stage-topbar .prov')?.textContent?.trim();
    return { rowsCount: rows.length, rows, caption, provenance };
  });

  console.log('\n--- AUDIT RESULTS ---');
  console.log('Ledger row count:', auditReport.rowsCount);
  console.log('Sample rows:', auditReport.rows.slice(0, 2));
  console.log('Stage Caption:', auditReport.caption);
  console.log('Provenance Badge:', auditReport.provenance);
  console.log('\nConsole Errors:', consoleErrors.length === 0 ? 'none' : consoleErrors);
  console.log('Page Errors:', pageErrors.length === 0 ? 'none' : pageErrors);

  await browser.close();
  console.log('\n--- TEST COMPLETE ---');
}

testProblemSection().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
