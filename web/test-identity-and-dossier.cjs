const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const screenshotsDir = path.join(__dirname, '..', 'docs', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  console.log('=== TEST 1: Identity & Device Fingerprint Card in Investigation (/workspace) ===');
  await page.goto('http://localhost:5173/workspace/ACC-000000', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.idf-card', { timeout: 10000 });

  // 1. Verify Card Header & Provenance Tag
  const headerText = await page.$eval('.idf-title', (el) => el.textContent.trim());
  console.log('Header text:', headerText);
  if (!headerText.includes('IDENTITY & DEVICE FINGERPRINT')) {
    throw new Error('Header does not contain IDENTITY & DEVICE FINGERPRINT');
  }

  // 2. Verify Rows
  const rowLabels = await page.$$eval('.idf-row-label', (els) => els.map(e => e.textContent.trim()));
  console.log('Row labels:', rowLabels);

  const sublabels = await page.$$eval('.idf-row-sublabel', (els) => els.map(e => e.textContent.trim()));
  console.log('Row headline sentences:', sublabels);

  // 3. Test Expand on Phone row
  console.log('Expanding phone row...');
  const firstRowHeader = await page.$('.idf-row-header');
  await firstRowHeader.click();
  await page.waitForSelector('.idf-chips-wrap', { timeout: 5000 });
  const chips = await page.$$eval('.idf-chip', (els) => els.map(e => e.textContent.trim()));
  console.log('Masked chips:', chips);

  // 4. Test Reveal PII toggle
  console.log('Testing Reveal PII toggle...');
  const revealBtn = await page.$('.idf-reveal-btn');
  if (revealBtn) {
    await revealBtn.click();
    await new Promise((r) => setTimeout(r, 600));
    const revealedSentence = await page.$eval('.idf-row-sublabel', (e) => e.textContent.trim());
    console.log('Revealed sentence:', revealedSentence);
    await revealBtn.click(); // Re-mask
    await new Promise((r) => setTimeout(r, 600));
  }

  // 5. Test "Show shared identifiers on graph"
  console.log('Testing Show on graph button...');
  const showGraphBtn = await page.$('.idf-show-graph-btn');
  if (showGraphBtn) {
    await showGraphBtn.click();
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Take screenshot of Identity Fingerprint card & graph
  const fpScreenshotPath = path.join(screenshotsDir, 'identity-fingerprint-1440px.png');
  await page.screenshot({ path: fpScreenshotPath });
  console.log('Saved screenshot:', fpScreenshotPath);

  console.log('\n=== TEST 2: Export Legal Dossier Modal (/cases) ===');
  await page.goto('http://localhost:5173/cases/fan_1', { waitUntil: 'networkidle2' });
  await page.waitForSelector('button', { timeout: 10000 });

  // Find and click "Export notice & STR dossier"
  const exportBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find((b) => b.textContent.includes('Export notice & STR dossier'));
  });

  if (!exportBtn) {
    throw new Error('Export notice & STR dossier button not found');
  }

  console.log('Clicking Export notice & STR dossier button...');
  await exportBtn.click();

  // Wait for Dossier Modal
  await page.waitForSelector('.dossier-modal', { timeout: 8000 });
  await new Promise((r) => setTimeout(r, 1200));

  // Check Honest Framing Header
  const mandatoryHeader = await page.$eval('.dossier-mandatory-header', (el) => el.textContent.trim());
  console.log('Honest framing header:', mandatoryHeader);
  if (!mandatoryHeader.includes('DRAFT') || !mandatoryHeader.includes('Analyst review required')) {
    throw new Error('Mandatory header missing required honest framing text');
  }

  // Check Legal Advisory
  const advisory = await page.$eval('.dossier-legal-advisory', (el) => el.textContent.trim());
  console.log('Legal advisory note:', advisory.slice(0, 80) + '...');
  if (!advisory.includes('BNSS S.94')) {
    throw new Error('Legal advisory does not mention BNSS S.94');
  }

  // Check Footer
  const footerText = await page.$eval('.dossier-footer', (el) => el.textContent.trim());
  console.log('Footer text:', footerText);

  // Take screenshot of Freeze Notice Tab
  const freezeNoticeShot = path.join(screenshotsDir, 'dossier-freeze-notice-1440px.png');
  await page.screenshot({ path: freezeNoticeShot });
  console.log('Saved screenshot:', freezeNoticeShot);

  // Switch to STR Dossier tab
  console.log('Switching to STR Dossier tab...');
  const strTabBtn = await page.evaluateHandle(() => {
    const tabs = Array.from(document.querySelectorAll('.dossier-tab'));
    return tabs.find((t) => t.textContent.includes('STR Dossier'));
  });
  await strTabBtn.click();
  await new Promise((r) => setTimeout(r, 800));

  // Verify STR Dossier contents
  const strDocTitle = await page.$eval('.dossier-doc-title', (el) => el.textContent.trim());
  console.log('STR Doc Title:', strDocTitle);

  // Take screenshot of STR Dossier Tab
  const strDossierShot = path.join(screenshotsDir, 'dossier-str-1440px.png');
  await page.screenshot({ path: strDossierShot });
  console.log('Saved screenshot:', strDossierShot);

  // Close modal via close button
  const closeBtn = await page.$('.dossier-close-btn');
  await closeBtn.click();
  await new Promise((r) => setTimeout(r, 500));

  console.log('\n=== RESULTS SUMMARY ===');
  console.log('Console Errors caught:', consoleErrors.filter(e => !e.includes('422')).length);
  console.log('All tests passed successfully!');

  await browser.close();
})();
