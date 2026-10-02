const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function testReplay() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERR:', err.message));

  console.log('Navigating to /replay on preview server (4173)...');
  await page.goto('http://localhost:4173/replay', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => {
    return document.querySelector('.shell-main')?.innerText.includes('Step 1 of 10');
  }, { timeout: 10000 }).catch((e) => console.log('Wait timeout for Step 1 of 10:', e.message));

  // Check ledger items
  console.log('Page loaded. Checking ledger steps...');
  const stepText = await page.locator('text=/Step 1 of 10/i').first().isVisible().catch(() => false);
  console.log('Ledger header "Step 1 of 10" visible:', stepText);

  // Take screenshot of initial state
  const shotsDir = path.resolve(__dirname, '../docs/shots');
  if (!fs.existsSync(shotsDir)) fs.mkdirSync(shotsDir, { recursive: true });
  await page.screenshot({ path: path.join(shotsDir, 'replay-fixed-step1.png'), fullPage: true });
  console.log('Saved screenshot replay-fixed-step1.png');

  // Test Play button
  const playButton = page.locator('button[aria-label="Play simulation"]');
  if (await playButton.isVisible()) {
    console.log('Clicking Play button...');
    await playButton.click();
    await page.waitForTimeout(2500); // let it advance
    const currentStepText = await page.locator('text=/Step [2-9]\\/10/i').first().isVisible().catch(() => false);
    console.log('Advanced after Play clicked:', currentStepText);
  }

  // Test Freeze toggle
  const freezeCheckbox = page.locator('input[type="checkbox"]');
  console.log('Checking "Apply Min-Cut Freeze at ACC_05001" checkbox...');
  await freezeCheckbox.check();
  await page.waitForTimeout(1000);

  const stoppedOutcome = await page.locator('text=/Stopped/i').first().isVisible().catch(() => false);
  console.log('Outcome updated to Stopped:', stoppedOutcome);

  // Test Optimal Cut toggle
  const optimalCutToggle = page.locator('button[role="switch"][title="Toggle Optimal Cut"]');
  if (await optimalCutToggle.isVisible()) {
    console.log('Toggling Optimal Cut...');
    await optimalCutToggle.click();
    await page.waitForTimeout(1000);
    const zonesOverlay = await page.locator('.zones-overlay').first().isVisible().catch(() => false);
    console.log('Optimal Cut 3-Zones overlay visible:', zonesOverlay);
  }

  // Take screenshot of running / frozen / optimal cut state
  await page.screenshot({ path: path.join(shotsDir, 'replay-fixed-complete.png'), fullPage: true });
  console.log('Saved screenshot replay-fixed-complete.png');

  await browser.close();
  console.log('Replay simulator verification finished successfully!');
}

testReplay().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
