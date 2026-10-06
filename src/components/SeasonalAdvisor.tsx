import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bell, 
  Wind, 
  Droplets, 
  Thermometer, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  Calendar, 
  CloudRain, 
  Sun, 
  Smartphone, 
  BellRing,
  TrendingUp,
  Bug,
  MapPin,
  Radio,
  Send,
  RefreshCw,
  ShieldAlert,
  Sprout
} from "lucide-react";
import { Language } from "../types";
import { UI_TRANSLATIONS } from "../data/translations";
import {
  getNotificationPermissionStatus,
  requestPhoneNotificationPermission,
  sendPhoneNotification,
  sendTestPhoneNotification,
  KARNATAKA_DISTRICTS,
  getStoredDistrict,
  setStoredDistrict,
  registerFcmDistrict,
  fetchDistrictAlerts,
  triggerSimulatedDistrictPush,
  DistrictPushAlertItem
} from "../lib/notificationService";

export interface SeasonalAlertItem {
  id: string;
  type: "weather" | "seasonal" | "preventative";
  title: string;
  description: string;
  urgency: "low" | "medium" | "high" | "critical";
  action: string;
  icon?: string;
}

interface SeasonalAdvisorProps {
  language: Language;
  location?: string;
  isOnline: boolean;
}

export const SeasonalAdvisor: React.FC<SeasonalAdvisorProps> = ({ 
  language, 
  location = "Hassan (Alur & Sakleshpur), Karnataka", 
  isOnline 
}) => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [phoneAlertNotice, setPhoneAlertNotice] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string>(getStoredDistrict());
  
  // Seasonal AI Alerts state
  const [seasonalAlerts, setSeasonalAlerts] = useState<SeasonalAlertItem[]>([]);
  const [isLoadingSeasonal, setIsLoadingSeasonal] = useState(false);
  const [seasonalSource, setSeasonalSource] = useState<string>("");

  // FCM District Push Alerts state
  const [districtAlerts, setDistrictAlerts] = useState<DistrictPushAlertItem[]>([]);
  const [isLoadingFCM, setIsLoadingFCM] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState<string | null>(null);
  const [activeFCMTab, setActiveFCMTab] = useState<"all" | "weather" | "mandi" | "outbreak">("all");

  const [subscriptions, setSubscriptions] = useState({
    weather: true,
    mandi: true,
    outbreak: true,
  });

  const t = UI_TRANSLATIONS[language] || UI_TRANSLATIONS.en;

  // Initial load
  useEffect(() => {
    getNotificationPermissionStatus().then((status) => {
      setPermission(status as NotificationPermission);
    });
    fetchSeasonalAlerts(selectedDistrict);
    loadFcmAlerts(selectedDistrict);
  }, [language]);

  // 1. Fetch AI Seasonal Shifts & Preventative Alerts
  const fetchSeasonalAlerts = async (locName: string) => {
    setIsLoadingSeasonal(true);
    try {
      const res = await fetch("/api/notifications/seasonal-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: locName, language }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.alerts)) {
        setSeasonalAlerts(data.alerts);
        setSeasonalSource(data.source || "gemini_ai");
      }
    } catch (err) {
      console.warn("Failed to fetch seasonal alerts, using fallback:", err);
    } finally {
      setIsLoadingSeasonal(false);
    }
  };

  // 2. Fetch District FCM Push Alerts
  const loadFcmAlerts = async (district: string) => {
    setIsLoadingFCM(true);
    try {
      const alerts = await fetchDistrictAlerts(district);
      setDistrictAlerts(alerts);
    } catch (err) {
      console.warn("Failed to fetch FCM alerts:", err);
    } finally {
      setIsLoadingFCM(false);
    }
  };

  // Handle District Change
  const handleDistrictChange = async (newDistrict: string) => {
    setSelectedDistrict(newDistrict);
    setStoredDistrict(newDistrict);
    await registerFcmDistrict(newDistrict, subscriptions);
    setPhoneAlertNotice(`Subscribed to FCM push notifications for ${newDistrict}`);
    setTimeout(() => setPhoneAlertNotice(null), 4000);
    fetchSeasonalAlerts(newDistrict);
    loadFcmAlerts(newDistrict);
  };

  const handleToggleSubscription = async (key: "weather" | "mandi" | "outbreak") => {
    const updated = { ...subscriptions, [key]: !subscriptions[key] };
    setSubscriptions(updated);
    await registerFcmDistrict(selectedDistrict, updated);
  };

  const requestPermission = async () => {
    const granted = await requestPhoneNotificationPermission();
    setPermission(granted ? "granted" : "denied");
    if (granted) {
      await registerFcmDistrict(selectedDistrict, subscriptions);
      const res = await sendTestPhoneNotification();
      setPhoneAlertNotice(res.message);
      setTimeout(() => setPhoneAlertNotice(null), 5000);
    }
  };

  const handleSendSimulatedPush = async (type: "weather" | "mandi" | "outbreak") => {
    setIsSendingTest(type);
    const res = await triggerSimulatedDistrictPush(selectedDistrict, type);
    setIsSendingTest(null);

    if (res.success && res.alert) {
      setPhoneAlertNotice(`Push dispatched! Look at your phone's notification bar for "${res.alert.title}"`);
      setTimeout(() => setPhoneAlertNotice(null), 6000);
      loadFcmAlerts(selectedDistrict);
    }
  };

  const filteredFcmAlerts = districtAlerts.filter(a => activeFCMTab === "all" || a.type === activeFCMTab);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900 text-white rounded-2xl p-5 shadow-lg border border-emerald-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-700/60 rounded-xl">
                <Radio className="w-5 h-5 text-emerald-300 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  {language === "hi" ? "मौसमी अलर्ट व पुश सूचना केंद्र" : "Seasonal Alerts & Push Notification Center"}
                </h3>
                <p className="text-xs text-emerald-200">
                  {language === "hi" 
                    ? "फसल सुरक्षा, मौसम बदलाव एवं मंडी भाव की त्वरित सूचनाएं"
                    : "Real-time crop protection, agro-climatic shifts & mandi alerts"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {permission === "granted" ? (
              <span className="text-xs font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                {language === "hi" ? "अलर्ट सक्रिय" : "FCM Push Active"}
              </span>
            ) : (
              <button 
                onClick={requestPermission}
                className="text-xs bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-bold px-3.5 py-1.5 rounded-full transition shadow flex items-center gap-1.5"
              >
                <Smartphone className="w-3.5 h-3.5" />
                {language === "hi" ? "फोन अलर्ट चालू करें" : "Enable Push Alerts"}
              </button>
            )}
          </div>
        </div>

        {/* Registered District Selector */}
        <div className="mt-4 pt-4 border-t border-emerald-700/60 grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
          <div>
            <label className="text-xs font-semibold text-emerald-200 flex items-center gap-1 mb-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-300" />
              {language === "hi" ? "पंजीकृत जिला (अलर्ट क्षेत्र):" : "Registered Farming District (Alert Topic):"}
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => handleDistrictChange(e.target.value)}
              className="w-full bg-emerald-950/80 border border-emerald-600/80 text-white rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {KARNATAKA_DISTRICTS.map((d) => (
                <option key={d} value={d} className="bg-emerald-950 text-white">
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* FCM Topic Subscription Toggles */}
          <div>
            <label className="text-xs font-semibold text-emerald-200 mb-1 block">
              {language === "hi" ? "सक्रिय सूचना श्रेणियां:" : "Subscribed Alert Channels:"}
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => handleToggleSubscription("weather")}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1 transition ${
                  subscriptions.weather 
                    ? "bg-blue-600/60 border-blue-400 text-white" 
                    : "bg-emerald-950/40 border-emerald-800 text-emerald-400 opacity-60"
                }`}
              >
                <CloudRain className="w-3 h-3" />
                {language === "hi" ? "मौसम" : "Weather"}
              </button>
              <button
                onClick={() => handleToggleSubscription("mandi")}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1 transition ${
                  subscriptions.mandi 
                    ? "bg-amber-600/60 border-amber-400 text-white" 
                    : "bg-emerald-950/40 border-emerald-800 text-emerald-400 opacity-60"
                }`}
              >
                <TrendingUp className="w-3 h-3" />
                {language === "hi" ? "मंडी भाव" : "Mandi Spikes"}
              </button>
              <button
                onClick={() => handleToggleSubscription("outbreak")}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1 transition ${
                  subscriptions.outbreak 
                    ? "bg-red-600/60 border-red-400 text-white" 
                    : "bg-emerald-950/40 border-emerald-800 text-emerald-400 opacity-60"
                }`}
              >
                <Bug className="w-3 h-3" />
                {language === "hi" ? "रोग प्रकोप" : "Outbreaks"}
              </button>
            </div>
          </div>
        </div>

        {phoneAlertNotice && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-3 bg-emerald-500/20 border border-emerald-400/50 rounded-xl text-xs flex items-center gap-2 text-emerald-100"
          >
            <Smartphone className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{phoneAlertNotice}</span>
          </motion.div>
        )}
      </div>

      {/* SECTION 1: AI Seasonal Preventative Shifts & Weather Alerts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-900 dark:text-zinc-100">
                {language === "hi" ? "मौसमी निवारक सलाह व आगामी खतरे" : "Active Seasonal Preventative Shifts"}
              </h4>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                {selectedDistrict} • {language === "hi" ? "मौसम व फसल चक्र अनुसार सलाह" : "Localized agro-climatic advisories"}
              </p>
            </div>
          </div>

          <button
            onClick={() => fetchSeasonalAlerts(selectedDistrict)}
            disabled={isLoadingSeasonal}
            className="text-xs text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 flex items-center gap-1 font-semibold px-2 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSeasonal ? "animate-spin" : ""}`} />
            <span>{language === "hi" ? "ताज़ा करें" : "Refresh"}</span>
          </button>
        </div>

        <div className="grid gap-3">
          {isLoadingSeasonal && seasonalAlerts.length === 0 ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-gray-100 dark:bg-zinc-800 rounded-2xl border border-gray-200 dark:border-zinc-700" />
              ))}
            </div>
          ) : seasonalAlerts.length > 0 ? (
            seasonalAlerts.map((alert) => {
              const isHigh = alert.urgency === "high" || alert.urgency === "critical";
              const borderTheme = isHigh 
                ? "border-l-red-500 bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40" 
                : "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40";

              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-2xl border border-l-4 ${borderTheme} shadow-xs flex flex-col gap-2.5 transition-all`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {alert.type === "weather" ? (
                        <CloudRain className="w-5 h-5 text-blue-600 shrink-0" />
                      ) : alert.type === "preventative" ? (
                        <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                      ) : (
                        <Sprout className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                      <h5 className="font-bold text-sm text-gray-900 dark:text-zinc-100">
                        {alert.title}
                      </h5>
                    </div>

                    <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full border shrink-0 ${
                      isHigh 
                        ? "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300 border-red-200 dark:border-red-800" 
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                    }`}>
                      {alert.urgency}
                    </span>
                  </div>

                  <p className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed">
                    {alert.description}
                  </p>

                  <div className="mt-1 p-2.5 bg-white/80 dark:bg-zinc-900/80 rounded-xl border border-gray-200/80 dark:border-zinc-800 flex items-start gap-2">
                    <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <strong className="text-emerald-800 dark:text-emerald-400 font-bold mr-1">
                        {language === "hi" ? "कार्रवाई:" : "Immediate Action:"}
                      </strong>
                      <span className="text-gray-800 dark:text-zinc-200 font-medium">{alert.action}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="text-center py-8 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-gray-700 dark:text-zinc-300 text-sm font-medium">
                {language === "hi" ? "कोई गंभीर मौसमी खतरा नहीं है।" : "No critical seasonal alert for your district."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: Instant FCM Push Notification Dispatch Testing Bar */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-gray-200 dark:border-zinc-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-600" />
              {language === "hi" ? "फोन पर परीक्षण अलर्ट भेजें" : "Test FCM Push Dispatch to Device"}
            </h4>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              {language === "hi" 
                ? "ध्वनि और कंपन के साथ फोन नोटिफिकेशन का परीक्षण करें" 
                : "Trigger real-time alert to test sound, vibration, and banner on your device"}
            </p>
          </div>
          <span className="text-[11px] font-semibold text-gray-400">{selectedDistrict}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            onClick={() => handleSendSimulatedPush("weather")}
            disabled={isSendingTest !== null}
            className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 hover:bg-blue-100 text-blue-800 dark:text-blue-300 text-xs font-bold transition disabled:opacity-50"
          >
            <CloudRain className="w-4 h-4 text-blue-600" />
            <span>{isSendingTest === "weather" ? "Sending..." : language === "hi" ? "⛈️ मौसम अलर्ट" : "⛈️ Weather Alert"}</span>
          </button>

          <button
            onClick={() => handleSendSimulatedPush("mandi")}
            disabled={isSendingTest !== null}
            className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition disabled:opacity-50"
          >
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>{isSendingTest === "mandi" ? "Sending..." : language === "hi" ? "📈 मंडी भाव अलर्ट" : "📈 Mandi Spike Alert"}</span>
          </button>

          <button
            onClick={() => handleSendSimulatedPush("outbreak")}
            disabled={isSendingTest !== null}
            className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 hover:bg-red-100 text-red-800 dark:text-red-300 text-xs font-bold transition disabled:opacity-50"
          >
            <Bug className="w-4 h-4 text-red-600" />
            <span>{isSendingTest === "outbreak" ? "Sending..." : language === "hi" ? "⚠️ रोग प्रकोप अलर्ट" : "⚠️ Outbreak Warning"}</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: District Push Broadcast History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
            <BellRing className="w-4 h-4 text-emerald-600" />
            {language === "hi" ? "हाल के जिला अलर्ट रिकॉर्ड" : "Recent District Push Broadcasts"} ({filteredFcmAlerts.length})
          </h4>

          {/* Filter Pills */}
          <div className="flex gap-1 bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl text-xs">
            <button
              onClick={() => setActiveFCMTab("all")}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                activeFCMTab === "all" ? "bg-white dark:bg-zinc-700 shadow text-gray-900 dark:text-white font-bold" : "text-gray-500"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveFCMTab("weather")}
              className={`px-2 py-1 rounded-lg font-medium transition ${
                activeFCMTab === "weather" ? "bg-white dark:bg-zinc-700 shadow text-blue-700 dark:text-blue-300 font-bold" : "text-gray-500"
              }`}
            >
              Weather
            </button>
            <button
              onClick={() => setActiveFCMTab("mandi")}
              className={`px-2 py-1 rounded-lg font-medium transition ${
                activeFCMTab === "mandi" ? "bg-white dark:bg-zinc-700 shadow text-green-700 dark:text-green-300 font-bold" : "text-gray-500"
              }`}
            >
              Mandi
            </button>
            <button
              onClick={() => setActiveFCMTab("outbreak")}
              className={`px-2 py-1 rounded-lg font-medium transition ${
                activeFCMTab === "outbreak" ? "bg-white dark:bg-zinc-700 shadow text-red-700 dark:text-red-300 font-bold" : "text-gray-500"
              }`}
            >
              Outbreaks
            </button>
          </div>
        </div>

        <div className="grid gap-3">
          {isLoadingFCM ? (
            <div className="animate-pulse space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 bg-gray-100 dark:bg-zinc-800 rounded-2xl border border-gray-200 dark:border-zinc-700" />
              ))}
            </div>
          ) : filteredFcmAlerts.length > 0 ? (
            filteredFcmAlerts.map((alert) => {
              const borderTheme = 
                alert.type === "outbreak" ? "border-l-red-500 bg-red-50/40 dark:bg-red-950/20" :
                alert.type === "mandi" ? "border-l-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20" :
                "border-l-blue-500 bg-blue-50/40 dark:bg-blue-950/20";

              const icon = 
                alert.type === "outbreak" ? <Bug className="w-5 h-5 text-red-600 shrink-0" /> :
                alert.type === "mandi" ? <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0" /> :
                <CloudRain className="w-5 h-5 text-blue-600 shrink-0" />;

              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-2xl border border-gray-200 dark:border-zinc-800 border-l-4 ${borderTheme} shadow-xs flex flex-col sm:flex-row gap-3 sm:items-start justify-between bg-white dark:bg-zinc-900`}
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5">{icon}</div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-gray-900 dark:text-zinc-100">{alert.title}</span>
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                          alert.urgency === "critical" ? "bg-red-100 text-red-700 border-red-200" :
                          alert.urgency === "high" ? "bg-amber-100 text-amber-700 border-amber-200" :
                          "bg-blue-100 text-blue-700 border-blue-200"
                        }`}>
                          {alert.urgency}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">{alert.body}</p>

                      {alert.data && Object.keys(alert.data).length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                          {Object.entries(alert.data).map(([k, v]) => (
                            <span key={k} className="bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 px-2 py-0.5 rounded-md font-medium">
                              <strong className="capitalize">{k}:</strong> {String(v)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                    <span className="text-[10px] text-gray-400 font-medium">
                      Delivered to {alert.deliveredCount} farmers
                    </span>
                    {alert.actionText && (
                      <a
                        href={alert.actionUrl || "#"}
                        className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg transition text-center whitespace-nowrap"
                      >
                        {alert.actionText} →
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="text-center py-6 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800">
              <p className="text-gray-500 dark:text-zinc-400 text-xs">
                No alerts recorded in this filter for {selectedDistrict}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
