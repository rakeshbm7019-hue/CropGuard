package com.cropguard.ai.services

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.cropguard.ai.MainActivity
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

object FcmManager {
    private const val TAG = "FcmManager"
    private const val PREFS_NAME = "cropguard_prefs"
    private const val KEY_DISTRICT = "registered_district"
    private const val KEY_ALERT_WEATHER = "alert_weather_enabled"
    private const val KEY_ALERT_MANDI = "alert_mandi_enabled"
    private const val KEY_ALERT_OUTBREAK = "alert_outbreak_enabled"

    // Supported Karnataka Farming Districts
    val SUPPORTED_DISTRICTS = listOf(
        "Hassan (Alur & Sakleshpur)",
        "Chikkamagaluru (Mudigere)",
        "Kodagu (Madikeri & Somwarpet)",
        "Shimoga (Thirthahalli)",
        "Mandya (Pandavapura)",
        "Mysuru (Hunsur & Periyapatna)"
    )

    fun getRegisteredDistrict(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_DISTRICT, "Hassan (Alur & Sakleshpur)") ?: "Hassan (Alur & Sakleshpur)"
    }

    fun setRegisteredDistrict(context: Context, district: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val oldDistrict = prefs.getString(KEY_DISTRICT, null)

        prefs.edit().putString(KEY_DISTRICT, district).apply()

        // Unsubscribe from old district topic if changed
        if (oldDistrict != null && oldDistrict != district) {
            val oldTopic = cleanTopicName("district_$oldDistrict")
            FirebaseMessaging.getInstance().unsubscribeFromTopic(oldTopic)
        }

        // Subscribe to new district topic
        val newTopic = cleanTopicName("district_$district")
        FirebaseMessaging.getInstance().subscribeToTopic(newTopic).addOnCompleteListener { task ->
            if (task.isSuccessful) {
                Log.d(TAG, "Subscribed to FCM topic: $newTopic")
            }
        }

        // Send registration to backend
        fetchAndRegisterToken(context, district)
    }

    private fun cleanTopicName(raw: String): String {
        return raw.lowercase()
            .replace(Regex("[^a-z0-9_-]"), "_")
            .take(32)
    }

    fun fetchAndRegisterToken(context: Context, district: String = getRegisteredDistrict(context)) {
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (!task.isSuccessful) {
                Log.w(TAG, "Fetching FCM registration token failed", task.exception)
                return@addOnCompleteListener
            }

            val token = task.result
            Log.d(TAG, "FCM Registration Token: $token")

            // Store token in SharedPreferences
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(CropGuardMessagingService.PREF_FCM_TOKEN, token)
                .apply()

            // Transmit to Backend
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val client = OkHttpClient()
                    val json = JSONObject().apply {
                        put("token", token)
                        put("district", district)
                        put("platform", "android")
                        put("device", "${Build.MANUFACTURER} ${Build.MODEL}")
                        put("subscribedAt", System.currentTimeMillis())
                    }
                    val body = json.toString().toRequestBody("application/json".toMediaType())
                    val request = Request.Builder()
                        .url("https://ais-dev-vfq7hqpxz4kr4ckyho6h36-538946041778.asia-east1.run.app/api/fcm/register-token")
                        .post(body)
                        .build()

                    client.newCall(request).execute().close()
                } catch (e: Exception) {
                    Log.w(TAG, "Error posting token to backend: ${e.message}")
                }
            }
        }
    }

    /**
     * Trigger a local preview push notification to test device notification delivery
     */
    fun sendTestPushNotification(
        context: Context,
        alertType: String,
        title: String,
        body: String
    ) {
        CropGuardMessagingService.createNotificationChannels(context)

        val channelId = when (alertType) {
            "mandi" -> CropGuardMessagingService.CHANNEL_MANDI
            "outbreak" -> CropGuardMessagingService.CHANNEL_OUTBREAK
            else -> CropGuardMessagingService.CHANNEL_WEATHER
        }

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            putExtra("nav_screen", alertType)
            putExtra("alert_title", title)
            putExtra("alert_body", body)
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            System.currentTimeMillis().toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        val builder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.stat_notify_chat)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setSound(soundUri)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)

        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify((System.currentTimeMillis() % 100000).toInt(), builder.build())
    }
}
