import { execSync } from 'child_process';
import { onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { chromium } from 'playwright';
import { runOLX } from './hunters/olx.js';
import { runFacebook } from './hunters/facebook.js';
import { scoreListings } from './scorer.js';
import { sendTelegramReport } from './reporter.js';

initializeApp({ projectId: 'garbage-pc-hunter' });
const db = getFirestore();

// Install Chromium on cold start
try {
  execSync('npx playwright install chromium --only-shell', { stdio: 'inherit' });
} catch (e) {
  console.error('Chromium install failed:', e.message);
}

async function runHunt() {
  const startTime = Date.now();
  const date = new Date().toISOString().split('T')[0];
  const runId = `run_${date}_${startTime}`;
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    const failResult = { status: 'FAILED', date, reason: `Browser launch failed: ${err.message}` };
    await db.collection('runs').doc(runId).set({ ...failResult, runId, createdAt: new Date() });
    await sendTelegramReport(failResult);
    return failResult;
  }

  let olxResults = [];
  let fbResults = [];
  let olxStatus = 'OK';
  let fbStatus = 'OK';

  try {
    olxResults = await runOLX(browser);
    if (olxResults[0]?.status === 'BLOCKED') olxStatus = 'BLOCKED';
  } catch (e) {
    olxStatus = 'ERROR';
  }

  try {
    fbResults = await runFacebook(browser);
    if (fbResults[0]?.status === 'BLOCKED' || fbResults[0]?.status === 'NO_AUTH') fbStatus = fbResults[0].status;
  } catch (e) {
    fbStatus = 'ERROR';
  }

  await browser.close();

  const rawListings = [
    ...(olxStatus === 'OK' ? olxResults : []),
    ...(fbStatus === 'OK' ? fbResults : [])
  ];

  const scoredListings = scoreListings(rawListings);
  const duration = Math.round((Date.now() - startTime) / 1000);

  // Save run doc
  await db.collection('runs').doc(runId).set({
    runId, date, duration, olxStatus, fbStatus,
    totalListings: scoredListings.length,
    status: 'SUCCESS',
    createdAt: new Date()
  });

  // Save each listing
  for (const listing of scoredListings) {
    await db.collection('listings').add({ ...listing, runId, createdAt: new Date() });
  }

  const runResult = { status: 'SUCCESS', date, duration, listings: scoredListings, olxStatus, fbStatus };
  await sendTelegramReport(runResult);
  return runResult;
}

export const laptopHunterManual = onCall(
  { memory: '2GiB', timeoutSeconds: 540 },
  async () => runHunt()
);

export const dailyHunt = onSchedule(
  { schedule: '0 8 * * *', timeZone: 'Europe/Lisbon', memory: '2GiB', timeoutSeconds: 540 },
  async () => runHunt()
);
