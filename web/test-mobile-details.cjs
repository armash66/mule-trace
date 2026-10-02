const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.resolve(__dirname, '../docs/screenshots');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });

  // 1. Mobile XAI Section
  await page.evaluate(() => {
    const el = document.getElementById('xai');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    if (document.activeElement && 'blur' in document.activeElement) {
      document.activeElement.blur();
    }
  });
  await new Promise((r) => setTimeout(r, 2000));
  const xaiEl = await page.$('#xai');
  await xaiEl.screenshot({ path: path.join(SCREENSHOT_DIR, 'xai-section-390px.png') });
  console.log('Saved xai-section-390px.png');

  // 2. Mobile SAR Section
  await page.evaluate(() => {
    const el = document.getElementById('sar');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise((r) => setTimeout(r, 800));
  const sarBtn = await page.$('.generate-sar-btn');
  if (sarBtn) {
    await sarBtn.click();
    await page.waitForSelector('.sar-paper-surface', { timeout: 8000 });
  }
  await page.evaluate(() => {
    if (document.activeElement && 'blur' in document.activeElement) {
      document.activeElement.blur();
    }
    // Scroll window down past the fixed navbar so section is cleanly visible
    const el = document.getElementById('sar');
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top, behavior: 'instant' });
    }
  });
  await new Promise((r) => setTimeout(r, 500));
  const sarEl = await page.$('#sar');
  await sarEl.screenshot({ path: path.join(SCREENSHOT_DIR, 'sar-section-390px.png') });
  console.log('Saved sar-section-390px.png');

  // 3. Mobile CTA Section
  await page.evaluate(() => {
    const el = document.getElementById('cta');
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top, behavior: 'instant' });
    }
  });
  await new Promise((r) => setTimeout(r, 1200));
  const ctaEl = await page.$('#cta');
  await ctaEl.screenshot({ path: path.join(SCREENSHOT_DIR, 'cta-section-390px.png') });
  console.log('Saved cta-section-390px.png');

  await browser.close();
})();
