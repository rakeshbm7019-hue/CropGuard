package com.cropguard.ai.data.remote

import android.graphics.Bitmap
import android.util.Base64
import com.cropguard.ai.BuildConfig
import com.cropguard.ai.data.catalog.AgriDataCatalog
import com.cropguard.ai.model.AppLanguage
import com.cropguard.ai.model.DiseaseAnalysisResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonObject
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import retrofit2.http.Body
import retrofit2.http.POST
import retrofit2.http.Query
import java.io.ByteArrayOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

@Serializable
data class GenerateContentRequest(
    val contents: List<Content>,
    val generationConfig: GenerationConfig? = null,
    val systemInstruction: Content? = null
)

@Serializable
data class Content(
    val parts: List<Part>,
    val role: String? = null
)

@Serializable
data class Part(
    val text: String? = null,
    val inlineData: InlineData? = null
)

@Serializable
data class InlineData(
    val mimeType: String,
    val data: String
)

@Serializable
data class GenerationConfig(
    val responseMimeType: String? = null,
    val responseSchema: JsonObject? = null,
    val temperature: Float? = null
)

@Serializable
data class GenerateContentResponse(
    val candidates: List<Candidate> = emptyList()
)

@Serializable
data class Candidate(
    val content: Content? = null
)

interface GeminiApiService {
    @POST("v1beta/models/gemini-3.5-flash:generateContent")
    suspend fun generateContent(
        @Query("key") apiKey: String,
        @Body request: GenerateContentRequest
    ): GenerateContentResponse
}

object GeminiService {
    private const val BASE_URL = "https://generativelanguage.googleapis.com/"

    private val jsonParser = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(60, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .build()

    private val apiService: GeminiApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(jsonParser.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(GeminiApiService::class.java)
    }

    private fun isApiKeyConfigured(): Boolean {
        val key = BuildConfig.GEMINI_API_KEY
        return key.isNotBlank() && key != "YOUR_GEMINI_API_KEY" && !key.startsWith("YOUR_")
    }

    private fun Bitmap.toBase64Jpeg(): String {
        val outputStream = ByteArrayOutputStream()
        compress(Bitmap.CompressFormat.JPEG, 82, outputStream)
        return Base64.encodeToString(outputStream.toByteArray(), Base64.NO_WRAP)
    }

    suspend fun analyzeCropLeaf(
        bitmap: Bitmap?,
        cropHint: String,
        language: AppLanguage,
        farmerLocation: String
    ): DiseaseAnalysisResult = withContext(Dispatchers.IO) {
        if (!isApiKeyConfigured()) {
            return@withContext AgriDataCatalog.matchOfflineDisease(cropHint, language, farmerLocation)
        }

        try {
            val langInstruction = "Provide all text fields in ${language.englishName} (${language.nativeName})."
            val prompt = buildString {
                append("You are an expert ICAR plant pathologist and agricultural scientist. ")
                append("Analyze this crop leaf image. Crop hint: '$cropHint'. Farmer location: '$farmerLocation'. ")
                append("$langInstruction ")
                append("Return a JSON object with: crop, scientificCropName, diseaseName, threatType, isHealthy (boolean), ")
                append("confidence (int 85-99), severity ('Healthy', 'Low', 'Medium', or 'High'), infestationStage, ")
                append("etlLevel, etlDescription, symptoms (array of 3 strings), organicTreatment (array of 2 strings), ")
                append("biologicalControl (array of 2 strings), chemicalTreatment (array of 2 strings with exact ml/L or g/L dosage), ")
                append("recommendedChemicalName (string), dosagePerLiter (number), dosageUnit ('ml' or 'g'), phiDays (int), ")
                append("fertilizerAdvice (string), preventiveMeasures (array of 3 strings), chemicalsToAvoid (array of 2 strings), urgencyNote (string).")
            }

            val partsList = mutableListOf<Part>()
            partsList.add(Part(text = prompt))
            if (bitmap != null) {
                partsList.add(
                    Part(
                        inlineData = InlineData(
                            mimeType = "image/jpeg",
                            data = bitmap.toBase64Jpeg()
                        )
                    )
                )
            }

            val request = GenerateContentRequest(
                contents = listOf(Content(parts = partsList)),
                generationConfig = GenerationConfig(
                    responseMimeType = "application/json",
                    temperature = 0.2f
                )
            )

            val response = apiService.generateContent(BuildConfig.GEMINI_API_KEY, request)
            val rawJson = response.candidates.firstOrNull()?.content?.parts?.firstOrNull()?.text
                ?: return@withContext AgriDataCatalog.matchOfflineDisease(cropHint, language, farmerLocation)

            val root = jsonParser.parseToJsonElement(rawJson).jsonObject
            val nowStr = SimpleDateFormat("dd MMM yyyy, hh:mm a", Locale.getDefault()).format(Date())

            fun parseStringList(key: String): List<String> {
                val el = root[key] ?: return emptyList()
                return try {
                    el.jsonArray.mapNotNull { it.jsonPrimitive.content.takeIf { s -> s.isNotBlank() } }
                } catch (_: Exception) {
                    listOfNotNull(el.jsonPrimitive.content.takeIf { it.isNotBlank() })
                }
            }

            DiseaseAnalysisResult(
                id = "scan_${System.currentTimeMillis()}",
                crop = root["crop"]?.jsonPrimitive?.content ?: cropHint.ifBlank { "Crop" },
                scientificCropName = root["scientificCropName"]?.jsonPrimitive?.content ?: "",
                diseaseName = root["diseaseName"]?.jsonPrimitive?.content ?: "Foliar Blight",
                threatType = root["threatType"]?.jsonPrimitive?.content ?: "Fungal Disease",
                isHealthy = root["isHealthy"]?.jsonPrimitive?.booleanOrNull ?: false,
                confidence = root["confidence"]?.jsonPrimitive?.intOrNull ?: 95,
                severity = root["severity"]?.jsonPrimitive?.content ?: "High",
                infestationStage = root["infestationStage"]?.jsonPrimitive?.content ?: "Moderate (Localized)",
                etlLevel = root["etlLevel"]?.jsonPrimitive?.content ?: "Approaching ETL",
                etlDescription = root["etlDescription"]?.jsonPrimitive?.content
                    ?: "Immediate ICAR IPM intervention recommended.",
                symptoms = parseStringList("symptoms").ifEmpty {
                    listOf("Foliar lesions and chlorotic halos observed on leaf lamina")
                },
                organicTreatment = parseStringList("organicTreatment").ifEmpty {
                    listOf("Spray Trichoderma viride @ 5g/L or Neem Oil 10,000 PPM @ 3ml/L water")
                },
                biologicalControl = parseStringList("biologicalControl").ifEmpty {
                    listOf("Pseudomonas fluorescens foliar application @ 5g/L water")
                },
                chemicalTreatment = parseStringList("chemicalTreatment").ifEmpty {
                    listOf("Spray Mancozeb 75% WP @ 2.5g/L or Azoxystrobin @ 1ml/L water")
                },
                recommendedChemicalName = root["recommendedChemicalName"]?.jsonPrimitive?.content
                    ?: "Mancozeb 75% WP",
                dosagePerLiter = root["dosagePerLiter"]?.jsonPrimitive?.doubleOrNull ?: 2.5,
                dosageUnit = root["dosageUnit"]?.jsonPrimitive?.content ?: "g",
                phiDays = root["phiDays"]?.jsonPrimitive?.intOrNull ?: 7,
                fertilizerAdvice = root["fertilizerAdvice"]?.jsonPrimitive?.content
                    ?: "Apply balanced NPK 19:19:19 foliar feed + Potash (MOP) to boost disease resistance; avoid excess Urea.",
                preventiveMeasures = parseStringList("preventiveMeasures").ifEmpty {
                    listOf("Prune infected lower leaves", "Ensure proper field drainage", "Avoid overhead evening irrigation")
                },
                chemicalsToAvoid = parseStringList("chemicalsToAvoid").ifEmpty {
                    listOf("Avoid high-nitrogen Urea top-dressing during active blight", "Do not mix alkaline Bordeaux with systemic insecticides")
                },
                urgencyNote = root["urgencyNote"]?.jsonPrimitive?.content
                    ?: "Spray during calm morning hours before 10:00 AM.",
                scannedAt = nowStr,
                location = farmerLocation
            )
        } catch (e: Exception) {
            AgriDataCatalog.matchOfflineDisease(cropHint, language, farmerLocation)
        }
    }

    suspend fun askKisanMitra(
        question: String,
        bitmap: Bitmap?,
        language: AppLanguage,
        farmerName: String,
        farmerDistrict: String
    ): String = withContext(Dispatchers.IO) {
        if (!isApiKeyConfigured()) {
            return@withContext AgriDataCatalog.generateOfflineAiAnswer(question, language, farmerName, farmerDistrict)
        }

        try {
            val systemPrompt = buildString {
                append("You are Kisan Mitra AI (किसान मित्र), an ICAR-aligned digital agronomist inside CropGuard. ")
                append("The farmer's name is $farmerName from $farmerDistrict. ")
                append("Respond clearly, warmly, and practically in ${language.englishName} (${language.nativeName}). ")
                append("Always include: 1) Direct Diagnosis/Answer, 2) Organic Remedy, 3) Exact Chemical Spray Dosage per Liter & 16L Knapsack Tank, and 4) Safety/PHI tips.")
            }

            val parts = mutableListOf<Part>(Part(text = question))
            if (bitmap != null) {
                parts.add(Part(inlineData = InlineData("image/jpeg", bitmap.toBase64Jpeg())))
            }

            val request = GenerateContentRequest(
                contents = listOf(Content(parts = parts)),
                systemInstruction = Content(parts = listOf(Part(text = systemPrompt))),
                generationConfig = GenerationConfig(temperature = 0.4f)
            )

            val response = apiService.generateContent(BuildConfig.GEMINI_API_KEY, request)
            response.candidates.firstOrNull()?.content?.parts?.firstOrNull()?.text
                ?: AgriDataCatalog.generateOfflineAiAnswer(question, language, farmerName, farmerDistrict)
        } catch (e: Exception) {
            AgriDataCatalog.generateOfflineAiAnswer(question, language, farmerName, farmerDistrict)
        }
    }

    suspend fun analyzeMandiTrend(
        crop: String,
        market: String,
        modalPrice: Int,
        trend: String,
        language: AppLanguage
    ): String = withContext(Dispatchers.IO) {
        if (!isApiKeyConfigured()) {
            return@withContext "📊 ICAR & e-NAM Market Outlook for $crop at $market:\n" +
                "• Current Modal Rate: ₹$modalPrice / Quintal (Trend: ${trend.uppercase()})\n" +
                "• Selling Strategy: Arrivals are steady across regional APMC yards. Grade-A moisture-free produce commands a 8–12% premium.\n" +
                "• Storage Tip: If holding stock for 2–3 weeks, ensure moisture is below 11% in ventilated crates and monitor daily e-NAM bids."
        }

        try {
            val prompt = "Provide a concise 4-bullet agricultural market advisory in ${language.englishName} (${language.nativeName}) " +
                "for a farmer selling $crop at $market where current modal price is ₹$modalPrice/Quintal (trend: $trend). " +
                "Include short-term price outlook, grading tip for maximum price, and hold-vs-sell recommendation."
            val request = GenerateContentRequest(
                contents = listOf(Content(parts = listOf(Part(text = prompt)))),
                generationConfig = GenerationConfig(temperature = 0.3f)
            )
            val response = apiService.generateContent(BuildConfig.GEMINI_API_KEY, request)
            response.candidates.firstOrNull()?.content?.parts?.firstOrNull()?.text
                ?: "Modal rate ₹$modalPrice/qtl at $market shows a $trend trend. Grade produce cleanly before APMC auction."
        } catch (_: Exception) {
            "📊 APMC Market Advisory ($market): Current modal rate is ₹$modalPrice/Quintal ($trend). Sort Grade-A produce for top auction price."
        }
    }
}
