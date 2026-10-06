package com.cropguard.ai.data

data class CropDisease(
    val cropName: String,
    val diseaseName: String,
    val scientificName: String,
    val severity: String,
    val confidence: Int,
    val symptoms: List<String>,
    val organicRemedy: String,
    val chemicalTreatment: String,
    val dosagePer16L: String,
    val preventionTip: String
)

data class AgriStore(
    val id: String,
    val name: String,
    val area: String,
    val taluk: String,
    val district: String,
    val phone: String,
    val lat: Double,
    val lng: Double,
    val rating: Double,
    val licenseNo: String
)

data class MandiCommodity(
    val crop: String,
    val variety: String,
    val market: String,
    val minPrice: Int,
    val maxPrice: Int,
    val modalPrice: Int,
    val trend: String
)

object CropRepository {

    val sampleDiseases = listOf(
        CropDisease(
            cropName = "Coffee (Arabica / Robusta)",
            diseaseName = "Coffee Leaf Rust",
            scientificName = "Hemileia vastatrix",
            severity = "Moderate to Severe",
            confidence = 94,
            symptoms = listOf(
                "Orange-yellow powdery spots on the lower leaf surface",
                "Premature leaf drop causing bare branches",
                "Reduced berry formation and bean filling"
            ),
            organicRemedy = "Spray 0.5% Bordeaux mixture (Copper sulphate + Slaked lime) or Pseudomonas fluorescens @ 5g/L.",
            chemicalTreatment = "Hexaconazole 5% EC @ 2 ml/L or Propiconazole 25% EC @ 1 ml/L during pre-monsoon & post-monsoon.",
            dosagePer16L = "32 ml Hexaconazole in a standard 16-liter knapsack sprayer tank.",
            preventionTip = "Ensure adequate shade regulation (30-40% filtered sunlight) and prune exhausted branches after harvest."
        ),
        CropDisease(
            cropName = "Black Pepper",
            diseaseName = "Quick Wilt / Foot Rot",
            scientificName = "Phytophthora capsici",
            severity = "Critical",
            confidence = 96,
            symptoms = listOf(
                "Dark water-soaked lesions on tender runner shoots",
                "Sudden wilting of whole vine leaves within 2-3 weeks",
                "Root rot and blackening of collar region"
            ),
            organicRemedy = "Trichoderma harzianum enriched neem cake @ 2 kg/vine in collar region before June rains.",
            chemicalTreatment = "Soil drenching with Metalaxyl-Mancozeb (Ridomil MZ) @ 2g/L and spray 1% Bordeaux mixture.",
            dosagePer16L = "32g Metalaxyl-Mancozeb per 16-liter backpack tank.",
            preventionTip = "Provide contour drainage trenches to avoid water stagnation around root zones."
        ),
        CropDisease(
            cropName = "Cardamom",
            diseaseName = "Cardamom Thrips & Capsule Rot",
            scientificName = "Sciothrips cardamomi",
            severity = "Moderate",
            confidence = 91,
            symptoms = listOf(
                "Rough scabby patches on capsules reducing grade",
                "Dropping of young developing capsules",
                "Silvery streaks on vegetative buds and shoots"
            ),
            organicRemedy = "Neem seed kernel extract (NSKE 5%) or Spinosad 45% SC @ 0.3 ml/L.",
            chemicalTreatment = "Quinalphos 25% EC @ 2 ml/L or Fipronil 5% SC @ 1.5 ml/L.",
            dosagePer16L = "24 ml Fipronil per 16-liter tank.",
            preventionTip = "Remove and destroy damaged panicles during weed slashing."
        ),
        CropDisease(
            cropName = "Tomato",
            diseaseName = "Early & Late Blight",
            scientificName = "Phytophthora infestans",
            severity = "High",
            confidence = 97,
            symptoms = listOf(
                "Irregular dark brown patches on leaf tips and margins",
                "White fungal downy growth on leaf undersides in cool moist mornings",
                "Brown sunken lesions on developing fruit"
            ),
            organicRemedy = "Spray Copper Oxychloride 50% WP @ 3g/L or Bacillus subtilis @ 5ml/L.",
            chemicalTreatment = "Cymoxanil 8% + Mancozeb 64% WP (Curzate) @ 2g/L or Dimethomorph @ 1.5g/L.",
            dosagePer16L = "32g Cymoxanil-Mancozeb per 16-liter tank.",
            preventionTip = "Avoid sprinkler overhead watering; ensure wide spacing for airflow."
        ),
        CropDisease(
            cropName = "Paddy / Rice",
            diseaseName = "Paddy Blast",
            scientificName = "Magnaporthe oryzae",
            severity = "High",
            confidence = 95,
            symptoms = listOf(
                "Spindle-shaped lesions with gray-white centers and brownish borders",
                "Neck blast causing empty, broken panicles (rotten neck)",
                "Rapid yellowing and drying of leaves"
            ),
            organicRemedy = "Pseudomonas fluorescens seed treatment @ 10g/kg and foliar spray @ 5g/L.",
            chemicalTreatment = "Tricyclazole 75% WP @ 0.6g/L or Kasugamycin 3% SL @ 2.5 ml/L.",
            dosagePer16L = "10g Tricyclazole 75% WP per 16-liter knapsack sprayer.",
            preventionTip = "Avoid excessive split nitrogen fertilizers during overcast humid weather."
        )
    )

    // Verified Licensed Agricultural Input Stores in Alur Taluk & Hassan District
    val licensedAgriStores = listOf(
        AgriStore(
            id = "alur-1",
            name = "Alur Raitha Seva Sahakara Sangha (TAPCMS)",
            area = "APMC Market Yard, Alur Town",
            taluk = "Alur Taluk",
            district = "Hassan",
            phone = "+91 8170 218234",
            lat = 12.9892,
            lng = 75.9867,
            rating = 4.8,
            licenseNo = "KA-HSN-ALUR-AGRI-0012"
        ),
        AgriStore(
            id = "alur-2",
            name = "Kisan Agro Supplies & Fertilizers",
            area = "BM Highway Road, Near Bus Stand",
            taluk = "Alur Taluk",
            district = "Hassan",
            phone = "+91 94481 45210",
            lat = 12.9915,
            lng = 75.9840,
            rating = 4.7,
            licenseNo = "KA-HSN-ALUR-RET-0489"
        ),
        AgriStore(
            id = "alur-3",
            name = "Sri Manjunatha Agro Agencies",
            area = "Magge Main Road, Palya Cross",
            taluk = "Alur Taluk",
            district = "Hassan",
            phone = "+91 98452 77120",
            lat = 12.9780,
            lng = 75.9920,
            rating = 4.6,
            licenseNo = "KA-HSN-ALUR-RET-0511"
        ),
        AgriStore(
            id = "alur-4",
            name = "Annapoorneshwari Krishi Seva Kendra",
            area = "K.Hoskote Junction",
            taluk = "Alur Taluk",
            district = "Hassan",
            phone = "+91 97410 88231",
            lat = 12.9650,
            lng = 75.9610,
            rating = 4.7,
            licenseNo = "KA-HSN-ALUR-RET-0622"
        ),
        AgriStore(
            id = "hsn-1",
            name = "Hassan District Cooperative Agri Union",
            area = "APMC Yard, Ring Road",
            taluk = "Hassan Taluk",
            district = "Hassan",
            phone = "+91 8172 268451",
            lat = 13.0072,
            lng = 76.1030,
            rating = 4.9,
            licenseNo = "KA-HSN-CENTRAL-0001"
        )
    )

    val mandiRates = listOf(
        MandiCommodity("Coffee Arabica Parchment", "Grade A", "Hassan / Sakleshpur", 18500, 19200, 18900, "+2.4%"),
        MandiCommodity("Coffee Robusta Cherry", "Cleaned", "Alur / Belur APMC", 9400, 9900, 9650, "+1.8%"),
        MandiCommodity("Black Pepper", "Malabar Garbled", "Sakleshpur APMC", 62000, 65500, 64000, "+3.1%"),
        MandiCommodity("Green Cardamom", "7-8mm Bold", "Hassan Market", 240000, 275000, 260000, "-0.5%"),
        MandiCommodity("Maize (Corn)", "Yellow Hybrid", "Hassan APMC Yard", 2150, 2350, 2280, "+0.8%"),
        MandiCommodity("Ragi (Finger Millet)", "Brown Raw", "Alur / Hassan APMC", 3400, 3750, 3600, "+1.2%"),
        MandiCommodity("Fresh Ginger", "Green Washed", "Hassan Wholesale", 5500, 6800, 6200, "+4.5%")
    )
}
