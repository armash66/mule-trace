const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });

  // Scroll to #scroll
  await page.evaluate(() => {
    const el = document.getElementById('scroll');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise((r) => setTimeout(r, 2000));

  const details = await page.evaluate(() => {
    const el = document.getElementById('scroll');
    const pinWrap = el?.querySelector('.cinematic-pin-wrap');
    const fallback = el?.querySelector('.cinematic-reduced-motion-fallback');
    const spacer = el?.querySelector('.pin-spacer');

    return {
      elHeight: el?.offsetHeight,
      pinWrapHeight: pinWrap?.offsetHeight,
      pinWrapDisplay: pinWrap ? window.getComputedStyle(pinWrap).display : null,
      fallbackHeight: fallback?.offsetHeight,
      fallbackDisplay: fallback ? window.getComputedStyle(fallback).display : null,
      hasSpacer: !!spacer,
      spacerHeight: spacer?.offsetHeight,
    };
  });

  console.log('Details:', details);
  await browser.close();
})();
