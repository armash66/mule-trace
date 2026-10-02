const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function run() {
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

  // 1. Desktop 1440px Hero View
  console.log('Navigating to http://localhost:5173/welcome at 1440px...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/welcome', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  const pHero1440 = path.join(screenshotsDir, 'landing-hero-1440px.png');
  await page.screenshot({ path: pHero1440, fullPage: false });
  console.log(`Saved screenshot 1440px hero to ${pHero1440}`);

  // Scroll through all sections gradually
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 300;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });

  await new Promise(r => setTimeout(r, 1000));

  // Check section opacities and visibility
  const sectionReport = await page.evaluate(() => {
    const ids = ['problem', 'approach', 'features', 'workbench', 'scroll', 'xai', 'sar'];
    return ids.map(id => {
      const el = document.getElementById(id);
      if (!el) return { id, found: false };
      const style = window.getComputedStyle(el);
      return {
        id,
        found: true,
        opacity: style.opacity,
        visibility: style.visibility,
        transform: style.transform,
        display: style.display,
        height: el.offsetHeight
      };
    });
  });

  const pScroll1440 = path.join(screenshotsDir, 'landing-1440px.png');
  await page.screenshot({ path: pScroll1440, fullPage: false });
  console.log(`Saved screenshot 1440px scrolled to ${pScroll1440}`);

  // 2. Mobile 390px View
  console.log('Resizing to 390px viewport...');
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 600));

  const p390 = path.join(screenshotsDir, 'landing-390px.png');
  await page.screenshot({ path: p390, fullPage: false });
  console.log(`Saved screenshot 390px to ${p390}`);

  // 3. Test prefers-reduced-motion
  console.log('Testing prefers-reduced-motion: reduce...');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.evaluate(() => window.scrollTo(0, 500));
  await new Promise(r => setTimeout(r, 500));

  const reducedReport = await page.evaluate(() => {
    const edges = Array.from(document.querySelectorAll('.edge-path')).map(el => {
      const style = window.getComputedStyle(el);
      return {
        animationName: style.animationName,
        opacity: style.opacity
      };
    });
    return {
      edgeCount: edges.length,
      sampleEdge: edges[0]
    };
  });

  // 4. Desktop 1440px CommandCenter / App Overview
  console.log('Testing http://localhost:5173/command (CommandCenter at 1440px)...');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/command', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  const pApp1440 = path.join(screenshotsDir, 'app-overview-1440px.png');
  await page.screenshot({ path: pApp1440, fullPage: false });
  console.log(`Saved screenshot app overview 1440px to ${pApp1440}`);

  await browser.close();

  const result = {
    sectionReport,
    reducedReport,
    consoleLogs,
    consoleErrors,
    pageErrors,
    screenshots: {
      pHero1440,
      pScroll1440,
      p390,
      pApp1440
    }
  };

  console.log('AUDIT_RESULT_START');
  console.log(JSON.stringify(result, null, 2));
  console.log('AUDIT_RESULT_END');
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
