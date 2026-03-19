const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    storageState: './facebook-storage-state.json',
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York'
  });

  const page = await context.newPage();

  // Basic stealth to help avoid detection
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  });

  console.log('✅ Restoring session and navigating to Marketplace...');

  try {
    await page.goto('https://www.facebook.com/marketplace', {
      waitUntil: 'domcontentloaded',     // much faster and more reliable than networkidle
      timeout: 60000                     // 60 seconds max for navigation
    });
  } catch (e) {
    console.error('Navigation failed or timed out:', e.message);
    await page.screenshot({ path: 'navigation-error.png', fullPage: true });
    console.log('Error screenshot saved as navigation-error.png');
    // Continue anyway so we get at least something
  }

  // Give the page extra time to settle (dynamic content, JS)
  await page.waitForTimeout(8000);

  // Take a screenshot early so we can see what actually loaded
  await page.screenshot({ path: 'initial-load.png', fullPage: true });
  console.log('📸 Initial page load screenshot saved as initial-load.png');

  // Check if we're actually logged in
  let loggedIn = false;
  try {
    loggedIn = await page.locator('text=Marketplace').isVisible({ timeout: 15000 });
  } catch {}
  console.log(`Logged in (Marketplace header visible): ${loggedIn}`);

  if (!loggedIn) {
    console.log('Warning: Marketplace header not found → probably not logged in or page blocked');
    const title = await page.title().catch(() => 'unknown');
    console.log(`Page title: ${title}`);
  }

  // Try to scrape listings (robust selectors – Facebook changes often)
  const listings = await page.evaluate(() => {
    const cards = Array.from(
      document.querySelectorAll(
        'div[role="article"], div[data-testid*="marketplace_listing"], div.x1yztbdb, div.x1n2onr6'
      )
    );

    return cards.map(card => {
      const linkEl = card.querySelector('a[href*="/marketplace/item/"]');
      const titleEl = card.querySelector('span[dir="auto"], div.x1lliihq, h2, h3');
      const priceEl = card.querySelector('span.x193iq5w, span.x1lliihq:has-text("$")');
      const locationEl = Array.from(card.querySelectorAll('span')).find(
        s => s.innerText.includes('·') || s.innerText.match(/km|mi|from/)
      );

      const title = titleEl?.innerText.trim() || 'N/A';
      const price = priceEl?.innerText.trim() || 'N/A';
      const location = locationEl?.innerText.trim() || 'N/A';
      const url = linkEl ? 'https://www.facebook.com' + linkEl.getAttribute('href') : 'N/A';

      return { title, price, location, url };
    }).filter(item => item.title !== 'N/A' && item.url !== 'N/A' && item.url.includes('/item/'))
      .slice(0, 15);
  });

  console.log('\n📦 Scraped listings (up to 15):');
  console.dir(listings, { depth: null });

  // Save to file
  const fs = require('fs');
  fs.writeFileSync('marketplace-listings.json', JSON.stringify(listings, null, 2));
  console.log('Results saved to marketplace-listings.json');

  // Final full-page screenshot
  await page.screenshot({ path: 'marketplace-screenshot.png', fullPage: true });
  console.log('📸 Final full screenshot saved as marketplace-screenshot.png');

  await browser.close();
  console.log('✅ Script finished');
})().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
