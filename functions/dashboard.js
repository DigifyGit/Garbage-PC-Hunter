import { mkdirSync, writeFileSync } from 'fs';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function buildDashboardHtml(listings = [], runErrors = []) {
  const statusContent = runErrors.length
    ? `
      <ul class="status-list error">
        ${runErrors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}
      </ul>
    `
    : '<p class="status-ok">All scrapers completed without reported platform errors.</p>';

  const cards = listings
    .map(
      (listing) => `
      <article class="card">
        <h2>${escapeHtml(listing.title || 'Untitled Listing')}</h2>
        <p><strong>Price:</strong> €${escapeHtml(listing.price)}</p>
        <p><strong>Score:</strong> ${escapeHtml(listing.score)}</p>
        <p><strong>Why this score:</strong></p>
        <ul>
          ${(listing.reasons || []).map((reason) => `<li>${escapeHtml(reason)}</li>`).join('')}
        </ul>
        <p><a href="${escapeHtml(listing.url || listing.sourceUrl || '#')}" target="_blank" rel="noopener noreferrer">Open listing</a></p>
      </article>
    `,
    )
    .join('');

  const listingsContent = listings.length
    ? `<section class="grid">${cards}</section>`
    : `
      <div class="empty-listings">
        <p><strong>0 listings found. The scraper may have been blocked by the platforms.</strong></p>
        <p><a href="/fb_debug.png" target="_blank" rel="noopener noreferrer">View Facebook debug screenshot</a></p>
      </div>
    `;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Daily Laptop Hunt - Lisbon</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; background: #f5f7fb; color: #111827; }
    main { max-width: 1100px; margin: 0 auto; padding: 1rem; }
    h1 { margin: 0 0 1rem; }
    .status { background: white; border-radius: 12px; padding: 1rem; margin-bottom: 1rem; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08); }
    .status h2 { margin-top: 0; }
    .status-list { margin: 0; padding-left: 1.2rem; }
    .status-list.error { color: #b91c1c; font-weight: 600; }
    .status-ok { color: #166534; font-weight: 600; }
    .empty-listings { background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; border-radius: 12px; padding: 1rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; }
    .card { background: white; border-radius: 12px; padding: 1rem; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08); }
    .card h2 { margin-top: 0; font-size: 1.1rem; }
    .card ul { margin: 0.5rem 0 1rem; padding-left: 1.2rem; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <main>
    <h1>Daily Laptop Hunt - Lisbon</h1>
    <section class="status">
      <h2>System Status</h2>
      ${statusContent}
    </section>
    ${listingsContent}
  </main>
</body>
</html>`;
}

export function writeDashboard(listings = [], runErrors = []) {
  mkdirSync('public', { recursive: true });
  const html = buildDashboardHtml(listings, runErrors);
  writeFileSync('public/index.html', html, 'utf8');
  return html;
}
