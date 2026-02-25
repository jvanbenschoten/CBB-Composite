/**
 * Primary team colors for major D-I programs.
 * Used as left-border accent on table rows.
 * Key = canonical NET team name (all keys must be quoted strings)
 */
export const TEAM_COLORS: Record<string, string> = {
  // ACC
  'Duke': '#003087',
  'North Carolina': '#4B9CD3',
  'NC State': '#CC0000',
  'Virginia': '#232D4B',
  'Virginia Tech': '#75103A',
  'Syracuse': '#F76900',
  'Louisville': '#AD0000',
  'Clemson': '#F56600',
  'Florida State': '#782F40',
  'Miami (FL)': '#005030',
  'Pittsburgh': '#003594',
  'Wake Forest': '#9E7E38',
  'Boston College': '#98002E',
  'Notre Dame': '#0C2340',
  'Georgia Tech': '#003057',
  'North Carolina State': '#CC0000',

  // Big Ten
  'Michigan': '#00274C',
  'Michigan State': '#18453B',
  'Ohio State': '#BB0000',
  'Illinois': '#E84A27',
  'Indiana': '#990000',
  'Iowa': '#000000',
  'Minnesota': '#7A0019',
  'Nebraska': '#E41C38',
  'Northwestern': '#4E2A84',
  'Penn State': '#001E44',
  'Purdue': '#CEB888',
  'Wisconsin': '#C5050C',
  'Maryland': '#E03A3E',
  'Rutgers': '#CC0033',
  'UCLA': '#2D68C4',
  'USC': '#990000',
  'Washington': '#4B2E83',
  'Oregon': '#154733',

  // Big 12
  'Kansas': '#0051A5',
  'Baylor': '#154734',
  'Texas': '#BF5700',
  'Texas Tech': '#CC0000',
  'Oklahoma State': '#FF6600',
  'West Virginia': '#002855',
  'Iowa State': '#C8102E',
  'TCU': '#4D1979',
  'Kansas State': '#512888',
  'Cincinnati': '#E00122',
  'Houston': '#C8102E',
  'UCF': '#BA9B37',
  'BYU': '#002E5D',
  'Colorado': '#000000',
  'Arizona': '#CC0033',
  'Arizona State': '#8C1D40',
  'Utah': '#CC0000',

  // SEC
  'Kentucky': '#0033A0',
  'Tennessee': '#FF8200',
  'Auburn': '#E87722',
  'Alabama': '#9E1B32',
  'Arkansas': '#9D2235',
  'Florida': '#0021A5',
  'Georgia': '#BA0C2F',
  'LSU': '#461D7C',
  'Mississippi': '#CE2128',
  'Ole Miss': '#CE2128',
  'Mississippi State': '#660000',
  'Missouri': '#F1B82D',
  'South Carolina': '#73000A',
  'Vanderbilt': '#000000',
  'Texas A&M': '#500000',

  // Big East
  'Connecticut': '#000E2F',
  'Villanova': '#003366',
  "St. John's (NY)": '#C60C30',
  'Georgetown': '#041E42',
  'Seton Hall': '#004488',
  'Marquette': '#003087',
  'Creighton': '#005CA9',
  'Xavier': '#0C2340',
  'DePaul': '#005596',
  'Providence': '#000000',
  'Butler': '#13294B',
  'Loyola Chicago': '#7A0019',

  // Mountain West
  'San Diego State': '#A6192E',
  'Nevada': '#003366',
  'New Mexico': '#BA0C2F',
  'UNLV': '#CC0000',
  'Utah State': '#002B5C',
  'Boise State': '#0033A0',
  'Colorado State': '#1E4D2B',
  'Air Force': '#003087',
  'Fresno State': '#CC0000',

  // WCC
  'Gonzaga': '#002967',
  "Saint Mary's (CA)": '#002060',
  'San Francisco': '#6E3B2A',
  'Loyola Marymount': '#A50034',
  'Pacific': '#F47920',
  'Portland': '#5C0D28',
  'Pepperdine': '#0C2340',
  'Santa Clara': '#862633',

  // A-10
  'Dayton': '#CE1141',
  'Saint Louis': '#003DA5',
  'VCU': '#000000',
  'Richmond': '#990000',
  'George Mason': '#006633',
  'George Washington': '#033A5E',
  'Rhode Island': '#002147',
  'Davidson': '#CC0000',
  'St. Bonaventure': '#7C3A2D',
  'Massachusetts': '#881C1C',
  'Fordham': '#781B23',
  'La Salle': '#005EB8',
  'Duquesne': '#003594',
  "Saint Joseph's": '#98002E',

  // MVC
  'Drake': '#004B8D',
  'Bradley': '#CC0000',
  'Illinois State': '#CC0000',
  'Northern Iowa': '#6B0032',
  'Evansville': '#6B2D8B',
  'Loyola (IL)': '#7A0019',

  // C-USA
  'Middle Tennessee': '#0066CC',
  'UAB': '#1E6B52',
  'UTEP': '#FF7F00',
  'Western Kentucky': '#B01E24',
  'Florida Atlantic': '#003366',

  // Other notable programs
  'Memphis': '#003087',
  'Wichita State': '#000000',
  'Murray State': '#002F6C',
  'Belmont': '#003DA5',
  'Oral Roberts': '#003087',
  'Liberty': '#002D62',
  'Eastern Washington': '#A10022',
  'SMU': '#0033A0',
};

export function getTeamColor(teamName: string): string {
  return TEAM_COLORS[teamName] ?? '#2d4f7a';
}
