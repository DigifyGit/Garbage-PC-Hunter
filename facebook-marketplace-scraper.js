const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: './facebook-storage-state.json',
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  console.log('✅ Restoring session and navigating to Marketplace...');
  await page.goto('https://www.facebook.com/marketplace', { waitUntil: 'networkidle' });

  // Confirm logged in
  const title = await page.title();
  const loggedIn = await page.locator('text=Marketplace').isVisible();
  console.log(`Page title: ${title}`);
  console.log(`Logged in (no login page): ${loggedIn}`);

  // Scrape first 15 listings (robust for current Marketplace layout)
  const listings = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('div[role="article"], div[data-testid*="marketplace_listing"]'), card => {
      const linkEl = card.querySelector('a[href*="/marketplace/item/"]');
      const titleEl = card.querySelector('span, h1, div')?.innerText.trim();
      const priceEl = card.querySelector('span')?.innerText.trim();
      const locationEl = Array.from(card.querySelectorAll('span')).find(s => s.innerText.includes('·'))?.innerText.trim();
      return {
        title: titleEl || 'N/A',
        price: priceEl || 'N/A',
        location: locationEl || 'N/A',
        url: linkEl ? 'https://www.facebook.com' + linkEl.getAttribute('href') : 'N/A'
      };
    }).filter(item => item.title !== 'N/A' && item.url !== 'N/A').slice(0, 15);
  });

  console.log('\n📦 Scraped listings:');
  console.dir(listings, { depth: null });

  // Save to file too
  const fs = require('fs');
  fs.writeFileSync('marketplace-listings.json', JSON.stringify(listings, null, 2));

  await page.screenshot({ path: 'marketplace-screenshot.png', fullPage: true });
  console.log('📸 Screenshot saved as marketplace-screenshot.png');

  await browser.close();
  console.log('✅ Done — check marketplace-listings.json and screenshot');
})().catch(console.error);
