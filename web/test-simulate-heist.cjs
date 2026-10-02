// test-simulate-heist.cjs
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = path.resolve('C:/Users/rayan/.gemini/antigravity-ide/brain/45e1e952-c705-462f-9939-185db500e357');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const consoleErrors = [];

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon') && !text.includes('net::ERR_CONNECTION_REFUSED')) {
          consoleErrors.push(text);
        }
      }
    });

    console.log('1. Navigating to http://localhost:5173/overview...');
    await page.goto('http://localhost:5173/overview', { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    // Verify topbar button exists
    const simButton = await page.$('.btn-ghost-sim');
    if (!simButton) {
      throw new Error('Could not find .btn-ghost-sim button in topbar!');
    }
    const btnText = await page.evaluate((el) => el.textContent, simButton);
    console.log(`Found topbar trigger: "${btnText.trim()}"`);

    // Click Simulate Live Heist button
    console.log('2. Clicking "⚡ Simulate Live Heist" button...');
    await simButton.click();
    await new Promise((r) => setTimeout(r, 500));

    // Check modal
    const modalTitle = await page.$eval('.heist-modal-title', (el) => el.textContent);
    console.log(`Modal opened with title: "${modalTitle}"`);

    // Verify two scenario cards
    const scenarioCards = await page.$$('.heist-scenario-card');
    console.log(`Found ${scenarioCards.length} scenario cards.`);
    if (scenarioCards.length !== 2) {
      throw new Error(`Expected 2 scenario cards, found ${scenarioCards.length}`);
    }

    const cardTitles = await page.$$eval('.scenario-card-title', (els) => els.map((e) => e.textContent));
    console.log('Scenario card titles:', cardTitles);

    const cardAmounts = await page.$$eval('.scenario-amount-val', (els) => els.map((e) => e.textContent));
    console.log('Scenario card amounts (from JSON script):', cardAmounts);

    // Capture screenshot of scenario modal
    const modalShotPath = path.join(ARTIFACT_DIR, 'simulate_modal_open.png');
    await page.screenshot({ path: modalShotPath });
    console.log(`Captured modal screenshot: ${modalShotPath}`);

    // Click "Start simulation" button (Digital Arrest Scam)
    console.log('3. Clicking "Start simulation" button (Scenario 1)...');
    const startBtn = await page.$('.heist-start-btn');
    await startBtn.click();

    // Wait 2.5s for transaction stream and live rule detection
    console.log('4. Waiting 2.5s for transaction stream and live rule detection...');
    await new Promise((r) => setTimeout(r, 2500));

    // Verify live UI states:
    const topbarBadge = await page.$('.topbar-sim-badge');
    console.log('Topbar SIMULATION badge present:', !!topbarBadge);

    const footerBadge = await page.$('.shell-footer-prov.simulation');
    console.log('Footer SIMULATION badge present:', !!footerBadge);

    const simStrip = await page.$('.sim-live-strip');
    console.log('Simulation control strip present:', !!simStrip);

    const kpiLabels = await page.$$eval('.kpi-label', (els) => els.map((e) => e.textContent.trim()));
    const kpiVals = await page.$$eval('.kpi-val', (els) => els.map((e) => e.textContent.trim()));
    console.log('Live KPI Labels:', kpiLabels);
    console.log('Live KPI Values:', kpiVals);

    const toasts = await page.$$('.sim-toast-item');
    console.log(`Found ${toasts.length} simulation alert toast(s).`);
    if (toasts.length > 0) {
      const toastTexts = await page.$$eval('.sim-toast-title-line', (els) => els.map((e) => e.textContent.trim()));
      console.log('Toast alert text:', toastTexts);
      const roles = await page.$$eval('.sim-toast-item', (els) => els.map((e) => e.getAttribute('role')));
      console.log('Toast roles:', roles);
    }

    // Capture live simulation screenshot
    const liveShotPath = path.join(ARTIFACT_DIR, 'simulate_live_running.png');
    await page.screenshot({ path: liveShotPath });
    console.log(`Captured live simulation screenshot: ${liveShotPath}`);

    // 5. Test Pause & Resume
    console.log('5. Testing Pause button...');
    const pauseBtn = await page.$('.sim-btn-ctrl');
    if (pauseBtn) {
      await pauseBtn.click();
      await new Promise((r) => setTimeout(r, 300));
      const pauseText = await page.evaluate((el) => el.textContent, pauseBtn);
      console.log(`After pause click, button text: "${pauseText.trim()}"`);

      // Resume
      await pauseBtn.click();
      await new Promise((r) => setTimeout(r, 300));
    }

    // 6. Test Speed Toggle (2x)
    console.log('6. Testing Speed toggle...');
    const speedBtn = await page.$$('.sim-btn-ctrl');
    if (speedBtn.length > 1) {
      await speedBtn[1].click();
      await new Promise((r) => setTimeout(r, 300));
      const speedText = await page.evaluate((el) => el.textContent, speedBtn[1]);
      console.log(`After speed click: "${speedText.trim()}"`);
    }

    // 7. Click Stop & reset
    console.log('7. Clicking Stop & reset button...');
    const stopBtn = await page.$('.sim-btn-stop');
    if (stopBtn) {
      await stopBtn.click();
      await new Promise((r) => setTimeout(r, 600));

      const summaryModal = await page.$('.summary-modal-card');
      console.log('Summary modal appeared:', !!summaryModal);

      if (summaryModal) {
        const summaryTitle = await page.$eval('.summary-modal-title', (el) => el.textContent);
        console.log(`Summary title: "${summaryTitle}"`);

        const summaryMetrics = await page.$$eval('.summary-metric-card .metric-value', (els) => els.map((e) => e.textContent.trim()));
        console.log('Summary computed metrics:', summaryMetrics);

        const summaryShotPath = path.join(ARTIFACT_DIR, 'simulate_summary_modal.png');
        await page.screenshot({ path: summaryShotPath });
        console.log(`Captured summary modal screenshot: ${summaryShotPath}`);

        // Close summary modal
        const closeSummaryBtn = await page.$('.summary-modal-actions .btn-primary');
        if (closeSummaryBtn) {
          await closeSummaryBtn.click();
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    }

    // 8. Mobile Viewport Check (390x844)
    console.log('8. Testing mobile viewport (390x844)...');
    await page.setViewport({ width: 390, height: 844 });
    await new Promise((r) => setTimeout(r, 500));
    const mobileShotPath = path.join(ARTIFACT_DIR, 'simulate_mobile_overview.png');
    await page.screenshot({ path: mobileShotPath });
    console.log(`Captured mobile screenshot: ${mobileShotPath}`);

    console.log('\n--- AUDIT RESULTS ---');
    console.log('Console errors count:', consoleErrors.length);
    if (consoleErrors.length > 0) {
      console.log('Console errors:', consoleErrors);
    } else {
      console.log('CONSOLE ERRORS: none');
    }
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
