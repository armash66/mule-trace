const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function testNavbar() {
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

  // ── TEST 1: Desktop 1440px ────────────────────────────────
  console.log('1. Testing Desktop 1440px viewport...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/welcome', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  // Check initial state (top of page: transparent, no border)
  const initialNavState = await page.evaluate(() => {
    const nav = document.querySelector('.mule-navbar');
    if (!nav) return { found: false };
    const style = window.getComputedStyle(nav);
    return {
      found: true,
      isTransparentClass: nav.classList.contains('is-transparent'),
      isScrolledClass: nav.classList.contains('is-scrolled'),
      backgroundColor: style.backgroundColor,
      borderBottomWidth: style.borderBottomWidth,
      borderBottomColor: style.borderBottomColor,
      backdropFilter: style.backdropFilter || style.webkitBackdropFilter,
      wordmarkText: document.querySelector('.nav-brand-desktop .nav-wordmark')?.textContent?.trim(),
      hasAmberDot: !!document.querySelector('.nav-brand-desktop .nav-amber-dot'),
      links: Array.from(document.querySelectorAll('.nav-links-desktop a')).map(a => ({
        text: a.textContent?.trim(),
        href: a.getAttribute('href')
      })),
      launchBtnText: document.querySelector('.nav-col-right .nav-launch-btn span')?.textContent?.trim(),
      skipLinkExists: !!document.querySelector('.skip-to-content'),
      htmlScrollPaddingTop: window.getComputedStyle(document.documentElement).scrollPaddingTop
    };
  });

  // Capture unscrolled screenshot at 1440px
  const pNavUnscrolled = path.join(screenshotsDir, 'navbar-1440px-top.png');
  await page.screenshot({ path: pNavUnscrolled, fullPage: false });

  // Scroll down to test scrolled navbar
  await page.evaluate(() => window.scrollTo(0, 200));
  await new Promise(r => setTimeout(r, 400));

  const scrolledNavState = await page.evaluate(() => {
    const nav = document.querySelector('.mule-navbar');
    if (!nav) return { found: false };
    const style = window.getComputedStyle(nav);
    return {
      found: true,
      isTransparentClass: nav.classList.contains('is-transparent'),
      isScrolledClass: nav.classList.contains('is-scrolled'),
      backgroundColor: style.backgroundColor,
      borderBottomWidth: style.borderBottomWidth,
      borderBottomColor: style.borderBottomColor,
      backdropFilter: style.backdropFilter || style.webkitBackdropFilter
    };
  });

  // Test amber focus ring on interactive element
  const focusRingState = await page.evaluate(() => {
    const btn = document.querySelector('.nav-launch-btn');
    if (!btn) return { found: false };
    btn.focus();
    const style = window.getComputedStyle(btn);
    return {
      found: true,
      outlineColor: style.outlineColor,
      outlineWidth: style.outlineWidth,
      outlineStyle: style.outlineStyle
    };
  });

  const pNavScrolled = path.join(screenshotsDir, 'navbar-1440px-scrolled.png');
  await page.screenshot({ path: pNavScrolled, fullPage: false });

  // ── TEST 2: Mobile 390px ──────────────────────────────────
  console.log('2. Testing Mobile 390px viewport...');
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 500));

  const mobileGridState = await page.evaluate(() => {
    const container = document.querySelector('.nav-container');
    const wordmark = document.querySelector('.nav-brand-mobile .nav-wordmark');
    const hamburger = document.querySelector('.nav-hamburger-btn');
    const actionBtn = document.querySelector('.nav-mobile-action-btn');

    if (!container || !wordmark || !hamburger || !actionBtn) return { found: false };

    const cStyle = window.getComputedStyle(container);
    const cRect = container.getBoundingClientRect();
    const wRect = wordmark.getBoundingClientRect();
    const hRect = hamburger.getBoundingClientRect();
    const aRect = actionBtn.getBoundingClientRect();

    // Check centering: distance from container left to wordmark center vs wordmark center to container right
    const containerCenter = cRect.left + cRect.width / 2;
    const wordmarkCenter = wRect.left + wRect.width / 2;
    const centerDiff = Math.abs(containerCenter - wordmarkCenter);

    return {
      found: true,
      display: cStyle.display,
      gridTemplateColumns: cStyle.gridTemplateColumns,
      centerDiff: centerDiff,
      isCentered: centerDiff < 5,
      hamburgerVisible: hRect.width > 0,
      actionBtnVisible: aRect.width > 0,
      wordmarkVisible: wRect.width > 0
    };
  });

  const pNavMobile = path.join(screenshotsDir, 'navbar-390px-closed.png');
  await page.screenshot({ path: pNavMobile, fullPage: false });

  // Open mobile sheet
  console.log('3. Testing Mobile Sheet open & focus trap...');
  await page.click('.nav-hamburger-btn');
  await new Promise(r => setTimeout(r, 400));

  const sheetOpenState = await page.evaluate(() => {
    const sheet = document.querySelector('.nav-mobile-sheet');
    const backdrop = document.querySelector('.nav-sheet-backdrop');
    const closeBtn = document.querySelector('.sheet-close-btn');

    return {
      sheetOpen: sheet?.classList.contains('is-open'),
      backdropVisible: !!backdrop,
      bodyOverflow: document.body.style.overflow,
      activeElementIsClose: document.activeElement === closeBtn,
      links: Array.from(document.querySelectorAll('.sheet-link')).map(a => ({
        text: a.querySelector('.sheet-link-text')?.textContent?.trim(),
        href: a.getAttribute('href')
      })),
      sheetLaunchBtn: !!document.querySelector('.sheet-launch-btn')
    };
  });

  const pSheetOpen = path.join(screenshotsDir, 'navbar-390px-sheet-open.png');
  await page.screenshot({ path: pSheetOpen, fullPage: false });

  // Test Esc key to close
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 400));

  const sheetClosedState = await page.evaluate(() => {
    const sheet = document.querySelector('.nav-mobile-sheet');
    const hamburger = document.querySelector('.nav-hamburger-btn');
    return {
      sheetOpen: sheet?.classList.contains('is-open'),
      bodyOverflow: document.body.style.overflow,
      activeElementIsHamburger: document.activeElement === hamburger
    };
  });

  // ── TEST 4: Extreme 320px Width (No Overlap) ─────────────
  console.log('4. Testing Extreme 320px viewport for overlap...');
  await page.setViewport({ width: 320, height: 600 });
  await new Promise(r => setTimeout(r, 400));

  const overlap320State = await page.evaluate(() => {
    const hamburger = document.querySelector('.nav-hamburger-btn');
    const wordmark = document.querySelector('.nav-brand-mobile .nav-wordmark');
    const action = document.querySelector('.nav-mobile-action-btn');

    if (!hamburger || !wordmark || !action) return { found: false };

    const hRect = hamburger.getBoundingClientRect();
    const wRect = wordmark.getBoundingClientRect();
    const aRect = action.getBoundingClientRect();

    // Check no overlap: hamburger.right < wordmark.left and wordmark.right < action.left
    const noOverlap = hRect.right < wRect.left && wRect.right < aRect.left;
    const gapLeft = wRect.left - hRect.right;
    const gapRight = aRect.left - wRect.right;

    return {
      found: true,
      viewportWidth: window.innerWidth,
      hRect: { left: hRect.left, right: hRect.right, width: hRect.width },
      wRect: { left: wRect.left, right: wRect.right, width: wRect.width },
      aRect: { left: aRect.left, right: aRect.right, width: aRect.width },
      noOverlap,
      gapLeft,
      gapRight
    };
  });

  const p320 = path.join(screenshotsDir, 'navbar-320px-no-overlap.png');
  await page.screenshot({ path: p320, fullPage: false });

  // ── TEST 5: Reduced Motion ────────────────────────────────
  console.log('5. Testing prefers-reduced-motion: reduce...');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.click('.nav-hamburger-btn');
  await new Promise(r => setTimeout(r, 200));

  const reducedMotionState = await page.evaluate(() => {
    const sheet = document.querySelector('.nav-mobile-sheet');
    const style = window.getComputedStyle(sheet);
    return {
      sheetOpen: sheet?.classList.contains('is-open'),
      transitionProperty: style.transitionProperty,
      transitionDuration: style.transitionDuration
    };
  });

  await browser.close();

  const results = {
    initialNavState,
    scrolledNavState,
    focusRingState,
    mobileGridState,
    sheetOpenState,
    sheetClosedState,
    overlap320State,
    reducedMotionState,
    consoleLogs,
    consoleErrors,
    pageErrors,
    screenshots: {
      pNavUnscrolled,
      pNavScrolled,
      pNavMobile,
      pSheetOpen,
      p320
    }
  };

  console.log('NAVBAR_TEST_RESULT_START');
  console.log(JSON.stringify(results, null, 2));
  console.log('NAVBAR_TEST_RESULT_END');
}

testNavbar().catch(err => {
  console.error('Navbar test failed:', err);
  process.exit(1);
});
