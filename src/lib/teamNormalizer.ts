/**
 * Normalizes team names across different ranking sources to prevent duplicates.
 * The canonical name is always the one from the NCAA NET list.
 */

// Known aliases: maps various name formats → canonical NET name
const ALIASES: Record<string, string> = {
  // UConn / Connecticut
  'uconn': 'Connecticut',
  'connecticut': 'Connecticut',

  // Saint / St. variations
  "st. john's": "St. John's (NY)",
  "saint john's": "St. John's (NY)",
  "st john's": "St. John's (NY)",
  'st. johns': "St. John's (NY)",

  "st. mary's": "Saint Mary's (CA)",
  "saint mary's": "Saint Mary's (CA)",
  "st. mary's (ca)": "Saint Mary's (CA)",

  "st. joseph's": "Saint Joseph's",
  "saint joseph's": "Saint Joseph's",

  "st. bonaventure": 'St. Bonaventure',

  "st. peter's": "St. Peter's",
  "saint peter's": "St. Peter's",

  'louisville': 'Louisville',
  'u of l': 'Louisville',

  // Miami
  'miami (fl)': 'Miami (FL)',
  'miami fl': 'Miami (FL)',
  'miami florida': 'Miami (FL)',
  'miami (oh)': 'Miami (OH)',
  'miami ohio': 'Miami (OH)',

  // USC / Southern California
  'usc': 'USC',
  'southern california': 'USC',

  // Ole Miss
  'ole miss': 'Mississippi',
  'mississippi': 'Mississippi',

  // LSU
  'lsu': 'LSU',
  'louisiana state': 'LSU',

  // TCU
  'tcu': 'TCU',
  'texas christian': 'TCU',

  // SMU
  'smu': 'SMU',
  'southern methodist': 'SMU',

  // UNLV
  'unlv': 'UNLV',
  'nevada las vegas': 'UNLV',
  'nevada-las vegas': 'UNLV',

  // UAB
  'uab': 'UAB',
  'alabama-birmingham': 'UAB',

  // UTEP
  'utep': 'UTEP',
  'texas-el paso': 'UTEP',

  // UTSA
  'utsa': 'UTSA',
  'texas-san antonio': 'UTSA',

  // UCF
  'ucf': 'UCF',
  'central florida': 'UCF',

  // FIU
  'fiu': 'FIU',
  'florida international': 'FIU',

  // FAU
  'fau': 'FAU',
  'florida atlantic': 'FAU',

  // NC State
  'nc state': 'NC State',
  'north carolina state': 'NC State',

  // UNC
  'unc': 'North Carolina',
  'north carolina': 'North Carolina',

  // UCSB
  'uc santa barbara': 'UC Santa Barbara',
  'ucsb': 'UC Santa Barbara',

  // UC Davis / Irvine / Riverside etc.
  'uc davis': 'UC Davis',
  'uc irvine': 'UC Irvine',
  'uc riverside': 'UC Riverside',

  // Pitt
  'pitt': 'Pittsburgh',
  'pittsburgh': 'Pittsburgh',

  // VCU
  'vcu': 'VCU',
  'virginia commonwealth': 'VCU',

  // BYU
  'byu': 'BYU',
  'brigham young': 'BYU',

  // App State
  'appalachian state': 'Appalachian State',
  'app state': 'Appalachian State',

  // Grambling
  'grambling state': 'Grambling State',
  'grambling': 'Grambling State',

  // Prairie View
  'prairie view a&m': 'Prairie View A&M',
  'prairie view': 'Prairie View A&M',

  // Texas Southern
  'texas southern': 'Texas Southern',

  // Arkansas-Pine Bluff
  'arkansas-pine bluff': 'Arkansas-Pine Bluff',
  'ark.-pine bluff': 'Arkansas-Pine Bluff',

  // Morehead State
  'morehead state': 'Morehead State',
  'morehead st.': 'Morehead State',

  // Eastern Washington
  'eastern washington': 'Eastern Washington',
  'e. washington': 'Eastern Washington',

  // Western Kentucky
  'western kentucky': 'Western Kentucky',
  'wku': 'Western Kentucky',

  // Middle Tennessee
  'middle tennessee state': 'Middle Tennessee',
  'mtsu': 'Middle Tennessee',
  'middle tennessee': 'Middle Tennessee',

  // Tennessee-Martin
  'tennessee-martin': 'UT Martin',
  'ut martin': 'UT Martin',

  // Loyola Chicago
  'loyola (il)': 'Loyola Chicago',
  'loyola chicago': 'Loyola Chicago',
  'loyola-chicago': 'Loyola Chicago',

  // Cal Poly
  'cal poly': 'Cal Poly',
  'california polytechnic': 'Cal Poly',

  // Long Island
  'liu': 'LIU',
  'long island': 'LIU',
  'long island university': 'LIU',
};

/**
 * Returns the canonical team name for a given input.
 * If no alias found, returns the original (trimmed, with some basic normalization).
 */
export function normalizeTeamName(raw: string): string {
  if (!raw) return raw;
  const lower = raw.trim().toLowerCase();
  if (ALIASES[lower]) return ALIASES[lower];

  // Try without trailing punctuation
  const stripped = lower.replace(/[.,]+$/, '').trim();
  if (ALIASES[stripped]) return ALIASES[stripped];

  // Return original with trimmed whitespace
  return raw.trim();
}

/**
 * Finds a team in the canonical list by fuzzy matching.
 * Returns the canonical name if found, otherwise null.
 */
export function findCanonicalTeam(
  raw: string,
  canonicalList: string[]
): string | null {
  const normalized = normalizeTeamName(raw);

  // Exact match (case-insensitive)
  const exactMatch = canonicalList.find(
    (t) => t.toLowerCase() === normalized.toLowerCase()
  );
  if (exactMatch) return exactMatch;

  // Check if canonical list has a team that starts with or contains the normalized name
  const containsMatch = canonicalList.find(
    (t) =>
      t.toLowerCase().includes(normalized.toLowerCase()) ||
      normalized.toLowerCase().includes(t.toLowerCase())
  );
  if (containsMatch) return containsMatch;

  return null;
}
