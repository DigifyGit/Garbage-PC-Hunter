import { readFileSync, existsSync } from 'fs';
import { KEYWORDS_PT_EN, BUDGET } from '../keywords.js';

export async function runFacebook(browser) {
  const authPath = './facebook-auth.json';

  if (!existsSync(authPath)) {
    return [{ status: 'NO_AUTH', platform: 'FACEBOOK', message: 'facebook-auth.json missing — run auth setup first. Use: npx playwright codegen https://facebook.com to generate it.' }];
  }

  const results = [];

  for (const keyword of KEYWORDS_PT_EN) {
    let page;
    try {
      const context = await browser.newContext({ storageState: authPath });
      page = await context.newPage();

      const url = `https://www.facebook.com/marketplace/lisboa/search?query=${encodeURIComponent(keyword)}&minPrice=100&maxPrice=${BUDGET.absolute_max}`;
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      if (page.url().includes('login') || page.url().includes('checkpoint') || page.url().includes('captcha')) {
        await page.close();
        return [{ status: 'BLOCKED', platform: 'FACEBOOK', keyword, message: 'Session expired or blocked. Regenerate facebook-auth.json.' }];
      }

      const listings = await page.$$eval('a[href*="/marketplace/item/"]', els =>
        els.slice(0, 20).map(el => ({
          title: el.querySelector('span')?.innerText?.trim() || '',
          href: el.href || '',
          price: el.querySelector('[aria-label]')?.innerText?.trim() || ''
        }))
      );

      for (const item of listings) {
        const rawPrice = parseFloat(item.price.replace(/[^\d.]/g, ''));
        if (!rawPrice || rawPrice < 100 || rawPrice > BUDGET.absolute_max) continue;

        results.push({
          platform: 'FACEBOOK',
          keyword,
          title: item.title,
          price: rawPrice,
          location: 'Lisboa',
          sellerName: '',
          description: '',
          sourceUrl: item.href,
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
