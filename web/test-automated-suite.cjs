const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:4173';
const SHOTS_DIR = path.resolve(__dirname, '../docs/shots');

if (!fs.existsSync(SHOTS_DIR)) {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
}

const VIEWPORTS = [
  { width: 1440, height: 900, name: '1440' },
  { width: 1366, height: 768, name: '1366x768' },
  { width: 768, height: 1024, name: '768' },
  { width: 390, height: 844, name: '390' },
];

const ROUTES = [
  { path: '/', slug: 'landing' },
  { path: '/overview', slug: 'overview' },
  { path: '/alerts', slug: 'alerts' },
  { path: '/workspace/ACC-RING01-04', slug: 'workspace' },
  { path: '/freezes', slug: 'freezes' },
  { path: '/cases', slug: 'cases' },
  { path: '/data', slug: 'data' },
  { path: '/rules', slug: 'rules' },
  { path: '/accuracy', slug: 'accuracy' },
  { path: '/activity', slug: 'activity' },
  { path: '/replay', slug: 'replay' },
];

(async () => {
  const results = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    consoleErrors: [],
    failedRequests: [],
    overflows: [],
    axeViolations: [],
    screenshots: [],
    keyboardResults: {},
  };

  const browser = await chromium.launch({ headless: true });

  console.log('====================================================');
  console.log('RUNNING AUTOMATED PLAYWRIGHT SUITE ON PRODUCTION PREVIEW');
  console.log(`URL: ${BASE_URL}`);
  console.log('====================================================\n');

  // 1. Loop through viewports & routes
  for (const vp of VIEWPORTS) {
    console.log(`\n--- Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);

    for (const r of ROUTES) {
      results.totalTests++;
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        reducedMotion: 'no-preference',
      });
      const page = await context.newPage();

      const pageErrors = [];
      const pageFailedReqs = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          pageErrors.push(`${r.path} [${vp.name}]: ${msg.text()}`);
        }
      });

      page.on('requestfailed', (req) => {
        // Ignore favicon or analytics if any
        if (!req.url().includes('favicon')) {
          pageFailedReqs.push(`${r.path} [${vp.name}]: ${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
        }
      });

      try {
        await page.goto(`${BASE_URL}${r.path}`, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(600); // Allow render & animations

        // Screenshot
        const shotName = `${r.slug}-${vp.name}.png`;
        const shotPath = path.join(SHOTS_DIR, shotName);
        await page.screenshot({ path: shotPath, fullPage: true });
        results.screenshots.push(shotName);

        // Check horizontal overflow
        const overflow = await page.evaluate(() => {
          const scrollW = document.documentElement.scrollWidth;
          const innerW = window.innerWidth;
          return {
            hasOverflow: scrollW > innerW,
            scrollW,
            innerW,
            diff: scrollW - innerW,
          };
        });

        if (overflow.hasOverflow) {
          console.warn(`  [OVERFLOW] ${r.path} at ${vp.name}px: scrollWidth ${overflow.scrollW} > innerWidth ${overflow.innerW} (+${overflow.diff}px)`);
          results.overflows.push({ route: r.path, viewport: vp.name, ...overflow });
        }

        // Run axe accessibility check (serious & critical)
        try {
          const axeResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa'])
            .analyze();
          const seriousOrCritical = axeResults.violations.filter(
            (v) => v.impact === 'serious' || v.impact === 'critical'
          );
          if (seriousOrCritical.length > 0) {
            results.axeViolations.push({
              route: r.path,
              viewport: vp.name,
              violations: seriousOrCritical.map((v) => ({
                id: v.id,
                impact: v.impact,
                description: v.description,
                nodesCount: v.nodes.length,
              })),
            });
          }
        } catch (axeErr) {
          console.error(`  Axe error on ${r.path}:`, axeErr.message);
        }

        if (pageErrors.length > 0) {
          results.consoleErrors.push(...pageErrors);
        }
        if (pageFailedReqs.length > 0) {
          results.failedRequests.push(...pageFailedReqs);
        }

        console.log(`  ✓ Route ${r.path} (${vp.name}) -> ${shotName} (Overflow: ${overflow.hasOverflow ? 'FAIL' : 'OK'})`);
        results.passed++;
      } catch (err) {
        console.error(`  ✕ Error on ${r.path} (${vp.name}):`, err.message);
        results.failed++;
      } finally {
        await context.close();
      }
    }
  }

  // 2. Reduced motion test (reducedMotion: 'reduce')
  console.log('\n--- Testing with reducedMotion: "reduce" ---');
  {
    const rmContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: 'reduce',
    });
    const rmPage = await rmContext.newPage();
    await rmPage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await rmPage.waitForTimeout(500);
    const rmShot = path.join(SHOTS_DIR, 'landing-reduced-motion-1440.png');
    await rmPage.screenshot({ path: rmShot, fullPage: true });
    results.screenshots.push('landing-reduced-motion-1440.png');
    console.log('  ✓ Reduced motion landing screenshot saved.');
    await rmContext.close();
  }

  // 3. Keyboard walkthrough test
  console.log('\n--- Keyboard Walkthrough & Focus Ring Test ---');
  {
    const kbContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const kbPage = await kbContext.newPage();

    // Landing walkthrough
    await kbPage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    let focusableCount = 0;
    let visibleFocusCount = 0;

    for (let i = 0; i < 20; i++) {
      await kbPage.keyboard.press('Tab');
      const focusedTag = await kbPage.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const style = window.getComputedStyle(el);
        const hasOutline = style.outlineStyle !== 'none' || style.boxShadow.includes('rgba') || style.borderColor !== '';
        return { tag: el.tagName, hasOutline };
      });
      if (focusedTag) {
        focusableCount++;
        if (focusedTag.hasOutline) visibleFocusCount++;
      }
    }
    console.log(`  Landing page keyboard tab: reached ${focusableCount} interactive elements (${visibleFocusCount} with focus styling).`);

    // App walkthrough & Esc test
    await kbPage.goto(`${BASE_URL}/workspace/ACC-RING01-04`, { waitUntil: 'networkidle' });
    await kbPage.waitForTimeout(500);

    // Open freeze modal via 'f' key or button
    await kbPage.keyboard.press('f');
    await kbPage.waitForTimeout(400);
    const modalVisible = await kbPage.evaluate(() => !!document.querySelector('.modal-backdrop, .modal, [role="dialog"], .glass-panel'));
    console.log(`  Modal opened via 'f' key: ${modalVisible}`);

    // Press Escape to close modal
    await kbPage.keyboard.press('Escape');
    await kbPage.waitForTimeout(400);
    const modalAfterEsc = await kbPage.evaluate(() => {
      const modal = document.querySelector('.modal-backdrop, [role="dialog"]');
      return modal && window.getComputedStyle(modal).display !== 'none';
    });
    console.log(`  Modal closed via Escape: ${!modalAfterEsc}`);

    results.keyboardResults = {
      landingFocusableCount: focusableCount,
      modalOpenedByShortcut: modalVisible,
      modalClosedByEsc: !modalAfterEsc,
    };

    await kbContext.close();
  }

  await browser.close();

  // Save summary JSON
  const summaryPath = path.resolve(__dirname, '../docs/automated-test-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));

  console.log('\n====================================================');
  console.log('AUTOMATED SUITE COMPLETE');
  console.log(`Passed routes: ${results.passed} | Failed: ${results.failed}`);
  console.log(`Console Errors: ${results.consoleErrors.length}`);
  console.log(`Failed Requests: ${results.failedRequests.length}`);
  console.log(`Horizontal Overflows: ${results.overflows.length}`);
  console.log(`Axe Violations (serious/critical): ${results.axeViolations.length}`);
  console.log(`Summary written to: ${summaryPath}`);
  console.log('====================================================\n');
})();
