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

/** Territories we don't want clickable in quizzes */
export const nonClickableTerritories = new Set<string>([
  // French
  "French Guiana",
  "Guadeloupe",
  "Martinique",
  "Réunion",
  "Mayotte",
  "New Caledonia",
  "St. Pierre and Miquelon",
  "Saint Barthélemy",
  "Saint Martin",

  // British
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

  // Dutch
  "Aruba",
  "Curaçao",
  "Sint Maarten",
  "Caribbean Netherlands",

  // US
  "Puerto Rico",
  "U.S. Virgin Islands",
  "Guam",
  "Northern Mariana Islands",
  "American Samoa",

  // Danish
  "Faroe Islands",

  // Others / small islands
  "Norfolk Island",
  "Christmas Island",
  "Cocos Islands",
  "Azores",
  "Madeira",
  "Canary Islands",
  "Svalbard",
  "Jan Mayen",
  "Åland",

  // Disputed/occupied territories - not separate clickable entities
  "Crimea",
  "Crimean Peninsula",
]);

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
