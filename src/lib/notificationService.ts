import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

export interface PhoneNotificationOptions {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
  urgency?: "low" | "medium" | "high" | "critical";
}

/**
 * Check if the current device/browser supports notifications
 */
export function isNotificationSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (Capacitor.isNativePlatform()) return true;
  return "Notification" in window || "serviceWorker" in navigator;
}

/**
 * Get current notification permission state: "granted" | "denied" | "default"
 */
export async function getNotificationPermissionStatus(): Promise<"granted" | "denied" | "default"> {
  if (typeof window === "undefined") return "denied";

  if (Capacitor.isNativePlatform()) {
    try {
      const status = await LocalNotifications.checkPermissions();
      if (status.display === "granted") return "granted";
      if (status.display === "denied") return "denied";
      return "default";
    } catch (_) {
      return "default";
    }
  }

  if ("Notification" in window) {
    return Notification.permission as "granted" | "denied" | "default";
  }

  return "default";
}

/**
 * Request notification permissions for mobile device / browser
 */
export async function requestPhoneNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  // 1. Native Capacitor (Android APK)
  if (Capacitor.isNativePlatform()) {
    try {
      // Create agricultural alerts notification channel on Android
      await LocalNotifications.createChannel({
        id: "cropguard_outbreaks",
        name: "CropGuard Outbreak Radar",
        description: "Real-time crop pest and disease outbreak alerts within your 15km geofence",
        importance: 5, // High importance (heads-up notification + sound)
        visibility: 1, // Public visibility on lockscreen
        sound: "alert.wav",
        vibration: true,
        lights: true,
        lightColor: "#059669",
      });

      const res = await LocalNotifications.requestPermissions();
      return res.display === "granted";
    } catch (err) {
      console.warn("Capacitor notification permission error:", err);
      return false;
    }
  }

  // 2. Web / PWA on Android / Desktop
  if ("Notification" in window) {
    try {
      const perm = await Notification.requestPermission();
      return perm === "granted";
    } catch (err) {
      console.warn("Web notification permission error:", err);
      return false;
    }
  }

  return false;
}

/**
 * Deliver a notification directly to the user's phone / device
 */
export async function sendPhoneNotification(options: PhoneNotificationOptions): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const { title, body, tag = "cropguard-alert", data = {}, urgency = "high" } = options;

  // Vibrate mobile device if available
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([200, 100, 200, 100, 200]);
    } catch (_) {}
  }

  // 1. Native Android device via Capacitor LocalNotifications
  if (Capacitor.isNativePlatform()) {
    try {
      const permStatus = await LocalNotifications.checkPermissions();
      if (permStatus.display !== "granted") {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== "granted") return false;
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Date.now() % 1000000),
            title,
            body,
            channelId: "cropguard_outbreaks",
            schedule: { at: new Date(Date.now() + 100) }, // Send immediately
            sound: "default",
            actionTypeId: "OUTBREAK_ALERT",
            extra: {
              ...data,
              urgency,
              url: "/?tab=outbreaks",
            },
          },
        ],
      });
      return true;
    } catch (err) {
      console.warn("Capacitor local notification dispatch failed:", err);
    }
  }

  // 2. Progressive Web App / Mobile Browser via Service Worker
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && "showNotification" in reg) {
        // Request permission if not yet decided
        if ("Notification" in window && Notification.permission === "default") {
          await Notification.requestPermission();
        }

        if ("Notification" in window && Notification.permission === "granted") {
          await reg.showNotification(title, {
            body,
            icon: options.icon || "/icon-192.png",
            badge: options.badge || "/icon-192.png",
            vibrate: [250, 100, 250, 100, 250],
            tag,
            renotify: true,
            data: {
              url: "/?tab=outbreaks",
              ...data,
            },
          } as any);
          return true;
        }
      }
    } catch (swErr) {
      console.warn("ServiceWorker showNotification failed, trying fallback:", swErr);
    }
  }

  // 3. Fallback: Standard Web Notification API
  if ("Notification" in window) {
    if (Notification.permission === "granted") {
      try {
        new Notification(title, {
          body,
          icon: options.icon || "/icon-192.png",
          badge: options.badge || "/icon-192.png",
          tag,
        });
        return true;
      } catch (nErr) {
        console.warn("Window Notification constructor notice:", nErr);
      }
    }
  }

  return false;
}

/**
 * Send an immediate test notification to verify phone alerts
 */
export async function sendTestPhoneNotification(): Promise<{ success: boolean; message: string }> {
  const permGranted = await requestPhoneNotificationPermission();
  if (!permGranted) {
    return {
      success: false,
      message: "Please allow notification permission in your browser or device settings to receive alerts on your phone.",
    };
  }

  const sent = await sendPhoneNotification({
    title: "🌾 CropGuard AI • Phone Notification Active",
    body: "Real-time Outbreak Radar is connected. You will receive instant warnings when crop diseases or pests are detected in your 15km geofence.",
    tag: "cropguard-test-notification",
    urgency: "high",
  });

  return {
    success: sent,
    message: sent
      ? "Test alert delivered to your phone! Real-time notifications are active."
      : "Unable to trigger alert. Please check phone notification permissions.",
  };
}

export interface DistrictPushAlertItem {
  id: string;
  district: string;
  type: "weather" | "mandi" | "outbreak";
  title: string;
  body: string;
  urgency: "low" | "medium" | "high" | "critical";
  actionText?: string;
  actionUrl?: string;
  data?: Record<string, any>;
  timestamp: string;
  deliveredCount: number;
}

export const KARNATAKA_DISTRICTS = [
  "Hassan (Alur & Sakleshpur)",
  "Chikkamagaluru (Mudigere)",
  "Kodagu (Madikeri & Somwarpet)",
  "Shimoga (Thirthahalli)",
  "Mandya (Pandavapura)",
  "Mysuru (Hunsur & Periyapatna)",
];

export function getStoredDistrict(): string {
  try {
    return localStorage.getItem("cropguard_registered_district") || "Hassan (Alur & Sakleshpur)";
  } catch {
    return "Hassan (Alur & Sakleshpur)";
  }
}

export function setStoredDistrict(district: string) {
  try {
    localStorage.setItem("cropguard_registered_district", district);
  } catch {}
}

export async function registerFcmDistrict(
  district: string,
  alertSubscriptions = { weather: true, mandi: true, outbreak: true }
): Promise<{ success: boolean; message: string }> {
  setStoredDistrict(district);
  
  // Generate or retrieve persistent pseudo token
  let token = "";
  try {
    token = localStorage.getItem("cropguard_fcm_token") || "";
    if (!token) {
      token = "fcm_web_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem("cropguard_fcm_token", token);
    }
  } catch {
    token = "fcm_web_fallback_" + Date.now();
  }

  try {
    const res = await fetch("/api/fcm/register-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        district,
        platform: "web",
        alertSubscriptions,
      }),
    });
    const data = await res.json();
    return {
      success: data.success ?? true,
      message: data.message || `Subscribed to ${district} alerts`,
    };
  } catch (err: any) {
    console.warn("FCM register-token API fallback:", err);
    return { success: true, message: `Subscribed locally to ${district}` };
  }
}

export async function fetchDistrictAlerts(
  district: string = "all",
  type: string = "all"
): Promise<DistrictPushAlertItem[]> {
  try {
    const res = await fetch(`/api/fcm/alerts?district=${encodeURIComponent(district)}&type=${encodeURIComponent(type)}`);
    const data = await res.json();
    return data.alerts || [];
  } catch (err) {
    console.error("Failed to fetch district alerts:", err);
    return [];
  }
}

export async function triggerSimulatedDistrictPush(
  district: string,
  type: "weather" | "mandi" | "outbreak"
): Promise<{ success: boolean; alert?: DistrictPushAlertItem }> {
  try {
    const res = await fetch("/api/fcm/simulate-district-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ district, type }),
    });
    const data = await res.json();

    if (data.alert) {
      // Also trigger phone notification locally
      await sendPhoneNotification({
        title: data.alert.title,
        body: data.alert.body,
        urgency: data.alert.urgency,
        tag: `fcm-${data.alert.id}`,
      });
    }

    return { success: true, alert: data.alert };
  } catch (err) {
    console.error("Simulated district push error:", err);
    return { success: false };
  }
}

