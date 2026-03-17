export function scoreListings(listings) {
  return [...listings]
    .map((listing) => {
      const text = `${listing.title || ''} ${listing.description || ''}`.toLowerCase();
      const price = Number(listing.price) || 0;
      let score = 100;
      const reasons = ['Base score: +100'];

      if (price > 500) {
        score -= 1000;
        reasons.push('Price over €500: -1000');
      }

      if (price <= 300) {
        score += 30;
        reasons.push('Price at or below €300: +30');
      }

      if (text.includes('16gb') || text.includes('16 gb')) {
        score += 40;
        reasons.push('Mentions 16GB RAM: +40');
      }

      if (text.includes('i7') || text.includes('i9')) {
        score += 40;
        reasons.push('Mentions Intel i7/i9: +40');
      }

      if (text.includes('ssd') || text.includes('512gb')) {
        score += 20;
        reasons.push('Mentions SSD/512GB: +20');
      }

      if (text.includes('bateria viciada') || text.includes('parts only') || text.includes('broken')) {
        score -= 100;
        reasons.push('Broken/parts-only battery warning: -100');
      }

      return {
        ...listing,
        score,
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score);
}
