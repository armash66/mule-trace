import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outDir = path.resolve(__dirname, '../docs/screenshots');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function capture() {
  console.log('Launching browser to capture MuleTrace screenshots...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    // 1. Landing Page
    console.log('Capturing 01_landing.png...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(outDir, '01_landing.png') });

    // 2. Login Page
    console.log('Capturing 02_login.png...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(outDir, '02_login.png') });

    // Authenticate: Fill login form
    console.log('Logging in as analyst...');
    await page.type('input[type="text"]', 'analyst');
    await page.type('input[type="password"]', 'analyst123');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]'),
    ]);

    // 3. Command Center
    console.log('Capturing 03_command_center.png...');
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(outDir, '03_command_center.png') });

    // 4. Open Account Drawer (click first alert row)
    console.log('Opening top alert and capturing 04_account_drawer.png...');
    const alertRow = await page.$('.alert-row, [data-testid="alert-item"], tr, .card');
    if (alertRow) {
      await alertRow.click();
      await new Promise((r) => setTimeout(r, 1000));
    }
    await page.screenshot({ path: path.join(outDir, '04_account_drawer.png') });

    // 5. Rings & Communities
    console.log('Capturing 05_rings_network.png...');
    await page.goto('http://localhost:5173/app/rings', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(outDir, '05_rings_network.png') });

    // 6. Audit & Hash-Chain Verification
    console.log('Capturing 06_audit_verification.png...');
    await page.goto('http://localhost:5173/app/audit', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(outDir, '06_audit_verification.png') });

    console.log('✓ All 6 screenshots successfully captured in docs/screenshots/');
  } catch (err) {
    console.error('Screenshot error:', err);
  } finally {
    await browser.close();
  }
}

capture();
