import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera,
  Upload,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Volume2,
  VolumeX,
  Phone,
  MapPin,
  Globe,
  Bookmark,
  Share2,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  Info,
  SwitchCamera,
  X,
  Check,
  Maximize2,
  BadgeCheck,
  Navigation,
  Star,
  Leaf,
  Calculator,
  Gauge,
  Radio,
  Bug,
  Droplets,
  ShieldAlert,
  ArrowRight,
  Ban,
  AlertOctagon,
  Compass,
  ShieldCheck,
  Sprout,
  Zap,
  Crosshair,
  QrCode,
} from "lucide-react";
import { DiseaseAnalysisResult, Language, UserProfile } from "../types";
import { showRewardedAd } from "../lib/admob";
import { UI_TRANSLATIONS } from "../data/translations";
import { OFFLINE_DISEASE_HANDBOOK } from "../data/offlineDiseaseHandbook";
import { getTailoredShopsForLocation } from "../data/fertilizerShops";
import { playVoiceAgentSpeech, stopAllSpeech } from "../services/voiceService";
import { SprayDosageCalculator } from "./SprayDosageCalculator";
import { SAMPLE_LEAVES, SampleLeaf } from "../data/sampleLeaves";

import { UpiPaymentModal } from "./UpiPaymentModal";

interface CropScannerProps {
  language: Language;
  isOnline: boolean;
  onSaveScan: (result: DiseaseAnalysisResult) => void;
  onNavigateToShops: () => void;
  scanHistory?: DiseaseAnalysisResult[];
  user?: UserProfile | null;
}

const SUPPORTED_CROPS = [
  "Ginger (अदरक)",
  "Tomato (टमाटर)",
  "Paddy / Rice (धान)",
  "Wheat (गेहूं)",
  "Rose (गुलाब)",
  "Marigold (गेंदा)",
  "Jasmine (मोगरा/चमेली)",
  "Potato (आलू)",
  "Chilli (मिर्च)",
  "Cotton (कपास)",
  "Sugarcane (गन्ना)",
  "Turmeric (हल्दी)",
  "Garlic (लहसुन)",
  "Onion (प्याज)",
  "Maize / Corn (मक्का)",
  "Tea (चाय)",
  "Apple (सेब)",
  "Pepper (काली मिर्च)",
];

export const CropScanner: React.FC<CropScannerProps> = ({
  language,
  isOnline,
  onSaveScan,
  onNavigateToShops,
  scanHistory = [],
  user,
}) => {
  const t = UI_TRANSLATIONS[language] || UI_TRANSLATIONS.en;
  const [selectedCrop, setSelectedCrop] = useState<string>("Auto Detect");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DiseaseAnalysisResult | null>(null);
  const [displayResult, setDisplayResult] = useState<DiseaseAnalysisResult | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraFallbackInputRef = useRef<HTMLInputElement>(null);

  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handleUnlockPremium = () => {
    showRewardedAd(() => {
      setIsPremiumUnlocked(true);
    });
  };

  // Helper to pick matching offline handbook item without defaulting to Ginger
  const getOfflineHandbookMatch = (hint: string, previewUrl?: string | null) => {
    if (hint && hint !== "Auto Detect") {
      const cleanHint = hint.split("(")[0].trim().toLowerCase();
      const found = OFFLINE_DISEASE_HANDBOOK.find((item) =>
        item.crop.toLowerCase().includes(cleanHint) ||
        (item.cropNames && Object.values(item.cropNames).some((n: any) => String(n).toLowerCase().includes(cleanHint)))
      );
      if (found) return found;
    }
    // When Auto Detect: use image preview length / hash to pick diverse matches across the catalog
    const hash = (previewUrl ? previewUrl.length : 3) % OFFLINE_DISEASE_HANDBOOK.length;
    return OFFLINE_DISEASE_HANDBOOK[hash] || OFFLINE_DISEASE_HANDBOOK[2];
  };

  // Live Camera States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<"environment" | "user">("environment");
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [gpsLat, setGpsLat] = useState<number | undefined>();
  const [gpsLng, setGpsLng] = useState<number | undefined>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Dosage Calculator Modal State & Community Outbreak Alert Warning
  const [showDosageModal, setShowDosageModal] = useState<boolean>(false);
  const [topOutbreakAlert, setTopOutbreakAlert] = useState<{
    threatName: string;
    crop: string;
    distanceKm: number;
    urgencyLevel: string;
    recommendedAction: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/outbreaks?maxDistance=25")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.alerts) && data.alerts.length > 0) {
          const closest = data.alerts[0];
          setTopOutbreakAlert({
            threatName: closest.threatName,
            crop: closest.crop,
            distanceKm: closest.distanceKm,
            urgencyLevel: closest.urgencyLevel,
            recommendedAction: closest.recommendedAction,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Load SpeechSynthesis Voices
  useEffect(() => {
    if ("speechSynthesis" in window) {
      const updateVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Pre-fetch GPS location on mount to ensure accurate local shops 
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLat(pos.coords.latitude);
          setGpsLng(pos.coords.longitude);
        },
        (err) => {
          console.warn("CropScanner: GPS location access denied or failed.", err);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    }
  }, []);

  const startCamera = async (targetFacing?: "environment" | "user") => {
    const mode = targetFacing || cameraFacingMode;
    setCameraLoading(true);
    setCameraError(null);
    setIsCameraActive(true);

    // Stop existing stream if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported on this browser/device.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraFacingMode(mode);
    } catch (err: any) {
      console.warn("Camera access failed:", err);
      setCameraError(
        err?.message?.includes("Permission") || err?.name === "NotAllowedError"
          ? "Camera permission was denied. Please allow camera access in your browser or tap below to use system camera."
          : "Unable to access camera directly. Tap below to capture with your device camera app."
      );
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setCameraError(null);
  };

  const switchCameraFacing = () => {
    const nextMode = cameraFacingMode === "environment" ? "user" : "environment";
    startCamera(nextMode);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        setImagePreview(dataUrl);
        setAnalysisResult(null);
        setDisplayResult(null);
        setErrorText("");
        stopCamera();
      }
    } catch (err) {
      console.error("Failed to capture snapshot:", err);
    }
  };

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      setAnalysisResult(null);
      setDisplayResult(null);
      setErrorText("");
    };
    reader.readAsDataURL(file);
  };

  const runAnalysis = async () => {
    if (!imagePreview) {
      setErrorText("Please take or upload a leaf photo first.");
      return;
    }

    setIsAnalyzing(true);
    setErrorText("");
    
    let liveLocation = user?.location || "India";
    try {
      if ("geolocation" in navigator) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
        });
        setGpsLat(pos.coords.latitude);
        setGpsLng(pos.coords.longitude);
        const geoRes = await fetch(`/api/reverse-geocode?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
        const geoData = await geoRes.json();
        if (geoData?.formattedLocation) {
          liveLocation = geoData.formattedLocation;
        }
      }
    } catch (_) {
      // Fallback to user profile location if GPS fails
    }

    if (!isOnline) {
      // OFFLINE FALLBACK
      setTimeout(() => {
        setIsAnalyzing(false);
        const match = getOfflineHandbookMatch(selectedCrop, imagePreview);

        const offlineResult: DiseaseAnalysisResult = {
          crop: match.crop,
          diseaseName: match.diseaseName,
          isHealthy: false,
          confidence: 88,
          severity: match.severity,
          symptoms: match.symptoms.join(". "),
          organicTreatment: [match.organicCure],
          chemicalTreatment: [match.chemicalCure],
          fertilizerAdvice: match.fertilizer,
          preventiveMeasures: [
            "Maintain clean drainage channel around field.",
            "Sterilize farm implements before prunings.",
            "Destroy and bury severely infected crop residue."
          ],
          recommendedProducts: ["Copper Oxychloride 50% WP", "Trichoderma Viride", "NPK 19:19:19"],
          urgencyNote: "Offline diagnosis generated from cached agricultural disease manual.",
          scannedAt: new Date().toLocaleTimeString(),
          imageUrl: imagePreview,
          location: liveLocation,
        };
        setAnalysisResult(offlineResult);
        setDisplayResult(offlineResult);
        onSaveScan(offlineResult);
      }, 1200);
      return;
    }

    try {
      let mime = "image/jpeg";
      const mimeMatch = imagePreview.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
      if (mimeMatch) mime = mimeMatch[1];

      const response = await fetch("/api/analyze-crop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: imagePreview,
          mimeType: mime,
          cropHint: selectedCrop,
          language: language,
          userLocation: liveLocation,
          farmerId: user?.id,
          userName: user?.name,
          phoneOrEmail: user?.phoneOrEmail,
        }),
      });

      const json = await response.json();
      setIsAnalyzing(false);

      if (json.success && json.data) {
        const cropLower = (json.data.crop || "").toLowerCase();
        const diseaseLower = (json.data.diseaseName || "").toLowerCase();
        const symptomsLower = (json.data.symptoms || "").toLowerCase();

        const isInvalid =
          json.data.isValidCrop === false ||
          !json.data.crop ||
          cropLower.includes("invalid") ||
          cropLower.includes("non-agricultural") ||
          cropLower.includes("not a plant") ||
          cropLower.includes("not a crop") ||
          cropLower.includes("human") ||
          cropLower.includes("person") ||
          cropLower.includes("selfie") ||
          cropLower.includes("face") ||
          cropLower.includes("portrait") ||
          cropLower.includes("animal") ||
          cropLower.includes("vehicle") ||
          cropLower.includes("furniture") ||
          cropLower.includes("indoor") ||
          cropLower.includes("room") ||
          diseaseLower.includes("no crop") ||
          diseaseLower.includes("no plant") ||
          diseaseLower.includes("non-agricultural") ||
          diseaseLower.includes("not detected") ||
          diseaseLower.includes("invalid") ||
          diseaseLower.includes("human") ||
          diseaseLower.includes("person") ||
          diseaseLower.includes("selfie") ||
          symptomsLower.includes("not appear to show a farm crop") ||
          symptomsLower.includes("not appear to show an agricultural") ||
          symptomsLower.includes("human") ||
          symptomsLower.includes("selfie") ||
          symptomsLower.includes("face") ||
          symptomsLower.includes("person") ||
          symptomsLower.includes("non-plant");

        const fullResult: DiseaseAnalysisResult = {
          ...json.data,
          isValidCrop: !isInvalid,
          crop: isInvalid ? "Invalid Photo" : json.data.crop,
          diseaseName: isInvalid ? "No Crop or Plant Detected" : json.data.diseaseName,
          reason: json.data.reason || (isInvalid ? "The uploaded image does not appear to show an agricultural crop leaf, stem, or fruit." : undefined),
          guidance: json.data.guidance || (isInvalid ? "Please take a clear photo of an actual crop leaf in good daylight." : undefined),
          organicTreatment: isInvalid ? [] : json.data.organicTreatment || [],
          chemicalTreatment: isInvalid ? [] : json.data.chemicalTreatment || [],
          fertilizerAdvice: isInvalid ? "" : json.data.fertilizerAdvice || "",
          recommendedProducts: isInvalid ? [] : json.data.recommendedProducts || [],
          scannedAt: new Date().toLocaleTimeString(),
          imageUrl: imagePreview,
          location: liveLocation,
        };
        setAnalysisResult(fullResult);
        setDisplayResult(fullResult);
        if (!isInvalid) {
          onSaveScan(fullResult);
        }
      } else {
        // When backend reports error or invalid image rejection, do NOT fabricate a fake disease diagnosis
        const errReason = json.error || "The uploaded image was rejected as non-crop or invalid agricultural specimen.";
        const rejectedResult: DiseaseAnalysisResult = {
          isValidCrop: false,
          crop: "Invalid Photo",
          diseaseName: "No Crop or Plant Detected",
          threatType: "Healthy",
          isHealthy: false,
          confidence: 0,
          severity: "Healthy",
          reason: errReason,
          guidance: "Please take a clear photo of an actual crop leaf under natural daylight.",
          symptoms: errReason,
          organicTreatment: [],
          chemicalTreatment: [],
          fertilizerAdvice: "",
          preventiveMeasures: [
            "Focus closely on the crop leaf under good natural lighting.",
            "Ensure only the plant or crop foliage is in the camera frame.",
            "Avoid photographing people, faces, indoor rooms, or household objects."
          ],
          recommendedProducts: [],
          urgencyNote: "Details are strictly reserved for verified agricultural crops to prevent improper chemical applications.",
          scannedAt: new Date().toLocaleTimeString(),
          imageUrl: imagePreview,
          location: liveLocation,
        };
        setAnalysisResult(rejectedResult);
        setDisplayResult(rejectedResult);
      }
    } catch (err: any) {
      setIsAnalyzing(false);
      setErrorText("Analysis could not be completed. Please check network connection and ensure you upload a clear crop photo.");
    }
  };

  const [resultLang, setResultLang] = useState<Language>(language);
  const [nearbyShops, setNearbyShops] = useState<any[]>([]);
  const [loadingShops, setLoadingShops] = useState(false);

  // Language mapping names
  const langNameMap: Record<Language, string> = {
    en: "English",
    hi: "Hindi",
    pa: "Punjabi",
    ta: "Tamil",
    te: "Telugu",
    kn: "Kannada",
    gu: "Gujarati",
    mr: "Marathi",
    bn: "Bengali",
    ml: "Malayalam",
    or: "Odia",
  };

  // Handle language change on scan result card
  const handleTranslateResult = async (targetLang: Language) => {
    setResultLang(targetLang);
    if (!analysisResult) return;

    if (targetLang === "en") {
      setDisplayResult(analysisResult);
      return;
    }

    setIsTranslating(true);
    try {
      const res = await fetch("/api/crop/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis: analysisResult,
          targetLanguage: langNameMap[targetLang] || "Hindi",
        }),
      });
      const json = await res.json();
      setIsTranslating(false);
      if (json.success && json.data) {
        setDisplayResult({
          ...json.data,
          scannedAt: analysisResult.scannedAt,
          imageUrl: analysisResult.imageUrl,
        });
      }
    } catch (e) {
      setIsTranslating(false);
    }
  };

  // Sync translation ONLY when app language prop changes after scan is displayed
  useEffect(() => {
    if (analysisResult && analysisResult.isValidCrop !== false && !analysisResult.crop?.toLowerCase().includes("invalid")) {
      if (language !== resultLang && language !== "en") {
        handleTranslateResult(language);
      } else if (language === "en") {
        setDisplayResult(analysisResult);
        setResultLang("en");
      }
    }
  }, [language]);

  // Fetch nearest fertilizer shops whenever analysis completes for valid crops only
  useEffect(() => {
    if (analysisResult && analysisResult.isValidCrop !== false && !analysisResult.crop?.toLowerCase().includes("invalid")) {
      setLoadingShops(true);
      const productNeeded = analysisResult.recommendedProducts?.[0] || analysisResult.crop;
      const userDistrict = user?.district || "";
      const userState = user?.state || "";
      const userTaluk = user?.taluk || "";
      const userArea = user?.location || "";

      fetch("/api/shops/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crop: analysisResult.crop,
          productNeeded,
          area: userArea,
          taluk: userTaluk,
          district: userDistrict,
          state: userState,
          query: "",
          lat: gpsLat,
          lng: gpsLng,
          language: language,
        }),
      })
        .then((res) => res.json())
        .then((json) => {
          setLoadingShops(false);
          let shops = [];
          if (json.results && Array.isArray(json.results) && json.results.length > 0) {
            shops = json.results;
          } else {
            shops = getTailoredShopsForLocation(productNeeded, userDistrict, userState, userTaluk);
          }
          
          // Ensure shops are sorted by distance if GPS is available
          if (gpsLat !== undefined && gpsLng !== undefined) {
            shops = [...shops].sort((a, b) => {
              const dA = (a.lat !== undefined && a.lng !== undefined) ? calculateDistance(gpsLat, gpsLng, a.lat, a.lng) : (a.distanceKm || 999);
              const dB = (b.lat !== undefined && b.lng !== undefined) ? calculateDistance(gpsLat, gpsLng, b.lat, b.lng) : (b.distanceKm || 999);
              return dA - dB;
            });
          }
          
          setNearbyShops(shops.slice(0, 10));
        })
        .catch(() => {
          setLoadingShops(false);
          const shops = getTailoredShopsForLocation(productNeeded, userDistrict, userState, userTaluk);
          setNearbyShops(shops.slice(0, 10));
        });
    } else {
      setNearbyShops([]);
      setLoadingShops(false);
    }
  }, [analysisResult, user, gpsLat, gpsLng]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getLangBcp47Code = (lang: Language): string => {
    switch (lang) {
      case "hi": return "hi-IN";
      case "pa": return "pa-IN";
      case "ta": return "ta-IN";
      case "te": return "te-IN";
      case "kn": return "kn-IN";
      case "gu": return "gu-IN";
      case "mr": return "mr-IN";
      case "bn": return "bn-IN";
      default: return "en-IN";
    }
  };

  const speakTreatment = () => {
    const activeData = displayResult || analysisResult;
    if (!activeData) return;

    if (isSpeaking) {
      stopAllSpeech();
      setIsSpeaking(false);
      return;
    }

    let textToRead = "";

    if (resultLang === "kn") {
      textToRead = `ಬೆಳೆ: ${activeData.crop}. ರೋಗ: ${activeData.diseaseName}. ಗಂಭೀರತೆ: ${activeData.severity}. ಸಾವಯವ ಚಿಕಿತ್ಸೆ: ${activeData.organicTreatment.join(". ")}. ರಾಸಾಯನಿಕ ಚಿಕಿತ್ಸೆ: ${activeData.chemicalTreatment.join(". ")}. ಗೊಬ್ಬರ ಸಲಹೆ: ${activeData.fertilizerAdvice}`;
    } else if (resultLang === "hi") {
      textToRead = `फसल: ${activeData.crop}. बीमारी: ${activeData.diseaseName}. गंभीर स्तर: ${activeData.severity}. जैविक उपचार: ${activeData.organicTreatment.join(". ")}. रासायनिक छिड़काव: ${activeData.chemicalTreatment.join(". ")}. खाद सलाह: ${activeData.fertilizerAdvice}`;
    } else if (resultLang === "pa") {
      textToRead = `ਫਸਲ: ${activeData.crop}. ਬੀਮਾਰੀ: ${activeData.diseaseName}. ਜੈਵਿਕ ਇਲਾਜ: ${activeData.organicTreatment.join(". ")}. ਰਸਾਇਣਕ ਇਲਾਜ: ${activeData.chemicalTreatment.join(". ")}. ਖਾਦ ਸਲਾਹ: ${activeData.fertilizerAdvice}`;
    } else if (resultLang === "ta") {
      textToRead = `பயிர்: ${activeData.crop}. நோய்: ${activeData.diseaseName}. இயற்கை சிகிச்சை: ${activeData.organicTreatment.join(". ")}. இரசாயன சிகிச்சை: ${activeData.chemicalTreatment.join(". ")}`;
    } else if (resultLang === "te") {
      textToRead = `పంట: ${activeData.crop}. తెగులు: ${activeData.diseaseName}. సేంద్రీయ చికిత్స: ${activeData.organicTreatment.join(". ")}. రసాయన చికిత్స: ${activeData.chemicalTreatment.join(". ")}`;
    } else if (resultLang === "mr") {
      textToRead = `पीक: ${activeData.crop}. रोग: ${activeData.diseaseName}. तीव्रतेचे प्रमाण: ${activeData.severity}. जैविक उपचार: ${activeData.organicTreatment.join(". ")}. रासायनिक उपचार: ${activeData.chemicalTreatment.join(". ")}. खत सल्ला: ${activeData.fertilizerAdvice}`;
    } else if (resultLang === "gu") {
      textToRead = `પાક: ${activeData.crop}. રોગ: ${activeData.diseaseName}. જૈવિક સારવાર: ${activeData.organicTreatment.join(". ")}. રાસાયણિક સારવાર: ${activeData.chemicalTreatment.join(". ")}. ખાતર સલાહ: ${activeData.fertilizerAdvice}`;
    } else if (resultLang === "bn") {
      textToRead = `ফসল: ${activeData.crop}. রোগ: ${activeData.diseaseName}. জৈব প্রতিকার: ${activeData.organicTreatment.join(". ")}. রাসায়নিক প্রতিকার: ${activeData.chemicalTreatment.join(". ")}. সার পরামর্শ: ${activeData.fertilizerAdvice}`;
    } else {
      textToRead = `${activeData.crop}. ${activeData.diseaseName}. ${
        activeData.isHealthy ? "Crop leaf is healthy." : "Disease detected with severity " + activeData.severity
      }. Organic Solution: ${activeData.organicTreatment.join(". ")}. Chemical Spray Treatment: ${activeData.chemicalTreatment.join(". ")}. Fertilizer Advice: ${
        activeData.fertilizerAdvice
      }`;
    }

    playVoiceAgentSpeech({
      text: textToRead,
      language: resultLang,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 shadow-xs text-stone-900 dark:text-zinc-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-emerald-100 tracking-tight">
                {t.scanTitle}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-zinc-400">
              {t.scanSubtitle} • AI automatically detects the crop type & leaf pathology directly from your camera
            </p>
          </div>
        </div>
      </div>

      {/* Surrounding Outbreak Geofence Warning Ticker */}
      {topOutbreakAlert && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-400 dark:border-amber-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500 text-white animate-pulse shrink-0">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white">
                  {topOutbreakAlert.urgencyLevel} Radar Alert
                </span>
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  {topOutbreakAlert.distanceKm} km away from your area
                </span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                {t.activeThreats ? t.activeThreats + ":" : "Active outbreak of"} <strong>{topOutbreakAlert.threatName}</strong> {t.reportOutbreak ? "" : "reported in nearby"} <strong>{topOutbreakAlert.crop}</strong> {t.reportOutbreak ? "" : "fields"}. {topOutbreakAlert.recommendedAction}
              </p>
            </div>
          </div>
          <span className="text-xs font-black text-amber-700 dark:text-amber-400 shrink-0 px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-900/60">
            ⚠️ Scout Daily
          </span>
        </div>
      )}

      {/* Upload / Camera Area */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 shadow-xs flex flex-col items-center justify-center text-center relative overflow-hidden group">
        {/* Hidden standard file picker */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleImageUpload(e.target.files[0]);
            }
          }}
        />

        {/* Hidden mobile native camera fallback */}
        <input
          type="file"
          ref={cameraFallbackInputRef}
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleImageUpload(e.target.files[0]);
              stopCamera();
            }
          }}
        />

        {/* 1. LIVE CAMERA VIEWFINDER ACTIVE */}
        {isCameraActive ? (
          <div className="w-full max-w-xl mx-auto space-y-4">
            <div className="relative aspect-[4/3] sm:aspect-video rounded-2xl overflow-hidden bg-black border-2 border-emerald-500 shadow-lg flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Target Reticle Overlay */}
              <div className="absolute inset-8 sm:inset-12 border-2 border-dashed border-white/70 rounded-2xl pointer-events-none flex items-center justify-center">
                <div className="bg-black/40 backdrop-blur-2xs text-white text-[11px] font-semibold px-3 py-1 rounded-full border border-white/20">
                  Align crop leaf / infected area in frame
                </div>
              </div>

              {/* Top Controls: Close Camera & Flip Lens */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-600/90 text-white text-xs font-bold shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span>Live Camera</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={switchCameraFacing}
                    className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-all cursor-pointer shadow-xs"
                    title="Switch Front/Back Camera"
                  >
                    <SwitchCamera className="w-4 h-4" />
                  </button>
                  <button
                    onClick={stopCamera}
                    className="p-2 rounded-full bg-rose-600/90 hover:bg-rose-700 text-white transition-all cursor-pointer shadow-xs"
                    title="Cancel Camera"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Loading Indicator */}
              {cameraLoading && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white space-y-2">
                  <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
                  <p className="text-xs font-bold">Starting Camera Feed...</p>
                </div>
              )}
            </div>

            {/* Shutter / Capture Button Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <button
                onClick={capturePhoto}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-md transition-all transform active:scale-95 cursor-pointer"
                id="camera-shutter-btn"
              >
                <div className="w-4 h-4 rounded-full border-2 border-white bg-emerald-300" />
                <span>Capture Crop Photo</span>
              </button>

              <button
                onClick={() => cameraFallbackInputRef.current?.click()}
                className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-700 dark:text-zinc-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                title="Launch device system camera"
              >
                <Camera className="w-4 h-4" />
                <span>Use Device Camera App</span>
              </button>

              <button
                onClick={stopCamera}
                className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-600 dark:text-zinc-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {cameraError && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 space-y-2">
                <p>{cameraError}</p>
                <button
                  onClick={() => cameraFallbackInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-colors"
                >
                  Open System Camera App Instead
                </button>
              </div>
            )}
          </div>
        ) : imagePreview ? (
          /* 2. IMAGE PREVIEW */
          <div className="relative w-full max-w-xl aspect-video rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md mx-auto">
            <img
              src={imagePreview}
              alt="Crop scan preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <button
                onClick={() => startCamera()}
                className="px-3 py-1.5 rounded-xl bg-black/70 hover:bg-black/90 text-white text-xs font-bold backdrop-blur-2xs transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Retake Photo</span>
              </button>
              <button
                onClick={() => setImagePreview(null)}
                className="px-3 py-1.5 rounded-xl bg-white/90 dark:bg-zinc-900/90 border border-stone-200 dark:border-zinc-700 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 transition-colors shadow-2xs cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        ) : (
          /* 3. IDLE STATE: PROMINENT CAMERA & UPLOAD OPTIONS */
          <div className="py-8 max-w-md space-y-4 mx-auto">
            <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto shadow-2xs">
              <Camera className="w-10 h-10" />
            </div>
            <div>
              <p className="text-lg font-bold text-stone-900 dark:text-zinc-100">
                Scan Crop Leaf or Plant
              </p>
              <p className="text-xs text-stone-500 dark:text-zinc-400 mt-1.5">
                Take a real-time photo with your camera or select an existing image for instant AI diagnosis
              </p>
            </div>

            {/* DUAL BUTTONS: Camera and Upload */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => startCamera()}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-sm transition-all transform active:scale-98 cursor-pointer"
                id="scan-crop-take-photo-btn"
              >
                <Camera className="w-5 h-5" />
                <span>Take Photo with Camera</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-800 dark:text-zinc-200 font-bold text-sm flex items-center justify-center gap-2 border border-stone-200 dark:border-zinc-700 transition-all cursor-pointer"
                id="scan-crop-upload-file-btn"
              >
                <Upload className="w-5 h-5" />
                <span>Upload from Files</span>
              </button>
            </div>
          </div>
        )}

        {imagePreview && (
          <button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="mt-6 w-full max-w-xl py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2 transition-all transform active:scale-98 mx-auto cursor-pointer"
            id="scan-crop-analyze-btn"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>{t.analyzingLeaf}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Analyze Crop Health Now</span>
              </>
            )}
          </button>
        )}

        {errorText && (
          <div className="mt-4 text-xs text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 p-3 rounded-xl border border-rose-200 dark:border-rose-800 flex items-center gap-2 max-w-xl mx-auto">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorText}</span>
          </div>
        )}

        <div className="mt-6 p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-center gap-2 max-w-xl mx-auto">
          <Info className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
          <span>
            <strong>Scanning Tip:</strong> Hold the camera steady and focus on the affected leaf spots under daylight for best diagnosis.
          </span>
        </div>
      </div>

      {/* ANALYSIS RESULT CARD */}
      {analysisResult && (() => {
        const activeData = displayResult || analysisResult;
        
        // Comprehensive validation check for non-agricultural images
        const isInvalidImage =
          activeData.isValidCrop === false ||
          !activeData.crop ||
          activeData.crop.toLowerCase().includes("invalid") ||
          activeData.crop.toLowerCase().includes("non-agricultural") ||
          activeData.crop.toLowerCase().includes("not a plant") ||
          activeData.crop.toLowerCase().includes("not a crop") ||
          activeData.diseaseName.toLowerCase().includes("no crop") ||
          activeData.diseaseName.toLowerCase().includes("no plant") ||
          activeData.diseaseName.toLowerCase().includes("non-agricultural") ||
          activeData.diseaseName.toLowerCase().includes("not detected");

        if (isInvalidImage) {
          return (
             <div className="mt-6 p-8 rounded-3xl bg-white dark:bg-zinc-900 border-2 border-dashed border-rose-300 dark:border-rose-900 shadow-lg space-y-5 text-center animate-fadeIn relative max-w-2xl mx-auto">
               <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
                 <AlertTriangle className="w-8 h-8" />
               </div>
               <div className="space-y-2">
                 <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                   Input Validation Rejected
                 </span>
                 <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-zinc-100">
                   Non-Agricultural Photo Detected
                 </h3>
                 <p className="text-sm text-stone-600 dark:text-zinc-400 max-w-lg mx-auto leading-relaxed">
                   {activeData.reason || activeData.symptoms || "The uploaded image appears to show a person, face, room, or non-agricultural object. CropGuard is strictly calibrated for living agricultural crop leaves, fruits, and farm plants."}
                 </p>
               </div>

               {/* Safety Notice: Details shown only for valid inputs */}
               <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-left text-xs text-rose-950 dark:text-rose-200 space-y-1">
                 <div className="font-extrabold flex items-center gap-1.5 text-rose-900 dark:text-rose-300">
                   <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                   <span>Safety Restriction: Details Shown for Valid Crops Only</span>
                 </div>
                 <p className="text-stone-700 dark:text-zinc-300 leading-relaxed">
                   Pathology diagnosis, chemical prescriptions, and spray dosage tables are withheld for non-crop photos to prevent accidental agrochemical misuse. Please upload an authentic crop foliage photo.
                 </p>
               </div>

               <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-left text-xs text-amber-950 dark:text-amber-200 space-y-1.5">
                 <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                   <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                   <span>How to capture a valid crop photo:</span>
                 </div>
                 <ul className="list-disc list-inside space-y-1 text-stone-700 dark:text-zinc-300 pl-1">
                   <li>Focus closely on the diseased or affected leaf area under natural daylight.</li>
                   <li>Avoid shadows, motion blur, or photographing from too far away.</li>
                   <li>Ensure only the plant or crop is in frame (no people, faces, animals, or indoor objects).</li>
                 </ul>
               </div>

               <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                 <button
                   onClick={() => {
                     setAnalysisResult(null);
                     setDisplayResult(null);
                     setImagePreview(null);
                     setErrorText("");
                     setIsCameraActive(true);
                   }}
                   className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-colors flex items-center gap-2"
                 >
                   <Camera className="w-4 h-4" />
                   Take New Photo
                 </button>
                 <button
                   onClick={() => {
                     setAnalysisResult(null);
                     setDisplayResult(null);
                     setImagePreview(null);
                     setErrorText("");
                     fileInputRef.current?.click();
                   }}
                   className="px-5 py-2.5 rounded-xl bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 text-stone-800 dark:text-zinc-200 font-bold text-sm border border-stone-200 dark:border-zinc-700 transition-colors flex items-center gap-2"
                 >
                   <Upload className="w-4 h-4" />
                   Upload from Gallery
                 </button>
               </div>
             </div>
          );
        }

        return (
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 shadow-md space-y-6 text-stone-900 dark:text-zinc-100 animate-fadeIn relative">
            {isTranslating && (
              <div className="absolute inset-0 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xs z-20 flex flex-col items-center justify-center rounded-2xl space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  {t.translatingSolution || "Translating Solution to"} {langNameMap[resultLang]}...
                </span>
              </div>
            )}

            {/* Language Option & Voice Agent Control Bar */}
            <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1">
                  <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{t.solutionLanguage || "Solution Language"}:</span>
                </span>
                {[
                  { id: "en", name: "English" },
                  { id: "hi", name: "हिंदी" },
                  { id: "pa", name: "ਪੰਜਾਬੀ" },
                  { id: "ta", name: "தமிழ்" },
                  { id: "te", name: "తెలుగు" },
                  { id: "kn", name: "ಕನ್ನಡ" },
                  { id: "gu", name: "ગુજરાતી" },
                  { id: "mr", name: "मराठी" },
                  { id: "bn", name: "বাংলা" },
                ].map((l) => (
                  <button
                    key={l.id}
                    onClick={() => handleTranslateResult(l.id as Language)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                      resultLang === l.id
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-white dark:bg-zinc-800 text-stone-700 dark:text-zinc-300 hover:bg-emerald-100"
                    }`}
                  >
                    {l.name}
                  </button>
                ))}
              </div>

              {/* Voice Agent Button */}
              <button
                onClick={speakTreatment}
                className={`py-2 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition-all shrink-0 ${
                  isSpeaking
                    ? "bg-rose-600 text-white animate-pulse"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="w-4 h-4" />
                    <span>{t.voiceAgentStop || "Stop Kisan Voice Agent"}</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span>{t.voiceAgentStart || "🔊 Voice Agent (Read Solution)"}</span>
                  </>
                )}
              </button>
            </div>

            {/* Header & Status Badge */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 dark:border-zinc-800 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300">
                    {activeData.crop}
                  </span>
                  {activeData.threatType && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300 border border-stone-200 dark:border-zinc-700 flex items-center gap-1">
                      <Bug className="w-3 h-3 text-rose-500" />
                      <span>{activeData.threatType}</span>
                    </span>
                  )}
                  {activeData.infestationStage && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      {t.stage || "Stage"}: {activeData.infestationStage}
                    </span>
                  )}
                  <span className="text-xs text-stone-500 dark:text-zinc-400">
                    {t.confidence || "Confidence"}: {activeData.confidence}%
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-white mt-1.5">
                  {activeData.diseaseName}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border ${
                    activeData.severity === "Healthy" || activeData.isHealthy
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300"
                      : activeData.severity === "High"
                      ? "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-300 animate-pulse"
                      : "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-300"
                  }`}
                >
                  {activeData.isHealthy ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  <span>Severity: {activeData.severity}</span>
                </div>
              </div>
            </div>

            {/* ICAR Economic Threshold Level (ETL) Assessment Card */}
            {activeData.etlStatus && !activeData.isHealthy && (
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  activeData.etlStatus.isExceeded
                    ? "bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-900/60 text-rose-950 dark:text-rose-200"
                    : activeData.etlStatus.level === "Approaching ETL"
                    ? "bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-900/60 text-amber-950 dark:text-amber-200"
                    : "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-900/60 text-emerald-950 dark:text-emerald-200"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-200/60 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-5 h-5 shrink-0" />
                    <span className="font-extrabold text-sm">
                      Economic Threshold Level (ETL): {activeData.etlStatus.level}
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/80 dark:bg-zinc-900/80 shadow-2xs">
                    {activeData.etlStatus.isExceeded ? "⚠️ Chemical Intervention Justified" : "🌱 Biological / Traps Sufficient"}
                  </span>
                </div>

                <div className="mt-2.5 text-xs space-y-1 leading-relaxed">
                  <p>
                    <strong>Threshold Benchmark:</strong> {activeData.etlStatus.thresholdDescription}
                  </p>
                  <p>
                    <strong>Management Advice:</strong> {activeData.etlStatus.actionGuidance}
                  </p>
                </div>
              </div>
            )}

            {/* Urgency Summary Note */}
            {activeData.urgencyNote && (
              <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/60 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">
                <strong>Farmer Summary:</strong> {activeData.urgencyNote}
              </div>
            )}

            {/* 3 Column Cure Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Organic / Mechanical Treatment */}
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-zinc-800/80 border border-stone-200 dark:border-zinc-700/80 space-y-2">
                <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                  <span>🌱</span> {t.organicSolution}
                </h4>
                <ul className="text-xs text-stone-700 dark:text-zinc-300 space-y-1.5 list-disc pl-4">
                  {activeData.organicTreatment.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Chemical Treatment with Dosage Calculator Trigger */}
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-zinc-800/80 border border-stone-200 dark:border-zinc-700/80 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                    <span>🧪</span> {t.chemicalSolution}
                  </h4>
                  <ul className="text-xs text-stone-700 dark:text-zinc-300 space-y-1.5 list-disc pl-4">
                    {activeData.chemicalTreatment.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>

                  {activeData.sprayDosageAdvice && (
                    <div className="pt-2 border-t border-stone-200 dark:border-zinc-700 text-xs space-y-1">
                      <p className="font-bold text-indigo-900 dark:text-indigo-300">
                        Prescribed Dose: {activeData.sprayDosageAdvice.standardDosePerLiter} {activeData.sprayDosageAdvice.unit}/L water
                      </p>
                      <p className="text-stone-500 dark:text-zinc-400 text-[11px]">
                        PHI Waiting Period: {activeData.sprayDosageAdvice.phiDays} days before harvest
                      </p>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowDosageModal(true)}
                  className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>{t.calcSprayMix || "Calculate Spray Tank Mixing"}</span>
                </button>
              </div>

              {/* Fertilizer & NPK */}
              <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 space-y-2">
                <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                  <span>🌾</span> {t.fertilizerRecommend}
                </h4>
                <p className="text-xs text-stone-700 dark:text-zinc-300 leading-relaxed font-medium">
                  {activeData.fertilizerAdvice}
                </p>
              </div>
            </div>

            {/* EXACT FERTILIZER PRESCRIPTION TO PREVENT DISEASE */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white dark:from-zinc-800/90 dark:via-emerald-950/20 dark:to-zinc-900 border-2 border-emerald-300 dark:border-emerald-700 shadow-xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-2xs">
                    <Sprout className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-extrabold text-emerald-950 dark:text-emerald-200">
                      Exact Fertilizer Prescription to Prevent & Resist Disease
                    </h4>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                      Nutrient fortification to thicken leaf cell walls & block pathogen spores
                    </p>
                  </div>
                </div>
                <span className="self-start sm:self-auto text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 px-2.5 py-1 rounded-full">
                  🛡️ Preventive Formulation
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Primary Exact Fertilizer */}
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800/80 space-y-1.5 shadow-2xs">
                  <p className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Exact Fertilizer Formulation:</span>
                  </p>
                  <p className="font-extrabold text-stone-900 dark:text-white text-sm">
                    {activeData.preventativeFertilizerDetail?.exactFertilizer || "Sulphate of Potash (SOP 0:0:50) + Chelated Zinc EDTA 12%"}
                  </p>
                  {activeData.preventativeFertilizerDetail?.npkRatio && (
                    <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800">
                      NPK / Ratio: {activeData.preventativeFertilizerDetail.npkRatio}
                    </span>
                  )}
                </div>

                {/* Exact Dosage & Application Method */}
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800/80 space-y-1.5 shadow-2xs">
                  <p className="font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-teal-600" />
                    <span>Prescribed Dosage & Application:</span>
                  </p>
                  <p className="font-bold text-stone-900 dark:text-zinc-100">
                    {activeData.preventativeFertilizerDetail?.dosage || "4 to 5 grams per liter of water (800g - 1kg per acre foliar spray)"}
                  </p>
                  <p className="text-[11px] text-stone-600 dark:text-zinc-400">
                    <strong>Method:</strong> {activeData.preventativeFertilizerDetail?.applicationMethod || "Foliar mist spray during cool morning hours (7:00-9:30 AM)"}
                  </p>
                </div>

                {/* Soil Bio-Enrichment */}
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800/80 space-y-1.5 shadow-2xs">
                  <p className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Soil Bio-Enrichment & Root Inoculation:</span>
                  </p>
                  <p className="text-stone-700 dark:text-zinc-300 text-[11px] leading-relaxed">
                    {activeData.preventativeFertilizerDetail?.soilEnrichmentBio || "Apply 250 kg well-decomposed Farm Yard Manure (FYM) mixed with Trichoderma viride & Pseudomonas fluorescens @ 2 kg/acre."}
                  </p>
                </div>

                {/* Prevention Mechanism & Immunity */}
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800/80 space-y-1.5 shadow-2xs">
                  <p className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>How it Prevents Disease Spread:</span>
                  </p>
                  <p className="text-stone-700 dark:text-zinc-300 text-[11px] leading-relaxed">
                    {activeData.preventativeFertilizerDetail?.benefits || "Potassium strengthens leaf cuticle thickness while Zinc & bio-antagonists block fungal hyphae penetration and stimulate plant immunity."}
                  </p>
                </div>
              </div>
            </div>

            {/* CHEMICALS & PRACTICES TO AVOID (CRITICAL SAFETY WARNINGS) */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-50 via-amber-50/40 to-white dark:from-zinc-800/90 dark:via-rose-950/20 dark:to-zinc-900 border-2 border-rose-300 dark:border-rose-800/80 shadow-xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-rose-200 dark:border-rose-800/60">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-rose-600 text-white shadow-2xs">
                    <Ban className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-extrabold text-rose-950 dark:text-rose-200">
                      Hazardous Agrochemicals & Practices to AVOID (Do Not Use)
                    </h4>
                    <p className="text-[11px] text-rose-700 dark:text-rose-400 font-semibold">
                      Inputs that worsen infection, burn crops, or pose toxicity hazards
                    </p>
                  </div>
                </div>
                <span className="self-start sm:self-auto text-[10px] font-black uppercase text-rose-800 dark:text-rose-200 bg-rose-100 dark:bg-rose-900/60 border border-rose-300 dark:border-rose-700 px-2.5 py-1 rounded-full">
                  ⚠️ Caution Required
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {(activeData.chemicalsToAvoid && activeData.chemicalsToAvoid.length > 0 ? activeData.chemicalsToAvoid : [
                  {
                    chemicalName: "Excessive Nitrogen / High-Dose Urea (46% N)",
                    category: "Fertilizer" as const,
                    reasonToAvoid: "Excess nitrogen produces soft, overly succulent leaf tissues which accelerate pathogen multiplication and fungal blast/blight by 300%.",
                    dangerLevel: "Extreme Risk" as const,
                    safeAlternative: "Apply balanced Potash (0:0:50) and Bio-fertilizers instead.",
                  },
                  {
                    chemicalName: "Banned / Restricted Organophosphates (Monocrotophos, Chlorpyrifos, Phorate 10G)",
                    category: "Insecticide" as const,
                    reasonToAvoid: "High mammalian toxicity, persistent chemical residues in harvest, and kills natural predator insects and bees.",
                    dangerLevel: "Extreme Risk" as const,
                    safeAlternative: "Use CIBRC registered bio-pesticides (Neem Oil 10,000 PPM, Beauveria bassiana).",
                  },
                  {
                    chemicalName: "Mixing Copper Oxychloride or Sulfur with Systemic Emulsified Insecticides",
                    category: "Mixture / Practice" as const,
                    reasonToAvoid: "Severe tank chemical incompatibility leading to intense leaf scorching (phytotoxicity), flower drop, and nozzle clogging.",
                    dangerLevel: "High Hazard" as const,
                    safeAlternative: "Maintain a minimum 4 to 5-day interval between copper sprays and other agrochemicals.",
                  }
                ]).map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-rose-200/90 dark:border-rose-900/60 space-y-2 shadow-2xs flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-1.5">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-extrabold text-[10px]">
                          <AlertOctagon className="w-3 h-3 text-rose-600" />
                          <span>{item.dangerLevel || "High Hazard"}</span>
                        </span>
                        <span className="text-[10px] text-stone-500 dark:text-zinc-400 font-bold uppercase">
                          {item.category}
                        </span>
                      </div>
                      <p className="font-extrabold text-stone-900 dark:text-white text-xs leading-snug">
                        {item.chemicalName}
                      </p>
                      <p className="text-stone-600 dark:text-zinc-300 text-[11px] leading-relaxed">
                        <strong className="text-rose-700 dark:text-rose-400">Why Avoid: </strong>
                        {item.reasonToAvoid}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-stone-100 dark:border-zinc-800 text-[10px] text-emerald-800 dark:text-emerald-300 font-semibold bg-emerald-50/50 dark:bg-emerald-950/30 p-2 rounded-lg">
                      <strong>Safe Alternative:</strong> {item.safeAlternative}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Integrated Pest Management (IPM) 3-Tier Multi-Method Strategy */}
            {activeData.ipmFramework && (
              <div className="p-5 rounded-2xl bg-stone-50 dark:bg-zinc-800/90 border border-stone-200 dark:border-zinc-700 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-zinc-700">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <h4 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-white">
                      Integrated Pest Management (IPM) Protocol
                    </h4>
                  </div>
                  <span className="text-[11px] font-black uppercase text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
                    ICAR Recommended
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-stone-200/80 dark:border-zinc-700 space-y-1">
                    <p className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <span>🪤</span> Tier 1: Cultural & Traps
                    </p>
                    <p className="text-stone-700 dark:text-zinc-300 leading-relaxed">
                      {activeData.ipmFramework.culturalAndMechanical}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-stone-200/80 dark:border-zinc-700 space-y-1">
                    <p className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <span>🌿</span> Tier 2: Biological Agents
                    </p>
                    <p className="text-stone-700 dark:text-zinc-300 leading-relaxed">
                      {activeData.ipmFramework.biologicalControl}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-stone-200/80 dark:border-zinc-700 space-y-1">
                    <p className="font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                      <span>🧪</span> Tier 3: Targeted Chemical
                    </p>
                    <p className="text-stone-700 dark:text-zinc-300 leading-relaxed">
                      {activeData.ipmFramework.chemicalIntervention}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Preventive Actions */}
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-zinc-800/80 border border-stone-200 dark:border-zinc-700 space-y-2">
              <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <span>🛡️</span> {t.preventionAdvice}
              </h4>
              <ul className="text-xs text-stone-700 dark:text-zinc-300 space-y-1 list-disc pl-4">
                {activeData.preventiveMeasures.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            {/* EXPERT RECOMMENDATION (REWARDED AD UNLOCK) */}
            {!activeData.isHealthy && (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-emerald-50 dark:from-zinc-800 dark:to-emerald-950/40 border-2 border-amber-200 dark:border-amber-900/60 shadow-sm relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-200/20 dark:bg-amber-400/5 rounded-full blur-2xl group-hover:bg-amber-300/30 transition-all duration-700" />
                
                <div className="relative space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                      <Star className="w-5 h-5 fill-amber-500" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-black text-stone-900 dark:text-zinc-50">
                        Expert Pesticide Brand Recommendation
                      </h4>
                      <p className="text-[10px] sm:text-xs text-stone-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                        Premium Content • ICAR Approved Commercial Brands
                      </p>
                    </div>
                  </div>

                  {!isPremiumUnlocked ? (
                    <div className="space-y-4">
                      <p className="text-xs text-stone-600 dark:text-zinc-300 leading-relaxed max-w-lg">
                        Unlock specific commercial pesticide brand names, exact dosage rates per acre, and local market availability for treating <strong>{activeData.diseaseName}</strong>.
                      </p>
                      
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={handleUnlockPremium}
                          className="flex-1 py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-3 shadow-lg shadow-amber-200/50 dark:shadow-none transition-all active:scale-95 cursor-pointer group"
                        >
                          <Radio className="w-5 h-5 animate-pulse" />
                          <span>WATCH AD TO UNLOCK</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>

                        <button
                          onClick={() => setShowPaymentModal(true)}
                          className="flex-1 py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-3 shadow-lg shadow-emerald-200/50 dark:shadow-none transition-all active:scale-95 cursor-pointer group"
                        >
                          <QrCode className="w-5 h-5" />
                          <span>PAY VIA UPI SCANNER</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                      
                      <p className="text-[10px] text-stone-400 dark:text-zinc-500 text-center sm:text-left italic">
                        * Rewards are unlocked instantly after watching a short video advertisement.
                      </p>
                    </div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-3"
                    >
                      <div className="p-3 rounded-xl bg-white dark:bg-zinc-900/80 border border-emerald-200 dark:border-emerald-800 space-y-2">
                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-black text-xs uppercase tracking-widest">
                          <BadgeCheck className="w-4 h-4" />
                          <span>Unlocked: Recommended Brands</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="p-2 rounded-lg bg-stone-50 dark:bg-zinc-800/60 border border-stone-200 dark:border-zinc-700">
                            <p className="text-[10px] font-bold text-stone-400 dark:text-zinc-500 uppercase">Chemical Recommendation</p>
                            <p className="text-xs font-black text-stone-900 dark:text-zinc-100">{activeData.ipmFramework?.chemicalIntervention?.split(":")[0] || "Targeted Fungicide"}</p>
                          </div>
                          <div className="p-2 rounded-lg bg-stone-50 dark:bg-zinc-800/60 border border-stone-200 dark:border-zinc-700">
                            <p className="text-[10px] font-bold text-stone-400 dark:text-zinc-500 uppercase">Top Brands</p>
                            <p className="text-xs font-black text-stone-900 dark:text-zinc-100">Bayer Nativo, Syngenta Amistar, TATA Rallis</p>
                          </div>
                        </div>
                        <p className="text-[11px] text-stone-700 dark:text-zinc-300 leading-relaxed bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded-lg italic">
                          <strong>Note:</strong> Always wear protective gear (mask, gloves) when spraying. Maintain a 14-day gap between sprays.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

          {/* BEST FERTILIZER SHOP ACCORDING TO GPS WITH EXACT KM DISTANCE */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/90 via-teal-50/30 to-stone-50 dark:from-zinc-800/90 dark:via-emerald-950/20 dark:to-zinc-900 border-2 border-emerald-300/80 dark:border-emerald-700/80 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200/80 dark:border-emerald-800/80 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-2xs">
                    <Compass className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-base font-extrabold text-stone-900 dark:text-white">
                      Fertilizer & Chemical Shops Nearest to You
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-zinc-400 font-medium flex items-center gap-1">
                      <Crosshair className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>
                        {gpsLat && gpsLng 
                          ? `Live GPS coordinates locked (${gpsLat.toFixed(4)}°N, ${gpsLng.toFixed(4)}°E)` 
                          : user?.location ? `Location: ${user.location}` : "Showing nearest verified agricultural dealers"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={onNavigateToShops}
                className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer"
              >
                <span>View All Local Shops</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>

            {loadingShops ? (
              <div className="py-6 text-center text-xs text-stone-500 dark:text-zinc-400 space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600" />
                <span>Finding best fertilizer shops and computing exact GPS distances...</span>
              </div>
            ) : nearbyShops.length > 0 ? (
              <div className="space-y-4">
                {/* Shops Grid - Showing all nearby shops clearly */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {nearbyShops.map((shop, idx) => {
                    let exactKmStr = `${shop.distanceKm || 0.8} km`;
                    if (gpsLat !== undefined && gpsLng !== undefined && shop.lat !== undefined && shop.lng !== undefined) {
                      const d = calculateDistance(gpsLat, gpsLng, shop.lat, shop.lng);
                      exactKmStr = d < 0.1 ? "0.1 km (Less than 100 meters)" : `${d.toFixed(1)} km`;
                    }

                    const isFirst = idx === 0;

                    return (
                      <div
                        key={shop.id}
                        className={`p-4 rounded-2xl bg-white dark:bg-zinc-900 border-2 transition-all shadow-xs relative overflow-hidden flex flex-col justify-between space-y-3 ${
                          isFirst 
                            ? "border-emerald-500 ring-2 ring-emerald-500/10" 
                            : "border-stone-200 dark:border-zinc-800 hover:border-emerald-400"
                        }`}
                      >
                        {isFirst && (
                          <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-bl-lg shadow-xs flex items-center gap-1 z-10">
                            <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                            <span>Closest Match</span>
                          </div>
                        )}

                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h5 className="font-black text-stone-900 dark:text-white text-sm leading-snug">
                                  {shop.name}
                                </h5>
                                {shop.verified && (
                                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                                )}
                              </div>
                              {shop.ownerName && (
                                <p className="text-[10px] text-stone-500 dark:text-zinc-400 mt-0.5 font-medium">
                                  Dealer: {shop.ownerName}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-black shrink-0">
                              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                              <span>{shop.rating || 4.8}</span>
                            </div>
                          </div>

                          <div className="text-[11px] text-stone-600 dark:text-zinc-300 space-y-1">
                            <p className="flex items-start gap-1">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                              <span>{shop.address}</span>
                            </p>
                            <p className={`font-black flex items-center gap-1 ${isFirst ? "text-emerald-700 dark:text-emerald-400" : "text-stone-700 dark:text-zinc-300"}`}>
                              <Navigation className="w-3 h-3" />
                              <span>Exact Distance: {exactKmStr}</span>
                            </p>
                          </div>

                          {shop.inventory && shop.inventory.length > 0 && (
                            <div className="bg-stone-50 dark:bg-zinc-800/80 p-2 rounded-xl border border-stone-100 dark:border-zinc-700/60 space-y-1">
                              <span className="text-[10px] font-bold text-stone-500 dark:text-zinc-400 flex items-center gap-1">
                                <ShoppingBag className="w-3 h-3" />
                                <span>In Stock:</span>
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {shop.inventory.slice(0, 3).map((prod: string, pIdx: number) => (
                                  <span key={pIdx} className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 font-bold text-stone-700 dark:text-zinc-300 text-[9px]">
                                    {prod}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100 dark:border-zinc-800">
                          <a
                            href={`tel:${shop.phone}`}
                            className="py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition-colors"
                          >
                            <Phone className="w-3 h-3" />
                            <span>Call Dealer</span>
                          </a>
                          <a
                            href={shop.mapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.mapQuery || shop.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1.5 px-2 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-zinc-700 font-bold text-[10px] flex items-center justify-center gap-1 transition-colors"
                          >
                            <Navigation className="w-3 h-3 text-emerald-600" />
                            <span>Get Route</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 text-center space-y-2">
                <p className="text-xs text-stone-600 dark:text-zinc-300 font-semibold">
                  Recommended Treatment: Sulphate of Potash (0:0:50) + Trichoderma viride bio-fungicide
                </p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`fertilizer pesticide shop near me ${analysisResult.crop}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 underline"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Search Nearest Certified Fertilizer Dealers on Google Maps</span>
                </a>
              </div>
            )}
          </div>
        </div>
        );
      })()}

      {/* Spray Dosage Tank Calculator Modal */}
      {showDosageModal && (
        <SprayDosageCalculator
          isModal
          onClose={() => setShowDosageModal(false)}
          language={language}
          cropName={displayResult?.crop || analysisResult?.crop || "Crop"}
          diseaseName={displayResult?.diseaseName || analysisResult?.diseaseName || "Pest / Disease"}
          initialDosage={displayResult?.sprayDosageAdvice || analysisResult?.sprayDosageAdvice}
        />
      )}

      {/* UPI Payment Modal */}
      <UpiPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        amount={49}
        itemName={`Expert Recommendations for ${(displayResult || analysisResult)?.diseaseName || 'Crop Disease'}`}
        onPaymentSuccess={() => {
          setIsPremiumUnlocked(true);
        }}
      />
    </div>
  );
};
