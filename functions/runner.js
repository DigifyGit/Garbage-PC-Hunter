import { readFileSync, existsSync } from 'fs';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { runOLX } from './hunters/olx.js';
import { runFacebook } from './hunters/facebook.js';
import { scoreListings } from './scorer.js';
import { writeDashboard } from './dashboard.js';

chromium.use(StealthPlugin());

const BROAD_OLX_KEYWORDS = ['portátil', 'portatil', 'laptop', 'laptops'];

function formatRunError(platform, error) {
  if (!error) return `${platform}: unknown error`;
  if (typeof error === 'string') return `${platform}: ${error}`;

  const message = error.message || JSON.stringify(error);
  return `${platform}: ${message}`;
}

function collectPlatformStatuses(results = []) {
  return results
    .filter((item) => item && item.status)
    .map((item) => {
      const details = item.message || item.keyword || 'no additional details';
      return `${item.platform || 'UNKNOWN'} ${item.status}: ${details}`;
    });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const runErrors = [];
  let olxResults = [];
  let facebookResults = [];

  try {
    const authPath = './functions/facebook-auth.json';
    let parsedCookies = [];

    if (process.env.FACEBOOK_AUTH) {
      const parsedSecret = JSON.parse(process.env.FACEBOOK_AUTH);
      parsedCookies = Array.isArray(parsedSecret) ? parsedSecret : parsedSecret.cookies || [];
    } else if (existsSync(authPath)) {
      const parsedFile = JSON.parse(readFileSync(authPath, 'utf8'));
      parsedCookies = Array.isArray(parsedFile) ? parsedFile : parsedFile.cookies || [];
    } else {
      runErrors.push('FACEBOOK NO_AUTH: FACEBOOK_AUTH secret and functions/facebook-auth.json missing.');
    }

    if (Array.isArray(parsedCookies) && parsedCookies.length > 0) {
      await context.addCookies(parsedCookies);
    }
  } catch (error) {
    runErrors.push(formatRunError('FACEBOOK_AUTH', error));
    console.error('Failed to load Facebook auth cookies:', error);
  }

  try {
    try {
      olxResults = await runOLX(browser, BROAD_OLX_KEYWORDS);
      runErrors.push(...collectPlatformStatuses(olxResults));
    } catch (error) {
      runErrors.push(formatRunError('OLX', error));
      console.error('OLX run failed:', error);
    }

    try {
      facebookResults = await runFacebook(browser, context);
      runErrors.push(...collectPlatformStatuses(facebookResults));
    } catch (error) {
      runErrors.push(formatRunError('FACEBOOK', error));
      console.error('Facebook run failed:', error);
    }

    const combined = [...olxResults, ...facebookResults]
      .filter((item) => item && !item.status)
      .map((item) => ({
        title: item.title || '',
        price: Number(item.price) || 0,
        description: item.description || '',
        url: item.url || item.sourceUrl || '',
      }));

    const scoredListings = scoreListings(combined);
    writeDashboard(scoredListings, runErrors);

    await browser.close();
    process.exit(0);
  } catch (error) {
    await browser.close();
    console.error('Runner failed:', error);
    process.exit(1);
  }
}

run();
