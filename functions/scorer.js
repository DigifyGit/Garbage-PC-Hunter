export function scoreListings(listings) {
  return listings.map(listing => {
    let score = 0;
    const price = listing.price || 9999;
    const ram = listing.ram || 0;
    const storage = listing.storage || '';
    const cpu = listing.cpuGen || 0;
    const battery = (listing.description || '').toLowerCase();
    const condition = (listing.description || '').toLowerCase();

    // Price
    if (price <= 200) score += 20;
    else if (price <= 300) score += 15;
    else if (price <= 400) score += 5;
    else score -= 10;

    // RAM
    if (ram >= 32) score += 25;
    else if (ram >= 16) score += 15;
    else if (ram === 8) score -= 20;
    else if (ram > 0 && ram < 8) score -= 40;

    // Storage
    if (storage.includes('1tb') || storage.includes('1 tb')) score += 20;
    else if (storage.includes('512')) score += 15;
    else if (storage.includes('256')) score -= 5;
    if (storage.includes('hdd')) score -= 25;

    // CPU generation
    if (cpu >= 12) score += 25;
    else if (cpu >= 10) score += 15;
    else if (cpu >= 8) score += 5;
    else if (cpu >= 1 && cpu < 8) score -= 15;
    else score -= 10; // unknown

    // Business class
    const title = (listing.title || '').toLowerCase();
    if (['thinkpad','latitude','elitebook','probook'].some(b => title.includes(b))) score += 15;

    // Battery / condition
    if (battery.includes('works only plugged') || battery.includes('only plugged in')) score -= 30;
    else if (battery.includes('battery') && (battery.includes('issue') || battery.includes('replace') || battery.includes('bad'))) score -= 20;
    else if (battery.includes('battery good') || battery.includes('battery ok') || battery.includes('battery health')) score += 10;

    // Physical condition
    if (condition.includes('missing screw')) score -= 10;
    if (condition.includes('charger') && (condition.includes('broken') || condition.includes('issue') || condition.includes('bite'))) score -= 10;

    // Proof level
    if (listing.proofLevel === 'VERIFIED_FROM_IMAGE') score += 15;
    else if (!listing.proofLevel || listing.proofLevel === 'UNKNOWN') score -= 15;

    // Seller honesty
    if (listing.honestDisclosure) score += 5;
    if (listing.hypeOnly) score -= 10;

    // Auto-override rules
    let marketClass;
    if (ram < 16 && price > 250) {
      marketClass = 'TRASH';
      score = Math.min(score, 10);
    } else if ((battery.includes('works only plugged') || battery.includes('only plugged in')) && price > 150) {
      score = Math.min(score, 25);
    }

    // Assign class
    if (!marketClass) {
      if (score >= 70) marketClass = 'BENCHMARK_OUTLIER';
      else if (score >= 55) marketClass = 'RARE_VALUE';
      else if (score >= 40) marketClass = 'LESS_BAD';
      else if (score >= 25) marketClass = 'SURVIVAL_FALLBACK';
      else if (score >= 10) marketClass = 'HARD_COMPROMISE';
      else if (score >= 0) marketClass = 'JUNK';
      else marketClass = 'TRASH';
    }

    const verdictMap = {
      BENCHMARK_OUTLIER: 'True market anomaly — rare buy-now candidate.',
      RARE_VALUE: 'Unusually favorable price-to-spec. Worth serious consideration.',
      LESS_BAD: 'Less harmful than most listings. Acceptable under pressure.',
      SURVIVAL_FALLBACK: 'Cheap enough to stay in discussion. Still a compromise machine.',
      HARD_COMPROMISE: 'Usable only if forced. Buyer accepts pain and limitations.',
      JUNK: 'Meets minimal paper specs only. Old hardware compromise territory.',
      TRASH: 'Weak specs, bad proof, bad condition, or bad pricing. Avoid.'
    };

    return {
      ...listing,
      valueScore: score,
      confidenceScore: listing.proofLevel === 'VERIFIED_FROM_IMAGE' ? 75 : 45,
      marketClass,
      verdict: marketClass === 'BENCHMARK_OUTLIER' || marketClass === 'RARE_VALUE' ? 'rare buy-now anomaly' : 'fallback only',
      verdictDetail: verdictMap[marketClass],
      realUseRisk2026: score >= 55 ? 'lower' : score >= 25 ? 'medium' : 'high',
      batteryRisk: battery.includes('plugged') ? 'high' : battery.includes('replace') ? 'high' : 'unknown',
      proofLevel: listing.proofLevel || 'UNKNOWN',
      paperSpecs: ram >= 16 && (storage.includes('512') || storage.includes('1tb')) ? 'survival-baseline only' : 'weak'
    };
  });
}
