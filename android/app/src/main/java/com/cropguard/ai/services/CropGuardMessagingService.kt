package com.cropguard.ai.services

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.cropguard.ai.MainActivity
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

class CropGuardMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "CropGuardFCM"
        const val CHANNEL_WEATHER = "cropguard_weather_alerts"
        const val CHANNEL_MANDI = "cropguard_mandi_spikes"
        const val CHANNEL_OUTBREAK = "cropguard_disease_outbreaks"
        const val PREF_FCM_TOKEN = "cropguard_fcm_token"
        const val PREFS_NAME = "cropguard_prefs"

        fun createNotificationChannels(context: Context) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val notificationManager = context.getSystemService(NotificationManager::class.java)

                // 1. Weather & Spray Alerts Channel
                val weatherChannel = NotificationChannel(
                    CHANNEL_WEATHER,
                    "Weather & Spray Alerts",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Critical rain warnings, spraying window forecasts, and humidity alerts for your district"
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 300, 200, 300)
                }

                // 2. Mandi APMC Price Alerts Channel
                val mandiChannel = NotificationChannel(
                    CHANNEL_MANDI,
                    "Mandi APMC Price Spikes",
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "Real-time crop price spikes and market surges in Hassan & Alur APMC"
                    enableVibration(true)
                }

                // 3. Disease Outbreak Radar Channel
                val outbreakChannel = NotificationChannel(
                    CHANNEL_OUTBREAK,
                    "Disease Outbreak Warnings",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Urgent alerts on localized pest infestations and fungal outbreaks in your taluk"
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 500, 200, 500)
                }

                notificationManager.createNotificationChannels(
                    listOf(weatherChannel, mandiChannel, outbreakChannel)
                )
            }
        }
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "New FCM Registration Token: $token")

        // Save locally
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(PREF_FCM_TOKEN, token).apply()

        // Sync with CropGuard backend server
        val registeredDistrict = prefs.getString("registered_district", "Hassan") ?: "Hassan"
        syncTokenWithBackend(token, registeredDistrict)
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        Log.d(TAG, "Received FCM message from: ${remoteMessage.from}")

        val data = remoteMessage.data
        val alertType = data["type"] ?: "weather"
        val district = data["district"] ?: "Hassan"

        val title = remoteMessage.notification?.title
            ?: data["title"]
            ?: when (alertType) {
                "mandi" -> "📈 Mandi Price Spike: $district"
                "outbreak" -> "⚠️ Outbreak Warning: $district"
                else -> "⛈️ Farm Weather Alert: $district"
            }

        val body = remoteMessage.notification?.body
            ?: data["body"]
            ?: "New agricultural alert for registered farmers in $district."

        showNotification(title, body, alertType, district, data)
    }

    private fun showNotification(
        title: String,
        body: String,
        alertType: String,
        district: String,
        data: Map<String, String>
    ) {
        createNotificationChannels(this)

        val channelId = when (alertType) {
            "mandi" -> CHANNEL_MANDI
            "outbreak" -> CHANNEL_OUTBREAK
            else -> CHANNEL_WEATHER
        }

        // Notification Click Intent
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            putExtra("nav_screen", when (alertType) {
                "mandi" -> "mandi"
                "outbreak" -> "scanner"
                else -> "weather"
            })
            putExtra("alert_district", district)
            putExtra("alert_title", title)
            putExtra("alert_body", body)
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            System.currentTimeMillis().toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        val notificationBuilder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.stat_notify_chat)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setSound(defaultSoundUri)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val notificationId = (System.currentTimeMillis() % 100000).toInt()
        notificationManager.notify(notificationId, notificationBuilder.build())
    }

    private fun syncTokenWithBackend(token: String, district: String) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val client = OkHttpClient()
                val json = JSONObject().apply {
                    put("token", token)
                    put("district", district)
                    put("platform", "android")
                    put("device", Build.MODEL)
                }
                val requestBody = json.toString().toRequestBody("application/json".toMediaType())
                val request = Request.Builder()
                    .url("https://ais-dev-vfq7hqpxz4kr4ckyho6h36-538946041778.asia-east1.run.app/api/fcm/register-token")
                    .post(requestBody)
                    .build()

                client.newCall(request).execute().use { response ->
                    Log.d(TAG, "FCM Token sync response: ${response.code}")
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed to sync FCM token with server: ${e.message}")
            }
        }
    }
}
