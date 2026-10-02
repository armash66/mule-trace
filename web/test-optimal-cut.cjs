const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const artifactDir = 'C:/Users/rayan/.gemini/antigravity-ide/brain/45e1e952-c705-462f-9939-185db500e357';
  console.log('Starting Puppeteer test for Optimal Cut...');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const consoleErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.toString());
  });

  // ── 1. Desktop Test (1440x900) ──
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/overview', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));

  // Verify Simulate Live Heist button has NO lightning icon
  const simBtnText = await page.$eval('.btn-ghost-sim', el => el.innerText.trim());
  const simBtnHasSvg = await page.$eval('.btn-ghost-sim', el => !!el.querySelector('svg'));
  console.log(`Simulate button text: "${simBtnText}", has SVG icon inside: ${simBtnHasSvg}`);
  if (simBtnHasSvg || simBtnText.includes('⚡')) {
    console.error('FAIL: Simulate Live Heist button still contains lightning icon/emoji!');
  } else {
    console.log('✓ PASS: Simulate Live Heist button is clean with no fiq/lightning sign.');
  }

  // Scroll down to the Cytoscape graph cluster in Overview
  await page.evaluate(() => {
    const cluster = document.querySelector('.cluster-graph-container') || document.querySelector('.cy-graph-container');
    if (cluster) cluster.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 600));

  // Find the Optimal Cut toggle button
  const toggleBtn = await page.$('.toggle-optimal-cut');
  if (!toggleBtn) {
    console.error('FAIL: .toggle-optimal-cut button not found on Cytoscape graph!');
    await browser.close();
    process.exit(1);
  }

  // Click to toggle Optimal Cut ON
  console.log('Toggling Optimal Cut ON...');
  await toggleBtn.click();
  // Wait for 600ms layout animation + settling
  await new Promise(r => setTimeout(r, 800));

  const activeAriaPressed = await page.$eval('.toggle-optimal-cut', el => el.getAttribute('aria-pressed'));
  console.log(`After click aria-pressed: ${activeAriaPressed}`);

  // Verify 3 Zones are visible
  const zoneVictim = await page.$('.zone-col.victim');
  const zoneHub = await page.$('.zone-col.hub');
  const zoneMule = await page.$('.zone-col.mule');
  console.log(`Zones present: Victim=${!!zoneVictim}, Hub=${!!zoneHub}, Mule=${!!zoneMule}`);

  // Verify glowing dashed cut line and scissors icon
  const cutLine = await page.$('.cut-line-amber');
  const scissorsSvg = await page.$('.cut-scissors-svg');
  const cutBadgeText = await page.$eval('.cut-badge-text', el => el.innerText.trim());
  console.log(`Cut line present: ${!!cutLine}, Scissors SVG present: ${!!scissorsSvg}`);
  console.log(`Cut badge label: "${cutBadgeText}"`);

  // Open "Why this cut" panel
  console.log('Clicking the cut badge to open "Why this cut" panel...');
  const cutBadgeBtn = await page.$('.cut-badge-button');
  if (cutBadgeBtn) {
    await cutBadgeBtn.click();
    await new Promise(r => setTimeout(r, 500));
  }

  // Capture desktop screenshot at 1440px
  const desktopShotPath = path.join(artifactDir, 'optimal_cut_desktop_1440.png');
  await page.screenshot({ path: desktopShotPath, fullPage: false });
  console.log(`Saved desktop screenshot: ${desktopShotPath}`);

  // Test "Reset layout" button
  console.log('Testing "Reset layout" button...');
  const resetBtn = await page.$('.btn-reset-layout');
  if (resetBtn) {
    await resetBtn.click();
    await new Promise(r => setTimeout(r, 800));
    const isCutActiveAfterReset = await page.$eval('.toggle-optimal-cut', el => el.getAttribute('aria-pressed'));
    const isWhyCutStillOpen = await page.$('.why-cut-overlay');
    console.log(`After Reset layout: aria-pressed=${isCutActiveAfterReset}, isWhyCutStillOpen=${!!isWhyCutStillOpen}`);
  }

  // ── 2. Mobile Test (390x844 - iPhone 12/13/14) ──
  console.log('\nTesting Mobile view (390px)...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:5173/overview', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));

  // Scroll to graph container
  await page.evaluate(() => {
    const cluster = document.querySelector('.cluster-graph-container') || document.querySelector('.cy-graph-container');
    if (cluster) cluster.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 500));

  // Toggle Optimal Cut on Mobile
  const mobileToggle = await page.$('.toggle-optimal-cut');
  if (mobileToggle) {
    await mobileToggle.click();
    await new Promise(r => setTimeout(r, 800));
  }

  // Click cut badge to open mobile bottom sheet
  const mobileCutBadge = await page.$('.cut-badge-button');
  if (mobileCutBadge) {
    await mobileCutBadge.click();
    await new Promise(r => setTimeout(r, 600));
  }

  // Verify mobile bottom sheet
  const mobileSheet = await page.$('.why-cut-overlay');
  const mobileBackdrop = await page.$('.why-cut-backdrop');
  console.log(`Mobile bottom sheet open: ${!!mobileSheet}, backdrop present: ${!!mobileBackdrop}`);

  // Capture mobile screenshot at 390px
  const mobileShotPath = path.join(artifactDir, 'optimal_cut_mobile_390.png');
  await page.screenshot({ path: mobileShotPath, fullPage: false });
  console.log(`Saved mobile screenshot: ${mobileShotPath}`);

  // ── Console Errors Check ──
  console.log('\n--- Console Errors Check ---');
  if (consoleErrors.length === 0) {
    console.log('✓ CONSOLE IS CLEAN: 0 errors detected.');
  } else {
    console.warn('Console messages/errors:', consoleErrors);
  }

  await browser.close();
  console.log('Optimal Cut Puppeteer test completed successfully!');
})();
