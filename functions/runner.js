import { chromium } from 'playwright';
import { runOLX } from './hunters/olx.js';
import { runFacebook } from './hunters/facebook.js';
import { scoreListings } from './scorer.js';
import { writeDashboard } from './dashboard.js';

async function run() {
  const browser = await chromium.launch({ headless: true });

  try {
    const [olxResults, facebookResults] = await Promise.all([
      runOLX(browser),
      runFacebook(browser),
    ]);

    const combined = [...olxResults, ...facebookResults]
      .filter((item) => item && !item.status)
      .map((item) => ({
        title: item.title || '',
        price: Number(item.price) || 0,
        description: item.description || '',
        url: item.url || item.sourceUrl || '',
      }));

    const scored = scoreListings(combined);
    writeDashboard(scored);

    await browser.close();
    process.exit(0);
  } catch (error) {
    await browser.close();
    console.error('Runner failed:', error);
    process.exit(1);
  }
}

run();
