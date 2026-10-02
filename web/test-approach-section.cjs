const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function testApproachSection() {
  console.log('--- STARTING 4-STAGE APPROACH SECTION TEST ---');

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

  // 1. DESKTOP 1440px: Motion ON
  console.log('\n[1] Testing Desktop 1440px with Motion ON...');
  await page.setViewport({ width: 1440, height: 950 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);

  await page.goto('http://localhost:5173/welcome', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  // Scroll to approach section
  console.log('Scrolling to #approach section...');
  await page.evaluate(() => {
    const el = document.getElementById('approach');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
  await new Promise(r => setTimeout(r, 1600)); // wait for 1.2s travelling bright segment animation

  // Capture desktop 1440px screenshot
  const pApproach1440 = path.join(screenshotsDir, 'approach-section-1440px.png');
  const approachEl = await page.$('#approach');
  if (approachEl) {
    await approachEl.screenshot({ path: pApproach1440 });
    console.log(`Saved screenshot 1440px to ${pApproach1440}`);
  }

  // Test Hover Interaction: Hover stage 02 (Trace)
  console.log('Testing hover interaction on stage 02 (Trace)...');
  await page.hover('.spine-stage-item:nth-child(2) button');
  await new Promise(r => setTimeout(r, 500));

  const pApproachHover = path.join(screenshotsDir, 'approach-section-1440px-hover.png');
  if (approachEl) {
    await approachEl.screenshot({ path: pApproachHover });
    console.log(`Saved screenshot 1440px Hover to ${pApproachHover}`);
  }

  // Verify that activeTab in #features matches 'trace'
  const activeFeatureTab = await page.evaluate(() => {
    const activeBtn = document.querySelector('.feature-nav-item.active .nav-title');
    return activeBtn ? activeBtn.textContent : null;
  });
  console.log('Active feature tab after hovering Trace:', activeFeatureTab);

  // Test Click Interaction: Click stage 03 (Explain)
  console.log('Testing click interaction on stage 03 (Explain)...');
  await page.click('.spine-stage-item:nth-child(3) button');
  await new Promise(r => setTimeout(r, 800));

  const activeTabAfterClick = await page.evaluate(() => {
    const activeBtn = document.querySelector('.feature-nav-item.active .nav-title');
    return activeBtn ? activeBtn.textContent : null;
  });
  console.log('Active feature tab after clicking Explain:', activeTabAfterClick);

  // 2. REDUCED MOTION TEST: Reduced motion ON
  console.log('\n[2] Testing with prefers-reduced-motion: reduce...');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.reload({ waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    const el = document.getElementById('approach');
    if (el) {
      el.scrollIntoView({ behavior: 'auto', block: 'center' });
    }
  });
  await new Promise(r => setTimeout(r, 600));

  const pReduced1440 = path.join(screenshotsDir, 'approach-section-1440px-reduced-motion.png');
  const approachReducedEl = await page.$('#approach');
  if (approachReducedEl) {
    await approachReducedEl.screenshot({ path: pReduced1440 });
    console.log(`Saved screenshot 1440px Reduced Motion to ${pReduced1440}`);
  }

  // 3. MOBILE 390px Viewport
  console.log('\n[3] Testing Mobile 390px...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  await page.evaluate(() => {
    const nav = document.querySelector('.navbar-root');
    if (nav) nav.style.display = 'none';
    const el = document.getElementById('approach');
    if (el) {
      el.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  });
  await new Promise(r => setTimeout(r, 1600));

  const pMobile390 = path.join(screenshotsDir, 'approach-section-390px.png');
  const approachMobileEl = await page.$('#approach');
  if (approachMobileEl) {
    await approachMobileEl.screenshot({ path: pMobile390 });
    console.log(`Saved screenshot 390px to ${pMobile390}`);
  }

  // Check copy content & stroke attributes
  const auditReport = await page.evaluate(() => {
    const stages = Array.from(document.querySelectorAll('.spine-stage-item')).map(item => ({
      num: item.querySelector('.numeral-outline')?.textContent?.trim(),
      name: item.querySelector('.stage-name')?.textContent?.trim(),
      copy: item.querySelector('.stage-copy')?.textContent?.trim(),
      hasStroke: window.getComputedStyle(item.querySelector('.numeral-outline')).webkitTextStrokeWidth !== '',
    }));
    return { stagesCount: stages.length, stages };
  });

  console.log('\n--- AUDIT RESULTS ---');
  console.log('Stages count:', auditReport.stagesCount);
  console.log('Stages details:', auditReport.stages);
  console.log('\nConsole Errors:', consoleErrors.length === 0 ? 'none' : consoleErrors);
  console.log('Page Errors:', pageErrors.length === 0 ? 'none' : pageErrors);

  await browser.close();
  console.log('\n--- TEST COMPLETE ---');
}

testApproachSection().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
