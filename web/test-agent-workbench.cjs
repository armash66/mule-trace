const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.resolve(__dirname, '../docs/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

(async () => {
  console.log('--- STARTING AGENT WORKBENCH SECTION TEST ---');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const consoleErrors = [];
  const pageErrors = [];

  const page = await browser.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err.toString());
  });

  // 1. Desktop 1440px
  console.log('\n[1] Testing Desktop 1440px...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/#workbench', { waitUntil: 'networkidle2' });

  await page.waitForSelector('#workbench', { timeout: 10000 });
  await page.evaluate(() => {
    const el = document.getElementById('workbench');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise((r) => setTimeout(r, 1200));

  const shot1440Idle = path.join(SCREENSHOT_DIR, 'agent-workbench-1440px-idle.png');
  await page.screenshot({ path: shot1440Idle, fullPage: false });
  console.log('Saved screenshot 1440px IDLE to', shot1440Idle);

  // Expand a trace row to verify expandable details
  console.log('Testing expandable trace row...');
  const traceRows = await page.$$('.trace-row');
  if (traceRows.length > 0) {
    await traceRows[0].click();
    await new Promise((r) => setTimeout(r, 400));
  }

  // Trigger agent run via Run Button
  console.log('Triggering agent execution...');
  await page.click('.agent-run-action-btn');
  await new Promise((r) => setTimeout(r, 1200)); // capture during execution

  const shot1440Running = path.join(SCREENSHOT_DIR, 'agent-workbench-1440px-running.png');
  await page.screenshot({ path: shot1440Running, fullPage: false });
  console.log('Saved screenshot 1440px RUNNING to', shot1440Running);

  // Wait for execution to finish
  await new Promise((r) => setTimeout(r, 3500));

  const shot1440Complete = path.join(SCREENSHOT_DIR, 'agent-workbench-1440px-complete.png');
  await page.screenshot({ path: shot1440Complete, fullPage: false });
  console.log('Saved screenshot 1440px COMPLETE to', shot1440Complete);

  // 2. Prefers-reduced-motion test
  console.log('\n[2] Testing with prefers-reduced-motion: reduce...');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto('http://localhost:5173/#workbench', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    const el = document.getElementById('workbench');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise((r) => setTimeout(r, 1000));

  const shotReduced = path.join(SCREENSHOT_DIR, 'agent-workbench-1440px-reduced-motion.png');
  await page.screenshot({ path: shotReduced, fullPage: false });
  console.log('Saved screenshot Reduced Motion to', shotReduced);

  // 3. Mobile 390px test
  console.log('\n[3] Testing Mobile 390px...');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:5173/#workbench', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#workbench', { timeout: 10000 });
  await page.evaluate(() => {
    const el = document.getElementById('workbench');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise((r) => setTimeout(r, 1200));

  const benchEl = await page.$('#workbench');
  const shot390 = path.join(SCREENSHOT_DIR, 'agent-workbench-390px.png');
  if (benchEl) {
    await benchEl.screenshot({ path: shot390 });
  } else {
    await page.screenshot({ path: shot390, fullPage: false });
  }
  console.log('Saved screenshot Mobile 390px to', shot390);

  // 4. Verify specifications
  console.log('\n--- VERIFYING WORKBENCH SPECIFICATIONS ---');
  const specs = await page.evaluate(() => {
    const input = document.querySelector('.agent-query-input');
    const prefix = document.querySelector('.prompt-glyph');
    const shortcut = document.querySelector('.hotkey-hint');
    const chips = [...document.querySelectorAll('.suggestion-chip')];
    const stages = [...document.querySelectorAll('.stage-ladder-item')];
    const treeModules = [...document.querySelectorAll('.tree-module-group')];
    const traceViewport = document.querySelector('.trace-rows-viewport');
    const resultPane = document.querySelector('.workbench-result-pane');

    return {
      inputPrefilled: input ? input.value : null,
      hasPrefix: !!prefix,
      hasShortcut: shortcut ? shortcut.innerText : null,
      chipsCount: chips.length,
      stagesCount: stages.length,
      stagesLabels: stages.map((s) => {
        const lbl = s.querySelector('.ladder-label-mono');
        return lbl ? lbl.innerText : '';
      }),
      treeModulesCount: treeModules.length,
      hasAriaLive: traceViewport ? traceViewport.getAttribute('aria-live') : null,
      hasResultPane: !!resultPane,
    };
  });

  console.log('Workbench Specs:', JSON.stringify(specs, null, 2));

  // Errors summary
  console.log('\nConsole Errors:', consoleErrors.length > 0 ? consoleErrors.join('\n') : 'none');
  console.log('Page Errors:', pageErrors.length > 0 ? pageErrors.join('\n') : 'none');

  await browser.close();
  console.log('\n--- TEST COMPLETE ---');
})();
