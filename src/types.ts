export type Language =
  | "en"
  | "hi"
  | "pa"
  | "mr"
  | "te"
  | "ta"
  | "bn"
  | "gu"
  | "kn"
  | "ml"
  | "or";

export type AppTheme = "emerald" | "harvest" | "forest" | "earth" | "ocean";

export interface UserProfile {
  id: string;
  name: string;
  phoneOrEmail: string;
  loginType: "phone" | "google" | "email";
  isLoggedIn: boolean;
  location: string;
  language: Language;
  avatar?: string;
  termsAccepted?: boolean;
  primaryCrop?: string;
  landSize?: string;
  state?: string;
  district?: string;
  taluk?: string;
  isVerified?: boolean;
  verifiedMethod?: "otp" | "google" | "supabase" | "phone" | "email";
}

export interface EtlStatus {
  level: "Below ETL" | "Approaching ETL" | "Critical - Exceeded ETL" | string;
  thresholdDescription: string;
  actionRequired?: string;
  actionGuidance?: string;
  isExceeded?: boolean;
}

export interface IpmChemicalItem {
  chemicalName: string;
  dosePerLiter: string;
  dosePerAcre: string;
  phiDays: number;
  targetPestOrStage?: string;
}

export interface IpmFramework {
  culturalMechanical?: string[] | string;
  culturalAndMechanical?: string[] | string;
  biologicalControl?: string[] | string;
  chemicalControl?: IpmChemicalItem[] | string[] | string;
  chemicalIntervention?: string;
}

export interface SprayDosageAdvice {
  recommendedChemical: string;
  standardDosePerLiter: number; // in ml/L or g/L
  unit: "ml" | "g";
  waterVolumeLitersPerAcre: number;
  phiDays: number;
  safetyPrecautions: string[];
}

export interface PestDetails {
  scientificName?: string;
  commonPestName?: string;
  pestStage?: "Egg" | "Larva / Caterpillar" | "Nymph" | "Adult" | "Multiple Stages";
  damageType?: "Chewing / Defoliator" | "Sucking Sap" | "Internal Borer" | "Root Feeder" | "Chlorotic Spotting" | "Healthy";
}

export interface PreventativeFertilizerAdvice {
  exactFertilizer: string;
  npkRatio?: string;
  dosage: string;
  applicationMethod: string;
  timing: string;
  soilEnrichmentBio: string;
  benefits: string;
}

export interface ChemicalToAvoid {
  chemicalName: string;
  category: "Fertilizer" | "Fungicide" | "Insecticide" | "Mixture / Practice";
  reasonToAvoid: string;
  dangerLevel: "Extreme Risk" | "High Hazard" | "Not Recommended";
  safeAlternative: string;
}

export interface DiseaseAnalysisResult {
  id?: string;
  userId?: string;
  isValidCrop?: boolean;
  crop: string;
  scientificCropName?: string;
  diseaseName: string;
  threatType?: "Fungal Disease" | "Bacterial Disease" | "Viral Disease" | "Insect / Pest Infestation" | "Nutrient Deficiency" | "Healthy";
  isHealthy: boolean;
  confidence: number;
  severity: "Healthy" | "Low" | "Medium" | "High";
  infestationStage?: "Early (Scattered)" | "Moderate (Localized)" | "Severe (Field-wide)";
  pestDetails?: PestDetails;
  etlStatus?: EtlStatus;
  ipmFramework?: IpmFramework;
  sprayDosageAdvice?: SprayDosageAdvice;
  preventativeFertilizerDetail?: PreventativeFertilizerAdvice;
  chemicalsToAvoid?: ChemicalToAvoid[];
  reason?: string;
  guidance?: string;
  symptoms: string;
  organicTreatment: string[];
  chemicalTreatment: string[];
  fertilizerAdvice: string;
  preventiveMeasures: string[];
  recommendedProducts: string[];
  urgencyNote: string;
  scannedAt?: string;
  location?: string;
  timestamp?: string;
  imageUrl?: string;
}

export interface CommunityOutbreakAlert {
  id: string;
  crop: string;
  threatName: string;
  threatType: "Pest Infestation" | "Fungal Blight" | "Bacterial Disease" | "Viral Infection";
  severity: "Moderate" | "High" | "Critical";
  locationName: string;
  district?: string;
  state?: string;
  distanceKm: number;
  reportedAgo: string;
  reportedDate: string;
  affectedAcres?: number;
  confirmedFarms: number;
  recommendedAction: string;
  preventiveSpray: string;
  urgencyLevel: "Watch" | "Warning" | "Emergency";
  lat?: number;
  lng?: number;
}

export interface DistrictItem {
  district: string;
  state: string;
  alertCount: number;
  criticalCount: number;
  crops: string[];
}

export interface DistrictIntel {
  district: string;
  state: string;
  agroClimaticZone: string;
  threatLevel: "Critical" | "High" | "Moderate";
  vulnerableCrops: string[];
  primaryThreat: string;
  weatherTrigger: string;
  kvkAdvisoryNote: string;
  recommendedPreventiveAction: string;
  activeOutbreakCount?: number;
  localAlerts?: CommunityOutbreakAlert[];
}

export interface PredictiveRiskItem {
  pathogenOrPest: string;
  crop: string;
  type: "Pest" | "Disease";
  riskScore: number; // 0 - 100
  riskLevel: "Low" | "Moderate" | "High" | "Critical";
  triggerCondition: string;
  favorableWeather: string;
  prophylacticMeasure: string;
  preventiveChemicalOrBio: string;
}

export interface MandiPriceItem {
  id: string;
  crop: string;
  cropLocalName: Record<string, string>;
  category: "Vegetables" | "Grains" | "Spices" | "Commercial" | "Fruits";
  market: string;
  district: string;
  state: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number; // avg price in ₹/quintal
  unit: string;
  changePercent: number;
  trend: "up" | "down" | "stable";
  lastUpdated: string;
  historicalPrices: { day: string; price: number }[];
}

export interface GovtScheme {
  id: string;
  title: string;
  titleLocal: Record<string, string>;
  category:
    | "Direct Benefit Transfer"
    | "Insurance"
    | "Soil & Fertilizer"
    | "Credit & Loan"
    | "Infrastructure"
    | "Machinery & Subsidies"
    | "Solar & Irrigation"
    | "Organic & Natural Farming"
    | "Livestock & Fisheries"
    | "Horticulture & Cold Storage"
    | "Social Security & Pension"
    | "State Schemes"
    | string;
  objective: string;
  benefits: string;
  eligibility: string[];
  documents: string[];
  applyLink: string;
  state: string; // 'All India' or specific state
  helplinePhone: string;
  subsidyPercentage?: string;
  targetBeneficiaries?: string;
}

export interface FertilizerShop {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  address: string;
  landmark?: string;
  area?: string;
  taluk?: string;
  district: string;
  state: string;
  pincode: string;
  distanceKm: number;
  rating: number;
  totalReviews?: number;
  verified: boolean;
  mapQuery: string;
  mapsUri?: string;
  reviewSnippet?: string;
  openingHours?: string;
  inventory: string[];
  servicesOffered?: string[];
  lat?: number;
  lng?: number;
  licenseNumber?: string;
  dealerType?: string;
}

export interface OfflineDiseaseItem {
  id: string;
  crop: string;
  cropNames?: Record<string, string>;
  category?: "Cash & Spices" | "Vegetables" | "Cereals & Grains" | "Fruits & Plantation" | "Pulses & Oilseeds" | string;
  symptoms: string[];
  symptomsLocal?: Record<string, string[]>;
  diseaseName: string;
  diseaseNameLocal?: Record<string, string>;
  scientificName?: string;
  severity: "Low" | "Medium" | "High";
  organicCure: string;
  organicCureLocal?: Record<string, string>;
  chemicalCure: string;
  chemicalCureLocal?: Record<string, string>;
  fertilizer: string;
  fertilizerLocal?: Record<string, string>;
  preventionTips?: string[];
  preventionTipsLocal?: Record<string, string[]>;
}

export interface WeatherHourlyItem {
  time: string;
  temp: number;
  rainProb: number;
  condition: string;
  windSpeed?: number;
}

export interface WeatherForecastItem {
  day: string;
  date?: string;
  temp: number;
  tempMax?: number;
  tempMin?: number;
  condition: string;
  rainProb: number;
  humidity?: number;
  windSpeed?: number;
  farmingAdvice?: string;
}

export interface WeatherInfo {
  locationName?: string;
  temp: number;
  tempC?: number;
  feelsLike: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  windKm?: number;
  rainProbability: number;
  precipChance?: number;
  uvIndex?: number;
  pressureHpa?: number;
  airQuality?: string;
  sprayCondition?: "Optimal" | "Caution" | "Avoid";
  sprayAdvice?: string;
  sprayAdvisory: {
    safeToSpray: boolean;
    reason: string;
    bestTimeWindow: string;
  };
  forecast: WeatherForecastItem[];
  hourly?: WeatherHourlyItem[];
  farmingAdvisory?: {
    irrigationNeeded: boolean;
    irrigationAdvice: string;
    pestRiskLevel: "Low" | "Moderate" | "High";
    pestRiskAdvice: string;
    harvestSuitability: string;
  };
}

