import { mkdirSync, writeFileSync } from 'fs';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function buildDashboardHtml(listings) {
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
    <section class="grid">
      ${cards}
    </section>
  </main>
</body>
</html>`;
}

export function writeDashboard(listings) {
  mkdirSync('public', { recursive: true });
  const html = buildDashboardHtml(listings);
  writeFileSync('public/index.html', html, 'utf8');
  return html;
}
