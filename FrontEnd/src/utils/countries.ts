// Common country utilities for map and games

/** Map dataset short names to normalized names */
export function normalizeCountryName(raw: string): string {
  const map: Record<string, string> = {
    "Bosnia and Herz.": "Bosnia and Herzegovina",
    Congo: "Republic of the Congo",
    "Dem. Rep. Congo": "DR Congo",
    "Central African Rep.": "Central African Republic",
    "Eq. Guinea": "Equatorial Guinea",
    "Côte d'Ivoire": "Ivory Coast",
    "S. Sudan": "South Sudan",
    "Czech Rep.": "Czechia",
    "Wallis and Futuna Is.": "Wallis and Futuna",
    "Cook Is.": "Cook Islands",
    "Fr. Polynesia": "French Polynesia",
    "N. Cyprus": "Northern Cyprus",
    // Crimea is part of Ukraine (internationally recognized)
    Crimea: "Ukraine",
    "Crimean Peninsula": "Ukraine",
  };
  return map[raw] ?? raw;
}

/** Some names differ between map dataset and REST Countries */
export const restAliases: Record<string, string> = {
  "United States of America": "United States",
  "Cabo Verde": "Cape Verde",
  "Wallis and Futuna Is.": "Wallis and Futuna",
  "Cook Is.": "Cook Islands",
  "Fr. Polynesia": "French Polynesia",
};

export const normalizeApos = (s: string) => s.replace(/\u2019/g, "'");
export const stripDiacritics = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * UN Member States (193) + Palestine + Vatican City = 195 sovereign states
 * These are the ONLY countries that should appear in game modes
 * Territories and dependencies should only appear in explore mode
 */
export const gameEligibleCountries = new Set<string>([
  // UN Member States - All 193 countries
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda",
  "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas",
  "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize",
  "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil",
  "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia",
  "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China",
  "Colombia", "Comoros", "Republic of the Congo", "DR Congo", "Costa Rica", "Croatia",
  "Cuba", "Cyprus", "Czechia", "Denmark", "Djibouti", "Dominica",
  "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea",
  "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece",
  "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti",
  "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran",
  "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast", "Jamaica",
  "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "North Korea",
  "South Korea", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon",
  "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta",
  "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova",
  "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua",
  "Niger", "Nigeria", "North Macedonia", "Norway", "Oman", "Pakistan",
  "Palau", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines",
  "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", 
  "San Marino", "São Tomé and Príncipe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles",
  "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia",
  "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname",
  "Sweden", "Switzerland", "Syria", "Tajikistan", "Tanzania", "Thailand",
  "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey",
  "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom",
  "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Venezuela", "Vietnam",
  "Yemen", "Zambia", "Zimbabwe",
  
  // Observer States (2) - included in games
  "Palestine", "Vatican City",
  
  // Partially recognized state (included)
  "Kosovo",
]);

/** Territories we don't want clickable in quizzes */
export const nonClickableTerritories = new Set<string>([
  // French overseas territories
  "French Guiana",
  "Guadeloupe",
  "Martinique",
  "Réunion",
  "Mayotte",
  "New Caledonia",
  "French Polynesia",
  "Wallis and Futuna",
  "St. Pierre and Miquelon",
  "Saint Barthélemy",
  "Saint Martin",

  // British overseas territories
  "Falkland Islands",
  "British Virgin Islands",
  "Cayman Islands",
  "Turks and Caicos Islands",
  "Bermuda",
  "Gibraltar",
  "Anguilla",
  "Montserrat",
  "British Indian Ocean Territory",
  "South Georgia and South Sandwich Islands",
  "Pitcairn Islands",
  "Saint Helena",

  // Dutch overseas territories
  "Aruba",
  "Curaçao",
  "Sint Maarten",
  "Caribbean Netherlands",

  // US territories
  "Puerto Rico",
  "U.S. Virgin Islands",
  "Guam",
  "Northern Mariana Islands",
  "American Samoa",

  // Danish autonomous territories
  "Faroe Islands",
  "Greenland",

  // New Zealand territories
  "Cook Islands",
  "Niue",
  "Tokelau",

  // Australian territories
  "Norfolk Island",
  "Christmas Island",
  "Cocos Islands",

  // Portuguese autonomous regions
  "Azores",
  "Madeira",

  // Spanish autonomous regions
  "Canary Islands",

  // Norwegian territories
  "Svalbard",
  "Jan Mayen",

  // Finnish autonomous region
  "Åland",

  // Disputed/occupied territories - not separate clickable entities
  "Crimea",
  "Crimean Peninsula",
  "Northern Cyprus",
  "Western Sahara",
]);

/**
 * Check if a country is eligible for game modes (UN + Palestine + Vatican = 195)
 * Territories and dependencies are excluded from games but can appear in explore mode
 */
export function isGameEligibleCountry(rawName: string): boolean {
  const name = normalizeCountryName(rawName);
  
  // Check common alternate names used in map data vs REST Countries
  const checkNames = [
    name,
    // Handle common variations
    name === "Ivory Coast" ? "Côte d'Ivoire" : name,
    name === "Cape Verde" ? "Cabo Verde" : name,
    name === "East Timor" ? "Timor-Leste" : name,
    name === "Czech Republic" ? "Czechia" : name,
    name === "United States of America" ? "United States" : name,
    name === "Republic of the Congo" ? "Congo" : name,
    name === "DR Congo" ? "Democratic Republic of the Congo" : name,
  ];
  
  return checkNames.some(n => gameEligibleCountries.has(n));
}

export function isClickableCountry(rawName: string): boolean {
  const name = normalizeCountryName(rawName);
  return !nonClickableTerritories.has(name);
}

/**
 * Build a lookup from REST Countries results to map names.
 * Uses common name, alias map, and diacritics/apos normalization.
 */
export function buildRestLookup(
  countries: Array<{
    name: { common: string };
    cca2: string;
    flags: { svg?: string; png?: string };
  }>
): Record<string, { name: string; cca2: string; flag: string }> {
  const lookup: Record<string, { name: string; cca2: string; flag: string }> = {};

  const set = (key: string, val: { name: string; cca2: string; flag: string }) => {
    const k1 = normalizeApos(key);
    const k2 = stripDiacritics(k1);
    lookup[k1] = val;
    lookup[k2] = val;
  };

  for (const c of countries) {
    const common = c.name.common;
    const flag = c.flags.svg || c.flags.png || "";
    const val = { name: common, cca2: c.cca2, flag };
    set(common, val);

    // Also store aliases we know
    for (const [from, to] of Object.entries(restAliases)) {
      if (to === common) {
        set(from, val);
      }
    }
  }
  return lookup;
}
