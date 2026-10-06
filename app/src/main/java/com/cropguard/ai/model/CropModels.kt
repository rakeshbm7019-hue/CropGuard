package com.cropguard.ai.model

import kotlinx.serialization.Serializable

enum class AppLanguage(
    val code: String,
    val englishName: String,
    val nativeName: String,
    val flag: String,
    val localeTag: String
) {
    EN("en", "English", "English", "🇬🇧", "en-IN"),
    HI("hi", "Hindi", "हिंदी", "🇮🇳", "hi-IN"),
    KN("kn", "Kannada", "ಕನ್ನಡ", "🇮🇳", "kn-IN"),
    TE("te", "Telugu", "తెలుగు", "🇮🇳", "te-IN"),
    TA("ta", "Tamil", "தமிழ்", "🇮🇳", "ta-IN"),
    MR("mr", "Marathi", "मराठी", "🇮🇳", "mr-IN"),
    PA("pa", "Punjabi", "ਪੰਜਾਬੀ", "🇮🇳", "pa-IN"),
    BN("bn", "Bengali", "বাংলা", "🇮🇳", "bn-IN"),
    GU("gu", "Gujarati", "ગુજરાતી", "🇮🇳", "gu-IN"),
    ML("ml", "Malayalam", "മലയാളം", "🇮🇳", "ml-IN"),
    OR("or", "Odia", "ଓଡ଼ିଆ", "🇮🇳", "or-IN");

    companion object {
        fun fromCode(code: String): AppLanguage =
            entries.find { it.code.equals(code, ignoreCase = true) } ?: EN
    }
}

data class LocalizedUiStrings(
    val appSubtitle: String,
    val tabScan: String,
    val tabRadar: String,
    val tabDosage: String,
    val tabMarkets: String,
    val tabAdvisor: String,
    val scanTitle: String,
    val scanSubtitle: String,
    val takePhoto: String,
    val pickGallery: String,
    val sampleLeavesTitle: String,
    val analyzingText: String,
    val organicCureLabel: String,
    val chemicalControlLabel: String,
    val fertilizerLabel: String,
    val voiceReadoutLabel: String,
    val stopVoiceLabel: String,
    val outbreakRadarTitle: String,
    val reportOutbreakBtn: String,
    val sprayCalculatorTitle: String,
    val mandiTitle: String,
    val weatherTitle: String,
    val soilAdvisorTitle: String,
    val kisanAiTitle: String,
    val shopsTitle: String,
    val schemesTitle: String,
    val offlineHandbookTitle: String,
    val scanHistoryTitle: String
)

fun getLocalizedStrings(lang: AppLanguage): LocalizedUiStrings = when (lang) {
    AppLanguage.HI -> LocalizedUiStrings(
        appSubtitle = "स्मार्ट फसल स्वास्थ्य और किसान सहायक",
        tabScan = "स्कैन",
        tabRadar = "रडार",
        tabDosage = "स्प्रे मात्रा",
        tabMarkets = "मंडी व मौसम",
        tabAdvisor = "किसान केंद्र",
        scanTitle = "AI फसल रोग पहचान (ICAR IPM)",
        scanSubtitle = "तुरंत निदान और उपचार के लिए प्रभावित पत्ती का फोटो लें या चुनें",
        takePhoto = "कैमरा से फोटो लें",
        pickGallery = "गैलरी से चुनें",
        sampleLeavesTitle = "त्वरित परीक्षण नमूने (ऑफ़लाइन एवं लाइव):",
        analyzingText = "AI पत्ती के ऊतकों का विश्लेषण कर रहा है...",
        organicCureLabel = "🌱 ICAR जैविक उपचार (Organic Bio-Cure)",
        chemicalControlLabel = "🧪 रासायनिक छिड़काव व खुराक (Chemical Control)",
        fertilizerLabel = "🌾 उर्वरक व NPK पोषण सलाह",
        voiceReadoutLabel = "🔊 किसान वॉइस एजेंट (सुनें)",
        stopVoiceLabel = "⏹️ आवाज़ बंद करें",
        outbreakRadarTitle = "सामुदायिक कीट एवं रोग प्रकोप रडार",
        reportOutbreakBtn = "प्रकोप रिपोर्ट करें",
        sprayCalculatorTitle = "कीटनाशक एवं स्प्रेयर टैंक खुराक कैलकुलेटर",
        mandiTitle = "लाइव APMC मंडी भाव",
        weatherTitle = "कृषि मौसम और छिड़काव समय",
        soilAdvisorTitle = "मृदा एवं उपयुक्त फसल सलाहकार",
        kisanAiTitle = "किसान मित्र AI सहायक",
        shopsTitle = "प्रमाणित खाद एवं बीज दुकानें",
        schemesTitle = "सरकारी कृषि योजनाएं व सब्सिडी",
        offlineHandbookTitle = "ऑफ़लाइन फसल रोग पुस्तिका",
        scanHistoryTitle = "सहेजा गया जांच इतिहास"
    )
    AppLanguage.KN -> LocalizedUiStrings(
        appSubtitle = "ಸ್ಮಾರ್ಟ್ ಬೆಳೆ ಆರೋಗ್ಯ ಮತ್ತು ರೈತ ಸಹಾಯಕ",
        tabScan = "ಸ್ಕ್ಯಾನ್",
        tabRadar = "ರಾಡಾರ್",
        tabDosage = "ಸಿಂಪರಣೆ",
        tabMarkets = "ಮಾರುಕಟ್ಟೆ",
        tabAdvisor = "ಸಲಹೆಗಾರ",
        scanTitle = "AI ಬೆಳೆ ರೋಗ ಪತ್ತೆ (ICAR IPM)",
        scanSubtitle = "ತಕ್ಷಣದ ರೋಗನಿರ್ಣಯಕ್ಕಾಗಿ ಬಾಧಿತ ಎಲೆಯ ಫೋಟೋ ತೆಗೆಯಿರಿ ಅಥವಾ ಆಯ್ಕೆಮಾಡಿ",
        takePhoto = "ಕ್ಯಾಮೆರಾ ಫೋಟೋ",
        pickGallery = "ಗ್ಯಾಲರಿಯಿಂದ ಆರಿಸಿ",
        sampleLeavesTitle = "ತ್ವರಿತ ಪರೀಕ್ಷಾ ಮಾದರಿಗಳು:",
        analyzingText = "AI ಎಲೆಯ ರೋಗ ಲಕ್ಷಣಗಳನ್ನು ವಿಶ್ಲೇಷಿಸುತ್ತಿದೆ...",
        organicCureLabel = "🌱 ಸಾವಯವ ಜೈವಿಕ ಚಿಕಿತ್ಸೆ (Organic Bio-Cure)",
        chemicalControlLabel = "🧪 ರಾಸಾಯನಿಕ ಸಿಂಪರಣೆ ಮತ್ತು ಪ್ರಮಾಣ",
        fertilizerLabel = "🌾 ಗೊಬ್ಬರ ಮತ್ತು NPK ಪೋಷಕಾಂಶ ಸಲಹೆ",
        voiceReadoutLabel = "🔊 ಕಿಸಾನ್ ಧ್ವನಿ ಏಜೆಂಟ್ (ಕೇಳಿ)",
        stopVoiceLabel = "⏹️ ಧ್ವನಿ ನಿಲ್ಲಿಸಿ",
        outbreakRadarTitle = "ಸಮುದಾಯ ರೋಗ ಮತ್ತು ಕೀಟ ಪ್ರಸರಣ ರಾಡಾರ್",
        reportOutbreakBtn = "ರೋಗ ವರದಿ ಮಾಡಿ",
        sprayCalculatorTitle = "ಕೀಟನಾಶಕ ಟ್ಯಾಂಕ್ ಪ್ರಮಾಣ ಕ್ಯಾಲ್ಕುಲೇಟರ್",
        mandiTitle = "ಲೈವ್ APMC ಮಾರುಕಟ್ಟೆ ಧಾರಣೆ",
        weatherTitle = "ಕೃಷಿ ಹವಾಮಾನ ಮತ್ತು ಸಿಂಪರಣೆ ಸಮಯ",
        soilAdvisorTitle = "ಮಣ್ಣು ಮತ್ತು ಬೆಳೆ ಹೊಂದಾಣಿಕೆ ಸಲಹೆಗಾರ",
        kisanAiTitle = "ಕಿಸಾನ್ ಮಿತ್ರ AI ಸಹಾಯಕ",
        shopsTitle = "ಅಧಿಕೃತ ಗೊಬ್ಬರ ಮತ್ತು ಬೀಜ ಕೇಂದ್ರಗಳು",
        schemesTitle = "ಸರ್ಕಾರಿ ಕೃಷಿ ಯೋಜನೆಗಳು ಮತ್ತು ಸಬ್ಸಿಡಿ",
        offlineHandbookTitle = "ಆಫ್‌ಲೈನ್ ಬೆಳೆ ರೋಗ ಕೈಪಿಡಿ",
        scanHistoryTitle = "ಉಳಿಸಿದ ಸ್ಕ್ಯಾನ್ ಇತಿಹಾಸ"
    )
    else -> LocalizedUiStrings(
        appSubtitle = "Precision Crop Pathology & Farmer Advisory",
        tabScan = "Scan",
        tabRadar = "Radar",
        tabDosage = "Dosage",
        tabMarkets = "Markets",
        tabAdvisor = "Advisor",
        scanTitle = "AI Crop Disease Detector",
        scanSubtitle = "Capture or select a leaf photo for instant ICAR 3-Tier IPM diagnosis",
        takePhoto = "Take Camera Photo",
        pickGallery = "Pick Leaf Photo",
        sampleLeavesTitle = "Try Regional Crop Samples (Instant Test):",
        analyzingText = "AI is analyzing plant tissue & pathology...",
        organicCureLabel = "🌱 ICAR Organic Bio-Cure",
        chemicalControlLabel = "🧪 Chemical Spray & PHI Control",
        fertilizerLabel = "🌾 Fertilizer & NPK Recovery Advice",
        voiceReadoutLabel = "🔊 Voice Agent (Read Solution)",
        stopVoiceLabel = "⏹️ Stop Voice Agent",
        outbreakRadarTitle = "Community Pest & Outbreak Radar",
        reportOutbreakBtn = "Report Outbreak",
        sprayCalculatorTitle = "Sprayer Tank Dilution Calculator",
        mandiTitle = "Live APMC Mandi Rates",
        weatherTitle = "Agri Weather & Spray Window",
        soilAdvisorTitle = "Soil & Crop Match Advisor",
        kisanAiTitle = "Kisan Mitra AI Assistant",
        shopsTitle = "Licensed Fertilizer & Seed Stores",
        schemesTitle = "Govt Schemes & Eligibility",
        offlineHandbookTitle = "Offline Disease & Crop Manual",
        scanHistoryTitle = "Saved Leaf Scan History"
    )
}

@Serializable
data class FarmerProfile(
    val id: String = "usr_default",
    val name: String = "Kisan Farmer",
    val phoneOrEmail: String = "+91 98450 12345",
    val village: String = "Alur",
    val taluk: String = "Alur Taluk",
    val district: String = "Hassan",
    val state: String = "Karnataka",
    val primaryCrop: String = "Coffee & Ginger",
    val landSizeAcres: String = "3.5 Acres",
    val isLoggedIn: Boolean = true,
    val isVerified: Boolean = true
)

@Serializable
data class DiseaseAnalysisResult(
    val id: String,
    val crop: String,
    val scientificCropName: String = "",
    val diseaseName: String,
    val threatType: String = "Fungal Disease",
    val isHealthy: Boolean = false,
    val confidence: Int = 95,
    val severity: String = "High", // Healthy, Low, Medium, High
    val infestationStage: String = "Moderate (Localized)",
    val etlLevel: String = "Approaching ETL",
    val etlDescription: String = "10-15% foliage affected; immediate prophylactic spray advised.",
    val symptoms: List<String> = emptyList(),
    val organicTreatment: List<String> = emptyList(),
    val biologicalControl: List<String> = emptyList(),
    val chemicalTreatment: List<String> = emptyList(),
    val recommendedChemicalName: String = "Mancozeb 75% WP",
    val dosagePerLiter: Double = 2.5,
    val dosageUnit: String = "g",
    val phiDays: Int = 7,
    val fertilizerAdvice: String = "",
    val preventiveMeasures: List<String> = emptyList(),
    val chemicalsToAvoid: List<String> = emptyList(),
    val urgencyNote: String = "",
    val scannedAt: String = "",
    val location: String = "Hassan, Karnataka"
)

data class OfflineDiseaseItem(
    val id: String,
    val crop: String,
    val cropNames: Map<String, String>,
    val category: String,
    val scientificName: String,
    val diseaseName: String,
    val diseaseNameLocal: Map<String, String>,
    val severity: String,
    val symptoms: List<String>,
    val symptomsLocal: Map<String, List<String>> = emptyMap(),
    val organicCure: String,
    val organicCureLocal: Map<String, String> = emptyMap(),
    val chemicalCure: String,
    val chemicalCureLocal: Map<String, String> = emptyMap(),
    val recommendedChemical: String = "Mancozeb 75% WP",
    val dosePerLiter: Double = 2.5,
    val doseUnit: String = "g",
    val phiDays: Int = 7,
    val fertilizer: String,
    val fertilizerLocal: Map<String, String> = emptyMap(),
    val preventionTips: List<String> = emptyList()
)

data class CommunityOutbreakAlert(
    val id: String,
    val crop: String,
    val threatName: String,
    val threatType: String,
    val severity: String, // Moderate, High, Critical
    val locationName: String,
    val district: String,
    val state: String,
    val distanceKm: Double,
    val reportedAgo: String,
    val affectedAcres: Int,
    val confirmedFarms: Int,
    val recommendedAction: String,
    val preventiveSpray: String,
    val urgencyLevel: String // Watch, Warning, Emergency
)

data class DistrictIntel(
    val district: String,
    val state: String,
    val agroClimaticZone: String,
    val threatLevel: String,
    val vulnerableCrops: List<String>,
    val primaryThreat: String,
    val weatherTrigger: String,
    val kvkAdvisoryNote: String,
    val recommendedPreventiveAction: String
)

data class PredictiveRiskItem(
    val pathogenOrPest: String,
    val crop: String,
    val type: String, // Pest or Disease
    val riskScore: Int, // 0 - 100
    val riskLevel: String, // Low, Moderate, High, Critical
    val triggerCondition: String,
    val prophylacticMeasure: String,
    val preventiveChemicalOrBio: String
)

data class HistoricalPricePoint(
    val day: String,
    val price: Int
)

data class MandiPriceItem(
    val id: String,
    val crop: String,
    val cropLocalName: Map<String, String>,
    val category: String,
    val market: String,
    val district: String,
    val state: String,
    val minPrice: Int,
    val maxPrice: Int,
    val modalPrice: Int,
    val unit: String = "Quintal (100 kg)",
    val changePercent: Double,
    val trend: String, // up, down, stable
    val lastUpdated: String,
    val historicalPrices: List<HistoricalPricePoint>
)

data class WeatherForecastItem(
    val day: String,
    val tempMax: Int,
    val tempMin: Int,
    val condition: String,
    val rainProb: Int,
    val windSpeed: Int,
    val farmingAdvice: String
)

data class WeatherInfo(
    val locationName: String,
    val temp: Int,
    val feelsLike: Int,
    val condition: String,
    val humidity: Int,
    val windSpeed: Int,
    val rainProbability: Int,
    val uvIndex: Int,
    val sprayCondition: String, // Optimal, Caution, Avoid
    val safeToSpray: Boolean,
    val sprayReason: String,
    val bestTimeWindow: String,
    val irrigationAdvice: String,
    val pestRiskLevel: String,
    val pestRiskAdvice: String,
    val forecast: List<WeatherForecastItem>
)

data class CropSuitabilityItem(
    val cropName: String,
    val localCropName: Map<String, String>,
    val icon: String,
    val category: String,
    val suitabilityScore: Int,
    val suitabilityLevel: String,
    val season: String,
    val waterNeed: String,
    val expectedYield: String,
    val durationDays: String,
    val whyItGrowsWell: String,
    val fieldPreparationTip: String,
    val recommendedFertilizer: String
)

data class SoilTypeInfo(
    val id: String,
    val name: String,
    val localName: Map<String, String>,
    val colorHex: Long,
    val texture: String,
    val drainage: String,
    val waterRetention: String,
    val phOptimal: String,
    val regions: List<String>,
    val characteristics: List<String>,
    val nitrogenStatus: String,
    val phosphorusStatus: String,
    val potassiumStatus: String,
    val micronutrients: String,
    val organicAmendments: List<String>,
    val reclamationTips: List<String>,
    val bestCrops: List<CropSuitabilityItem>
)

data class FertilizerShop(
    val id: String,
    val name: String,
    val ownerName: String,
    val phone: String,
    val address: String,
    val area: String,
    val taluk: String,
    val district: String,
    val state: String,
    val pincode: String,
    val lat: Double,
    val lng: Double,
    val distanceKm: Double,
    val rating: Double,
    val totalReviews: Int,
    val verified: Boolean = true,
    val licenseNumber: String,
    val openingHours: String,
    val inventory: List<String>,
    val servicesOffered: List<String>
)

data class GovtScheme(
    val id: String,
    val title: String,
    val titleLocal: Map<String, String>,
    val category: String,
    val objective: String,
    val benefits: String,
    val eligibility: List<String>,
    val documents: List<String>,
    val applyLink: String,
    val state: String,
    val helplinePhone: String,
    val subsidyPercentage: String,
    val targetBeneficiaries: String
)

data class ChatMessage(
    val id: String,
    val isUser: Boolean,
    val content: String,
    val timestamp: String,
    val modelName: String = "Kisan Mitra AI",
    val hasImageAttachment: Boolean = false
)
