const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const artifactDir = 'C:/Users/rayan/.gemini/antigravity-ide/brain/45e1e952-c705-462f-9939-185db500e357';
  console.log('Capturing showcase screenshots for Optimal Cut...');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // ── 1. Desktop 1440px - Overview with Optimal Cut Zones & Cut Line ──
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/overview', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));

  // Scroll to graph
  await page.evaluate(() => {
    const cluster = document.querySelector('.cluster-graph-container') || document.querySelector('.cy-graph-container');
    if (cluster) cluster.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 500));

  // Toggle Optimal Cut ON
  const toggleBtn = await page.$('.toggle-optimal-cut');
  if (toggleBtn) {
    await toggleBtn.click();
    await new Promise(r => setTimeout(r, 900));
  }

  // Screenshot 1: 1440px with Optimal Cut ON (showing 3 zones, labels, cut line with SVG scissors)
  const shot1Path = path.join(artifactDir, 'optimal_cut_desktop_1440_zones.png');
  await page.screenshot({ path: shot1Path, fullPage: false });
  console.log('Saved:', shot1Path);

  // Click cut badge to open side panel
  const cutBadge = await page.$('.cut-badge-button');
  if (cutBadge) {
    await cutBadge.click();
    await new Promise(r => setTimeout(r, 600));
  }

  // Screenshot 2: 1440px with Why This Cut Side Panel
  const shot2Path = path.join(artifactDir, 'optimal_cut_desktop_1440.png');
  await page.screenshot({ path: shot2Path, fullPage: false });
  console.log('Saved:', shot2Path);

  // ── 2. Desktop 1440px - Workspace Full Graph with Optimal Cut ──
  await page.goto('http://localhost:5173/workspace/ACC_05001', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  const wsToggle = await page.$('.toggle-optimal-cut');
  if (wsToggle) {
    await wsToggle.click();
    await new Promise(r => setTimeout(r, 900));
  }

  const shotWsPath = path.join(artifactDir, 'optimal_cut_workspace_1440.png');
  await page.screenshot({ path: shotWsPath, fullPage: false });
  console.log('Saved:', shotWsPath);

  await browser.close();
  console.log('All showcase screenshots captured!');
})();
