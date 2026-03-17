import { KEYWORDS_PT_EN, BUDGET } from '../keywords.js';

export async function runOLX(browser, keywords = KEYWORDS_PT_EN) {
  const results = [];

  for (const keyword of keywords) {
    let page;
    try {
      page = await browser.newPage();
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      });

      const url = `https://www.olx.pt/informatica/computadores-portateis/?q=${encodeURIComponent(keyword)}`;
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      if (page.url().includes('blocked') || page.url().includes('captcha') || page.url().includes('403')) {
        await page.close();
        return [{ status: 'BLOCKED', platform: 'OLX', keyword }];
      }

      const cards = await page.$$eval('[data-cy="l-card"]', els => els.map(el => ({
        title: el.querySelector('h6')?.innerText?.trim() || '',
        price: el.querySelector('[data-testid="ad-price"]')?.innerText?.trim() || '',
        location: el.querySelector('[data-testid="location-date"]')?.innerText?.trim() || '',
        href: el.querySelector('a')?.href || ''
      })));

      for (const card of cards) {
        const rawPrice = parseFloat(card.price.replace(/[^\d.]/g, ''));
        if (!rawPrice || rawPrice < 100 || rawPrice > BUDGET.absolute_max) continue;

        let description = '';
        let sellerName = '';
        try {
          const listingPage = await browser.newPage();
          await listingPage.goto(card.href, { waitUntil: 'networkidle', timeout: 30000 });
          description = await listingPage.$eval('[data-cy="ad_description"]', el => el.innerText.trim()).catch(() => '');
          sellerName = await listingPage.$eval('[data-testid="user-profile-link"]', el => el.innerText.trim()).catch(() => '');
          await listingPage.close();
        } catch {}

        results.push({
          platform: 'OLX',
          keyword,
          title: card.title,
          price: rawPrice,
          location: card.location,
          sellerName,
          description,
          sourceUrl: card.href,
          scrapedAt: new Date().toISOString()
        });
      }

      await page.close();
    } catch (err) {
      if (page) await page.close().catch(() => {});
    }
  }

  return results;
}
