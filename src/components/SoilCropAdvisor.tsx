import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Sprout,
  Filter,
  Search,
  Sparkles,
  Droplets,
  Layers,
  CheckCircle2,
  BookOpen,
  Download,
  RefreshCw,
  FlaskConical,
  Compass,
  Send,
  AlertTriangle,
  Info,
  ChevronRight,
  Copy,
  X,
  FileText,
  Check,
  Upload,
  UploadCloud,
  Camera,
  Mic,
  MicOff,
  SwitchCamera,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Language, UserProfile } from "../types";
import { SOIL_DATABASE, SoilTypeInfo, CropSuitabilityItem } from "../data/soilData";
import { SoilMapHelper } from "./SoilMapHelper";
import { LANGUAGE_NAMES, UI_TRANSLATIONS } from "../data/translations";

interface SoilCropAdvisorProps {
  language: Language;
  user?: UserProfile | null;
}

export const SoilCropAdvisor: React.FC<SoilCropAdvisorProps> = ({ language, user }) => {
  const t = UI_TRANSLATIONS[language] || UI_TRANSLATIONS.en;
  const [selectedSoilId, setSelectedSoilId] = useState<string>("black_soil");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeView, setActiveView] = useState<"catalog" | "map" | "ask_ai">("catalog");
  const [displayLimit, setDisplayLimit] = useState<number>(24);

  useEffect(() => {
    setDisplayLimit(24);
  }, [selectedCategory, searchQuery, selectedSoilId]);

  // AI Soil Query State
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [soilValidationError, setSoilValidationError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileUploadInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageSource, setImageSource] = useState<"camera" | "upload" | null>(null);

  // Live Camera & Voice States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const accumulatedTranscriptRef = useRef<string>("");

  const startCamera = async (facing: "environment" | "user" = cameraFacing) => {
    setCameraLoading(true);
    setCameraError(null);
    setIsCameraActive(true);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(t.cameraNotSupported || "Camera API is not supported on this browser or device.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraLoading(false);
    } catch (err: any) {
      console.warn("Camera start error:", err);
      setCameraLoading(false);
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera permission was denied. Please allow camera access in your browser settings or use Upload File."
          : "Unable to start live camera feed. You can use Upload File instead."
      );
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
    setCameraLoading(false);
    setCameraError(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setSelectedImage(dataUrl);
      setImageSource("camera");
      stopCamera();
    }
  };

  const switchCameraFacing = () => {
    const nextFacing = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(nextFacing);
    startCamera(nextFacing);
  };

  // Voice speech-to-text language tags
  const getLanguageTag = (lang: Language): string => {
    switch (lang) {
      case "hi": return "hi-IN";
      case "kn": return "kn-IN";
      case "te": return "te-IN";
      case "ta": return "ta-IN";
      case "mr": return "mr-IN";
      case "pa": return "pa-IN";
      case "bn": return "bn-IN";
      case "gu": return "gu-IN";
      case "ml": return "ml-IN";
      case "or": return "or-IN";
      default: return "en-IN";
    }
  };

  // Start recording with dual-layer capture: live Web Speech + MediaRecorder for Gemini fallback
  const startVoiceRecording = async () => {
    setVoiceError(null);
    accumulatedTranscriptRef.current = "";
    audioChunksRef.current = [];

    // 1. Microphone capture & MediaRecorder for high-fidelity audio transcription
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;

        let mimeType = "audio/webm";
        if (typeof MediaRecorder !== "undefined") {
          if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
            mimeType = "audio/webm;codecs=opus";
          } else if (MediaRecorder.isTypeSupported("audio/webm")) {
            mimeType = "audio/webm";
          } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
            mimeType = "audio/mp4";
          } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
            mimeType = "audio/ogg";
          }

          const recorder = new MediaRecorder(stream, { mimeType });
          mediaRecorderRef.current = recorder;
          audioChunksRef.current = [];

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };

          recorder.start(250);
        }
      }
    } catch (micErr: any) {
      console.warn("Microphone access notice:", micErr);
      if (micErr.name === "NotAllowedError" || micErr.name === "PermissionDeniedError") {
        setVoiceError("Microphone permission was denied. Please allow microphone access in your browser settings.");
        setTimeout(() => setVoiceError(null), 5000);
        return;
      }
    }

    // 2. Real-time browser speech recognition (if available)
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.lang = getLanguageTag(language);
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let fullTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            fullTranscript += event.results[i][0].transcript + " ";
          }
          const cleaned = fullTranscript.trim();
          if (cleaned) {
            accumulatedTranscriptRef.current = cleaned;
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("Live SpeechRecognition notice:", event.error);
        };

        recognition.start();
      } catch (recErr) {
        console.warn("SpeechRecognition start notice:", recErr);
      }
    }

    setIsListening(true);
  };

  // Finish recording and convert to text
  const finishVoiceRecording = async () => {
    setIsListening(false);
    setIsTranscribing(true);

    // Stop Web Speech recognition if active
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    // Check if live Web Speech transcript already captured words
    const liveText = accumulatedTranscriptRef.current.trim();
    if (liveText) {
      setAiPrompt((prev) => (prev.trim() ? `${prev.trim()} ${liveText}` : liveText));
      setIsTranscribing(false);

      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;
      }
      return;
    }

    // If Web Speech yielded empty (or network blocked in iframe), convert recorded audio via backend Gemini AI
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = async () => {
        try {
          const mimeType = recorder.mimeType || "audio/webm";
          const blob = new Blob(audioChunksRef.current, { type: mimeType });

          if (blob.size < 400) {
            setVoiceError("Recording was too short. Please speak your question and press Done.");
            setTimeout(() => setVoiceError(null), 4000);
            setIsTranscribing(false);
            return;
          }

          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const base64Audio = reader.result as string;
              const res = await fetch("/api/voice-transcribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  audioBase64: base64Audio,
                  mimeType: blob.type,
                  language,
                  languageName: LANGUAGE_NAMES[language]?.name || "English",
                }),
              });

              const data = await res.json();
              if (data.success && data.transcript && data.transcript.trim()) {
                const text = data.transcript.trim();
                setAiPrompt((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
              } else {
                setVoiceError("No clear speech was detected. Please try speaking closer to the microphone.");
                setTimeout(() => setVoiceError(null), 4000);
              }
            } catch (err: any) {
              console.warn("Transcribe error:", err);
              setVoiceError("Transcription service error. Please try again or type directly.");
              setTimeout(() => setVoiceError(null), 4000);
            } finally {
              setIsTranscribing(false);
            }
          };
          reader.readAsDataURL(blob);
        } catch (err) {
          console.warn("Audio processing error:", err);
          setIsTranscribing(false);
        } finally {
          if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach((t) => t.stop());
            audioStreamRef.current = null;
          }
        }
      };

      try {
        recorder.stop();
      } catch (stopErr) {
        setIsTranscribing(false);
      }
    } else {
      setIsTranscribing(false);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;
      }
    }
  };

  const toggleVoiceRecording = () => {
    if (isListening) {
      finishVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, source: "camera" | "upload") => {
    const file = e.target.files?.[0];
    if (file) {
      setImageSource(source);
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const selectedSoil = useMemo(() => {
    return SOIL_DATABASE.find((s) => s.id === selectedSoilId) || SOIL_DATABASE[0];
  }, [selectedSoilId]);

  // Categories list
  const categories = ["All", "Cereals & Grains", "Cash Crops", "Oilseeds", "Pulses", "Vegetables", "Horticulture & Fruits", "Spices & Plantation"];

  // Filter crops in the active soil catalog
  const filteredCrops = useMemo(() => {
    return selectedSoil.bestCrops.filter((crop) => {
      const matchesCategory = selectedCategory === "All" || crop.category === selectedCategory;
      const localizedName = crop.localCropName[language] || crop.cropName;
      const matchesSearch =
        searchQuery.trim() === "" ||
        crop.cropName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        localizedName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        crop.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        crop.season.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedSoil, selectedCategory, searchQuery, language]);

  // Handle Ask AI Soil Query with graceful fallback
  const handleAskSoilAi = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = aiPrompt.trim();
    if (!cleanInput && !selectedImage) return;

    // Check if input is only a greeting without any soil details or photo
    const lowerInput = cleanInput.toLowerCase().replace(/[^a-z\s]/g, "").trim();
    const isOnlyGreeting =
      ["hi", "hello", "hey", "namaste", "namaskar", "vanakkam", "namaskara", "hola", "good morning", "good evening"].includes(lowerInput) ||
      (lowerInput.length <= 2 && !selectedImage);

    if (isOnlyGreeting && !selectedImage) {
      const farmerName = user?.name || "Farmer";
      let greetingText = "";
      if (language === "kn") {
        greetingText = `ನಮಸ್ತೆ ${farmerName}! 🙏 ಕಿಸಾನ್ ಮಣ್ಣು ಮತ್ತು ಬೆಳೆ ಸಲಹೆಗಾರರಿಗೆ ಸುಸ್ವಾಗತ.\n\nನಿಮ್ಮ **ನಿಖರವಾದ ಮಣ್ಣನ್ನು ವಿಶ್ಲೇಷಿಸಲು**, ದಯವಿಟ್ಟು:\n1. 📸 **ಮಣ್ಣಿನ ಫೋಟೋ:** ಕೆಳಗಿನ **ಕ್ಯಾಮರಾ (Camera)** ಅಥವಾ **ಫೈಲ್ ಅಪ್‌ಲೋಡ್ (Upload File)** ಬಟನ್ ಕ್ಲಿಕ್ ಮಾಡಿ ಮಣ್ಣಿನ ಫೋಟೋ ಲಗತ್ತಿಸಿ.\n2. 📝 **ಅಥವಾ ಮಣ್ಣಿನ ವಿವರ:** ನಿಮ್ಮ ಮಣ್ಣಿನ ಬಣ್ಣ (ಉದಾ: ಕೆಂಪು, ಕಪ್ಪು, ಮರಳು ಅಥವಾ ಜೇಡಿಮಣ್ಣು), ಜಿಲ್ಲೆ ಮತ್ತು ಬೆಳೆಯಲು ಬಯಸುವ ಬೆಳೆಯನ್ನು ಬರೆಯಿರಿ.\n\nನಂತರ ನಾವು ನಿಮ್ಮ ನಿಖರವಾದ ಮಣ್ಣಿನ ಪ್ರಕಾರ, ಪೌಷ್ಟಿಕಾಂಶ ಮತ್ತು ಸೂಕ್ತ ಬೆಳೆಗಳನ್ನು ವಿಶ್ಲೇಷಿಸುತ್ತೇವೆ!`;
      } else if (language === "hi") {
        greetingText = `नमस्ते ${farmerName}! 🙏 किसान मृदा एवं फसल सलाहकार में आपका स्वागत है।\n\nआपकी **सटीक मिट्टी का विश्लेषण करने के लिए**, कृपया:\n1. 📸 **मिट्टी की फोटो:** नीचे दिए गए **कैमरा (Camera)** या **अपलोड फाइल (Upload File)** बटन से अपने खेत की मिट्टी की फोटो लगाएं।\n2. 📝 **या मिट्टी का विवरण:** अपनी मिट्टी का रंग (काली, लाल, दोमट या बलुई), क्षेत्र और पानी की स्थिति लिखें।\n\nइसके बाद हम आपकी मिट्टी का सटीक प्रकार, भौतिक गुण, सर्वोत्तम फसलें और जैविक खाद की सलाह देंगे!`;
      } else {
        greetingText = `Namaste ${farmerName}! 🙏 Welcome to the Kisan Soil & Crop Advisor.\n\nTo analyze your **exact soil**, please provide:\n1. 📸 **Soil Photo:** Tap the **Camera** or **Upload File** button below to attach a clear photo of your field soil.\n2. 📝 **Or Soil Description:** Mention your soil color (e.g. red, black, sandy loam), texture, region/district, or irrigation type.\n\nOnce provided, I will analyze the **exact soil classification, physical properties, best matching crops, and pre-sowing soil conditioning**!`;
      }
      setAiResponse(greetingText);
      return;
    }

    setAiLoading(true);
    setAiResponse(null);
    setSoilValidationError(null);

    try {
      const res = await fetch("/api/soil/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: cleanInput,
          soilImageBase64: selectedImage || undefined,
          selectedSoilType: selectedSoil?.name || undefined,
          userRegion: user?.state || "India",
          language: language,
          farmerName: user?.name || "Farmer",
        }),
      });

      const data = await res.json();
      if (data && data.isValidSoil === false) {
        setSoilValidationError(data.rejectionReason || data.text || "The uploaded image does not appear to show agricultural soil or farm dirt. Please take or upload a photo of field soil.");
        setAiResponse(null);
      } else if (data && data.text) {
        const lowerText = data.text.toLowerCase();
        if (lowerText.includes("invalid photo detected") || lowerText.includes("not agricultural soil") || lowerText.includes("does not appear to show agricultural soil")) {
          setSoilValidationError(data.text);
          setAiResponse(null);
        } else {
          setSoilValidationError(null);
          setAiResponse(data.text);
        }
      } else {
        throw new Error(data.message || "Empty response");
      }
    } catch {
      if (selectedImage) {
        setSoilValidationError(
          "⚠️ The uploaded photo could not be verified as agricultural soil or farm dirt. Please upload a clear photo of your field soil or soil clod in daylight."
        );
        setAiResponse(null);
      } else {
        // Intelligent Agronomic offline fallback focusing strictly on soil for text queries
        setAiResponse(
          `🌱 **Exact Soil Recommendation for ${selectedSoil.name}:**\n\n` +
            `1. **Soil Classification & Nature:** ${selectedSoil.characteristics.join("; ")}\n` +
            `2. **Top Recommended High-Yield Crops:** ${selectedSoil.bestCrops.slice(0, 3).map((c) => c.cropName).join(", ")}.\n` +
            `3. **Soil Preparation & Organic Conditioning:** ${selectedSoil.organicAmendments[0]}; ${selectedSoil.organicAmendments[1]}.\n` +
            `4. **Nutrient Management (NPK):** Optimal pH ${selectedSoil.phRange.optimal}. Basal profile shows ${selectedSoil.nutrientProfile.nitrogen} Nitrogen, ${selectedSoil.nutrientProfile.phosphorus} Phosphorus, and ${selectedSoil.nutrientProfile.potassium} Potassium. Incorporate bio-fertilizers (Azotobacter/Rhizobium + PSB) with organic compost.\n` +
            `5. **Drainage & Aeration Tip:** ${selectedSoil.reclamationTips[0] || "Ensure proper drainage and avoid water stagnation during peak monsoon."}`
        );
      }
    } finally {
      setAiLoading(false);
    }
  };

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  const handlePrintCard = () => {
    setShowPrintModal(true);
  };

  const handleDownloadSheet = () => {
    const textContent = `=====================================================
ICAR - KRISHI VIGYAN KENDRA / SOIL ADVISORY CELL
SOIL HEALTH & CROP SUITABILITY ADVISORY CARD
=====================================================
Farmer Name: ${user?.name || "Progressive Farmer"}
Location / District: ${user?.district || "Local Agriculture Zone"}, ${user?.state || "India"}
Date: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}

1. SOIL CHARACTERISTICS & DIAGNOSTICS:
- Soil Classification: ${selectedSoil.name} (${selectedSoil.localName[language] || selectedSoil.name})
- Physical Texture: ${selectedSoil.texture}
- Color & Appearance: ${selectedSoil.soilColorDesc}
- Optimal pH: ${selectedSoil.phRange.optimal} (Range: ${selectedSoil.phRange.min} - ${selectedSoil.phRange.max})
- Moisture Retention: ${selectedSoil.waterRetention}

2. SOIL NUTRIENT PROFILE (NPK):
- Nitrogen (N): ${selectedSoil.nutrientProfile.nitrogen}
- Phosphorus (P): ${selectedSoil.nutrientProfile.phosphorus}
- Potassium (K): ${selectedSoil.nutrientProfile.potassium}

3. ORGANIC CONDITIONING & AMENDMENTS:
${selectedSoil.organicAmendments.map((a, i) => `  * ${a}`).join("\n")}

4. RECLAMATION & MANAGEMENT PROTOCOL:
${selectedSoil.reclamationTips.map((t, i) => `  * ${t}`).join("\n")}

5. TOP RECOMMENDED CROPS FOR THIS SOIL (${selectedSoil.bestCrops.length} CROPS):
${selectedSoil.bestCrops
  .slice(0, 35)
  .map(
    (c, i) =>
      `[${i + 1}] ${c.cropName} (${c.localCropName[language] || c.cropName})
     Category: ${c.category} | Season: ${c.season} | Expected Yield: ${c.expectedYield}
     Water Need: ${c.waterNeed} | Suitability Score: ${c.suitabilityScore}%
     Recommended Fertilizer Dosage: ${c.recommendedFertilizer}`
  )
  .join("\n\n")}

=====================================================
Generated by CropGuard Advisory Engine
=====================================================`;

    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Soil_Health_Advisory_${selectedSoil.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopySheet = () => {
    const summary = `🌾 Soil Health Advisory Card: ${selectedSoil.name}\n` +
      `Optimal pH: ${selectedSoil.phRange.optimal} (${selectedSoil.soilColorDesc})\n` +
      `Nutrients: N-${selectedSoil.nutrientProfile.nitrogen}, P-${selectedSoil.nutrientProfile.phosphorus}, K-${selectedSoil.nutrientProfile.potassium}\n` +
      `Top Recommended Crops: ${selectedSoil.bestCrops.slice(0, 8).map(c => c.cropName).join(", ")}\n` +
      `Amendments: ${selectedSoil.organicAmendments.slice(0, 2).join("; ")}`;
    
    navigator.clipboard.writeText(summary);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 3000);
  };

  return (
    <div id="soil-crop-advisor" className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-emerald-800 to-stone-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
          <Layers className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 bg-emerald-600/60 border border-emerald-400/30 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-emerald-100">
            <FlaskConical className="w-3.5 h-3.5" />
            <span>ICAR Certified Soil & Agronomy Engine</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            Soil Type & Recommended Crops
          </h1>

          <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed">
            Discover exactly which high-yielding crops thrive in your soil type, check ideal pH ranges, NPK nutrient deficits, and receive scientific soil reclamation guidelines.
          </p>

          {/* Quick Nav Switches */}
          <div className="pt-2 flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={() => setActiveView("catalog")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeView === "catalog"
                  ? "bg-white text-emerald-900 shadow-md"
                  : "bg-emerald-900/50 hover:bg-emerald-800/60 text-emerald-100 border border-emerald-600/40"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>{t.soilCatalog || "Explore 8 Major Soils"}</span>
            </button>

            <button
              onClick={() => setActiveView("map")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeView === "map"
                  ? "bg-white text-emerald-900 shadow-md"
                  : "bg-emerald-900/50 hover:bg-emerald-800/60 text-emerald-100 border border-emerald-600/40"
              }`}
            >
              <Compass className="w-4 h-4 text-amber-300" />
              <span>{t.soilMap || "🗺️ Find Soil from Map"}</span>
            </button>

            <button
              onClick={() => setActiveView("ask_ai")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeView === "ask_ai"
                  ? "bg-white text-emerald-900 shadow-md"
                  : "bg-emerald-900/50 hover:bg-emerald-800/60 text-emerald-100 border border-emerald-600/40"
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{t.soilAskAi || "Ask Soil Agronomist AI"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: CATALOG & EXPLORER */}
      {activeView === "catalog" && (
        <div className="space-y-6">
          {/* Quick Map Help Helper Bar */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-emerald-600 text-white shadow-2xs">
                <Compass className="w-4 h-4" />
              </span>
              <div>
                <p className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-200">
                  Don't know which soil covers your field?
                </p>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400">
                  Take map help to pinpoint your district or use live GPS to automatically detect your soil type and top matching crops!
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveView("map")}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <span>Take Map Help</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Soil Selector Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-zinc-100 flex items-center gap-2">
                <Compass className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Select Your Soil Type</span>
              </h2>
              <span className="text-xs text-stone-500 dark:text-zinc-400">
                8 Standard Agro-Climatic Soils
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
              {SOIL_DATABASE.map((soil) => {
                const isSelected = soil.id === selectedSoilId;
                const localizedTitle = soil.localName[language] || soil.name;

                return (
                  <button
                    key={soil.id}
                    onClick={() => setSelectedSoilId(soil.id)}
                    className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between h-28 cursor-pointer ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-sm ring-2 ring-emerald-500/30"
                        : "border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-stone-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="w-5 h-5 rounded-full border border-black/20 shadow-inner inline-block"
                        style={{ backgroundColor: soil.colorSwatch }}
                      />
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-bold text-stone-900 dark:text-zinc-100 line-clamp-2 leading-snug">
                        {localizedTitle.split("(")[0]}
                      </p>
                      <p className="text-[10px] text-stone-500 dark:text-zinc-400 truncate mt-0.5">
                        {soil.waterRetention} Retention
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Soil Overview Card */}
          <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-stone-200 dark:border-zinc-800">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span
                    className="w-4 h-4 rounded-full border border-black/20"
                    style={{ backgroundColor: selectedSoil.colorSwatch }}
                  />
                  <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-zinc-100">
                    {selectedSoil.localName[language] || selectedSoil.name}
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {selectedSoil.bestCrops.length} Top Crops
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-zinc-400">
                  {selectedSoil.soilColorDesc} • {selectedSoil.texture}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintCard}
                  className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-700 dark:text-zinc-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="View Advisory Sheet"
                >
                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Advisory Sheet</span>
                </button>
                <button
                  onClick={() => setActiveView("map")}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Compass className="w-4 h-4" />
                  <span>Soil Map Help</span>
                </button>
              </div>
            </div>

            {/* Quick Soil Diagnostics Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-stone-50 dark:bg-zinc-800/60 p-4 rounded-2xl border border-stone-200/70 dark:border-zinc-700/60">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-500 dark:text-zinc-400 mb-1">
                  <FlaskConical className="w-4 h-4 text-emerald-600" />
                  <span>Ideal pH Range</span>
                </div>
                <p className="text-base sm:text-lg font-black text-stone-900 dark:text-zinc-100">
                  {selectedSoil.phRange.optimal}
                </p>
                <p className="text-[11px] text-stone-500 dark:text-zinc-400">
                  Min: {selectedSoil.phRange.min} | Max: {selectedSoil.phRange.max}
                </p>
              </div>

              <div className="bg-stone-50 dark:bg-zinc-800/60 p-4 rounded-2xl border border-stone-200/70 dark:border-zinc-700/60">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-500 dark:text-zinc-400 mb-1">
                  <Droplets className="w-4 h-4 text-blue-600" />
                  <span>Water Retention</span>
                </div>
                <p className="text-base sm:text-lg font-black text-stone-900 dark:text-zinc-100">
                  {selectedSoil.waterRetention}
                </p>
                <p className="text-[11px] text-stone-500 dark:text-zinc-400 truncate">
                  {selectedSoil.drainage}
                </p>
              </div>

              <div className="bg-stone-50 dark:bg-zinc-800/60 p-4 rounded-2xl border border-stone-200/70 dark:border-zinc-700/60">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-500 dark:text-zinc-400 mb-1">
                  <Layers className="w-4 h-4 text-amber-600" />
                  <span>NPK Status</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                    N: {selectedSoil.nutrientProfile.nitrogen}
                  </span>
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                    P: {selectedSoil.nutrientProfile.phosphorus}
                  </span>
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                    K: {selectedSoil.nutrientProfile.potassium}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-zinc-400 mt-1 truncate">
                  {selectedSoil.nutrientProfile.micronutrients}
                </p>
              </div>

              <div className="bg-stone-50 dark:bg-zinc-800/60 p-4 rounded-2xl border border-stone-200/70 dark:border-zinc-700/60">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-500 dark:text-zinc-400 mb-1">
                  <Compass className="w-4 h-4 text-purple-600" />
                  <span>Key States & Regions</span>
                </div>
                <p className="text-xs font-medium text-stone-800 dark:text-zinc-200 line-clamp-2">
                  {selectedSoil.regions.slice(0, 3).join(", ")}
                </p>
                <p className="text-[11px] text-stone-500 dark:text-zinc-400 mt-1">
                  + {selectedSoil.regions.length - 3} more belts
                </p>
              </div>
            </div>

            {/* Scientific Agronomic Care & Soil Management */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/50">
                <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Recommended Organic Amendments</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-stone-700 dark:text-zinc-300">
                  {selectedSoil.organicAmendments.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/50">
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Field Reclamation & Tillage Tips</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-stone-700 dark:text-zinc-300">
                  {selectedSoil.reclamationTips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Filter and Search Crops */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-lg font-black text-stone-900 dark:text-zinc-100 flex items-center gap-2">
                  <Sprout className="w-5 h-5 text-emerald-600" />
                  <span>Recommended Crops for This Soil ({filteredCrops.length})</span>
                </h3>

                {/* Search Bar */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search crop, pulse, season..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-white focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-700 dark:text-zinc-300"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Crops Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCrops.slice(0, displayLimit).map((crop, idx) => {
                  const localName = crop.localCropName[language] || crop.cropName;

                  return (
                    <div
                      key={idx}
                      className="rounded-2xl border border-stone-200 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-800/40 p-5 flex flex-col justify-between hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-all group"
                    >
                      <div className="space-y-3">
                        {/* Title & Score */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-3xl p-2 rounded-2xl bg-white dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 shadow-sm">
                              {crop.icon}
                            </span>
                            <div>
                              <h4 className="text-base font-bold text-stone-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                {localName}
                              </h4>
                              <p className="text-xs text-stone-500 dark:text-zinc-400">
                                {crop.category} • {crop.season}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="inline-block px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              {crop.suitabilityScore}% Match
                            </span>
                          </div>
                        </div>

                        {/* Agronomic Why it grows well */}
                        <p className="text-xs text-stone-700 dark:text-zinc-300 leading-relaxed bg-white dark:bg-zinc-900/60 p-3 rounded-xl border border-stone-200/80 dark:border-zinc-800">
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">Why it grows: </span>
                          {crop.whyItGrowsWell}
                        </p>

                        {/* Key Metrics */}
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-stone-200/80 dark:border-zinc-800">
                            <span className="text-stone-500 dark:text-zinc-400 block font-medium">Expected Yield:</span>
                            <span className="font-bold text-stone-800 dark:text-zinc-200">{crop.expectedYield}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-stone-200/80 dark:border-zinc-800">
                            <span className="text-stone-500 dark:text-zinc-400 block font-medium">Water Need:</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400">{crop.waterNeed}</span>
                          </div>
                        </div>
                      </div>

                      {/* Field Preparation and Fertilizer advice */}
                      <div className="pt-3 mt-3 border-t border-stone-200 dark:border-zinc-800/80 space-y-1 text-[11px]">
                        <p className="text-stone-600 dark:text-zinc-400">
                          <strong className="text-stone-800 dark:text-zinc-200">Sowing Tip: </strong>
                          {crop.fieldPreparationTip}
                        </p>
                        <p className="text-emerald-700 dark:text-emerald-400 font-medium">
                          <strong>Dose: </strong>
                          {crop.recommendedFertilizer}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Show More / Show All Crops pagination */}
              {displayLimit < filteredCrops.length && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                  <button
                    onClick={() => setDisplayLimit((prev) => prev + 24)}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    Load More Crops (+24)
                  </button>
                  <button
                    onClick={() => setDisplayLimit(filteredCrops.length)}
                    className="px-5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-800 dark:text-zinc-200 text-xs font-bold transition-all cursor-pointer border border-stone-200 dark:border-zinc-700"
                  >
                    Show All {filteredCrops.length} Crops for {selectedSoil.name.split("(")[0].trim()}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: ASK SOIL AGRONOMIST AI */}
      {activeView === "ask_ai" && (
        <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-stone-900 dark:text-zinc-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>Ask Kisan Soil Agronomist</span>
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-zinc-400">
              Ask any question about your soil type, fertilizer dosage, crop rotation, or which vegetable/cash crop gives maximum profit in your area.
            </p>
          </div>

          {/* Preset Prompts */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-stone-500 dark:text-zinc-400">
              Popular Soil Questions:
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                "Which cash crop is most profitable for black cotton soil in Maharashtra?",
                "My soil is red sandy loam with borewell water. Which vegetable will yield highest?",
                "How to increase organic carbon and moisture retention in dry sandy soil?",
                "What is the best fertilizer dose for wheat in alluvial soil?",
              ].map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAiPrompt(prompt)}
                  className="text-xs bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-700 dark:text-zinc-300 py-1.5 px-3 rounded-xl transition-colors text-left cursor-pointer"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleAskSoilAi} className="space-y-3">
            {/* Image Preview */}
            {selectedImage && (
              <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 animate-fadeIn">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-emerald-500/40 shadow-xs shrink-0">
                  <img src={selectedImage} alt="Soil Preview" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200 truncate">
                    {imageSource === "camera" ? "📷 Soil Photo Captured" : "📁 Soil Image File Attached"}
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    Ready for AI soil texture & crop analysis
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    setImageSource(null);
                  }}
                  className="p-1.5 rounded-xl bg-stone-200 dark:bg-zinc-800 text-stone-600 dark:text-zinc-300 hover:bg-rose-100 hover:text-rose-700 transition-colors cursor-pointer shrink-0"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Hidden Inputs for File Upload Fallback */}
            <input
              type="file"
              ref={cameraInputRef}
              onChange={(e) => handleImageSelect(e, "camera")}
              accept="image/*"
              className="hidden"
              capture="environment"
            />
            <input
              type="file"
              ref={fileUploadInputRef}
              onChange={(e) => handleImageSelect(e, "upload")}
              accept="image/*"
              className="hidden"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Live Camera Viewfinder Modal */}
            {isCameraActive && (
              <div className="p-4 rounded-3xl bg-zinc-950 text-white border border-emerald-500/40 shadow-2xl space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                    <span className="text-xs font-bold text-emerald-400">Live Soil Camera</span>
                    <span className="text-[10px] text-zinc-400">
                      ({cameraFacing === "environment" ? "Back Camera" : "Front Camera"})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={switchCameraFacing}
                      className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                      title="Switch Camera Facing"
                    >
                      <SwitchCamera className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="p-1.5 rounded-xl bg-zinc-800 hover:bg-rose-900 text-zinc-300 hover:text-white transition-colors"
                      title="Close Camera"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Video Stream Container */}
                <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-zinc-800">
                  {cameraLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 z-10 text-zinc-300 text-xs">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                      <span>Starting Camera Stream...</span>
                    </div>
                  )}

                  {cameraError ? (
                    <div className="p-6 text-center space-y-3 z-10">
                      <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                      <p className="text-xs text-rose-300 max-w-xs">{cameraError}</p>
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => startCamera()}
                          className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white"
                        >
                          Retry Camera
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            stopCamera();
                            fileUploadInputRef.current?.click();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white"
                        >
                          Upload File Instead
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />

                      {/* Framing Guide Grid Overlay */}
                      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
                        <div className="flex justify-between">
                          <div className="w-6 h-6 border-t-2 border-l-2 border-emerald-400/80 rounded-tl-lg" />
                          <div className="w-6 h-6 border-t-2 border-r-2 border-emerald-400/80 rounded-tr-lg" />
                        </div>
                        <p className="text-center text-[11px] font-medium text-white/80 bg-black/40 backdrop-blur-xs py-1 px-3 rounded-full self-center">
                          Hold camera steady over soil sample
                        </p>
                        <div className="flex justify-between">
                          <div className="w-6 h-6 border-b-2 border-l-2 border-emerald-400/80 rounded-bl-lg" />
                          <div className="w-6 h-6 border-b-2 border-r-2 border-emerald-400/80 rounded-br-lg" />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Shutter Capture Button */}
                {!cameraError && (
                  <div className="flex items-center justify-center gap-4 pt-1">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      disabled={cameraLoading}
                      className="w-16 h-16 rounded-full bg-white hover:bg-zinc-200 active:scale-95 transition-all p-1 shadow-lg flex items-center justify-center cursor-pointer border-4 border-emerald-500 disabled:opacity-50"
                      title="Take Photo"
                    >
                      <div className="w-11 h-11 rounded-full bg-emerald-600 flex items-center justify-center text-white">
                        <Camera className="w-5 h-5" />
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Voice Recording Listening Status Banner */}
            {isListening && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 animate-pulse">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping shrink-0" />
                  <div>
                    <p className="text-xs font-bold">
                      🎙️ Recording Voice in {LANGUAGE_NAMES[language]?.native || "your language"} ({LANGUAGE_NAMES[language]?.name})
                    </p>
                    <p className="text-[11px] text-rose-700 dark:text-rose-400">
                      Speak your question now... Tap Done when finished to convert to text
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={finishVoiceRecording}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shrink-0 shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Done</span>
                </button>
              </div>
            )}

            {/* Voice Transcribing Loader Banner */}
            {isTranscribing && (
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
                <p className="text-xs font-semibold">
                  Converting voice recording to text in {LANGUAGE_NAMES[language]?.name || "English"}...
                </p>
              </div>
            )}

            {/* Voice Error Banner */}
            {voiceError && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
                <span>⚠️ {voiceError}</span>
                <button
                  type="button"
                  onClick={() => setVoiceError(null)}
                  className="p-1 hover:text-amber-700"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="rounded-2xl bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 focus-within:border-emerald-600 transition-colors overflow-hidden">
              <div className="relative">
                <textarea
                  rows={3}
                  placeholder="Describe your soil, tap mic to speak in your language, or take/upload a photo of your soil..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full p-4 pr-12 bg-transparent text-sm text-stone-900 dark:text-white focus:outline-none resize-none"
                />
                {/* Quick Mic button inside textarea top-right */}
                <button
                  type="button"
                  onClick={toggleVoiceRecording}
                  disabled={isTranscribing}
                  className={`absolute right-3 top-3 p-2 rounded-xl transition-all cursor-pointer shadow-xs ${
                    isListening
                      ? "bg-rose-600 text-white animate-bounce ring-4 ring-rose-400/40"
                      : isTranscribing
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-stone-200/80 dark:bg-zinc-700/80 text-stone-700 dark:text-zinc-200 hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900/40"
                  }`}
                  title={isListening ? "Stop & Convert Voice to Text" : "Speak to Type (Voice-to-Text)"}
                >
                  {isTranscribing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isListening ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between px-3.5 py-2.5 bg-stone-100/70 dark:bg-zinc-800/80 border-t border-stone-200/80 dark:border-zinc-700/80 gap-2 flex-wrap">
                <span className="text-[11px] text-stone-500 dark:text-zinc-400 font-medium hidden sm:inline">
                  Attach soil photo:
                </span>

                <div className="flex items-center gap-2 ml-auto">
                  {/* Real Live Camera Option */}
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:hover:bg-emerald-900/70 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    title="Open Live Camera Viewfinder to Snap Soil Photo"
                  >
                    <Camera className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    <span>Camera</span>
                  </button>

                  {/* Upload File Option */}
                  <button
                    type="button"
                    onClick={() => fileUploadInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/70 text-blue-800 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    title="Upload Soil Image File from Device/Gallery"
                  >
                    <Upload className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                    <span>Upload File</span>
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={aiLoading || (!aiPrompt.trim() && !selectedImage)}
              className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {aiLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analyzing Soil Agronomy...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Get AI Soil Advisory</span>
                </>
              )}
            </button>
          </form>

          {/* Validation Error Display for Non-Soil Photos */}
          {soilValidationError && (
            <div className="p-5 rounded-2xl bg-amber-50/95 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 text-stone-800 dark:text-zinc-200 space-y-3 shadow-sm animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-900 dark:text-amber-300">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Non-Soil Photo Detected</span>
              </div>
              <div className="text-xs sm:text-sm whitespace-pre-line leading-relaxed text-amber-900/90 dark:text-amber-200/90">
                {soilValidationError}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-200 dark:border-amber-800/60">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    setSoilValidationError(null);
                    cameraInputRef.current?.click();
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Take Field Soil Photo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    setSoilValidationError(null);
                    fileUploadInputRef.current?.click();
                  }}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-stone-300 dark:border-zinc-700 text-stone-800 dark:text-zinc-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Upload Different Photo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    setSoilValidationError(null);
                  }}
                  className="px-3 py-1.5 text-stone-600 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-200 text-xs font-medium transition-colors ml-auto"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* AI Response Display */}
          {aiResponse && !soilValidationError && (
            <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-stone-800 dark:text-zinc-200 space-y-3">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Agronomist Recommendation</span>
              </div>
              <div className="text-xs sm:text-sm whitespace-pre-line leading-relaxed">
                {aiResponse}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: INTERACTIVE MAP & REGIONAL SOIL FINDER */}
      {activeView === "map" && (
        <SoilMapHelper
          language={language}
          selectedSoilId={selectedSoilId}
          onSelectSoil={(id) => setSelectedSoilId(id)}
          onViewCrops={() => setActiveView("catalog")}
        />
      )}

      {/* PRINTABLE SOIL ADVISORY SHEET MODAL */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-4xl w-full shadow-2xl border border-stone-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Actions Toolbar (no-print) */}
            <div className="no-print p-4 sm:p-5 bg-stone-50 dark:bg-zinc-800/80 border-b border-stone-200 dark:border-zinc-700 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-white">
                  Soil Health & Crop Advisory Sheet
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold">
                  Official Format
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleDownloadSheet}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  title="Download advisory text file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File</span>
                </button>

                <button
                  onClick={handleCopySheet}
                  className="px-3 py-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-stone-800 dark:text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Copy advisory summary"
                >
                  {copiedToast ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedToast ? "Copied!" : "Copy"}</span>
                </button>

                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 rounded-xl hover:bg-stone-200 dark:hover:bg-zinc-700 text-stone-500 dark:text-zinc-400 transition-colors cursor-pointer"
                  title="Close Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Printable Document View */}
            <div className="overflow-y-auto p-6 sm:p-8 bg-white text-stone-900 font-sans">
              <div id="printable-soil-advisory-sheet" className="max-w-3xl mx-auto space-y-6">
                {/* Official Letterhead */}
                <div className="border-b-2 border-emerald-700 pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-xl shadow-xs">
                      🌾
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-emerald-950 uppercase tracking-tight">
                        ICAR - Krishi Vigyan Kendra & Agronomy Advisory Cell
                      </h2>
                      <p className="text-xs text-stone-600 font-semibold">
                        Department of Agriculture & Farmers Welfare • Soil Health & Crop Planning Card
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-stone-500 font-medium">
                    <div>Advisory ID: SHC-{selectedSoil.id.toUpperCase()}-{Math.floor(1000 + Math.random() * 9000)}</div>
                    <div>Issued: {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
                  </div>
                </div>

                {/* Farmer & Land Profile Info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                  <div>
                    <span className="text-stone-500 block text-[10px] uppercase font-bold">Farmer Name:</span>
                    <span className="font-bold text-stone-900">{user?.name || "Progressive Farmer"}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block text-[10px] uppercase font-bold">Region / State:</span>
                    <span className="font-bold text-stone-900">{user?.district || "Local Agriculture Belt"}, {user?.state || "India"}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block text-[10px] uppercase font-bold">Soil Classification:</span>
                    <span className="font-bold text-emerald-800">{selectedSoil.name}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block text-[10px] uppercase font-bold">Tested Suitable Crops:</span>
                    <span className="font-bold text-stone-900">{selectedSoil.bestCrops.length} Crops</span>
                  </div>
                </div>

                {/* Soil Physical & Chemical Properties */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900 border-l-3 border-emerald-700 pl-2">
                    1. Soil Physical Characteristics & Diagnostics
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-lg border border-stone-200 bg-stone-50/50">
                      <div className="text-[10px] uppercase font-bold text-stone-500">Texture & Color</div>
                      <div className="font-bold text-stone-900 mt-0.5">{selectedSoil.texture}</div>
                      <div className="text-[11px] text-stone-600 mt-1">{selectedSoil.soilColorDesc}</div>
                    </div>
                    <div className="p-3 rounded-lg border border-stone-200 bg-stone-50/50">
                      <div className="text-[10px] uppercase font-bold text-stone-500">Ideal pH Range</div>
                      <div className="text-base font-black text-emerald-800 mt-0.5">{selectedSoil.phRange.optimal}</div>
                      <div className="text-[11px] text-stone-600 mt-1">Tolerance: {selectedSoil.phRange.min} – {selectedSoil.phRange.max}</div>
                    </div>
                    <div className="p-3 rounded-lg border border-stone-200 bg-stone-50/50">
                      <div className="text-[10px] uppercase font-bold text-stone-500">Water Retention</div>
                      <div className="font-bold text-stone-900 mt-0.5">{selectedSoil.waterRetention}</div>
                      <div className="text-[11px] text-stone-600 mt-1">Drainage management required</div>
                    </div>
                  </div>
                </div>

                {/* NPK Status */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900 border-l-3 border-emerald-700 pl-2">
                    2. Primary Nutrients Profile (NPK Status)
                  </h4>
                  <div className="grid grid-cols-3 gap-3 text-center text-xs">
                    <div className="p-2.5 rounded-lg border border-stone-200 bg-stone-50">
                      <div className="text-[10px] font-bold text-stone-500 uppercase">Nitrogen (N)</div>
                      <div className="font-black text-sm text-stone-900">{selectedSoil.nutrientProfile.nitrogen}</div>
                    </div>
                    <div className="p-2.5 rounded-lg border border-stone-200 bg-stone-50">
                      <div className="text-[10px] font-bold text-stone-500 uppercase">Phosphorus (P)</div>
                      <div className="font-black text-sm text-stone-900">{selectedSoil.nutrientProfile.phosphorus}</div>
                    </div>
                    <div className="p-2.5 rounded-lg border border-stone-200 bg-stone-50">
                      <div className="text-[10px] font-bold text-stone-500 uppercase">Potassium (K)</div>
                      <div className="font-black text-sm text-stone-900">{selectedSoil.nutrientProfile.potassium}</div>
                    </div>
                  </div>
                </div>

                {/* Soil Conditioning & Amendments */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50">
                    <h5 className="font-bold text-stone-900 mb-1.5 flex items-center gap-1.5 text-xs">
                      <span>🌿 Organic Amendments & Fertilizer Base</span>
                    </h5>
                    <ul className="list-disc list-inside space-y-1 text-stone-700 text-[11px]">
                      {selectedSoil.organicAmendments.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50">
                    <h5 className="font-bold text-stone-900 mb-1.5 flex items-center gap-1.5 text-xs">
                      <span>🛠️ Reclamation & Best Field Practices</span>
                    </h5>
                    <ul className="list-disc list-inside space-y-1 text-stone-700 text-[11px]">
                      {selectedSoil.reclamationTips.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Top Recommended Crops Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900 border-l-3 border-emerald-700 pl-2">
                      3. Crop Suitability & Recommended Prescriptions
                    </h4>
                    <span className="text-[10px] text-stone-500 font-semibold">
                      Showing Top Recommended Crops
                    </span>
                  </div>

                  <div className="border border-stone-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-stone-100 text-stone-800 font-bold border-b border-stone-200">
                        <tr>
                          <th className="p-2">Crop Name</th>
                          <th className="p-2">Category</th>
                          <th className="p-2">Season</th>
                          <th className="p-2">Yield Potential</th>
                          <th className="p-2">Water Need</th>
                          <th className="p-2">Fertilizer Prescription</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 text-stone-700">
                        {selectedSoil.bestCrops.slice(0, 18).map((crop, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-stone-50/60"}>
                            <td className="p-2 font-bold text-stone-900">
                              {crop.cropName}
                              {crop.localCropName[language] && crop.localCropName[language] !== crop.cropName ? (
                                <span className="block text-[10px] font-normal text-stone-500">
                                  {crop.localCropName[language]}
                                </span>
                              ) : null}
                            </td>
                            <td className="p-2 text-stone-600">{crop.category}</td>
                            <td className="p-2">{crop.season}</td>
                            <td className="p-2 font-semibold text-emerald-800">{crop.expectedYield}</td>
                            <td className="p-2">{crop.waterNeed}</td>
                            <td className="p-2 text-stone-600 text-[10px] max-w-[200px]">{crop.recommendedFertilizer}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Certification & Disclaimer Footer */}
                <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-stone-500 text-center sm:text-left">
                  <div>
                    <p className="font-bold text-stone-700">CropGuard Agri-Advisory & Soil Information System</p>
                    <p>Referenced against ICAR soil survey benchmarks & regional agronomic guidelines.</p>
                  </div>
                  <div className="border border-stone-300 rounded px-3 py-1 font-mono text-[9px] uppercase tracking-wider text-stone-600">
                    Verified Digital Record
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
