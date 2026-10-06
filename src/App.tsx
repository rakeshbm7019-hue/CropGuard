import React, { useState, useEffect, useMemo } from "react";
import { Header } from "./components/Header";
import { AuthModal } from "./components/AuthModal";
import { FarmerAuthGate } from "./components/FarmerAuthGate";
import { LandingPage } from "./components/LandingPage";
import { CropScanner } from "./components/CropScanner";
import { MandiPrices } from "./components/MandiPrices";
import { GovtSchemes } from "./components/GovtSchemes";
import { FertilizerShopFinder } from "./components/FertilizerShopFinder";
import { KisanAIAssistant } from "./components/KisanAIAssistant";
import { WeatherWidget } from "./components/WeatherWidget";
import { SoilCropAdvisor } from "./components/SoilCropAdvisor";
import { AdminDashboard } from "./components/AdminDashboard";
import { DiseaseHistoryModal } from "./components/DiseaseHistoryModal";
import { OfflineHandbookModal } from "./components/OfflineHandbookModal";
import { FarmerProfileModal } from "./components/FarmerProfileModal";
import { CommunityOutbreakRadar } from "./components/CommunityOutbreakRadar";
import { SprayDosageCalculator } from "./components/SprayDosageCalculator";
import { SeasonalAdvisor } from "./components/SeasonalAdvisor";
import { AdBanner } from "./components/AdBanner";
import { showInterstitial } from "./lib/admob";
import { DiseaseAnalysisResult, Language, UserProfile, AppTheme } from "./types";
import { APP_THEMES } from "./data/themes";
import {
  checkSupabaseSession,
  signOutSupabase,
  saveScanToSupabase,
  getScansFromSupabase,
  initGlobalRealtimeSubscription,
} from "./lib/supabase";

export default function App() {
  const [currentTab, setCurrentTab] = useState("scan");
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem("cropguard_lang") as Language) || "en";
  });
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("cropguard_theme");
    return saved !== null ? saved === "dark" : false;
  });
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [user, setUser] = useState<UserProfile | null>(() => {
    const savedUser = localStorage.getItem("cropguard_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [scanHistory, setScanHistory] = useState<DiseaseAnalysisResult[]>(() => {
    const savedHist = localStorage.getItem("cropguard_history");
    return savedHist ? JSON.parse(savedHist) : [];
  });

  const currentUserScans = useMemo(() => {
    return scanHistory.filter((scan) => {
      if (!user) return !scan.userId;
      return scan.userId === user.id;
    });
  }, [scanHistory, user]);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [realtimeNotification, setRealtimeNotification] = useState<string | null>(null);
  const [showLanding, setShowLanding] = useState(!user?.isLoggedIn);

  // Auto-detect returning Supabase Session & OAuth Redirects, plus real-time auth changes
  useEffect(() => {
    checkSupabaseSession().then((sbUser) => {
      if (sbUser) {
        setUser(sbUser);
        localStorage.setItem("cropguard_user", JSON.stringify(sbUser));
      }
    });

    // Subscribe to Supabase Realtime changes across crop_scans
    const unsubscribeRealtime = initGlobalRealtimeSubscription((newScan) => {
      if (newScan && newScan.id) {
        setScanHistory((prev) => {
          if (prev.some((s) => s.id === newScan.id)) return prev;
          const formatted: DiseaseAnalysisResult = {
            id: newScan.id,
            crop: newScan.crop,
            diseaseName: newScan.disease_name || newScan.diseaseName || "Scan",
            isHealthy: (newScan.disease_name || newScan.diseaseName || "").toLowerCase().includes("healthy"),
            severity: (newScan.severity as any) || "Medium",
            confidence: Number(newScan.confidence || 95),
            location: newScan.location || "India",
            symptoms: newScan.symptoms || "",
            organicTreatment: newScan.organic_cure ? newScan.organic_cure.split("; ") : [],
            chemicalTreatment: newScan.chemical_cure ? newScan.chemical_cure.split("; ") : [],
            fertilizerAdvice: newScan.fertilizer_advice || "",
            preventiveMeasures: [],
            recommendedProducts: [],
            urgencyNote: "",
            timestamp: newScan.scanned_at || new Date().toISOString(),
          };
          const updated = [formatted, ...prev];
          localStorage.setItem("cropguard_history", JSON.stringify(updated.slice(0, 50)));
          return updated;
        });

        // Trigger gentle real-time alert
        setRealtimeNotification(`⚡ Real-time Scan Synced: ${newScan.crop} (${newScan.disease_name || "Healthy"})`);
        setTimeout(() => setRealtimeNotification(null), 4500);
      }
    });

    return () => {
      unsubscribeRealtime();
    };
  }, []);

  // Monitor Network Online / Offline Status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Save Theme & Language
  useEffect(() => {
    localStorage.setItem("cropguard_lang", language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem("cropguard_theme", isDarkMode ? "dark" : "light");
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Load Supabase cloud scans when user logs in
  useEffect(() => {
    if (user?.id) {
      getScansFromSupabase(user.id).then((cloudScans) => {
        if (cloudScans && cloudScans.length > 0) {
          setScanHistory(cloudScans);
          localStorage.setItem("cropguard_history", JSON.stringify(cloudScans));
        }
      });
    }
  }, [user?.id]);

  const handleSaveScan = (result: DiseaseAnalysisResult) => {
    if (user?.id) {
      result.userId = user.id;
    }
    const updated = [result, ...scanHistory];
    setScanHistory(updated);
    localStorage.setItem("cropguard_history", JSON.stringify(updated));

    if (user?.id) {
      saveScanToSupabase(user.id, result).catch((err) => {
        console.warn("Scan save to Supabase notice:", err);
      });
    }

    // Show interstitial ad after scan is completed
    showInterstitial();
  };

  const handleClearHistory = () => {
    setScanHistory([]);
    localStorage.removeItem("cropguard_history");
  };

  const handleSuccessLogin = (newUser: UserProfile) => {
    setUser(newUser);
    localStorage.setItem("cropguard_user", JSON.stringify(newUser));
    setShowLanding(false);
  };

  const handleLogout = () => {
    signOutSupabase().catch(() => {});
    setUser(null);
    setScanHistory([]);
    setCurrentTab("scan");
    localStorage.removeItem("cropguard_user");
    localStorage.removeItem("cropguard_history");
    setShowLanding(true);
  };

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-200 ${
        isDarkMode
          ? "bg-zinc-950 text-zinc-100"
          : "bg-slate-50 text-stone-900"
      }`}
    >
      {/* Header Bar */}
      <Header
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          if (tab === "admin") {
            setCurrentTab("admin");
          } else {
            setCurrentTab(tab);
          }
        }}
        language={language}
        setLanguage={setLanguage}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        isOnline={isOnline}
        user={user}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenProfile={() => setProfileModalOpen(true)}
        onLogout={handleLogout}
        onOpenAdminModal={() => setCurrentTab("admin")}
        isAdminLoggedIn={isAdminLoggedIn}
      />

      {/* Supabase Realtime Floating Toast Notification */}
      {realtimeNotification && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-emerald-600 text-white shadow-xl text-xs font-semibold border border-emerald-400/40">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span>{realtimeNotification}</span>
            <button
              onClick={() => setRealtimeNotification(null)}
              className="ml-2 hover:bg-emerald-700/60 p-1 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {showLanding && currentTab !== "admin" ? (
          <LandingPage
            onGetStarted={() => setShowLanding(false)}
            onOpenAdmin={() => {
              setCurrentTab("admin");
              setShowLanding(false);
            }}
          />
        ) : !user?.isLoggedIn && currentTab !== "admin" ? (
          <FarmerAuthGate
            language={language}
            onSuccessLogin={handleSuccessLogin}
            onOpenAdmin={() => {
              setCurrentTab("admin");
              setShowLanding(false);
            }}
          />
        ) : (
          <>
            {currentTab === "scan" && (
              <>
                <CropScanner
                  language={language}
                  isOnline={isOnline}
                  onSaveScan={handleSaveScan}
                  onNavigateToShops={() => setCurrentTab("shops")}
                  scanHistory={currentUserScans}
                  user={user}
                />
                <AdBanner slotId="scanner-bottom" />
              </>
            )}

            {currentTab === "outbreaks" && (
              <>
                <CommunityOutbreakRadar
                  language={language}
                  user={user}
                  onNavigateToScan={() => setCurrentTab("scan")}
                />
                <AdBanner slotId="radar-bottom" />
              </>
            )}

            {currentTab === "dosage" && (
              <SprayDosageCalculator
                language={language}
              />
            )}

            {currentTab === "soil" && <SoilCropAdvisor language={language} user={user} />}

            {currentTab === "weather" && <WeatherWidget language={language} />}

            {currentTab === "mandi" && (
              <>
                <MandiPrices language={language} />
                <AdBanner slotId="mandi-bottom" />
              </>
            )}

            {currentTab === "schemes" && (
              <>
                <GovtSchemes language={language} />
                <AdBanner slotId="schemes-bottom" />
              </>
            )}

            {currentTab === "shops" && <FertilizerShopFinder language={language} user={user} />}

            {currentTab === "ai_agent" && <KisanAIAssistant language={language} user={user} />}

            {currentTab === "alerts" && (
              <div className="max-w-2xl mx-auto">
                <SeasonalAdvisor 
                  language={language} 
                  location={user?.location || "India"} 
                  isOnline={isOnline} 
                />
              </div>
            )}

            {currentTab === "history" && (
              <DiseaseHistoryModal
                history={currentUserScans}
                onClearHistory={handleClearHistory}
                language={language}
              />
            )}

            {currentTab === "offline" && <OfflineHandbookModal language={language} />}
          </>
        )}

        {currentTab === "admin" && (
          <AdminDashboard
            language={language}
            isAdminLoggedIn={isAdminLoggedIn}
            setIsAdminLoggedIn={setIsAdminLoggedIn}
          />
        )}
      </main>

      {/* Minimal Clean Bottom Bar - Offline & Admin Portal Only */}
      <footer className="mt-12 py-6 border-t border-stone-200/80 dark:border-zinc-800 text-xs text-stone-500 dark:text-zinc-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            © {new Date().getFullYear()} CropGuard
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setCurrentTab("offline");
                setShowLanding(false);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="hover:text-stone-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            >
              Offline Handbook
            </button>
            <span className="text-stone-300 dark:text-zinc-700">•</span>
            <button
              onClick={() => {
                setCurrentTab("admin");
                setShowLanding(false);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              id="bottom-admin-portal-link"
              className="inline-flex items-center gap-1.5 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-semibold transition-colors cursor-pointer"
            >
              <span>🛡️</span>
              <span>Admin Portal</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Auth Modal (can also be invoked from header or other buttons) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        language={language}
        onSuccessLogin={handleSuccessLogin}
      />

      {/* Farmer Profile Modal (shows registration details filled by farmer) */}
      {user && (
        <FarmerProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          user={user}
          onUpdateUser={(updated) => {
            setUser(updated);
            localStorage.setItem("cropguard_user", JSON.stringify(updated));
          }}
          onLogout={handleLogout}
          scanCount={currentUserScans.length}
        />
      )}
    </div>
  );
}
