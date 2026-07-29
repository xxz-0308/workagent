import { chromium } from 'playwright';
import path from 'node:path';

const ARTIFACT_DIR = 'C:\\Users\\zyf\\.gemini\\antigravity\\brain\\2d9cc213-4efc-40dc-90fe-f990cfbb971e';

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.nav-item');
  await page.waitForTimeout(500);

  // 1. Capture Agent Chat View
  console.log('Capturing Chat View...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_chat.png') });

  // 2. Click to Dashboard
  console.log('Capturing Dashboard View...');
  const navBtns = page.locator('.nav-item');
  await navBtns.nth(1).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_dashboard.png') });

  // 3. Open Patch Checklist Drawer if button available
  console.log('Capturing Patch Checklist Drawer...');
  const checklistBtn = page.locator('.patch-checklist-btn');
  if (await checklistBtn.isVisible()) {
    await checklistBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_patch_checklist.png') });
    // Close drawer
    await page.click('.close-btn');
    await page.waitForTimeout(400);
  }

  // 4. Click to Settings View
  console.log('Capturing Settings View...');
  await navBtns.nth(2).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_settings.png') });

  await browser.close();
  console.log('All screenshots captured successfully!');
}

capture().catch(err => {
  console.error('Screenshot error:', err);
  process.exit(1);
});
