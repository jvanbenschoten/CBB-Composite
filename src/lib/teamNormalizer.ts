/**
 * Normalizes team names across different ranking sources to prevent duplicates.
 *
 * Canonical names come from Warren Nolan (full proper names like "Iowa State",
 * "Connecticut", "Michigan State"). This is consistent with the BPI and Torvik
 * sources which also come from Warren Nolan compare-rankings.
 *
 * AP/Coaches poll data comes from the ESPN API, which typically returns
 * shortDisplayName or location — usually matching WN names directly.
 */

// Maps various name formats → canonical WN/full name.
// Includes NCAA.com abbreviated names (e.g. "Iowa St." → "Iowa State") so that
// NCAA.com conference data can be enriched onto WN canonical team names.
const ALIASES: Record<string, string> = {
  // ── NCAA.com "St." abbreviations → full "State" names ────────────────────
  'iowa st.': 'Iowa State',
  'michigan st.': 'Michigan State',
  'ohio st.': 'Ohio State',
  'utah st.': 'Utah State',
  'san diego st.': 'San Diego State',
  'arizona st.': 'Arizona State',
  'okla. st.': 'Oklahoma State',
  'oklahoma st.': 'Oklahoma State',
  'florida st.': 'Florida State',
  'colo. st.': 'Colorado State',
  'colorado st.': 'Colorado State',
  'ill. st.': 'Illinois State',
  'illinois st.': 'Illinois State',
  'kansas st.': 'Kansas State',
  'sam houston st.': 'Sam Houston State',
  'washington st.': 'Washington State',
  'penn st.': 'Penn State',
  'portland st.': 'Portland State',
  'montana st.': 'Montana State',
  'ark. st.': 'Arkansas State',
  'arkansas st.': 'Arkansas State',
  's. dakota st.': 'South Dakota State',
  'south dakota st.': 'South Dakota State',
  'idaho st.': 'Idaho State',
  'indiana st.': 'Indiana State',
  'missouri st.': 'Missouri State',
  'n. dakota st.': 'North Dakota State',
  'north dakota st.': 'North Dakota State',
  'murray st.': 'Murray State',
  'kent st.': 'Kent State',
  'fresno st.': 'Fresno State',
  'boise st.': 'Boise State',
  'wichita st.': 'Wichita State',
  'wright st.': 'Wright State',
  'youngstown st.': 'Youngstown State',
  'weber st.': 'Weber State',
  'tarleton st.': 'Tarleton State',
  'mississippi st.': 'Mississippi State',
  'delaware st.': 'Delaware State',
  'norfolk st.': 'Norfolk State',
  'chicago st.': 'Chicago State',
  'jackson st.': 'Jackson State',
  'morgan st.': 'Morgan State',
  'coppin st.': 'Coppin State',
  'alabama st.': 'Alabama State',
  'kennesaw st.': 'Kennesaw State',
  'georgia st.': 'Georgia State',
  'northwest. st.': 'Northwestern State',
  'northwestern st.': 'Northwestern State',
  // ── Other NCAA.com abbreviations ─────────────────────────────────────────
  'uconn': 'Connecticut',
  'uni': 'Northern Iowa',
  'n. iowa': 'Northern Iowa',
  'northern iowa': 'Northern Iowa',
  'n. texas': 'North Texas',
  'n. carolina a&t': 'North Carolina A&T',
  'n.c. a&t': 'North Carolina A&T',
  's. florida': 'South Florida',
  'usf': 'South Florida',
  'n. kentucky': 'Northern Kentucky',
  'n. illinois': 'Northern Illinois',
  'n. arizona': 'Northern Arizona',
  'se. louisiana': 'Southeastern Louisiana',
  's.e. louisiana': 'Southeastern Louisiana',
  'e. kentucky': 'Eastern Kentucky',
  'e. michigan': 'Eastern Michigan',
  'e. illinois': 'Eastern Illinois',
  'w. michigan': 'Western Michigan',
  'w. illinois': 'Western Illinois',
  'w. carolina': 'Western Carolina',
  'w. georgia': 'West Georgia',
  'md.-e. shore': 'Maryland Eastern Shore',
  'maryland-eastern shore': 'Maryland Eastern Shore',
  'se. missouri st.': 'Southeast Missouri',
  's.e. missouri st.': 'Southeast Missouri',
  's. carolina upstate': 'South Carolina Upstate',
  's.c. state': 'South Carolina State',
  's. carolina st.': 'South Carolina State',
  'south carolina st.': 'South Carolina State',
  'n. carolina central': 'North Carolina Central',
  'loyola-md.': 'Loyola-Maryland',
  'loyola (md)': 'Loyola-Maryland',
  'iupui': 'IU Indianapolis',
  'iu indy': 'IU Indianapolis',
  'central conn. st.': 'Central Connecticut',
  'central conn.': 'Central Connecticut',
  'mount st. mary\'s': "Mount Saint Mary's",
  'mount st. marys': "Mount Saint Mary's",
  'incarnate word': 'Incarnate Word',
  'umbc': 'UMBC',
  'seattle u': 'Seattle University',
  'seattle u.': 'Seattle University',
  'saint thomas (mn)': 'Saint Thomas',
  // ── ESPN/other sources that use abbreviations ─────────────────────────────
  'usc': 'USC',

  // Saint / St. variations
  "st. john's": "Saint John's",
  "saint john's": "Saint John's",
  "st john's": "Saint John's",
  'st. johns': "Saint John's",
  "st. john's (ny)": "Saint John's",

  // Saint Mary's College (WN canonical name)
  "st. mary's": "Saint Mary's College",
  "saint mary's": "Saint Mary's College",
  "st. mary's (ca)": "Saint Mary's College",
  "saint mary's (ca)": "Saint Mary's College",
  "st. mary's college": "Saint Mary's College",

  "st. joseph's": "Saint Joseph's",
  "saint joseph's": "Saint Joseph's",

  "st. bonaventure": "Saint Bonaventure",

  "st. peter's": "Saint Peter's",

  "st. francis (pa)": "Saint Francis (PA)",
  "saint francis (pa)": "Saint Francis (PA)",
  "saint francis": "Saint Francis (PA)",
  "st. francis": "Saint Francis (PA)",

  "st. thomas": "Saint Thomas",
  "st thomas": "Saint Thomas",

  // Miami disambiguation
  'miami (fl)': 'Miami (FL)',
  'miami fl': 'Miami (FL)',
  'miami florida': 'Miami (FL)',
  'miami (oh)': 'Miami (OH)',
  'miami ohio': 'Miami (OH)',

  // Common abbreviations / initialisms
  'lsu': 'LSU',
  'louisiana state': 'LSU',
  'tcu': 'TCU',
  'texas christian': 'TCU',
  'smu': 'SMU',
  'southern methodist': 'SMU',
  'unlv': 'UNLV',
  'nevada las vegas': 'UNLV',
  'nevada-las vegas': 'UNLV',
  'uab': 'UAB',
  'alabama-birmingham': 'UAB',
  'utep': 'UTEP',
  'texas-el paso': 'UTEP',
  'utsa': 'UTSA',
  'texas-san antonio': 'UTSA',
  'ucf': 'UCF',
  'central florida': 'UCF',
  'fiu': 'FIU',
  'florida international': 'FIU',
  'fau': 'FAU',
  'florida atlantic': 'FAU',
  'unc': 'North Carolina',
  'uc santa barbara': 'UC Santa Barbara',
  'ucsb': 'UC Santa Barbara',
  'uc davis': 'UC Davis',
  'uc irvine': 'UC Irvine',
  'uc riverside': 'UC Riverside',
  'vcu': 'VCU',
  'virginia commonwealth': 'VCU',
  'byu': 'BYU',
  'brigham young': 'BYU',
  'wku': 'Western Kentucky',
  'mtsu': 'Middle Tennessee',
  'middle tennessee state': 'Middle Tennessee',
  'loyola (il)': 'Loyola-Chicago',
  'cal poly': 'Cal Poly',
  'california polytechnic': 'Cal Poly',
  'long island university': 'Long Island',
  'liu': 'Long Island',

  // NC State
  'n.c. state': 'North Carolina State',
  'nc state': 'North Carolina State',

  // Pitt
  'pitt': 'Pittsburgh',

  // Prairie View
  'prairie view': 'Prairie View A&M',

  // Grambling
  'grambling': 'Grambling State',

  // App State
  'app state': 'Appalachian State',

  // Middle Tennessee
  'middle tennessee': 'Middle Tennessee',

  // UT Martin (WN canonical is "Tennessee-Martin")
  'ut martin': 'Tennessee-Martin',

  // Morehead State
  'morehead st.': 'Morehead State',

  // Eastern Washington
  'e. washington': 'Eastern Washington',

  // Arkansas-Pine Bluff
  'ark.-pine bluff': 'Arkansas-Pine Bluff',

  // Charleston (WN canonical is "Charleston")
  'college of charleston': 'Charleston',
  'col. of charleston': 'Charleston',

  // Detroit (WN canonical is "Detroit")
  'detroit mercy': 'Detroit',

  // UMass
  'umass': 'UMass',
  'massachusetts': 'UMass',
  'umass lowell': 'UMass-Lowell',

  // UTA (WN canonical is "UTA")
  'ut arlington': 'UTA',
  'texas-arlington': 'UTA',

  // Queens (WN canonical is "Queens")
  'queens (nc)': 'Queens',

  // Albany
  'ualbany': 'Albany',

  // Sam Houston
  'sam houston': 'Sam Houston State',

  // Lamar
  'lamar university': 'Lamar',

  // Southern Miss (WN canonical is "Southern Miss", no period)
  'southern mississippi': 'Southern Miss',

  // Army (WN canonical is "Army")
  'army west point': 'Army',

  // Boston U abbreviation
  'boston u': 'Boston University',
  'boston u.': 'Boston University',

  // Jacksonville State
  'jacksonville st.': 'Jacksonville State',

  // Alcorn State vs Alcorn
  'alcorn': 'Alcorn State',
  'alcorn st.': 'Alcorn State',

  // Presbyterian College
  'presbyterian': 'Presbyterian College',
  'presbyterian col.': 'Presbyterian College',

  // Loyola Maryland
  'loyola maryland': 'Loyola-Maryland',
  'loyola-md': 'Loyola-Maryland',

  // UMKC
  'kansas city': 'UMKC',
  'missouri-kansas city': 'UMKC',

  // Southeast Missouri (WN canonical is "Southeast Missouri")
  'semo': 'Southeast Missouri',
  'southeast missouri st.': 'Southeast Missouri',

  // UNCG (WN canonical is "UNCG")
  'unc greensboro': 'UNCG',
  'unc-greensboro': 'UNCG',

  // Stephen F. Austin
  'sfa': 'Stephen F. Austin',

  // Cal State schools
  'csun': 'Cal State Northridge',
  'cal state northridge': 'Cal State Northridge',
  'csuf': 'Cal State Fullerton',
  'cal state fullerton': 'Cal State Fullerton',
  'csub': 'Cal State Bakersfield',
  'cal state bakersfield': 'Cal State Bakersfield',

  // Sacramento State
  'sac state': 'Sacramento State',
  'sacramento st.': 'Sacramento State',

  // Long Beach State
  'long beach': 'Long Beach State',
  'long beach st.': 'Long Beach State',

  // South Carolina Upstate (ESPN may return "USC Upstate")
  'sc upstate': 'South Carolina Upstate',
  'usc upstate': 'South Carolina Upstate',

  // Cleveland State
  'cleveland st.': 'Cleveland State',

  // UNCW (WN canonical is "UNCW")
  'unc wilmington': 'UNCW',

  // Ball State
  'ball st.': 'Ball State',

  // Fairleigh Dickinson
  'fdu': 'Fairleigh Dickinson',

  // Mississippi Valley State
  'mvsu': 'Mississippi Valley State',
  'miss. valley st.': 'Mississippi Valley State',

  // ── Additional NCAA.com abbreviations for conference enrichment ───────────
  // These map NCAA.com abbreviated names → WN canonical names

  // Oregon State
  'oregon st.': 'Oregon State',

  // New Mexico State
  'new mexico st.': 'New Mexico State',
  'n.m. state': 'New Mexico State',
  'n.m. st.': 'New Mexico State',

  // Tennessee State
  'tennessee st.': 'Tennessee State',
  'tenn. state': 'Tennessee State',
  'tenn. st.': 'Tennessee State',

  // Southern Illinois
  's. illinois': 'Southern Illinois',
  'so. illinois': 'Southern Illinois',
  'southern ill.': 'Southern Illinois',

  // East Tennessee State
  'etsu': 'East Tennessee State',
  'e. tenn. st.': 'East Tennessee State',
  'e. tennessee st.': 'East Tennessee State',
  'east tenn. st.': 'East Tennessee State',

  // Northern Colorado
  'n. colorado': 'Northern Colorado',
  'northern colo.': 'Northern Colorado',

  // Loyola-Marymount (hyphen in WN canonical)
  'loyola marymount': 'Loyola-Marymount',
  'lmu': 'Loyola-Marymount',

  // Central Arkansas
  'central ark.': 'Central Arkansas',
  'cent. arkansas': 'Central Arkansas',

  // Texas A&M-Corpus Christi
  'tex. a&m-corpus christi': 'Texas A&M-Corpus Christi',
  'tamucc': 'Texas A&M-Corpus Christi',
  'a&m-corpus christi': 'Texas A&M-Corpus Christi',

  // Western Kentucky
  'w. kentucky': 'Western Kentucky',
  'western ky.': 'Western Kentucky',

  // Middle Tennessee
  'middle tenn.': 'Middle Tennessee',

  // Southern Miss (NCAA.com appends a period)
  'southern miss': 'Southern Miss',

  // Southeast Missouri (NCAA.com may abbreviate)
  's.e. mo. st.': 'Southeast Missouri',
  'se. mo. st.': 'Southeast Missouri',

  // USC Upstate / South Carolina Upstate
  's.c. upstate': 'South Carolina Upstate',

  // Saint Thomas (Minnesota)
  'st. thomas (mn)': 'Saint Thomas',
  'saint thomas (minn.)': 'Saint Thomas',
  'st. thomas (minn.)': 'Saint Thomas',

  // FAU abbreviation NCAA.com may use
  'fla. atlantic': 'FAU',

  // Cal State / CSUN
  'cal st. northridge': 'Cal State Northridge',
  'cal st. fullerton': 'Cal State Fullerton',
  'cal st. bakersfield': 'Cal State Bakersfield',
};

/**
 * Returns the canonical team name for a given input.
 * If no alias found, returns the original (trimmed).
 */
export function normalizeTeamName(raw: string): string {
  if (!raw) return raw;
  const lower = raw.trim().toLowerCase();
  if (ALIASES[lower]) return ALIASES[lower];

  // Try without trailing punctuation
  const stripped = lower.replace(/[.,]+$/, '').trim();
  if (ALIASES[stripped]) return ALIASES[stripped];

  return raw.trim();
}

/**
 * Finds a team in the canonical list by exact match only (after alias normalization).
 * The old substring containsMatch has been removed — it caused cross-contamination
 * between teams like "Iowa" / "Iowa State", "Michigan" / "Michigan State", etc.
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
  return exactMatch ?? null;
}
