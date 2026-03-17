import fetch from 'node-fetch';

export async function sendTelegramReport(runResult) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set');
    return;
  }

  let message;

  if (runResult.status === 'FAILED') {
    message = `❌ GARBAGE PC HUNTER — RUN FAILED\n📅 ${runResult.date}\nReason: ${runResult.reason}\nAction: Manual check required.`;
  } else {
    const { listings = [], date, duration, olxStatus, fbStatus, keywordStats = [] } = runResult;
    const sorted = [...listings].sort((a, b) => b.valueScore - a.valueScore);
    const top5 = sorted.slice(0, 5);
    const best = top5[0];
    const safest = sorted.find(l => l.batteryRisk === 'unknown' && l.marketClass !== 'TRASH') || top5[0];
    const cheapest = [...listings].sort((a, b) => a.price - b.price).find(l => l.marketClass !== 'TRASH');
    const caution = sorted.find(l => l.marketClass === 'HARD_COMPROMISE' || l.marketClass === 'SURVIVAL_FALLBACK');

    const top5Lines = top5.map((l, i) =>
      `${i + 1}. ${l.title} €${l.price} [${l.marketClass}]`
    ).join('\n');

    const kwLines = keywordStats.slice(0, 5).map(k =>
      `${k.keyword}: ${k.count} results`
    ).join('\n');

    message = `🔍 GARBAGE PC HUNTER — Daily Report
📅 ${date} | ⏱ Run: ${duration}s

🏆 BEST OVERALL:
${best?.title} — €${best?.price} | ${best?.marketClass}
${best?.sourceUrl}

🛡️ SAFEST:
${safest?.title} — €${safest?.price}
${safest?.sourceUrl}

💸 CHEAPEST ACCEPTABLE:
${cheapest?.title} — €${cheapest?.price}
${cheapest?.sourceUrl}

⚠️ CAUTION:
${caution?.title} — ${caution?.verdictDetail || 'Hard compromise'}

📊 TOP 5:
${top5Lines}

🔑 KEYWORD PERFORMANCE:
${kwLines}

✅ Status: SUCCESS
🔗 Platforms: OLX=${olxStatus} | FB=${fbStatus}`;
  }

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
  });
}
