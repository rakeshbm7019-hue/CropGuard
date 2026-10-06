import React, { useState, useEffect, useMemo } from "react";
import {
  MapPin,
  PhoneCall,
  Star,
  CheckCircle,
  Navigation,
  Search,
  ShoppingBag,
  ExternalLink,
  Compass,
  RefreshCw,
  Sparkles,
  Building2,
  ShieldCheck,
  AlertCircle,
  LocateFixed,
  Clock,
  MessageSquareQuote,
  Layers,
  Wrench,
  BadgeCheck,
  UserCheck,
  FileText,
} from "lucide-react";
import { FertilizerShop, Language, UserProfile } from "../types";
import { UI_TRANSLATIONS } from "../data/translations";
import { getTailoredShopsForLocation } from "../data/fertilizerShops";
import { INDIAN_STATES_AND_DISTRICTS } from "../data/indianStatesDistricts";

const cleanLocationName = (str: string): string => {
  if (!str) return "";
  return str
    .replace(/\b(Revenue\s+Division|Sub-Division|Subdivision|District\s+Division|Division|division)\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/,\s*,/g, ",")
    .replace(/^\s*,|\s*,\s*$/g, "")
    .trim();
};

interface FertilizerShopFinderProps {
  language: Language;
  user?: UserProfile | null;
}

interface MapsCitation {
  title: string;
  uri: string;
}

import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin
} from '@vis.gl/react-google-maps';

export const FertilizerShopFinder: React.FC<FertilizerShopFinderProps> = ({
  language,
  user,
}) => {
  const t = UI_TRANSLATIONS[language] || UI_TRANSLATIONS.en;
  const [locationInput, setLocationInput] = useState("");
  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  // Initialize empty and fetch via GPS immediately
  const [shopsList, setShopsList] = useState<FertilizerShop[]>([]);
  const [mapsCitations, setMapsCitations] = useState<MapsCitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [exactGpsDetails, setExactGpsDetails] = useState<{
    lat: number;
    lng: number;
    formattedCoords: string;
    area: string;
    taluk: string;
    district: string;
    state: string;
    provider?: string;
  } | null>(null);
  const [resolvedLocationName, setResolvedLocationName] = useState<string>(
    user?.district ? `${user.taluk ? user.taluk + ", " : ""}${user.district}, ${user.state || "India"}` : "Live Agricultural Zone"
  );
  const [gpsStatusMsg, setGpsStatusMsg] = useState<string | null>(null);
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);

  // State & District manual location override controls
  const [selectedState, setSelectedState] = useState<string>(() => user?.state || "Karnataka");
  const [selectedDistrict, setSelectedDistrict] = useState<string>(() => user?.district || "");
  const [customVillageTaluk, setCustomVillageTaluk] = useState<string>(() => user?.taluk || user?.location || "");
  const [showLocationOverride, setShowLocationOverride] = useState<boolean>(false);

  const allIndianStates = Object.keys(INDIAN_STATES_AND_DISTRICTS);
  const districtsForState = selectedState ? INDIAN_STATES_AND_DISTRICTS[selectedState] || [] : [];

  // Search shops via Google Maps Grounded API
  const fetchRealShops = async (
    searchQueryStr?: string,
    lat?: number,
    lng?: number,
    area?: string,
    taluk?: string,
    district?: string,
    state?: string
  ) => {
    setLoading(true);
    const activeLat = lat ?? userCoords?.lat;
    const activeLng = lng ?? userCoords?.lng;
    const activeArea = area || exactGpsDetails?.area || user?.location || "";
    const activeTaluk = taluk || exactGpsDetails?.taluk || user?.taluk || "";
    const activeDistrict = district || exactGpsDetails?.district || user?.district || "";
    const activeState = state || exactGpsDetails?.state || user?.state || "";

    try {
      const response = await fetch("/api/shops/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQueryStr || "",
          lat: activeLat,
          lng: activeLng,
          language,
          area: activeArea,
          taluk: activeTaluk,
          district: activeDistrict,
          state: activeState,
        }),
      });
      const json = await response.json();
      setLoading(false);

      if (json.success && Array.isArray(json.results) && json.results.length > 0) {
        setShopsList(json.results);
        if (json.locationResolved) {
          setResolvedLocationName(cleanLocationName(json.locationResolved));
        }
        if (json.exactGps) {
          setUserCoords({ lat: json.exactGps.lat, lng: json.exactGps.lng });
          setExactGpsDetails((prev) => ({
            lat: json.exactGps.lat,
            lng: json.exactGps.lng,
            formattedCoords: json.exactGps.formattedCoords,
            area: cleanLocationName(json.area || prev?.area || ""),
            taluk: cleanLocationName(json.taluk || prev?.taluk || ""),
            district: cleanLocationName(json.district || prev?.district || ""),
            state: cleanLocationName(json.state || prev?.state || ""),
            provider: json.exactGps.provider || prev?.provider || "High-Precision GPS",
          }));
        }
        if (Array.isArray(json.mapsCitations)) {
          setMapsCitations(json.mapsCitations);
        }
      } else {
        setShopsList(getTailoredShopsForLocation(searchQueryStr || "", activeDistrict, activeState, activeTaluk, activeArea, activeLat, activeLng));
      }
    } catch (err) {
      setLoading(false);
      setShopsList(getTailoredShopsForLocation(searchQueryStr || "", activeDistrict, activeState, activeTaluk, activeArea, activeLat, activeLng));
    }
  };

  // Request GPS Permission from device & reverse-geocode to exact Area, Taluk, District
  const handleRequestGps = (isInitial: boolean = true) => {
    if (!("geolocation" in navigator)) {
      setGpsStatusMsg("GPS Geolocation is not supported by your browser. Please search your location below.");
      if (isInitial) fetchRealShops();
      return;
    }

    if (isInitial && shopsList.length === 0) {
      setLoading(true);
    }
    setGpsStatusMsg("Accessing live GPS coordinates to locate nearest licensed dealers...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserCoords({ lat, lng });
        setIsGpsActive(true);

        // Reverse geocode with high precision server endpoint
        let areaName = "";
        let talukName = "";
        let districtName = "";
        let stateName = "";
        let locLabel = "";
        let providerName = "GPS";

        try {
          const geoRes = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
          const geoData = await geoRes.json();
          if (geoData?.success) {
            areaName = cleanLocationName(geoData.area || "");
            talukName = cleanLocationName(geoData.taluk || "");
            districtName = cleanLocationName(geoData.district || "");
            stateName = cleanLocationName(geoData.state || "");
            locLabel = cleanLocationName(geoData.formattedLocation || "");
            providerName = geoData.provider || "High-Precision GPS";

            setExactGpsDetails({
              lat,
              lng,
              formattedCoords: geoData.formattedCoords || `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
              area: areaName,
              taluk: talukName,
              district: districtName,
              state: stateName,
              provider: providerName,
            });
          }
        } catch (_) {}

        const finalLoc = locLabel || resolvedLocationName;
        setResolvedLocationName(finalLoc);
        setGpsStatusMsg(`📍 Live Farm GPS Connected: ${finalLoc}`);
        fetchRealShops("", lat, lng, areaName, talukName, districtName, stateName);
      },
      (err) => {
        setIsGpsActive(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatusMsg("GPS permission was denied. Showing 20+ verified shops based on your profile region.");
        } else {
          setGpsStatusMsg("Showing 20+ verified shops based on your profile region. You can also search your village, taluk, or district below.");
        }
        if (isInitial) fetchRealShops();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Request GPS location on initial mount and periodically update every 30 minutes
  useEffect(() => {
    handleRequestGps(true);

    // 30-minute location update interval (1,800,000 ms)
    const thirtyMinInterval = setInterval(() => {
      if (!locationInput.trim()) {
        handleRequestGps(false);
      }
    }, 30 * 60 * 1000);

    return () => clearInterval(thirtyMinInterval);
  }, [locationInput]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalQuery = locationInput.trim();

    if (finalQuery) {
      setIsGpsActive(false);
      setGpsStatusMsg(`🔍 Resolving high-precision coordinates and searching shops for: ${finalQuery}`);
      
      // Resolve coordinates upfront via Geocoding API
      try {
        const geoRes = await fetch(`/api/geocode?query=${encodeURIComponent(finalQuery)}`);
        const geoData = await geoRes.json();
        if (geoData?.success && geoData.lat && geoData.lng) {
          setUserCoords({ lat: geoData.lat, lng: geoData.lng });
          setExactGpsDetails({
            lat: geoData.lat,
            lng: geoData.lng,
            formattedCoords: `${geoData.lat.toFixed(4)}°N, ${geoData.lng.toFixed(4)}°E`,
            area: geoData.area || "",
            taluk: geoData.taluk || "",
            district: geoData.district || "",
            state: geoData.state || "",
            provider: geoData.provider || "Geocoding API",
          });
          if (geoData.formattedAddress) {
            setResolvedLocationName(geoData.formattedAddress);
          }
          fetchRealShops(finalQuery, geoData.lat, geoData.lng, geoData.area, geoData.taluk, geoData.district, geoData.state);
          return;
        }
      } catch (_) {}

      fetchRealShops(finalQuery);
    } else {
      handleRequestGps(true);
    }
  };

  const handleApplyManualLocation = async (stateOverride?: string, distOverride?: string, villageOverride?: string) => {
    const st = stateOverride !== undefined ? stateOverride : selectedState;
    const dst = distOverride !== undefined ? distOverride : selectedDistrict;
    const vlg = villageOverride !== undefined ? villageOverride : customVillageTaluk;

    setIsGpsActive(false);
    const locLabel = [vlg, dst, st].filter(Boolean).join(", ");
    setResolvedLocationName(locLabel || "Selected Agricultural Zone");
    setGpsStatusMsg(`📍 Geocoding precise coordinates for: ${locLabel}...`);

    const queryStr = vlg ? `${vlg}, ${dst}, ${st}` : (dst ? `${dst}, ${st}` : st);
    
    // Call high-precision Geocoding API to resolve exact farm/market coordinates
    try {
      const geoRes = await fetch(`/api/geocode?query=${encodeURIComponent(queryStr)}`);
      const geoData = await geoRes.json();
      if (geoData?.success && geoData.lat && geoData.lng) {
        setUserCoords({ lat: geoData.lat, lng: geoData.lng });
        setExactGpsDetails({
          lat: geoData.lat,
          lng: geoData.lng,
          formattedCoords: `${geoData.lat.toFixed(4)}°N, ${geoData.lng.toFixed(4)}°E`,
          area: vlg || geoData.area || "",
          taluk: vlg || geoData.taluk || "",
          district: dst || geoData.district || "",
          state: st || geoData.state || "",
          provider: geoData.provider || "Precision Geocoder",
        });
        setGpsStatusMsg(`📍 Precision Coordinates Resolved (${geoData.lat.toFixed(4)}°N, ${geoData.lng.toFixed(4)}°E): ${geoData.formattedAddress || locLabel}`);
        fetchRealShops(queryStr, geoData.lat, geoData.lng, vlg, vlg, dst, st);
        return;
      }
    } catch (_) {}

    fetchRealShops(queryStr, undefined, undefined, vlg, vlg, dst, st);
  };

  // Filter shops by category and enforce strict proximity & same district/taluk
  const displayedShops = useMemo(() => {
    const currentDistrict = (exactGpsDetails?.district || selectedDistrict || "").toLowerCase().trim();
    const currentTaluk = (exactGpsDetails?.taluk || customVillageTaluk || "")
      .toLowerCase()
      .replace(/\b(taluk|tq)\b/gi, "")
      .trim();

    const filtered = shopsList.filter((shop) => {
      // 1. Strict District Exclusion:
      // If user's district is known, discard any shop whose district doesn't match
      if (currentDistrict) {
        const sDist = (shop.district || "").toLowerCase().trim();
        const sAddr = (shop.address || "").toLowerCase();
        const sName = (shop.name || "").toLowerCase();
        const matchesDist =
          sDist.includes(currentDistrict) ||
          currentDistrict.includes(sDist) ||
          sAddr.includes(currentDistrict) ||
          sName.includes(currentDistrict);
        if (!matchesDist) {
          return false;
        }
      }

      // 2. Strict Taluk & Distance Exclusion:
      // Do not show distant shops from different taluks
      const shopDistKm = Number(shop.distanceKm) || 0;
      if (currentTaluk && shopDistKm > 15) {
        const sTlk = (shop.taluk || "").toLowerCase().replace(/\b(taluk|tq)\b/gi, "").trim();
        const sAddr = (shop.address || "").toLowerCase();
        const matchesTaluk = sTlk.includes(currentTaluk) || currentTaluk.includes(sTlk) || sAddr.includes(currentTaluk);
        if (!matchesTaluk) {
          return false;
        }
      }

      // Discard any shop further than 25 km from live GPS coordinates
      if (userCoords && shopDistKm > 25) {
        return false;
      }

      // 3. Category filter
      if (activeCategoryFilter === "iffco") {
        return (
          shop.name.toLowerCase().includes("iffco") ||
          shop.name.toLowerCase().includes("cooperative") ||
          shop.name.toLowerCase().includes("kisan seva") ||
          shop.inventory.some((i) => i.toLowerCase().includes("nano"))
        );
      }
      if (activeCategoryFilter === "bio") {
        return (
          shop.name.toLowerCase().includes("bio") ||
          shop.inventory.some((i) => i.toLowerCase().includes("trichoderma") || i.toLowerCase().includes("neem") || i.toLowerCase().includes("organic"))
        );
      }
      if (activeCategoryFilter === "pesticides") {
        return (
          shop.name.toLowerCase().includes("pesticide") ||
          shop.inventory.some((i) => i.toLowerCase().includes("fungicide") || i.toLowerCase().includes("blitox") || i.toLowerCase().includes("mancozeb") || i.toLowerCase().includes("spray"))
        );
      }
      return true;
    });

    // Strictly sort by nearest distance first
    return filtered.sort((a, b) => (Number(a.distanceKm) || 0) - (Number(b.distanceKm) || 0));
  }, [shopsList, activeCategoryFilter, exactGpsDetails?.district, exactGpsDetails?.taluk, selectedDistrict, customVillageTaluk, userCoords]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Exact Live GPS Location Status Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-zinc-900 dark:to-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-xs font-black shadow-xs">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              <span>{isGpsActive ? "Exact Live GPS Connected" : "GPS Location Ready"}</span>
            </span>

            {exactGpsDetails?.formattedCoords && (
              <span className="text-xs font-mono font-bold text-emerald-900 dark:text-emerald-300 bg-white/80 dark:bg-zinc-800/80 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-700 flex items-center gap-1">
                <LocateFixed className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{exactGpsDetails.formattedCoords}</span>
              </span>
            )}

            {exactGpsDetails?.provider && (
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/90 px-2.5 py-0.5 rounded-xl border border-emerald-300 dark:border-emerald-700">
                {exactGpsDetails.provider}
              </span>
            )}
          </div>

          <div className="text-xs text-stone-700 dark:text-zinc-200 flex items-center gap-2 flex-wrap pt-0.5">
            <span className="font-bold text-stone-900 dark:text-white flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Resolved Region:</span>
            </span>
            <span className="font-semibold text-emerald-800 dark:text-emerald-300">
              {resolvedLocationName}
            </span>
            {exactGpsDetails?.lat && exactGpsDetails?.lng && (
              <a
                href={`https://www.google.com/maps?q=${exactGpsDetails.lat},${exactGpsDetails.lng}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 underline flex items-center gap-0.5 ml-1"
              >
                <span>View on Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {exactGpsDetails && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
              {exactGpsDetails.area && (
                <span className="px-2 py-0.5 rounded-md bg-white/90 dark:bg-zinc-800 text-stone-800 dark:text-zinc-200 font-semibold border border-stone-200 dark:border-zinc-700">
                  📍 Area: {exactGpsDetails.area}
                </span>
              )}
              {exactGpsDetails.taluk && (
                <span className="px-2 py-0.5 rounded-md bg-white/90 dark:bg-zinc-800 text-stone-800 dark:text-zinc-200 font-semibold border border-stone-200 dark:border-zinc-700">
                  🏛️ Taluk: {exactGpsDetails.taluk}
                </span>
              )}
              {exactGpsDetails.district && (
                <span className="px-2 py-0.5 rounded-md bg-white/90 dark:bg-zinc-800 text-stone-800 dark:text-zinc-200 font-semibold border border-stone-200 dark:border-zinc-700">
                  🏢 District: {exactGpsDetails.district}
                </span>
              )}
              {exactGpsDetails.state && (
                <span className="px-2 py-0.5 rounded-md bg-white/90 dark:bg-zinc-800 text-stone-800 dark:text-zinc-200 font-semibold border border-stone-200 dark:border-zinc-700">
                  🇮🇳 {exactGpsDetails.state}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowLocationOverride(!showLocationOverride)}
            className={`px-3 py-2 rounded-2xl font-bold text-xs border flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0 ${
              showLocationOverride
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white dark:bg-zinc-800 text-stone-700 dark:text-zinc-200 border-stone-300 dark:border-zinc-700 hover:bg-stone-50"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Select State / District</span>
          </button>

          <button
            type="button"
            onClick={() => handleRequestGps(false)}
            className="px-4 py-2 rounded-2xl bg-white dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-zinc-700 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-300 dark:border-emerald-700 flex items-center gap-2 transition-all shadow-xs cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{isGpsActive ? "Refresh Exact GPS" : "Detect My Exact GPS"}</span>
          </button>
        </div>
      </div>

      {/* Manual State/District/Taluk Picker Accordion/Panel */}
      {showLocationOverride && (
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-emerald-300/80 dark:border-emerald-800/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Set Your Exact Location (State, District & Village/Taluk):</span>
            </h4>
            <span className="text-[11px] text-stone-500 dark:text-zinc-400">
              Useful if browser GPS is imprecise
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* State Select */}
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 dark:text-zinc-300 mb-1">
                State:
              </label>
              <select
                value={selectedState}
                onChange={(e) => {
                  const newState = e.target.value;
                  setSelectedState(newState);
                  const firstDist = INDIAN_STATES_AND_DISTRICTS[newState]?.[0] || "";
                  setSelectedDistrict(firstDist);
                }}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-xs text-stone-900 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {allIndianStates.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* District Select */}
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 dark:text-zinc-300 mb-1">
                District:
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-xs text-stone-900 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">-- Choose District --</option>
                {districtsForState.map((dst) => (
                  <option key={dst} value={dst}>
                    {dst}
                  </option>
                ))}
              </select>
            </div>

            {/* Village / Taluk Input */}
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 dark:text-zinc-300 mb-1">
                Village / Taluk / APMC:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={selectedDistrict === "Hassan" ? "e.g. Alur, Magge, Palya..." : "e.g. Athani, Shirhatti, Alur..."}
                  value={customVillageTaluk}
                  onChange={(e) => setCustomVillageTaluk(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-xs text-stone-900 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleApplyManualLocation()}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-xs cursor-pointer"
                >
                  Apply
                </button>
              </div>

              {selectedDistrict === "Hassan" && (
                <div className="flex items-center gap-1.5 flex-wrap pt-2">
                  <span className="text-[10px] text-stone-500 dark:text-zinc-400 font-semibold">Hassan Taluks:</span>
                  {["Alur", "Sakleshpur", "Belur", "Arkalgud", "Holenarasipur", "Channarayapatna", "Arsikere", "Hassan"].map((tName) => (
                    <button
                      key={tName}
                      type="button"
                      onClick={() => {
                        const val = `${tName} Taluk`;
                        setCustomVillageTaluk(val);
                        handleApplyManualLocation(selectedState, selectedDistrict, val);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                        customVillageTaluk.toLowerCase().includes(tName.toLowerCase())
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                      }`}
                    >
                      {tName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Step-by-Step Guide on How to Update Coordinates in App */}
          <div className="mt-3 pt-3 border-t border-emerald-100 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-2xl text-[11px] text-stone-600 dark:text-zinc-300 space-y-1">
            <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>How to update your location in this app:</span>
            </span>
            <ul className="list-disc list-inside space-y-0.5 text-stone-600 dark:text-zinc-400">
              <li>
                <strong className="text-stone-800 dark:text-zinc-200">Device GPS:</strong> Tap "Detect My Exact GPS" above and allow browser location access for high-precision satellite coordinates.
              </li>
              <li>
                <strong className="text-stone-800 dark:text-zinc-200">Village/Taluka Selection:</strong> Select your State & District, type your Village or APMC yard above, and click <strong className="text-emerald-700 dark:text-emerald-300">Apply</strong>. The app geocodes exact coordinates and sorts all shops by road proximity.
              </li>
              <li>
                <strong className="text-stone-800 dark:text-zinc-200">Custom Search:</strong> Type any town, mandal, or market into the search bar below to re-center the catalog on demand.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Single Location Search Form with subtle 30s Live GPS indicator */}
      <form
        onSubmit={handleSearchSubmit}
        className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-stone-200/80 dark:border-zinc-800 shadow-xs space-y-3"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Search Shops by Custom Village, Taluka, or APMC Market:</span>
          </h3>

          <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200/80 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live GPS Auto-Sync (Every 30 min)</span>
          </div>
        </div>

        {/* Single Primary Search Bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder={t.searchShopPlaceholder || "Enter village, taluka, APMC market or city name..."}
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-stone-50 dark:bg-zinc-800/80 border border-stone-200 dark:border-zinc-700 text-xs sm:text-sm text-stone-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span>{t.fetchShopsButton || "Find Local Shops"}</span>
          </button>
        </div>
      </form>

      {/* Filter Category Pills */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveCategoryFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeCategoryFilter === "all"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white dark:bg-zinc-800 text-stone-600 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-700 border border-stone-200 dark:border-zinc-700"
            }`}
          >
            All 20+ Verified Shops ({shopsList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategoryFilter("iffco")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeCategoryFilter === "iffco"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white dark:bg-zinc-800 text-stone-600 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-700 border border-stone-200 dark:border-zinc-700"
            }`}
          >
            IFFCO & Co-op Centers
          </button>
          <button
            type="button"
            onClick={() => setActiveCategoryFilter("bio")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeCategoryFilter === "bio"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white dark:bg-zinc-800 text-stone-600 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-700 border border-stone-200 dark:border-zinc-700"
            }`}
          >
            Bio & Organic Fertilizers
          </button>
          <button
            type="button"
            onClick={() => setActiveCategoryFilter("pesticides")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeCategoryFilter === "pesticides"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white dark:bg-zinc-800 text-stone-600 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-700 border border-stone-200 dark:border-zinc-700"
            }`}
          >
            Pesticide & Spray Specialists
          </button>
        </div>

        <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800">
          Showing {displayedShops.length} of {shopsList.length} shops
        </div>
      </div>

      {loading && (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 text-stone-500 dark:text-zinc-400 space-y-3">
          <RefreshCw className="w-8 h-8 mx-auto text-emerald-600 dark:text-emerald-400 animate-spin" />
          <p className="text-sm font-semibold">
            Querying Google Maps & identifying 20+ licensed fertilizer, seed & pesticide stores for your location...
          </p>
        </div>
      )}

      {/* Verified Shops Grid with Exact Area, Taluk, District & Google Maps Place Data */}
      {!loading && (
        <div className="space-y-4">
          {/* Google Maps Visual Representation */}
          {mapsApiKey && displayedShops.length > 0 && userCoords && (
            <div className="w-full h-72 sm:h-96 rounded-3xl overflow-hidden border border-stone-200 dark:border-zinc-800 shadow-sm relative z-0">
              <APIProvider apiKey={mapsApiKey}>
                <Map
                  key={`${userCoords.lat}-${userCoords.lng}`}
                  defaultCenter={{ lat: userCoords.lat, lng: userCoords.lng }}
                  defaultZoom={12}
                  mapId="DEMO_MAP_ID"
                  gestureHandling={"greedy"}
                  disableDefaultUI={false}
                >
                  <AdvancedMarker position={{ lat: userCoords.lat, lng: userCoords.lng }} title="Your Farm GPS Location">
                    <div className="relative flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-sky-500/30 animate-ping absolute"></div>
                      <div className="w-5 h-5 rounded-full bg-sky-600 border-2 border-white shadow-lg flex items-center justify-center text-[10px] text-white font-bold">
                        📍
                      </div>
                    </div>
                  </AdvancedMarker>

                  {displayedShops.map((shop) => (
                    shop.lat && shop.lng ? (
                      <AdvancedMarker
                        key={shop.id}
                        position={{ lat: shop.lat, lng: shop.lng }}
                        title={`${shop.name} (${shop.ownerName || 'Licensed Dealer'})`}
                        onClick={() => setSelectedShopId(shop.id)}
                      >
                        <Pin
                          background={selectedShopId === shop.id ? '#f59e0b' : '#059669'}
                          borderColor={selectedShopId === shop.id ? '#b45309' : '#047857'}
                          glyphColor={'#fff'}
                          scale={selectedShopId === shop.id ? 1.25 : 1}
                        />
                      </AdvancedMarker>
                    ) : null
                  ))}
                </Map>
              </APIProvider>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedShops.map((shop) => {
            const isSelected = selectedShopId === shop.id;
            const destinationStr = shop.lat && shop.lng
              ? `${shop.lat},${shop.lng}`
              : encodeURIComponent(`${shop.name}, ${shop.address}, ${shop.area ? shop.area + ", " : ""}${shop.district}, ${shop.state}`);

            const mapsNavUrl = userCoords
              ? `https://www.google.com/maps/dir/?api=1&origin=${userCoords.lat},${userCoords.lng}&destination=${destinationStr}`
              : (shop.mapsUri || `https://www.google.com/maps/dir/?api=1&destination=${destinationStr}`);

            return (
              <div
                key={shop.id}
                id={`shop-card-${shop.id}`}
                onClick={() => setSelectedShopId(shop.id)}
                className={`p-6 rounded-3xl bg-white dark:bg-zinc-900 border transition-all hover:shadow-md cursor-pointer flex flex-col justify-between space-y-4 text-stone-900 dark:text-zinc-100 ${
                  isSelected
                    ? "border-2 border-emerald-500 ring-4 ring-emerald-500/15 shadow-md dark:border-emerald-400"
                    : "border-stone-200/80 dark:border-zinc-800 hover:border-emerald-500/80 shadow-xs"
                }`}
              >
                <div className="space-y-3">
                  {/* Header: Name, Verified Badge & Google Maps Star Rating */}
                  <div className="flex items-start justify-between gap-2 border-b border-stone-200/80 dark:border-zinc-800 pb-3">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <a
                          href={mapsNavUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-base font-black text-stone-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                        >
                          <span>{shop.name}</span>
                          <ExternalLink className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
                        </a>
                        {shop.verified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                            <BadgeCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Licensed Dealer</span>
                          </span>
                        )}
                      </div>

                      {/* Proprietor / Owner, License & Dealer Type Details */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-zinc-800 text-stone-800 dark:text-zinc-200 text-xs font-semibold border border-stone-200/70 dark:border-zinc-700">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Owner: <strong className="font-bold text-stone-900 dark:text-white">{shop.ownerName || "Licensed Agricultural Dealer"}</strong></span>
                        </span>

                        {shop.licenseNumber && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px] font-mono font-bold">
                            <FileText className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span>Lic: {shop.licenseNumber}</span>
                          </span>
                        )}

                        {shop.dealerType && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] font-medium">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>{shop.dealerType}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-black">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>{shop.rating}</span>
                      </div>
                      {shop.totalReviews ? (
                        <span className="text-[10px] text-stone-400 dark:text-zinc-500 mt-0.5">
                          ({shop.totalReviews} Google Reviews)
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Exact Location: Area, Taluk, District & GPS Coordinates Badges */}
                  <div className="text-xs text-stone-700 dark:text-zinc-300 space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {shop.area && (
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-zinc-800 text-stone-800 dark:text-zinc-200 text-[11px] font-bold border border-stone-200 dark:border-zinc-700">
                          📍 Area: {cleanLocationName(shop.area)}
                        </span>
                      )}
                      {shop.landmark && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[11px] font-bold border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                          <span>📍 Landmark: {cleanLocationName(shop.landmark)}</span>
                        </span>
                      )}
                      {shop.taluk && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800">
                          🏛️ Taluk: {cleanLocationName(shop.taluk)}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 text-[11px] font-bold border border-sky-200 dark:border-sky-800">
                        🏢 District: {cleanLocationName(shop.district)}
                      </span>
                      {shop.lat && shop.lng && (
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300 text-[10px] font-mono font-semibold border border-stone-200 dark:border-zinc-700 flex items-center gap-1">
                          <LocateFixed className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>{shop.lat.toFixed(4)}°N, {shop.lng.toFixed(4)}°E</span>
                        </span>
                      )}
                    </div>

                    {/* Street Address */}
                    <div className="flex items-start gap-1.5 text-stone-600 dark:text-zinc-300">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>
                        {cleanLocationName(shop.address || shop.landmark || "Local Agricultural Market")}
                        {shop.area && !shop.address?.includes(shop.area) ? `, ${cleanLocationName(shop.area)}` : ""}
                        {shop.taluk && !shop.address?.includes(shop.taluk) ? `, ${cleanLocationName(shop.taluk)}` : ""}
                        {shop.district && !shop.address?.includes(shop.district) ? `, ${cleanLocationName(shop.district)}` : ""}
                        {shop.state && !shop.address?.includes(shop.state) ? `, ${cleanLocationName(shop.state)}` : ""}
                        {shop.pincode ? ` - ${shop.pincode}` : ""}
                      </span>
                    </div>

                    {/* Distance & Hours */}
                    <div className="flex items-center justify-between text-[11px] pl-5 flex-wrap gap-1">
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        <span>
                          {userCoords ? `Exact ${shop.distanceKm} km from your farm coordinates` : `Approx. ${shop.distanceKm} km from local center`}
                        </span>
                      </span>
                      {shop.openingHours && (
                        <span className="text-stone-500 dark:text-zinc-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-stone-400" />
                          <span>{shop.openingHours}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Google Maps Review Snippet */}
                  {shop.reviewSnippet && (
                    <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                      <MessageSquareQuote className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-relaxed italic">
                        "{shop.reviewSnippet}"
                      </p>
                    </div>
                  )}

                  {/* Available Stock Inventory */}
                  <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-zinc-800/80 border border-stone-200/80 dark:border-zinc-800/80 space-y-1.5 text-xs">
                    <div className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Verified Stock Available:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {shop.inventory?.map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 rounded-lg bg-white dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-[11px] font-semibold text-stone-700 dark:text-zinc-300"
                        >
                          {item}
                        </span>
                      ))}
                    </div>

                    {/* Services Offered */}
                    {shop.servicesOffered && shop.servicesOffered.length > 0 && (
                      <div className="pt-2 border-t border-stone-200/60 dark:border-zinc-700/60 flex items-center gap-1.5 flex-wrap text-[11px] text-stone-600 dark:text-zinc-400">
                        <span className="font-bold text-stone-700 dark:text-zinc-300 flex items-center gap-1">
                          <Wrench className="w-3 h-3 text-emerald-600" />
                          <span>Services:</span>
                        </span>
                        {shop.servicesOffered.map((svc, sIdx) => (
                          <span key={sIdx} className="bg-stone-200/60 dark:bg-zinc-700/60 px-2 py-0.5 rounded text-[10px]">
                            {svc}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons: Phone & Google Maps Navigation */}
                <div className="pt-3 border-t border-stone-200/80 dark:border-zinc-800 grid grid-cols-2 gap-2 text-xs font-bold">
                  <a
                    href={`tel:${shop.phone}`}
                    className="py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Call ({shop.phone})</span>
                  </a>

                  <a
                    href={mapsNavUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="py-3 rounded-2xl bg-stone-50 hover:bg-stone-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-stone-200 dark:border-zinc-700 text-stone-800 dark:text-emerald-300 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Navigation className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{userCoords ? "Navigate via GPS" : "Open in Google Maps"}</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      )}

      {!loading && shopsList.length === 0 && (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 shadow-xs space-y-2">
          <AlertCircle className="w-8 h-8 text-stone-400 mx-auto" />
          <p className="text-base font-bold text-stone-700 dark:text-zinc-300">
            No local dealers found for this query.
          </p>
          <p className="text-xs text-stone-500 dark:text-zinc-400">
            Try searching by District or click "Detect My Exact GPS".
          </p>
        </div>
      )}
    </div>
  );
};

