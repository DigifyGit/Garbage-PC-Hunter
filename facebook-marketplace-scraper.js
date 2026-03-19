const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const context = await browser.newContext({
    storageState: './facebook-storage-state.json',
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    bypassCSP: true
  });

  const page = await context.newPage();

  // Stealth enhancements
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    window.chrome = { runtime: {} };
  });

  console.log('✅ Restoring session and navigating to Marketplace...');

  let navSuccess = true;
  try {
    await page.goto('https://www.facebook.com/marketplace', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    console.log('Current URL after navigation:', await page.url());
  } catch (e) {
    console.error('Navigation failed:', e.message);
    await page.screenshot({ path: 'navigation-error.png', fullPage: true });
    console.log('Error screenshot saved as navigation-error.png');
    navSuccess = false;
  }

  await page.waitForTimeout(8000); // settle time

  await page.screenshot({ path: 'initial-load.png', fullPage: true });
  console.log('📸 Initial screenshot saved as initial-load.png');

  let loggedIn = false;
  try {
    loggedIn = await page.locator('text=Marketplace').isVisible({ timeout: 15000 });
  } catch {}
  console.log(`Logged in (Marketplace header visible): ${loggedIn}`);

  if (!loggedIn) {
    const title = await page.title().catch(() => 'unknown');
    console.log(`Page title: ${title}`);
    console.log('Warning: Likely not logged in — check cookies or Facebook block');
  }

  // Scrape listings with safe JS evaluation
  let listings = [];
  try {
    listings = await page.evaluate(() => {
      const cards = Array.from(
        document.querySelectorAll(
          'div[role="article"], div[data-testid*="marketplace_listing"], div.x1yztbdb, div.x1n2onr6, div.x8gbvx8'
        )
      );

      return cards.map(card => {
        const linkEl = card.querySelector('a[href*="/marketplace/item/"]');
        const titleEl = card.querySelector('span.x1lliihq, div.x1lliihq, h2, h3, span[dir="auto"]');
        const priceEls = card.querySelectorAll('span.x193iq5w, span.x1lliihq');
        const locationEls = card.querySelectorAll('span');

        let price = 'N/A';
        for (const el of priceEls) {
          const text = el.innerText.trim();
          if (text.match(/[\$€£][0-9,]+/) || text.match(/\d+[\.,]\d+/)) {
            price = text;
            break;
          }
        }

        let location = 'N/A';
        for (const el of locationEls) {
          const text = el.innerText.trim();
          if (text.includes('·') || text.match(/km|mi|from/i) || text.includes(',')) {
            location = text;
            break;
          }
        }

        const title = titleEl?.innerText.trim() || 'N/A';
        const url = linkEl ? 'https://www.facebook.com' + linkEl.getAttribute('href') : 'N/A';

        return { title, price, location, url };
      }).filter(item => 
        item.title !== 'N/A' && 
        item.url !== 'N/A' && 
        item.url.includes('/item/')
      ).slice(0, 15);
    });

    console.log('\n📦 Scraped listings (up to 15):');
    console.dir(listings, { depth: null });
  } catch (evalErr) {
    console.error('Evaluation failed:', evalErr.message);
    await page.screenshot({ path: 'eval-error.png', fullPage: true });
    console.log('Eval error screenshot saved as eval-error.png');
  }

  const fs = require('fs');
  fs.writeFileSync('marketplace-listings.json', JSON.stringify(listings, null, 2));
  console.log('Results saved to marketplace-listings.json (even if empty)');

  await page.screenshot({ path: 'marketplace-screenshot.png', fullPage: true });
  console.log('📸 Final screenshot saved as marketplace-screenshot.png');

  await browser.close();
  console.log('✅ Script finished');
})().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
