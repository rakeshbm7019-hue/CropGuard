/**
 * Precision Agricultural Geocoding & Geolocation Service
 * Integrates Google Maps Geocoding API (server-side proxy) with resilient fallbacks
 * to ensure precise shop and farm coordinates are resolved down to village and taluk level.
 */

// Earth radius in kilometers
const EARTH_RADIUS_KM = 6371;

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  area: string;
  taluk: string;
  district: string;
  state: string;
  country: string;
  postcode: string;
  confidence: "high" | "medium" | "low";
  provider: "google" | "open-meteo" | "osm" | "regional-centroid";
}

export interface ReverseGeocodeResult {
  area: string;
  taluk: string;
  district: string;
  state: string;
  country: string;
  postcode: string;
  displayName: string;
  formattedLocation: string;
  provider: string;
}

// In-memory cache to prevent redundant external API calls
const geocodeCache = new Map<string, { data: any; expires: number }>();

/**
 * Sanitizes location strings to strictly remove administrative "Division", "Revenue Division",
 * "Sub-Division", plus codes, and stray characters, ensuring only exact Taluk, District, Area, and State are returned.
 */
export function cleanLocationName(str: string): string {
  if (!str) return "";
  return str
    .replace(/^[A-Z0-9\+]+\s+(?=[A-Za-z])/g, "") // strip Plus Codes e.g. "XXQP+MM "
    .replace(/^[^,]*\b(S\/O|D\/O|W\/O|Door\s+No\.?|H\s+No\.?|House\s+No\.?|Plot\s+No\.?)\s*[^,]+,?\s*/gi, "")
    .replace(/\b(Revenue\s+Division|Sub-Division|Subdivision|District\s+Division|Division|division)\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/,\s*,/g, ",")
    .replace(/^\s*,|\s*,\s*$/g, "")
    .trim();
}

// Comprehensive centroid database of major Indian agricultural districts, taluks & mandi centers
export const INDIAN_AGRICULTURAL_CENTROIDS: Record<
  string,
  { lat: number; lng: number; district: string; state: string; taluk?: string }
> = {
  // Karnataka (North, South, Coastal, Central)
  dharwad: { lat: 15.4589, lng: 75.0078, district: "Dharwad", state: "Karnataka", taluk: "Dharwad Taluk" },
  hubballi: { lat: 15.3647, lng: 75.124, district: "Dharwad", state: "Karnataka", taluk: "Hubballi Taluk" },
  hubli: { lat: 15.3647, lng: 75.124, district: "Dharwad", state: "Karnataka", taluk: "Hubballi Taluk" },
  belagavi: { lat: 15.8497, lng: 74.4977, district: "Belagavi", state: "Karnataka", taluk: "Belagavi Taluk" },
  belgaum: { lat: 15.8497, lng: 74.4977, district: "Belagavi", state: "Karnataka", taluk: "Belagavi Taluk" },
  athani: { lat: 16.7324, lng: 75.0592, district: "Belagavi", state: "Karnataka", taluk: "Athani Taluk" },
  chikodi: { lat: 16.4294, lng: 74.5954, district: "Belagavi", state: "Karnataka", taluk: "Chikodi Taluk" },
  gokak: { lat: 16.1687, lng: 74.8252, district: "Belagavi", state: "Karnataka", taluk: "Gokak Taluk" },
  bailhongal: { lat: 15.8167, lng: 74.8667, district: "Belagavi", state: "Karnataka", taluk: "Bailhongal Taluk" },
  hukkeri: { lat: 16.2307, lng: 74.6022, district: "Belagavi", state: "Karnataka", taluk: "Hukkeri Taluk" },
  bagalkot: { lat: 16.1856, lng: 75.6961, district: "Bagalkot", state: "Karnataka", taluk: "Bagalkot Taluk" },
  badami: { lat: 15.9189, lng: 75.6797, district: "Bagalkot", state: "Karnataka", taluk: "Badami Taluk" },
  jamkhandi: { lat: 16.5117, lng: 75.2974, district: "Bagalkot", state: "Karnataka", taluk: "Jamkhandi Taluk" },
  mudhol: { lat: 16.3477, lng: 75.2842, district: "Bagalkot", state: "Karnataka", taluk: "Mudhol Taluk" },
  vijayapura: { lat: 16.8302, lng: 75.71, district: "Vijayapura", state: "Karnataka", taluk: "Vijayapura Taluk" },
  bijapur: { lat: 16.8302, lng: 75.71, district: "Vijayapura", state: "Karnataka", taluk: "Vijayapura Taluk" },
  indi: { lat: 17.1755, lng: 75.9616, district: "Vijayapura", state: "Karnataka", taluk: "Indi Taluk" },
  sindagi: { lat: 16.9189, lng: 76.2341, district: "Vijayapura", state: "Karnataka", taluk: "Sindagi Taluk" },
  gadag: { lat: 15.4287, lng: 75.6268, district: "Gadag", state: "Karnataka", taluk: "Gadag Taluk" },
  shirhatti: { lat: 15.2289, lng: 75.5786, district: "Gadag", state: "Karnataka", taluk: "Shirhatti Taluk" },
  ron: { lat: 15.6989, lng: 75.7341, district: "Gadag", state: "Karnataka", taluk: "Ron Taluk" },
  koppal: { lat: 15.3444, lng: 76.1557, district: "Koppal", state: "Karnataka", taluk: "Koppal Taluk" },
  kushtagi: { lat: 15.7533, lng: 76.1963, district: "Koppal", state: "Karnataka", taluk: "Kushtagi Taluk" },
  tawargeri: { lat: 15.8239, lng: 76.1824, district: "Koppal", state: "Karnataka", taluk: "Kushtagi Taluk" },
  gangavathi: { lat: 15.4328, lng: 76.5312, district: "Koppal", state: "Karnataka", taluk: "Gangavathi Taluk" },
  yelburga: { lat: 15.6178, lng: 75.9876, district: "Koppal", state: "Karnataka", taluk: "Yelburga Taluk" },
  haveri: { lat: 14.7954, lng: 75.3992, district: "Haveri", state: "Karnataka", taluk: "Haveri Taluk" },
  ranebennur: { lat: 14.6212, lng: 75.6218, district: "Haveri", state: "Karnataka", taluk: "Ranebennur Taluk" },
  byadgi: { lat: 14.6789, lng: 75.4876, district: "Haveri", state: "Karnataka", taluk: "Byadgi Taluk" },
  shiggaon: { lat: 14.9876, lng: 75.2341, district: "Haveri", state: "Karnataka", taluk: "Shiggaon Taluk" },
  ballari: { lat: 15.1394, lng: 76.9214, district: "Ballari", state: "Karnataka", taluk: "Ballari Taluk" },
  bellary: { lat: 15.1394, lng: 76.9214, district: "Ballari", state: "Karnataka", taluk: "Ballari Taluk" },
  hospet: { lat: 15.2689, lng: 76.3909, district: "Vijayanagara", state: "Karnataka", taluk: "Hosapete Taluk" },
  hosapete: { lat: 15.2689, lng: 76.3909, district: "Vijayanagara", state: "Karnataka", taluk: "Hosapete Taluk" },
  raichur: { lat: 16.2076, lng: 77.3463, district: "Raichur", state: "Karnataka", taluk: "Raichur Taluk" },
  sindhanur: { lat: 15.7667, lng: 76.7667, district: "Raichur", state: "Karnataka", taluk: "Sindhanur Taluk" },
  manvi: { lat: 15.9912, lng: 77.0512, district: "Raichur", state: "Karnataka", taluk: "Manvi Taluk" },
  kalaburagi: { lat: 17.3297, lng: 76.8343, district: "Kalaburagi", state: "Karnataka", taluk: "Kalaburagi Taluk" },
  gulbarga: { lat: 17.3297, lng: 76.8343, district: "Kalaburagi", state: "Karnataka", taluk: "Kalaburagi Taluk" },
  bidar: { lat: 17.9104, lng: 77.5199, district: "Bidar", state: "Karnataka", taluk: "Bidar Taluk" },
  yadgir: { lat: 16.7644, lng: 77.1378, district: "Yadgir", state: "Karnataka", taluk: "Yadgir Taluk" },
  shivamogga: { lat: 13.9299, lng: 75.5681, district: "Shivamogga", state: "Karnataka", taluk: "Shivamogga Taluk" },
  shimoga: { lat: 13.9299, lng: 75.5681, district: "Shivamogga", state: "Karnataka", taluk: "Shivamogga Taluk" },
  bhadravathi: { lat: 13.8409, lng: 75.7024, district: "Shivamogga", state: "Karnataka", taluk: "Bhadravathi Taluk" },
  davangere: { lat: 14.4644, lng: 75.9218, district: "Davanagere", state: "Karnataka", taluk: "Davanagere Taluk" },
  davanagere: { lat: 14.4644, lng: 75.9218, district: "Davanagere", state: "Karnataka", taluk: "Davanagere Taluk" },
  harihar: { lat: 14.5123, lng: 75.8012, district: "Davanagere", state: "Karnataka", taluk: "Harihar Taluk" },
  chitradurga: { lat: 14.2251, lng: 76.398, district: "Chitradurga", state: "Karnataka", taluk: "Chitradurga Taluk" },
  tumakuru: { lat: 13.3409, lng: 77.101, district: "Tumakuru", state: "Karnataka", taluk: "Tumakuru Taluk" },
  tumkur: { lat: 13.3409, lng: 77.101, district: "Tumakuru", state: "Karnataka", taluk: "Tumakuru Taluk" },
  chikkamagaluru: { lat: 13.3161, lng: 75.772, district: "Chikkamagaluru", state: "Karnataka", taluk: "Chikkamagaluru Taluk" },
  // Hassan District Taluks
  alur: { lat: 12.9892, lng: 75.9867, district: "Hassan", state: "Karnataka", taluk: "Alur Taluk" },
  aloor: { lat: 12.9892, lng: 75.9867, district: "Hassan", state: "Karnataka", taluk: "Alur Taluk" },
  arkalgud: { lat: 12.7667, lng: 76.0583, district: "Hassan", state: "Karnataka", taluk: "Arkalgud Taluk" },
  arakalagudu: { lat: 12.7667, lng: 76.0583, district: "Hassan", state: "Karnataka", taluk: "Arkalgud Taluk" },
  arsikere: { lat: 13.3139, lng: 76.2575, district: "Hassan", state: "Karnataka", taluk: "Arsikere Taluk" },
  arasikere: { lat: 13.3139, lng: 76.2575, district: "Hassan", state: "Karnataka", taluk: "Arsikere Taluk" },
  belur: { lat: 13.1644, lng: 75.8603, district: "Hassan", state: "Karnataka", taluk: "Belur Taluk" },
  channarayapatna: { lat: 12.9039, lng: 76.3922, district: "Hassan", state: "Karnataka", taluk: "Channarayapatna Taluk" },
  crpatna: { lat: 12.9039, lng: 76.3922, district: "Hassan", state: "Karnataka", taluk: "Channarayapatna Taluk" },
  holenarasipur: { lat: 12.7889, lng: 76.2436, district: "Hassan", state: "Karnataka", taluk: "Holenarasipur Taluk" },
  holenarasipura: { lat: 12.7889, lng: 76.2436, district: "Hassan", state: "Karnataka", taluk: "Holenarasipur Taluk" },
  sakleshpur: { lat: 12.9436, lng: 75.7878, district: "Hassan", state: "Karnataka", taluk: "Sakleshpur Taluk" },
  sakleshpura: { lat: 12.9436, lng: 75.7878, district: "Hassan", state: "Karnataka", taluk: "Sakleshpur Taluk" },
  hassan: { lat: 13.0072, lng: 76.103, district: "Hassan", state: "Karnataka", taluk: "Hassan Taluk" },

  // Mandya & Mysuru District Taluks
  krpet: { lat: 12.8625, lng: 76.4917, district: "Mandya", state: "Karnataka", taluk: "KR Pet Taluk" },
  pandavapura: { lat: 12.4967, lng: 76.6667, district: "Mandya", state: "Karnataka", taluk: "Pandavapura Taluk" },
  nagamangala: { lat: 12.8189, lng: 76.7583, district: "Mandya", state: "Karnataka", taluk: "Nagamangala Taluk" },
  maddur: { lat: 12.5833, lng: 77.0500, district: "Mandya", state: "Karnataka", taluk: "Maddur Taluk" },
  malavalli: { lat: 12.3833, lng: 77.0667, district: "Mandya", state: "Karnataka", taluk: "Malavalli Taluk" },
  srirangapatna: { lat: 12.4225, lng: 76.6936, district: "Mandya", state: "Karnataka", taluk: "Srirangapatna Taluk" },
  mandya: { lat: 12.5218, lng: 76.8951, district: "Mandya", state: "Karnataka", taluk: "Mandya Taluk" },
  nanjangud: { lat: 12.1189, lng: 76.6812, district: "Mysuru", state: "Karnataka", taluk: "Nanjangud Taluk" },
  hunsur: { lat: 12.3089, lng: 76.2917, district: "Mysuru", state: "Karnataka", taluk: "Hunsur Taluk" },
  piriyapatna: { lat: 12.3417, lng: 75.9889, district: "Mysuru", state: "Karnataka", taluk: "Piriyapatna Taluk" },
  krnagar: { lat: 12.5833, lng: 76.3833, district: "Mysuru", state: "Karnataka", taluk: "KR Nagar Taluk" },
  heggadadevankote: { lat: 12.0833, lng: 76.3333, district: "Mysuru", state: "Karnataka", taluk: "HD Kote Taluk" },
  hdkote: { lat: 12.0833, lng: 76.3333, district: "Mysuru", state: "Karnataka", taluk: "HD Kote Taluk" },
  tnarasipura: { lat: 12.2167, lng: 76.9000, district: "Mysuru", state: "Karnataka", taluk: "T Narasipura Taluk" },
  mysuru: { lat: 12.2958, lng: 76.6394, district: "Mysuru", state: "Karnataka", taluk: "Mysuru Taluk" },
  mysore: { lat: 12.2958, lng: 76.6394, district: "Mysuru", state: "Karnataka", taluk: "Mysuru Taluk" },
  chamarajanagar: { lat: 11.9261, lng: 76.9437, district: "Chamarajanagar", state: "Karnataka", taluk: "Chamarajanagar Taluk" },
  udupi: { lat: 13.3409, lng: 74.7421, district: "Udupi", state: "Karnataka", taluk: "Udupi Taluk" },
  mangaluru: { lat: 12.9141, lng: 74.856, district: "Dakshina Kannada", state: "Karnataka", taluk: "Mangaluru Taluk" },
  sirsi: { lat: 14.6195, lng: 74.8354, district: "Uttara Kannada", state: "Karnataka", taluk: "Sirsi Taluk" },
  karwar: { lat: 14.8185, lng: 74.135, district: "Uttara Kannada", state: "Karnataka", taluk: "Karwar Taluk" },
  bengaluru: { lat: 12.9716, lng: 77.5946, district: "Bengaluru Urban", state: "Karnataka", taluk: "Bengaluru" },
  bangalore: { lat: 12.9716, lng: 77.5946, district: "Bengaluru Urban", state: "Karnataka", taluk: "Bengaluru" },
  kolar: { lat: 13.1367, lng: 78.1291, district: "Kolar", state: "Karnataka", taluk: "Kolar Taluk" },
  chikkaballapur: { lat: 13.4325, lng: 77.7275, district: "Chikkaballapur", state: "Karnataka", taluk: "Chikkaballapur Taluk" },

  // Maharashtra
  pune: { lat: 18.5204, lng: 73.8567, district: "Pune", state: "Maharashtra", taluk: "Pune City Taluk" },
  baramati: { lat: 18.1521, lng: 74.5771, district: "Pune", state: "Maharashtra", taluk: "Baramati Taluk" },
  nashik: { lat: 19.9975, lng: 73.7898, district: "Nashik", state: "Maharashtra", taluk: "Nashik Taluk" },
  kolhapur: { lat: 16.705, lng: 74.2433, district: "Kolhapur", state: "Maharashtra", taluk: "Karveer Taluk" },
  solapur: { lat: 17.6599, lng: 75.9064, district: "Solapur", state: "Maharashtra", taluk: "North Solapur Taluk" },
  sangli: { lat: 16.8524, lng: 74.5815, district: "Sangli", state: "Maharashtra", taluk: "Miraj Taluk" },
  satara: { lat: 17.6805, lng: 74.0183, district: "Satara", state: "Maharashtra", taluk: "Satara Taluk" },
  ahmednagar: { lat: 19.0948, lng: 74.748, district: "Ahmednagar", state: "Maharashtra", taluk: "Nagar Taluk" },
  aurangabad: { lat: 19.8762, lng: 75.3433, district: "Chhatrapati Sambhaji Nagar", state: "Maharashtra", taluk: "Aurangabad Taluk" },
  nagpur: { lat: 21.1458, lng: 79.0882, district: "Nagpur", state: "Maharashtra", taluk: "Nagpur Taluk" },
  amravati: { lat: 20.932, lng: 77.7523, district: "Amravati", state: "Maharashtra", taluk: "Amravati Taluk" },
  jalgaon: { lat: 21.0077, lng: 75.5626, district: "Jalgaon", state: "Maharashtra", taluk: "Jalgaon Taluk" },
  latur: { lat: 18.4088, lng: 76.5604, district: "Latur", state: "Maharashtra", taluk: "Latur Taluk" },
  nanded: { lat: 19.1383, lng: 77.321, district: "Nanded", state: "Maharashtra", taluk: "Nanded Taluk" },

  // Andhra Pradesh & Telangana
  guntur: { lat: 16.3067, lng: 80.4365, district: "Guntur", state: "Andhra Pradesh", taluk: "Guntur Urban Taluk" },
  vijayawada: { lat: 16.5062, lng: 80.648, district: "Krishna", state: "Andhra Pradesh", taluk: "Vijayawada Taluk" },
  kurnool: { lat: 15.8281, lng: 78.0373, district: "Kurnool", state: "Andhra Pradesh", taluk: "Kurnool Taluk" },
  anantapur: { lat: 14.6819, lng: 77.6006, district: "Anantapur", state: "Andhra Pradesh", taluk: "Anantapur Taluk" },
  visakhapatnam: { lat: 17.6868, lng: 83.2185, district: "Visakhapatnam", state: "Andhra Pradesh", taluk: "Visakhapatnam Taluk" },
  tirupati: { lat: 13.6288, lng: 79.4192, district: "Tirupati", state: "Andhra Pradesh", taluk: "Tirupati Urban Taluk" },
  hyderabad: { lat: 17.385, lng: 78.4867, district: "Hyderabad", state: "Telangana", taluk: "Hyderabad" },
  warangal: { lat: 17.9689, lng: 79.5941, district: "Warangal", state: "Telangana", taluk: "Warangal Taluk" },
  karimnagar: { lat: 18.4386, lng: 79.1288, district: "Karimnagar", state: "Telangana", taluk: "Karimnagar Taluk" },
  nizamabad: { lat: 18.6725, lng: 78.0941, district: "Nizamabad", state: "Telangana", taluk: "Nizamabad Taluk" },

  // Tamil Nadu
  coimbatore: { lat: 11.0168, lng: 76.9558, district: "Coimbatore", state: "Tamil Nadu", taluk: "Coimbatore North Taluk" },
  erode: { lat: 11.341, lng: 77.7172, district: "Erode", state: "Tamil Nadu", taluk: "Erode Taluk" },
  salem: { lat: 11.6643, lng: 78.146, district: "Salem", state: "Tamil Nadu", taluk: "Salem Taluk" },
  madurai: { lat: 9.9252, lng: 78.1198, district: "Madurai", state: "Tamil Nadu", taluk: "Madurai Taluk" },
  thanjavur: { lat: 10.787, lng: 79.1378, district: "Thanjavur", state: "Tamil Nadu", taluk: "Thanjavur Taluk" },
  chennai: { lat: 13.0827, lng: 80.2707, district: "Chennai", state: "Tamil Nadu", taluk: "Chennai" },

  // Gujarat
  anand: { lat: 22.5645, lng: 72.9289, district: "Anand", state: "Gujarat", taluk: "Anand Taluk" },
  rajkot: { lat: 22.3039, lng: 70.8022, district: "Rajkot", state: "Gujarat", taluk: "Rajkot Taluk" },
  ahmedabad: { lat: 23.0225, lng: 72.5714, district: "Ahmedabad", state: "Gujarat", taluk: "Ahmedabad City" },
  surat: { lat: 21.1702, lng: 72.8311, district: "Surat", state: "Gujarat", taluk: "Surat City" },
  vadodara: { lat: 22.3072, lng: 73.1812, district: "Vadodara", state: "Gujarat", taluk: "Vadodara Taluk" },
  bhavnagar: { lat: 21.7645, lng: 72.1519, district: "Bhavnagar", state: "Gujarat", taluk: "Bhavnagar Taluk" },

  // Punjab & Haryana
  ludhiana: { lat: 30.901, lng: 75.8573, district: "Ludhiana", state: "Punjab", taluk: "Ludhiana West Taluk" },
  bathinda: { lat: 30.211, lng: 74.9455, district: "Bathinda", state: "Punjab", taluk: "Bathinda Taluk" },
  amritsar: { lat: 31.634, lng: 74.8723, district: "Amritsar", state: "Punjab", taluk: "Amritsar Taluk" },
  karnal: { lat: 29.6857, lng: 76.9905, district: "Karnal", state: "Haryana", taluk: "Karnal Taluk" },
  hisar: { lat: 29.1492, lng: 75.7217, district: "Hisar", state: "Haryana", taluk: "Hisar Taluk" },

  // Madhya Pradesh, UP, Bihar, WB
  indore: { lat: 22.7196, lng: 75.8577, district: "Indore", state: "Madhya Pradesh", taluk: "Indore Taluk" },
  bhopal: { lat: 23.2599, lng: 77.4126, district: "Bhopal", state: "Madhya Pradesh", taluk: "Huzur Taluk" },
  jabalpur: { lat: 23.1815, lng: 79.9864, district: "Jabalpur", state: "Madhya Pradesh", taluk: "Jabalpur Taluk" },
  varanasi: { lat: 25.3176, lng: 82.9739, district: "Varanasi", state: "Uttar Pradesh", taluk: "Varanasi Sadar Taluk" },
  lucknow: { lat: 26.8467, lng: 80.9462, district: "Lucknow", state: "Uttar Pradesh", taluk: "Lucknow Taluk" },
  patna: { lat: 25.5941, lng: 85.1376, district: "Patna", state: "Bihar", taluk: "Patna Sadar Taluk" },
  kolkata: { lat: 22.5726, lng: 88.3639, district: "Kolkata", state: "West Bengal", taluk: "Kolkata" },
};

/**
 * Computes exact Haversine Distance between two geographic coordinates in km.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return 0;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((EARTH_RADIUS_KM * c).toFixed(1));
}

/**
 * Finds the closest Indian agricultural hub from a coordinate pair.
 */
export function findNearestAgriculturalCentroid(
  lat: number,
  lng: number
): { name: string; distanceKm: number; district: string; state: string; taluk?: string } {
  let nearestName = "Dharwad";
  let minDistance = Infinity;
  let nearestObj = INDIAN_AGRICULTURAL_CENTROIDS.dharwad;

  for (const [key, val] of Object.entries(INDIAN_AGRICULTURAL_CENTROIDS)) {
    const dist = calculateHaversineDistanceKm(lat, lng, val.lat, val.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearestName = key;
      nearestObj = val;
    }
  }

  return {
    name: nearestName,
    distanceKm: minDistance,
    district: nearestObj.district,
    state: nearestObj.state,
    taluk: nearestObj.taluk,
  };
}

export const HASSAN_TALUKS = [
  {
    taluk: "Alur Taluk",
    district: "Hassan",
    state: "Karnataka",
    lat: 12.9892,
    lng: 75.9867,
    aliases: [
      "alur", "aloor", "k.hoskote", "k hoskote", "kenchammana hoskote", "magge", "palya", "karagodu",
      "tholalu", "kundur", "kudlur", "rayarakoppal", "byrapura", "doddankanahalli", "kanathur",
      "harasikere", "hunasavalli", "biccodu", "gendehalli", "mallapura"
    ],
  },
  {
    taluk: "Sakleshpur Taluk",
    district: "Hassan",
    state: "Karnataka",
    lat: 12.9436,
    lng: 75.7878,
    aliases: ["sakleshpur", "sakleshpura", "hettur", "yeslur", "hanbal", "ballupet", "belagodu", "shukravarasante"],
  },
  {
    taluk: "Belur Taluk",
    district: "Hassan",
    state: "Karnataka",
    lat: 13.1644,
    lng: 75.8603,
    aliases: ["belur", "halebeedu", "halebid", "arehally", "madihalli", "hagare"],
  },
  {
    taluk: "Arkalgud Taluk",
    district: "Hassan",
    state: "Karnataka",
    lat: 12.7667,
    lng: 76.0583,
    aliases: ["arkalgud", "arakalagudu", "ramanathapura", "konanur", "mallipatna"],
  },
  {
    taluk: "Holenarasipur Taluk",
    district: "Hassan",
    state: "Karnataka",
    lat: 12.7889,
    lng: 76.2436,
    aliases: ["holenarasipur", "holenarasipura", "halekote", "doddakadanoor"],
  },
  {
    taluk: "Channarayapatna Taluk",
    district: "Hassan",
    state: "Karnataka",
    lat: 12.9039,
    lng: 76.3922,
    aliases: ["channarayapatna", "crpatna", "shravanabelagola", "nuggehalli", "hiresave", "bagur"],
  },
  {
    taluk: "Arsikere Taluk",
    district: "Hassan",
    state: "Karnataka",
    lat: 13.3139,
    lng: 76.2575,
    aliases: ["arsikere", "arasikere", "banavara", "javagal", "kanakatte", "gandasi"],
  },
  {
    taluk: "Hassan Taluk",
    district: "Hassan",
    state: "Karnataka",
    lat: 13.0072,
    lng: 76.1030,
    aliases: ["hassan town", "hassan city", "salagame", "kattaya", "shantigrama", "dudda", "boovanahalli", "chikkahonnenahalli"],
  },
];

/**
 * Resolves a given place name / query to its exact Taluk, District, and State.
 */
export function lookupKnownTaluk(
  text: string,
  lat?: number,
  lng?: number
): { taluk: string; district: string; state: string; lat: number; lng: number } | null {
  const clean = (text || "")
    .toLowerCase()
    .replace(/\b(taluk|tq|dist|district|division|subdivision|revenue division)\b/gi, "")
    .trim();

  // 1. Check Hassan Taluk Aliases first
  if (clean) {
    for (const item of HASSAN_TALUKS) {
      if (item.aliases.some((a) => clean === a || clean.includes(a) || a.includes(clean))) {
        return {
          taluk: item.taluk,
          district: item.district,
          state: item.state,
          lat: item.lat,
          lng: item.lng,
        };
      }
    }
  }

  // 2. Check token / alias match in all Indian agricultural centroids
  if (clean) {
    const tokens = clean.split(/[\s,./\-_]+/).filter((t) => t.length >= 3);
    for (const token of tokens) {
      if (INDIAN_AGRICULTURAL_CENTROIDS[token]?.taluk) {
        const hit = INDIAN_AGRICULTURAL_CENTROIDS[token];
        return {
          taluk: hit.taluk!,
          district: hit.district,
          state: hit.state,
          lat: hit.lat,
          lng: hit.lng,
        };
      }
    }

    for (const [key, hit] of Object.entries(INDIAN_AGRICULTURAL_CENTROIDS)) {
      if (hit.taluk && (clean === key || clean.includes(key) || key.includes(clean))) {
        return {
          taluk: hit.taluk,
          district: hit.district,
          state: hit.state,
          lat: hit.lat,
          lng: hit.lng,
        };
      }
    }
  }

  // 3. Proximity check ONLY if coordinates are within a tight 18 km radius of a known centroid
  if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
    let closestItem: { taluk: string; district: string; state: string; lat: number; lng: number } | null = null;
    let minDistance = Infinity;

    for (const item of HASSAN_TALUKS) {
      const dist = calculateHaversineDistanceKm(lat, lng, item.lat, item.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closestItem = item;
      }
    }

    for (const hit of Object.values(INDIAN_AGRICULTURAL_CENTROIDS)) {
      if (hit.taluk) {
        const dist = calculateHaversineDistanceKm(lat, lng, hit.lat, hit.lng);
        if (dist < minDistance) {
          minDistance = dist;
          closestItem = {
            taluk: hit.taluk,
            district: hit.district,
            state: hit.state,
            lat: hit.lat,
            lng: hit.lng,
          };
        }
      }
    }

    // STRICT PROXIMITY: Only match if coordinates are genuinely within 18 km of the taluk center!
    if (closestItem && minDistance <= 18) {
      return closestItem;
    }
  }

  return null;
}

/**
 * Resolves a text query (village, taluk, district, PIN code, or search term) to exact coordinates.
 * Priority:
 * 1. Google Maps Geocoding API (if GOOGLE_MAPS_API_KEY is configured)
 * 2. Open-Meteo Geocoding API
 * 3. OpenStreetMap Nominatim
 * 4. Comprehensive Indian Centroids database
 */
export async function forwardGeocodeQuery(query: string): Promise<GeocodeResult> {
  const cleanQuery = (query || "").trim().toLowerCase();
  const cacheKey = `fwd_${cleanQuery}`;
  const now = Date.now();
  const hit = geocodeCache.get(cacheKey);
  if (hit && hit.expires > now) {
    return hit.data;
  }

  // 1. Google Maps Geocoding API (Server-side proxy)
  const googleKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        query
      )}&region=in&key=${googleKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.status === "OK" && json.results?.[0]) {
          const first = json.results[0];
          const loc = first.geometry.location;
          const comps = first.address_components || [];

          let area = "";
          let taluk = "";
          let district = "";
          let state = "";
          let country = "India";
          let postcode = "";
          let locality = "";

          // Comprehensive multi-level extraction across all address components
          for (const item of json.results) {
            for (const c of item.address_components || []) {
              const types = c.types || [];
              if (!area && (types.includes("sublocality") || types.includes("sublocality_level_1") || types.includes("neighborhood") || types.includes("sublocality_level_2"))) {
                area = c.long_name;
              }
              if (!taluk && (types.includes("administrative_area_level_3") || types.includes("subdistrict"))) {
                taluk = c.long_name;
              }
              if (!district && types.includes("administrative_area_level_2")) {
                district = c.long_name;
              }
              if (!state && types.includes("administrative_area_level_1")) {
                state = c.long_name;
              }
              if (!country && types.includes("country")) {
                country = c.long_name;
              }
              if (!postcode && types.includes("postal_code")) {
                postcode = c.long_name;
              }
              if (!locality && types.includes("locality")) {
                locality = c.long_name;
              }
            }
          }

          // Smart fallback for Taluk / Tehsil / Sub-district
          if (!taluk) {
            taluk = locality || area || "";
          }
          if (!area && locality && locality !== taluk) {
            area = locality;
          }

          let cleanArea = cleanLocationName(area || locality || "Market Area");
          let cleanTaluk = cleanLocationName(taluk || (locality !== cleanArea ? locality : ""));
          let cleanDistrict = cleanLocationName(district || cleanTaluk || "District");
          let cleanState = cleanLocationName(state || "Karnataka");

          // Cross-verify with known taluk database (e.g. Alur is strictly Alur Taluk in Hassan District)
          const talukHit =
            lookupKnownTaluk(cleanArea, loc.lat, loc.lng) ||
            lookupKnownTaluk(cleanTaluk, loc.lat, loc.lng) ||
            lookupKnownTaluk(cleanQuery, loc.lat, loc.lng) ||
            lookupKnownTaluk(first.formatted_address || "", loc.lat, loc.lng) ||
            lookupKnownTaluk("", loc.lat, loc.lng);
          if (talukHit) {
            cleanTaluk = talukHit.taluk;
            cleanDistrict = talukHit.district;
            cleanState = talukHit.state;
          }

          const result: GeocodeResult = {
            lat: loc.lat,
            lng: loc.lng,
            formattedAddress: cleanLocationName(first.formatted_address || query),
            area: cleanArea,
            taluk: cleanTaluk ? (cleanTaluk.toLowerCase().includes("taluk") ? cleanTaluk : `${cleanTaluk} Taluk`) : (cleanDistrict ? `${cleanDistrict} Taluk` : ""),
            district: cleanDistrict,
            state: cleanState,
            country,
            postcode,
            confidence: "high",
            provider: "google",
          };

          geocodeCache.set(cacheKey, { data: result, expires: now + 3600 * 1000 });
          return result;
        }
      }
    } catch (err: any) {
      console.warn("Notice: Google Maps Geocoding API call error:", err?.message);
    }
  }

  // 2. Open-Meteo Precision Geocoding
  try {
    const omRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        query
      )}&count=1&language=en&format=json`
    );
    if (omRes.ok) {
      const omData = await omRes.json();
      if (omData?.results?.[0]) {
        const r = omData.results[0];
        const cleanArea = cleanLocationName(r.name || "");
        const cleanAdmin2 = cleanLocationName(r.admin2 || "");
        const cleanState = cleanLocationName(r.admin1 || "");

        const result: GeocodeResult = {
          lat: r.latitude,
          lng: r.longitude,
          formattedAddress: cleanLocationName([r.name, r.admin2, r.admin1, r.country].filter(Boolean).join(", ")),
          area: cleanArea,
          taluk: cleanAdmin2 ? `${cleanAdmin2} Taluk` : "",
          district: cleanAdmin2 || cleanArea || "",
          state: cleanState,
          country: r.country || "India",
          postcode: r.postcodes?.[0] || "",
          confidence: "high",
          provider: "open-meteo",
        };
        geocodeCache.set(cacheKey, { data: result, expires: now + 3600 * 1000 });
        return result;
      }
    }
  } catch (_) {}

    // 3. OpenStreetMap Nominatim forward search
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const osmRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query
        )}&format=json&addressdetails=1&limit=1`,
        {
          headers: {
            "User-Agent": "CropGuard-Precision-Agriculture/2.0 (ICAR-Agro)",
            "Accept-Language": "en",
          },
          signal: controller.signal,
        }
      );
    clearTimeout(timeout);
    if (osmRes.ok) {
      const osmData = await osmRes.json();
      if (osmData?.[0]) {
        const o = osmData[0];
        const a = o.address || {};
        const cleanArea = cleanLocationName(a.suburb || a.village || a.neighbourhood || a.town || "");
        const rawTaluk = cleanLocationName(a.county || a.subdistrict || "");
        const cleanDistrict = cleanLocationName(a.state_district || a.district || a.city || "");
        const cleanState = cleanLocationName(a.state || "");

        const result: GeocodeResult = {
          lat: parseFloat(o.lat),
          lng: parseFloat(o.lon),
          formattedAddress: cleanLocationName(o.display_name || query),
          area: cleanArea,
          taluk: rawTaluk ? (rawTaluk.toLowerCase().includes("taluk") ? rawTaluk : `${rawTaluk} Taluk`) : "",
          district: cleanDistrict,
          state: cleanState,
          country: a.country || "India",
          postcode: a.postcode || "",
          confidence: "medium",
          provider: "osm",
        };
        geocodeCache.set(cacheKey, { data: result, expires: now + 3600 * 1000 });
        return result;
      }
    }
  } catch (_) {}

  // 4. Centroid Fallback: Scan our database of 120+ Indian agricultural centers
  for (const [key, centroid] of Object.entries(INDIAN_AGRICULTURAL_CENTROIDS)) {
    if (
      cleanQuery.includes(key) ||
      key.includes(cleanQuery) ||
      cleanQuery.includes(centroid.district.toLowerCase())
    ) {
      const result: GeocodeResult = {
        lat: centroid.lat,
        lng: centroid.lng,
        formattedAddress: `${centroid.district}, ${centroid.state}, India`,
        area: `${centroid.district} Market Center`,
        taluk: centroid.taluk || `${centroid.district} Taluk`,
        district: centroid.district,
        state: centroid.state,
        country: "India",
        postcode: "580001",
        confidence: "medium",
        provider: "regional-centroid",
      };
      geocodeCache.set(cacheKey, { data: result, expires: now + 3600 * 1000 });
      return result;
    }
  }

  // Final fallback: Dharwad North Karnataka Agricultural Belt
  return {
    lat: 15.4589,
    lng: 75.0078,
    formattedAddress: `${query || "Agricultural Field Center"}, Karnataka, India`,
    area: "APMC Market Yard",
    taluk: "Dharwad Taluk",
    district: "Dharwad",
    state: "Karnataka",
    country: "India",
    postcode: "580001",
    confidence: "low",
    provider: "regional-centroid",
  };
}

/**
 * Reverse geocodes exact GPS coordinates to localized village/taluk/district hierarchy.
 * Priority:
 * 1. Google Maps Geocoding API (if GOOGLE_MAPS_API_KEY is configured)
 * 2. BigDataCloud Reverse Geocoding API
 * 3. OpenStreetMap Nominatim
 * 4. Closest agricultural centroid
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult> {
  const cacheKey = `rev_${lat.toFixed(4)}_${lng.toFixed(4)}`;
  const now = Date.now();
  const hit = geocodeCache.get(cacheKey);
  if (hit && hit.expires > now) {
    return hit.data;
  }

  let area = "";
  let taluk = "";
  let district = "";
  let state = "";
  let country = "India";
  let postcode = "";
  let displayName = "";
  let provider = "fallback";

  // 1. Google Maps Reverse Geocoding API
  const googleKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.status === "OK" && json.results && json.results.length > 0) {
          provider = "google";

          let rawAdmin2 = "";
          let rawAdmin3 = "";
          let rawAdmin4 = "";
          let rawLocality = "";
          let rawSublocality = "";

          for (const item of json.results) {
            for (const c of item.address_components || []) {
              const types = c.types || [];
              if (!rawSublocality && (types.includes("sublocality_level_1") || types.includes("sublocality") || types.includes("neighborhood") || types.includes("sublocality_level_2"))) {
                rawSublocality = c.long_name;
              }
              if (!rawLocality && types.includes("locality")) {
                rawLocality = c.long_name;
              }
              if (!rawAdmin4 && types.includes("administrative_area_level_4")) {
                rawAdmin4 = c.long_name;
              }
              if (!rawAdmin3 && (types.includes("administrative_area_level_3") || types.includes("subdistrict"))) {
                rawAdmin3 = c.long_name;
              }
              if (!rawAdmin2 && types.includes("administrative_area_level_2")) {
                rawAdmin2 = c.long_name;
              }
              if (!state && types.includes("administrative_area_level_1")) {
                state = c.long_name;
              }
              if (!country && types.includes("country")) {
                country = c.long_name;
              }
              if (!postcode && types.includes("postal_code")) {
                postcode = c.long_name;
              }
            }
          }

          // In India: if administrative_area_level_2 contains "Division" (e.g. "Mysore Division", "Belgaum Division"):
          // then admin_3 is the actual District, and admin_4 / locality is the Taluk!
          if (rawAdmin2 && /division/i.test(rawAdmin2)) {
            district = rawAdmin3 || cleanLocationName(rawAdmin2);
            taluk = rawAdmin4 || (rawLocality && rawLocality.toLowerCase() !== district.toLowerCase() ? rawLocality : "") || rawAdmin3 || "";
            area = rawSublocality || (rawLocality && rawLocality.toLowerCase() !== taluk.toLowerCase() ? rawLocality : "") || "";
          } else if (rawAdmin2) {
            district = rawAdmin2;
            taluk = rawAdmin3 || rawAdmin4 || rawLocality || "";
            area = rawSublocality || (rawLocality && rawLocality.toLowerCase() !== taluk.toLowerCase() ? rawLocality : "") || "";
          } else {
            district = rawAdmin3 || rawLocality || "";
            taluk = rawAdmin4 || rawLocality || "";
            area = rawSublocality || "";
          }

          // Pick clean political or locality formatted address rather than a personal residential address
          const polResult = json.results.find((r: any) =>
            r.types?.some((t: string) =>
              t === "sublocality" ||
              t === "sublocality_level_1" ||
              t === "locality" ||
              t === "administrative_area_level_3"
            )
          );
          if (polResult?.formatted_address) {
            displayName = cleanLocationName(polResult.formatted_address);
          } else {
            displayName = [area, taluk, district, state].filter(Boolean).join(", ");
          }
        }
      }
    } catch (e: any) {
      console.warn("Notice: Google reverse geocode error:", e?.message);
    }
  }

  // 2. BigDataCloud Free Reverse Geocode Client API
  if (!district && !area) {
    try {
      const bdcRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      if (bdcRes.ok) {
        const bdc = await bdcRes.json();
        area = bdc.locality || bdc.neighbourhood || "";
        taluk = bdc.localityInfo?.administrative?.[3]?.name || bdc.city || "";
        district = bdc.localityInfo?.administrative?.[2]?.name || bdc.principalSubdivision || "";
        state = bdc.principalSubdivision || "";
        country = bdc.countryName || "India";
        postcode = bdc.postcode || "";
        provider = "bigdatacloud";
      }
    } catch (_) {}
  }

  // 3. OpenStreetMap Nominatim
  if (!district && !area) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        {
          headers: {
            "User-Agent": "CropGuard-Precision-Agriculture/2.0 (ICAR-Agro)",
            "Accept-Language": "en",
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (data?.address) {
          const addr = data.address;
          area =
            addr.suburb ||
            addr.village ||
            addr.neighbourhood ||
            addr.town ||
            addr.city_district ||
            addr.hamlet ||
            "";
          taluk = addr.county || addr.subdistrict || (addr.town ? `${addr.town} Taluk` : "") || "";
          district = addr.state_district || addr.district || addr.city || "";
          state = addr.state || "";
          country = addr.country || "India";
          postcode = addr.postcode || "";
          displayName = data.display_name || "";
          provider = "osm";
        }
      }
    } catch (_) {}
  }

  // 4. Fallback to Nearest Centroid Match
  if (!district) {
    const nearest = findNearestAgriculturalCentroid(lat, lng);
    district = nearest.district;
    state = nearest.state;
    taluk = nearest.taluk || `${nearest.district} Taluk`;
    area = `${nearest.district} Agricultural Sector`;
    provider = "centroid-fallback";
  }

  let cleanArea = cleanLocationName(area);
  let rawTaluk = cleanLocationName(taluk);
  let cleanTaluk = rawTaluk ? (rawTaluk.toLowerCase().includes("taluk") ? rawTaluk : `${rawTaluk} Taluk`) : "";
  let cleanDistrict = cleanLocationName(district);
  let cleanState = cleanLocationName(state);

  // Cross-verify with known taluk database (e.g. Alur is strictly Alur Taluk in Hassan District)
  const talukHit =
    lookupKnownTaluk(cleanArea, lat, lng) ||
    lookupKnownTaluk(cleanTaluk, lat, lng) ||
    lookupKnownTaluk(displayName || "", lat, lng) ||
    lookupKnownTaluk("", lat, lng);
  if (talukHit) {
    cleanTaluk = talukHit.taluk;
    cleanDistrict = talukHit.district;
    cleanState = talukHit.state;
  }

  // Construct formatted hierarchical location with exact Area, Taluk, District
  const locParts = [cleanArea, cleanTaluk, cleanDistrict, cleanState].filter(Boolean);
  const formattedLocation =
    locParts.length > 0 ? locParts.join(", ") : `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
  const cleanDisplayName = formattedLocation || cleanLocationName(displayName);

  const result: ReverseGeocodeResult = {
    area: cleanArea,
    taluk: cleanTaluk,
    district: cleanDistrict,
    state: cleanState,
    country,
    postcode,
    displayName: cleanDisplayName,
    formattedLocation,
    provider,
  };

  geocodeCache.set(cacheKey, { data: result, expires: now + 3600 * 1000 });
  return result;
}
