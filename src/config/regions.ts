/**
 * Groups of countries, for adding a whole region to a country setting in one
 * press (see CountryListEditor's presets). Names are spelled exactly as in
 * config/countries.ts; anything that is not on that list is ignored by the
 * editor rather than saved.
 */

/** The 54 sovereign states of Africa. */
export const AFRICAN_COUNTRIES = [
  "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi", "Cabo Verde",
  "Cameroon", "Central African Republic", "Chad", "Comoros", "Congo (Brazzaville)",
  "Congo (Kinshasa)", "Côte d'Ivoire", "Djibouti", "Egypt", "Equatorial Guinea", "Eritrea",
  "Eswatini", "Ethiopia", "Gabon", "Gambia", "Ghana", "Guinea", "Guinea-Bissau", "Kenya",
  "Lesotho", "Liberia", "Libya", "Madagascar", "Malawi", "Mali", "Mauritania", "Mauritius",
  "Morocco", "Mozambique", "Namibia", "Niger", "Nigeria", "Rwanda", "Sao Tome and Principe",
  "Senegal", "Seychelles", "Sierra Leone", "Somalia", "South Africa", "South Sudan", "Sudan",
  "Tanzania", "Togo", "Tunisia", "Uganda", "Zambia", "Zimbabwe",
] as const;
