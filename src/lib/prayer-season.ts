// Which form the "O Heavenly King" slot takes, by paschal distance (days from Pascha;
// Pascha = 0, Ascension = 39, Pentecost = 49). Pure + browser-safe so the prayer-page
// client scripts can import it.
//
//   0–38   Pascha → Leavetaking of Pascha   → Paschal troparion
//   39–47  Ascension → its Leavetaking       → Ascension troparion
//   48–49  Sat before Pentecost, Pentecost   → nothing (straight to the Trisagion)
//   else   the rest of the year               → "O Heavenly King" as normal
export type HolySpiritVariant = 'normal' | 'paschal' | 'ascension' | 'none';

export function holySpiritVariant(pdist: number): HolySpiritVariant {
  if (pdist < 0 || pdist >= 50) return 'normal';
  if (pdist <= 38) return 'paschal';
  if (pdist <= 47) return 'ascension';
  return 'none'; // 48–49
}
