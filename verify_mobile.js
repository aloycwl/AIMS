import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 375, height: 667 }); // iPhone 8 size
  await page.goto('http://localhost:3131');

  // Open the menu
  await page.click('.menu-toggle');
  await page.waitForTimeout(500); // wait for animation

  await page.screenshot({ path: 'mobile_menu_check.png' });
  await browser.close();
})();
