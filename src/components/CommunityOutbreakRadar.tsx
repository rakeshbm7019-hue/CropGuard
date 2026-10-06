import React, { useState, useEffect } from "react";
import {
  Radar,
  AlertTriangle,
  Radio,
  MapPin,
  ShieldAlert,
  Bug,
  Droplets,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Volume2,
  VolumeX,
  Sparkles,
  Thermometer,
  CloudRain,
  ChevronRight,
  TrendingUp,
  Building2,
  Landmark,
  ShieldCheck,
  Compass,
  Bell,
  BellRing,
  Smartphone,
  Check,
} from "lucide-react";
import { Language, CommunityOutbreakAlert, PredictiveRiskItem, UserProfile, DistrictItem, DistrictIntel } from "../types";
import { UI_TRANSLATIONS } from "../data/translations";
import {
  getNotificationPermissionStatus,
  requestPhoneNotificationPermission,
  sendPhoneNotification,
  sendTestPhoneNotification,
} from "../lib/notificationService";
import { playVoiceAgentSpeech, stopAllSpeech } from "../services/voiceService";

interface CommunityOutbreakRadarProps {
  language: Language;
  user?: UserProfile | null;
  onNavigateToScan?: () => void;
}

const POPULAR_DISTRICTS = [
  "All",
  "Davanagere",
  "Kolar",
  "Nashik",
  "Guntur",
  "Ludhiana",
  "Indore",
  "Varanasi",
  "Coimbatore",
  "Rajkot",
  "Wayanad",
];

export const CommunityOutbreakRadar: React.FC<CommunityOutbreakRadarProps> = ({
  language,
  user,
  onNavigateToScan,
}) => {
  const t = UI_TRANSLATIONS[language] || UI_TRANSLATIONS.en;

  const [activeTab, setActiveTab] = useState<"live_radar" | "district_intel" | "predictive_risk">("live_radar");
  const [alerts, setAlerts] = useState<CommunityOutbreakAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState<boolean>(true);
  const [filterCrop, setFilterCrop] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [maxDistance, setMaxDistance] = useState<number>(100);

  // Available districts list
  const [districtsList, setDistrictsList] = useState<DistrictItem[]>([]);
  const [districtsSummary, setDistrictsSummary] = useState<{
    totalAlerts: number;
    criticalCount: number;
    warningCount: number;
    totalAffectedAcres: number;
    districtsCovered: number;
  }>({
    totalAlerts: 0,
    criticalCount: 0,
    warningCount: 0,
    totalAffectedAcres: 0,
    districtsCovered: 0,
  });

  // District Intelligence State (ICAR / KVK Advisory)
  const [districtIntelTarget, setDistrictIntelTarget] = useState<string>("Davanagere");
  const [districtIntelData, setDistrictIntelData] = useState<DistrictIntel | null>(null);
  const [loadingIntel, setLoadingIntel] = useState<boolean>(false);

  // Outbreak Reporting Modal State
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportCrop, setReportCrop] = useState<string>("");
  const [reportThreat, setReportThreat] = useState<string>("");
  const [reportType, setReportType] = useState<string>("Pest Infestation");
  const [reportSeverity, setReportSeverity] = useState<"Moderate" | "High" | "Critical">("High");
  const [reportDistrict, setReportDistrict] = useState<string>("Davanagere");
  const [reportState, setReportState] = useState<string>("Karnataka");
  const [reportVillage, setReportVillage] = useState<string>(user?.location || "Harihar Taluka");
  const [reportAcres, setReportAcres] = useState<number>(2);
  const [reportNotes, setReportNotes] = useState<string>("");
  const [submittingReport, setSubmittingReport] = useState<boolean>(false);
  const [reportSuccessMsg, setReportSuccessMsg] = useState<string | null>(null);

  // Predictive Microclimate Risk State
  const [predictiveRisks, setPredictiveRisks] = useState<PredictiveRiskItem[]>([]);
  const [weatherConditions, setWeatherConditions] = useState<{ temp: number; humidity: number; rainProb: number }>({
    temp: 28,
    humidity: 82,
    rainProb: 65,
  });
  const [loadingPredictive, setLoadingPredictive] = useState<boolean>(false);

  // Audio readout state
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  // Phone Push Notification State
  const [phoneNotificationGranted, setPhoneNotificationGranted] = useState<boolean>(false);
  const [testNoticeMsg, setTestNoticeMsg] = useState<string | null>(null);

  useEffect(() => {
    getNotificationPermissionStatus().then((status) => {
      setPhoneNotificationGranted(status === "granted");
    });
  }, []);

  const handleEnablePhoneNotifications = async () => {
    const granted = await requestPhoneNotificationPermission();
    setPhoneNotificationGranted(granted);
    if (granted) {
      const res = await sendTestPhoneNotification();
      setTestNoticeMsg(res.message);
      setTimeout(() => setTestNoticeMsg(null), 5000);
    } else {
      setTestNoticeMsg("Please allow notification permissions in your browser or phone settings to receive live outbreak alerts.");
      setTimeout(() => setTestNoticeMsg(null), 6000);
    }
  };

  const handleSendTestPhoneAlert = async () => {
    const res = await sendTestPhoneNotification();
    setTestNoticeMsg(res.message);
    setTimeout(() => setTestNoticeMsg(null), 5000);
  };

  // Fetch available districts
  const fetchDistricts = async () => {
    try {
      const res = await fetch("/api/outbreaks/districts");
      const json = await res.json();
      if (json.success && Array.isArray(json.districts)) {
        setDistrictsList(json.districts);
      }
    } catch (err) {
      console.warn("Failed to load district catalog:", err);
    }
  };

  // Fetch Outbreak Alerts with multi-district filtering
  const fetchOutbreaks = async () => {
    setLoadingAlerts(true);
    try {
      let url = `/api/outbreaks?maxDistance=${maxDistance}`;
      if (filterCrop) url += `&crop=${encodeURIComponent(filterCrop)}`;
      if (filterType !== "all") url += `&type=${encodeURIComponent(filterType)}`;
      if (selectedDistrict !== "all") url += `&district=${encodeURIComponent(selectedDistrict)}`;
      if (selectedState !== "all") url += `&state=${encodeURIComponent(selectedState)}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success && Array.isArray(json.alerts)) {
        setAlerts(json.alerts);
        if (json.summary) {
          setDistrictsSummary({
            totalAlerts: json.summary.totalAlerts || json.alerts.length,
            criticalCount: json.summary.criticalCount || 0,
            warningCount: json.summary.warningCount || 0,
            totalAffectedAcres: json.summary.totalAffectedAcres || 0,
            districtsCovered: json.summary.districtsCovered || 0,
          });
        }
      }
    } catch (err) {
      console.warn("Failed to fetch outbreak alerts:", err);
    } finally {
      setLoadingAlerts(false);
    }
  };

  // Fetch District-specific KVK / ICAR Outbreak Intelligence
  const fetchDistrictIntel = async (districtName: string) => {
    setLoadingIntel(true);
    try {
      const langParam = language === "hi" ? "Hindi" : language === "kn" ? "Kannada" : language === "te" ? "Telugu" : language === "mr" ? "Marathi" : "English";
      const res = await fetch(`/api/outbreaks/district-intel?district=${encodeURIComponent(districtName)}&language=${langParam}`);
      const json = await res.json();
      if (json.success && json.data) {
        setDistrictIntelData(json.data);
      }
    } catch (err) {
      console.warn("Failed to fetch district intel:", err);
    } finally {
      setLoadingIntel(false);
    }
  };

  const fetchPredictiveRisks = async () => {
    setLoadingPredictive(true);
    try {
      const res = await fetch(
        `/api/predictive-risk?temp=${weatherConditions.temp}&humidity=${weatherConditions.humidity}&rainProb=${weatherConditions.rainProb}`
      );
      const json = await res.json();
      if (json.success && Array.isArray(json.risks)) {
        setPredictiveRisks(json.risks);
        if (json.conditions) {
          setWeatherConditions(json.conditions);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch predictive risk models:", err);
    } finally {
      setLoadingPredictive(false);
    }
  };

  useEffect(() => {
    fetchDistricts();
  }, []);

  useEffect(() => {
    fetchOutbreaks();
  }, [filterCrop, filterType, selectedDistrict, selectedState, maxDistance]);

  useEffect(() => {
    if (activeTab === "district_intel" || selectedDistrict !== "all") {
      const target = selectedDistrict !== "all" ? selectedDistrict : districtIntelTarget;
      fetchDistrictIntel(target);
    }
  }, [activeTab, selectedDistrict, districtIntelTarget, language]);

  useEffect(() => {
    if (activeTab === "predictive_risk") {
      fetchPredictiveRisks();
    }
  }, [activeTab]);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportCrop || !reportThreat || !reportVillage) return;

    setSubmittingReport(true);
    try {
      const res = await fetch("/api/outbreaks/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crop: reportCrop,
          threatName: reportThreat,
          threatType: reportType,
          severity: reportSeverity,
          locationName: `${reportDistrict} / ${reportVillage}`,
          affectedAcres: reportAcres,
          notes: reportNotes,
          reporterName: user?.name || "Local Farmer",
        }),
      });

      const json = await res.json();
      setSubmittingReport(false);
      if (json.success) {
        setReportSuccessMsg(`Outbreak broadcasted for ${reportDistrict} district! Nearby farmers will see this warning.`);
        
        // Dispatch real-time phone notification to the mobile device
        sendPhoneNotification({
          title: `🚨 Outbreak Alert: ${reportThreat} (${reportCrop})`,
          body: `Real-time broadcast for ${reportDistrict}. Action: ${reportNotes || 'Scout field foliage immediately.'}`,
          urgency: "critical",
          data: { district: reportDistrict, crop: reportCrop },
        });

        setShowReportModal(false);
        setReportCrop("");
        setReportThreat("");
        setReportNotes("");
        fetchOutbreaks();
        setTimeout(() => setReportSuccessMsg(null), 5000);
      }
    } catch (err) {
      setSubmittingReport(false);
    }
  };

  const speakEmergencyAlert = () => {
    if (isPlayingAudio) {
      stopAllSpeech();
      setIsPlayingAudio(false);
      return;
    }

    const firstAlert = alerts[0];
    if (!firstAlert) return;

    const alertText = `Attention Farmer. District Outbreak Alert for ${firstAlert.district || "your area"}: ${firstAlert.threatName} active in ${firstAlert.crop}, severity: ${firstAlert.severity}. Recommended protective action: ${firstAlert.recommendedAction}`;
    
    playVoiceAgentSpeech({
      text: alertText,
      language: language,
      onStart: () => setIsPlayingAudio(true),
      onEnd: () => setIsPlayingAudio(false),
      onError: () => setIsPlayingAudio(false)
    });
  };

  // Get list of unique states from district list
  const uniqueStates = Array.from(new Set(districtsList.map((d) => d.state))).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-700 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-white/20 text-white backdrop-blur-xs">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                Multi-District Pest & Disease Radar
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-stone-900 shadow-2xs">
                📍 {districtsSummary.districtsCovered || districtsList.length || 20} Agricultural Districts Monitored
              </span>
              {selectedDistrict !== "all" && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-white text-rose-700">
                  District: {selectedDistrict}
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
              <span>{t.outbreakTitle || "Community Pest & Disease Outbreak Radar"}</span>
            </h2>
            <p className="text-xs sm:text-sm text-rose-100 max-w-2xl">
              Track real-time pathogen clusters and insect infestations across Indian agricultural districts. Filter by your district for immediate ICAR & KVK advisories.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={speakEmergencyAlert}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-bold text-white transition-colors"
            >
              {isPlayingAudio ? <VolumeX className="w-4 h-4 text-amber-300 animate-pulse" /> : <Volume2 className="w-4 h-4" />}
              <span>{isPlayingAudio ? (t.stopAudio || "Stop Audio") : "Listen Alert"}</span>
            </button>

            <button
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white text-rose-700 hover:bg-rose-50 text-xs sm:text-sm font-extrabold shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Report Outbreak</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {reportSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{reportSuccessMsg}</span>
        </div>
      )}

      {/* Test Notice Notification */}
      {testNoticeMsg && (
        <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/80 border border-sky-300 text-sky-900 dark:text-sky-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <Smartphone className="w-5 h-5 text-sky-600 shrink-0" />
          <span>{testNoticeMsg}</span>
        </div>
      )}

      {/* Real-Time Mobile Phone Alerts Banner */}
      <div className="p-4 rounded-2xl bg-stone-900 text-white shadow-sm border border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            phoneNotificationGranted
              ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-400"
              : "bg-amber-500/20 border border-amber-400/40 text-amber-300"
          }`}>
            {phoneNotificationGranted ? (
              <BellRing className="w-5 h-5 animate-pulse" />
            ) : (
              <Bell className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black tracking-wide uppercase text-white">
                {phoneNotificationGranted ? "Phone Notifications Active" : "Enable Phone Notifications"}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                phoneNotificationGranted
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              }`}>
                {phoneNotificationGranted ? "Real-Time Push Enabled" : "One-Tap Setup"}
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5 max-w-xl">
              {phoneNotificationGranted
                ? "Your device will receive instant background and lock-screen alerts whenever urgent pest attacks, fungal blights, or weather shifts are detected."
                : "Get live outbreak alerts delivered straight to your phone's notification bar. Never miss a nearby crop infection outbreak."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          {!phoneNotificationGranted ? (
            <button
              onClick={handleEnablePhoneNotifications}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs shadow-md transition-all active:scale-95"
            >
              <Smartphone className="w-4 h-4" />
              <span>Allow Phone Alerts</span>
            </button>
          ) : (
            <button
              onClick={handleSendTestPhoneAlert}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition-colors active:scale-95"
            >
              <BellRing className="w-3.5 h-3.5 text-emerald-400" />
              <span>Send Test Alert</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick District Selector Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
          <span className="font-bold text-stone-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-rose-600" />
            <span>Select Your District:</span>
          </span>
          <span className="text-[11px] text-stone-500 dark:text-zinc-400">
            {districtsList.length} districts in network · Showing alerts for: <strong>{selectedDistrict === "all" ? "All Districts" : selectedDistrict}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {POPULAR_DISTRICTS.map((dist) => {
            const isSelected = (dist === "All" && selectedDistrict === "all") || selectedDistrict.toLowerCase() === dist.toLowerCase();
            return (
              <button
                key={dist}
                onClick={() => {
                  if (dist === "All") {
                    setSelectedDistrict("all");
                  } else {
                    setSelectedDistrict(dist);
                    setDistrictIntelTarget(dist);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 text-stone-700 dark:text-zinc-300"
                }`}
              >
                {dist === "All" ? "🇮🇳 All Districts" : dist}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-stone-100 dark:bg-zinc-800/80 border border-stone-200 dark:border-zinc-700 w-fit flex-wrap">
        <button
          onClick={() => setActiveTab("live_radar")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "live_radar"
              ? "bg-white dark:bg-zinc-900 text-rose-700 dark:text-rose-400 shadow-2xs"
              : "text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white"
          }`}
        >
          <Radio className="w-4 h-4 text-rose-600" />
          <span>District Outbreak Radar ({alerts.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("district_intel");
            fetchDistrictIntel(selectedDistrict !== "all" ? selectedDistrict : districtIntelTarget);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "district_intel"
              ? "bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-2xs"
              : "text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white"
          }`}
        >
          <Landmark className="w-4 h-4 text-emerald-600" />
          <span>ICAR / KVK District Advisory</span>
        </button>

        <button
          onClick={() => setActiveTab("predictive_risk")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "predictive_risk"
              ? "bg-white dark:bg-zinc-900 text-amber-700 dark:text-amber-400 shadow-2xs"
              : "text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white"
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Microclimate Forewarning (7-Day)</span>
        </button>
      </div>

      {/* Tab 1: Live District Radar */}
      {activeTab === "live_radar" && (
        <div className="space-y-6">
          {/* Detailed Filters: District, State, Crop, Threat Type */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200/80 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Search className="w-4 h-4 text-stone-400 shrink-0" />
              <input
                type="text"
                placeholder="Search crop, pest, or district..."
                value={filterCrop}
                onChange={(e) => setFilterCrop(e.target.value)}
                className="w-full md:w-56 px-3 py-1.5 rounded-xl border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-xs text-stone-900 dark:text-white focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-between md:justify-end">
              {/* District Dropdown */}
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <select
                  value={selectedDistrict}
                  onChange={(e) => {
                    setSelectedDistrict(e.target.value);
                    if (e.target.value !== "all") setDistrictIntelTarget(e.target.value);
                  }}
                  className="px-2.5 py-1.5 rounded-xl border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-xs font-semibold text-stone-800 dark:text-zinc-200"
                >
                  <option value="all">All Districts ({districtsList.length})</option>
                  {districtsList.map((d) => (
                    <option key={d.district} value={d.district}>
                      {d.district} ({d.state}) - {d.alertCount} alert{d.alertCount > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* State Dropdown */}
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-stone-400" />
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-xs font-semibold text-stone-800 dark:text-zinc-200"
                >
                  <option value="all">All States</option>
                  {uniqueStates.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Threat Type */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-stone-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-xs font-semibold text-stone-800 dark:text-zinc-200"
                >
                  <option value="all">All Threats</option>
                  <option value="Pest Infestation">Insect / Pest Attack</option>
                  <option value="Fungal Blight">Fungal Blight</option>
                  <option value="Bacterial">Bacterial Disease</option>
                  <option value="Viral">Viral Infection</option>
                </select>
              </div>

              <button
                onClick={() => {
                  fetchOutbreaks();
                  fetchDistricts();
                }}
                className="p-1.5 rounded-xl bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 text-stone-600 dark:text-zinc-400 cursor-pointer"
                title="Refresh alerts"
              >
                <RefreshCw className={`w-4 h-4 ${loadingAlerts ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 shadow-xs">
              <p className="text-[11px] font-bold text-stone-500 dark:text-zinc-400 uppercase tracking-wider">
                Total Monitored Alerts
              </p>
              <div className="text-2xl font-black text-stone-900 dark:text-white mt-1 flex items-baseline gap-2">
                <span>{districtsSummary.totalAlerts}</span>
                <span className="text-xs font-semibold text-rose-600">
                  {selectedDistrict === "all" ? "across all districts" : `in ${selectedDistrict}`}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 shadow-xs">
              <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                Critical Urgency Threats
              </p>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {districtsSummary.criticalCount}
                <span className="text-xs font-normal text-stone-500 dark:text-zinc-400 ml-1.5">
                  emergency sprays required
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 shadow-xs">
              <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Total Affected Acreage
              </p>
              <div className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                {districtsSummary.totalAffectedAcres} <span className="text-xs font-semibold text-stone-500">Acres</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 shadow-xs flex flex-col justify-between">
              <div>
                <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  ICAR / KVK Advisory
                </p>
                <p className="text-xs text-emerald-900 dark:text-emerald-200 font-bold mt-1">
                  {selectedDistrict === "all" ? "Davanagere & Surrounding Belt" : selectedDistrict}
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveTab("district_intel");
                  fetchDistrictIntel(selectedDistrict !== "all" ? selectedDistrict : districtIntelTarget);
                }}
                className="mt-2 text-xs font-extrabold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>View District Action Plan</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Outbreak Alert Cards List */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-stone-900 dark:text-zinc-100 flex items-center gap-2">
                <Radio className="w-5 h-5 text-rose-600" />
                <span>
                  District Outbreak Reports ({alerts.length})
                  {selectedDistrict !== "all" && <span className="text-rose-600 font-normal"> · {selectedDistrict}</span>}
                </span>
              </h3>
              {selectedDistrict !== "all" && (
                <button
                  onClick={() => setSelectedDistrict("all")}
                  className="text-xs text-stone-500 hover:text-rose-600 underline font-semibold"
                >
                  Clear district filter
                </button>
              )}
            </div>

            {loadingAlerts ? (
              <div className="p-8 text-center text-xs text-stone-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-3xl border border-stone-200 dark:border-zinc-800">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                <span>Scanning district outbreak networks...</span>
              </div>
            ) : alerts.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 space-y-6 text-center shadow-xs">
                {/* Real-time scanning radar display */}
                <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" />
                  <div className="absolute inset-2 rounded-full border border-emerald-500/30 animate-pulse" />
                  <div className="absolute inset-6 rounded-full border border-dashed border-emerald-500/40" />
                  <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center shadow-sm">
                    <Radar className="w-7 h-7 text-emerald-600 animate-spin" style={{ animationDuration: "7s" }} />
                  </div>
                </div>

                <div className="space-y-2 max-w-lg mx-auto">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 text-xs font-black uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Real-Time Radar Active · Zero Outbreaks Detected</span>
                  </div>
                  <h4 className="text-lg font-black text-stone-900 dark:text-zinc-100">
                    Safe Zone in {selectedDistrict === "all" ? "Your Agricultural Region" : selectedDistrict}
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-zinc-400 leading-relaxed">
                    The radar operates exclusively on <strong>real-time alerts</strong> — no default, mock, or synthetic alerts are displayed. Whenever a crop disease is diagnosed or a pest cluster is reported by local farmers, live geo-threat vectors and push notifications will trigger directly on your phone.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-sm transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Broadcast Real-Time Outbreak</span>
                  </button>

                  <button
                    onClick={handleSendTestPhoneAlert}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 text-stone-800 dark:text-zinc-200 text-xs font-bold transition-all active:scale-95"
                  >
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>Test Phone Alert</span>
                  </button>

                  {onNavigateToScan && (
                    <button
                      onClick={onNavigateToScan}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95"
                    >
                      <span>Scan Crop Leaves</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}

                  {(selectedDistrict !== "all" || selectedState !== "all" || filterCrop) && (
                    <button
                      onClick={() => {
                        setSelectedDistrict("all");
                        setSelectedState("all");
                        setFilterCrop("");
                      }}
                      className="px-4 py-2.5 rounded-2xl border border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-400 text-xs font-semibold hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              </div>
            ) : (
              alerts.map((alert) => {
                const isCritical = alert.severity === "Critical";
                const isEmergency = alert.urgencyLevel === "Emergency";
                return (
                  <div
                    key={alert.id}
                    className={`p-5 rounded-3xl bg-white dark:bg-zinc-900 border transition-all hover:shadow-md ${
                      isCritical
                        ? "border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-500/20"
                        : "border-stone-200/80 dark:border-zinc-800"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-stone-100 dark:border-zinc-800">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                            isEmergency
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {alert.urgencyLevel}
                        </span>

                        {/* District Badge (Clickable) */}
                        {alert.district && (
                          <button
                            onClick={() => {
                              setSelectedDistrict(alert.district!);
                              setDistrictIntelTarget(alert.district!);
                            }}
                            className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-colors flex items-center gap-1"
                          >
                            <MapPin className="w-3 h-3" />
                            <span>District: {alert.district}</span>
                          </button>
                        )}

                        {alert.state && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400">
                            {alert.state}
                          </span>
                        )}

                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-stone-100 text-stone-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {alert.threatType}
                        </span>

                        <span className="text-xs font-semibold text-stone-500 dark:text-zinc-400">
                          {alert.locationName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-stone-400 dark:text-zinc-500 font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{alert.reportedAgo}</span>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div className="flex items-baseline gap-2">
                        <h4 className="text-base sm:text-lg font-black text-stone-900 dark:text-white">
                          {alert.crop}: {alert.threatName}
                        </h4>
                      </div>

                      <div className="p-3 rounded-2xl bg-stone-50 dark:bg-zinc-800/70 border border-stone-200/60 dark:border-zinc-700/60 text-xs text-stone-800 dark:text-zinc-200 space-y-1">
                        <p>
                          <strong>Field Scouting Advisory:</strong> {alert.recommendedAction}
                        </p>
                        {alert.preventiveSpray && (
                          <p className="text-emerald-700 dark:text-emerald-300 font-semibold pt-1">
                            🛡️ <strong>Recommended Preventive Spray:</strong> {alert.preventiveSpray}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-zinc-400 pt-1 flex-wrap gap-2">
                        <span>
                          Reported across <strong>{alert.affectedAcres} acres</strong> ({alert.confirmedFarms} neighboring farm confirmations)
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-stone-700 dark:text-zinc-300">
                            Severity: {alert.severity}
                          </span>
                          {onNavigateToScan && (
                            <button
                              onClick={onNavigateToScan}
                              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                            >
                              Scan my field for this threat →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: ICAR / Krishi Vigyan Kendra (KVK) District Threat Intelligence */}
      {activeTab === "district_intel" && (
        <div className="space-y-6">
          {/* District Selector Header */}
          <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Landmark className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <h3 className="text-lg font-black text-stone-900 dark:text-white">
                    ICAR & Krishi Vigyan Kendra (KVK) District Advisory
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-zinc-400">
                    Scientific agro-climatic disease forecast and integrated pest management (IPM) guidelines.
                  </p>
                </div>
              </div>

              {/* District Switcher for Intel */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-600 dark:text-zinc-400">Select District:</span>
                <select
                  value={districtIntelTarget}
                  onChange={(e) => {
                    setDistrictIntelTarget(e.target.value);
                    fetchDistrictIntel(e.target.value);
                  }}
                  className="px-3 py-2 rounded-xl border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-xs font-bold text-stone-900 dark:text-white"
                >
                  {districtsList.map((d) => (
                    <option key={d.district} value={d.district}>
                      {d.district} ({d.state})
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => fetchDistrictIntel(districtIntelTarget)}
                  className="p-2 rounded-xl bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 text-stone-700 dark:text-zinc-300"
                  title="Refresh Advisory"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingIntel ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {loadingIntel ? (
              <div className="p-10 text-center text-xs text-stone-500 dark:text-zinc-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                <span>Loading ICAR / KVK advisory for {districtIntelTarget}...</span>
              </div>
            ) : districtIntelData ? (
              <div className="space-y-5 pt-2">
                {/* District Overview Header Card */}
                <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-700 text-white">
                        {districtIntelData.district}, {districtIntelData.state}
                      </span>
                      <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                        Agro-Climatic Zone: <strong>{districtIntelData.agroClimaticZone}</strong>
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                      Primary Seasonal Threat: <strong>{districtIntelData.primaryThreat}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                        districtIntelData.threatLevel === "Critical"
                          ? "bg-red-600 text-white"
                          : districtIntelData.threatLevel === "High"
                          ? "bg-amber-500 text-white"
                          : "bg-emerald-600 text-white"
                      }`}
                    >
                      {districtIntelData.threatLevel} Outbreak Risk
                    </span>
                  </div>
                </div>

                {/* Weather Trigger & KVK Advisory Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-stone-50 dark:bg-zinc-800/70 border border-stone-200/60 dark:border-zinc-700/60 space-y-2">
                    <div className="flex items-center gap-2 text-stone-900 dark:text-white font-bold text-xs">
                      <CloudRain className="w-4 h-4 text-sky-600" />
                      <span>Local Weather Trigger Factor</span>
                    </div>
                    <p className="text-xs text-stone-700 dark:text-zinc-300 leading-relaxed">
                      {districtIntelData.weatherTrigger}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-stone-50 dark:bg-zinc-800/70 border border-stone-200/60 dark:border-zinc-700/60 space-y-2">
                    <div className="flex items-center gap-2 text-stone-900 dark:text-white font-bold text-xs">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Vulnerable Crops in this District</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {districtIntelData.vulnerableCrops.map((crop, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 text-stone-800 dark:text-zinc-200"
                        >
                          🌾 {crop}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* KVK Direct Advisory Directive */}
                <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-2.5 text-xs text-amber-950 dark:text-amber-200">
                  <div className="font-extrabold text-sm text-amber-900 dark:text-amber-300 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-600" />
                    <span>Official Krishi Vigyan Kendra (KVK) Advisory</span>
                  </div>
                  <p className="text-xs leading-relaxed text-stone-800 dark:text-zinc-200">
                    {districtIntelData.kvkAdvisoryNote}
                  </p>
                  <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/60">
                    <p className="font-bold text-emerald-800 dark:text-emerald-300">
                      🧪 Recommended District Preventive Spray:
                    </p>
                    <p className="text-stone-800 dark:text-zinc-200 font-semibold mt-0.5">
                      {districtIntelData.recommendedPreventiveAction}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Tab 3: Microclimate 7-Day Predictive Risk */}
      {activeTab === "predictive_risk" && (
        <div className="space-y-6">
          <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-stone-200/80 dark:border-zinc-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-white">
                  Local Microclimate Parameters Used for Disease Modeling
                </h3>
              </div>
              <button
                onClick={fetchPredictiveRisks}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 text-xs font-bold text-stone-700 dark:text-zinc-300"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingPredictive ? "animate-spin" : ""}`} />
                <span>Recalculate Risk</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-stone-50 dark:bg-zinc-800/80 border border-stone-200/60 dark:border-zinc-700/60">
                <p className="text-[11px] font-bold text-stone-500 dark:text-zinc-400">Current Field Temp</p>
                <p className="text-xl font-black text-stone-900 dark:text-white mt-0.5">{weatherConditions.temp}°C</p>
              </div>
              <div className="p-3 rounded-2xl bg-stone-50 dark:bg-zinc-800/80 border border-stone-200/60 dark:border-zinc-700/60">
                <p className="text-[11px] font-bold text-stone-500 dark:text-zinc-400">Relative Humidity</p>
                <p className="text-xl font-black text-sky-700 dark:text-sky-300 mt-0.5">{weatherConditions.humidity}%</p>
              </div>
              <div className="p-3 rounded-2xl bg-stone-50 dark:bg-zinc-800/80 border border-stone-200/60 dark:border-zinc-700/60">
                <p className="text-[11px] font-bold text-stone-500 dark:text-zinc-400">Rain Probability</p>
                <p className="text-xl font-black text-teal-700 dark:text-teal-300 mt-0.5">{weatherConditions.rainProb}%</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {loadingPredictive ? (
              <div className="p-8 text-center text-xs text-stone-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-3xl border border-stone-200 dark:border-zinc-800">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                <span>Computing epidemiological outbreak probabilities...</span>
              </div>
            ) : (
              predictiveRisks.map((item, idx) => {
                const isHigh = item.riskLevel === "Critical" || item.riskLevel === "High";
                return (
                  <div
                    key={idx}
                    className={`p-5 rounded-3xl bg-white dark:bg-zinc-900 border transition-all ${
                      isHigh
                        ? "border-amber-300 dark:border-amber-800/80 shadow-xs"
                        : "border-stone-200/80 dark:border-zinc-800"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-zinc-800">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                              item.riskLevel === "Critical"
                                ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                                : item.riskLevel === "High"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            }`}
                          >
                            {item.riskLevel} Risk ({item.riskScore}%)
                          </span>

                          <span className="text-xs font-bold text-stone-500 dark:text-zinc-400">
                            Crops: {item.crop}
                          </span>
                        </div>
                        <h4 className="text-base sm:text-lg font-black text-stone-900 dark:text-white pt-1">
                          {item.pathogenOrPest}
                        </h4>
                      </div>

                      <div className="w-full sm:w-36 space-y-1">
                        <div className="flex justify-between text-[11px] font-bold text-stone-600 dark:text-zinc-400">
                          <span>Outbreak Risk</span>
                          <span>{item.riskScore}%</span>
                        </div>
                        <div className="w-full bg-stone-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              item.riskScore >= 75
                                ? "bg-red-500"
                                : item.riskScore >= 50
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${item.riskScore}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2.5 text-xs">
                      <div className="p-3 rounded-2xl bg-stone-50 dark:bg-zinc-800/70 text-stone-800 dark:text-zinc-200 space-y-1">
                        <p>
                          <strong>Triggering Weather Condition:</strong> {item.triggerCondition}
                        </p>
                        <p className="text-stone-500 dark:text-zinc-400">
                          <strong>Microclimate Window:</strong> {item.favorableWeather}
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 space-y-1">
                        <p>
                          🛡️ <strong>Cultural Prophylactic Step:</strong> {item.prophylacticMeasure}
                        </p>
                        <p className="font-bold">
                          🧪 <strong>Preventive Bio/Chemical Protection:</strong> {item.preventiveChemicalOrBio}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Report Outbreak Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl my-8 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-black text-base text-stone-900 dark:text-white">
                  Broadcast Outbreak to District Farmers
                </h3>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-500 dark:text-zinc-400">
              Reporting verified pest or disease sightings alerts farmers in your district to take preventive action immediately.
            </p>

            <form onSubmit={handleReportSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-zinc-300 mb-1">
                    District *
                  </label>
                  <select
                    value={reportDistrict}
                    onChange={(e) => setReportDistrict(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-stone-900 dark:text-white font-semibold"
                  >
                    {districtsList.map((d) => (
                      <option key={d.district} value={d.district}>
                        {d.district} ({d.state})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 dark:text-zinc-300 mb-1">
                    Village / Taluka *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Village, Taluka"
                    value={reportVillage}
                    onChange={(e) => setReportVillage(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-stone-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-zinc-300 mb-1">
                  Crop Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maize, Cotton, Tomato, Paddy, Chilli"
                  value={reportCrop}
                  onChange={(e) => setReportCrop(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-zinc-300 mb-1">
                  Pest or Disease Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fall Armyworm, Black Thrips, Late Blight, Stem Borer"
                  value={reportThreat}
                  onChange={(e) => setReportThreat(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-stone-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-zinc-300 mb-1">
                    Threat Category
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-stone-900 dark:text-white font-semibold"
                  >
                    <option value="Pest Infestation">Insect / Pest Attack</option>
                    <option value="Fungal Blight">Fungal Disease / Blight</option>
                    <option value="Bacterial Disease">Bacterial Wilt / Rot</option>
                    <option value="Viral Infection">Viral Leaf Curl</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 dark:text-zinc-300 mb-1">
                    Severity Level
                  </label>
                  <select
                    value={reportSeverity}
                    onChange={(e) => setReportSeverity(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-stone-900 dark:text-white font-semibold"
                  >
                    <option value="Critical">Critical (Severe Field Damage)</option>
                    <option value="High">High (Spreading Rapidly)</option>
                    <option value="Moderate">Moderate (Localized)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-zinc-300 mb-1">
                  Approx Affected Acres
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={reportAcres}
                  onChange={(e) => setReportAcres(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-zinc-300 mb-1">
                  Symptoms & Scouting Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Whorls damaged with holes; small green caterpillars observed in young crop."
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-stone-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 dark:border-zinc-700 text-stone-600 dark:text-zinc-400 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black shadow-md transition-colors"
                >
                  {submittingReport ? "Broadcasting..." : "Broadcast Alert"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
