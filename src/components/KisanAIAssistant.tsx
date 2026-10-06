import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AdBanner } from "./AdBanner";
import {
  Bot,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  RefreshCw,
  User,
  ExternalLink,
  Zap,
  ShieldCheck,
  Search,
  Globe,
  Trash2,
  Paperclip,
  Image as ImageIcon,
  FileText,
  X,
  Upload,
  Camera,
  FileCheck,
  RotateCw,
  AlertCircle,
  Radio,
  CheckCircle2,
} from "lucide-react";
import { Language, UserProfile } from "../types";
import { UI_TRANSLATIONS, LANGUAGE_NAMES } from "../data/translations";
import { saveChatToSupabase } from "../lib/supabase";
import {
  VoiceRecordingSession,
  playVoiceAgentSpeech,
  stopAllSpeech,
} from "../services/voiceService";

interface KisanAIAssistantProps {
  language: Language;
  user?: UserProfile | null;
}

interface Citation {
  title: string;
  uri: string;
}

interface AttachedFile {
  name: string;
  type: string;
  sizeStr: string;
  base64: string;
  previewUrl?: string;
  isImage: boolean;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
  modelUsed?: string;
  modelTier?: "general" | "pro" | "fast";
  citations?: Citation[];
  groundedWithSearch?: boolean;
  attachment?: {
    name: string;
    type: string;
    previewUrl?: string;
    isImage: boolean;
  };
}

const QUICK_PROMPTS = [
  "How to treat ginger rhizome soft rot?",
  "Best fertilizer dosage for tomato yield?",
  "When is the next PM-Kisan installment date?",
  "How to protect wheat from yellow rust & aphid attack?",
  "What is the current Mandi price trend for onion?",
];

const FILE_QUICK_PROMPTS = [
  "🔍 Identify Crop Name & Disease from this photo",
  "🌿 What disease is affecting this leaf and how to cure it?",
  "🧪 Analyze NPK & pH in this Soil Health Card",
  "💊 What is the safe chemical dosage for this plant?",
];

export const KisanAIAssistant: React.FC<KisanAIAssistantProps> = ({ language, user }) => {
  const t = UI_TRANSLATIONS[language] || UI_TRANSLATIONS.en;
  
  const QUICK_PROMPTS = t.quickPrompts || [
    "How to treat ginger rhizome soft rot?",
    "Best fertilizer dosage for tomato yield?",
    "When is the next PM-Kisan installment date?",
    "How to protect wheat from yellow rust & aphid attack?",
    "What is the current Mandi price trend for onion?",
  ];

  const FILE_QUICK_PROMPTS = t.fileQuickPrompts || [
    "🔍 Identify Crop Name & Disease from this photo",
    "🌿 What disease is affecting this leaf and how to cure it?",
    "🧪 Analyze NPK & pH in this Soil Health Card",
    "💊 What is the safe chemical dosage for this plant?",
  ];

  const [modelTier, setModelTier] = useState<"general" | "pro" | "fast">("general");
  const [enableSearch, setEnableSearch] = useState(true);

  // Determine farmer's registered name
  const farmerRegisteredName = (user?.name && user.name.trim())
    || (() => {
      try {
        const stored = localStorage.getItem("cropguard_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.name?.trim()) return parsed.name.trim();
        }
      } catch {}
      return "";
    })()
    || "Farmer";

  const getInitialGreeting = (name: string, lang: Language) => {
    switch (lang) {
      case "hi":
        return `नमस्ते ${name}! मैं किसान मित्र AI हूँ। मुझसे फसल रोगों, उर्वरक मात्रा, मंडी भाव या खेती से जुड़ा कोई भी सवाल पूछें।`;
      case "kn":
        return `ನಮಸ್ತೆ ${name}! ನಾನು ಕಿಸಾನ್ ಮಿತ್ರ AI. ಬೆಳೆ ರೋಗಗಳು, ಗೊಬ್ಬರದ ಪ್ರಮಾಣ, ಮಾರುಕಟ್ಟೆ ಧಾರಣೆ ಅಥವಾ ಕೃಷಿ ಸಲಹೆಗಳ ಬಗ್ಗೆ ಯಾವುದೇ ಪ್ರಶ್ನೆ ಕೇಳಿ.`;
      case "te":
        return `నమస్తే ${name}! నేను కిసాన్ మిత్ర AI. పంట వ్యాధులు, ఎరువుల మోతాదు, మార్కెట్ ధరలు లేదా వ్యవసాయంపై ఏవైనా ప్రశ్నలు అడగండి.`;
      case "ta":
        return `வணக்கம் ${name}! நான் கிசான் மித்ரா AI. பயிர் நோய்கள், உர பரிந்துரைகள், சந்தை விலைகள் அல்லது விவசாயம் குறித்த கேள்விகளைக் கேளுங்கள்.`;
      case "mr":
        return `नमस्कार ${name}! मी किसान मित्र AI आहे. पीक रोग, खतांचे प्रमाण, बाजारभाव किंवा शेतीसंबंधी कोणताही प्रश्न विचारा.`;
      case "pa":
        return `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ${name}! ਮੈਂ ਕਿਸਾਨ ਮਿੱਤਰ AI ਹਾਂ। ਫਸਲਾਂ ਦੇ ਰੋਗਾਂ, ਖਾਦਾਂ ਦੀ ਮਾਤਰਾ, ਮੰਡੀ ਦੇ ਭਾਵਾਂ ਜਾਂ ਖੇਤੀਬਾੜੀ ਬਾਰੇ ਕੋਈ ਵੀ ਸਵਾਲ ਪੁੱਛੋ।`;
      case "bn":
        return `নমস্কার ${name}! আমি কিষাণ মিত্র AI। ফসলের রোগ, সার প্রয়োগ, বাজার দর বা কৃষি সংক্রান্ত যে কোনো প্রশ্ন জিজ্ঞাসা করুন।`;
      case "gu":
        return `નમસ્તે ${name}! હું કિસાન મિત્ર AI છું. પાકના રોગો, ખાતરના પ્રમાણ, બજાર ભાવ અથવા ખેતી વિશે કોઈ પણ પ્રશ્ન પૂછો.`;
      case "ml":
        return `നമസ്കാരം ${name}! ഞാൻ കിസാൻ മിത്ര AI ആണ്. വിള രോഗങ്ങൾ, വളപ്രയോഗം, മാർക്കറ്റ് വിലകൾ അല്ലെങ്കിൽ കൃഷിയെക്കുറിച്ചുള്ള ഏത് സംശയവും ചോദിക്കാം.`;
      case "or":
        return `ନମସ୍କାର ${name}! ମୁଁ କିସାନ ମିତ୍ର AI। ଫସଲ ରୋଗ, ସାର ପ୍ରୟୋଗ, ମଣ୍ଡି ଦର କିମ୍ବା କୃଷି ସମ୍ବନ୍ଧୀୟ ଯେକୌଣସି ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ।`;
      default:
        return `Namaste ${name}! I am Kisan Mitra AI (किसान मित्र). Ask me any question regarding plant diseases, fertilizer calculations, Mandi price trends, or crop health management.`;
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "msg_init",
      role: "assistant",
      content: getInitialGreeting(farmerRegisteredName, language),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      modelTier: "general",
    },
  ]);

  // Update initial message if registered farmer name or language updates
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === "assistant" && prev[0].id.startsWith("msg_init")) {
        return [
          {
            ...prev[0],
            content: getInitialGreeting(farmerRegisteredName, language),
          },
        ];
      }
      return prev;
    });
  }, [farmerRegisteredName, language]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Voice & Audio States
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [liveVoiceTranscript, setLiveVoiceTranscript] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [isVoiceAgentActive, setIsVoiceAgentActive] = useState<boolean>(true); // Auto-read answers by default

  const voiceSessionRef = useRef<VoiceRecordingSession | null>(null);

  // Live Camera states & refs
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<"environment" | "user">("environment");
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fallbackCameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, attachedFile]);

  // Clean up streams & speech on unmount
  useEffect(() => {
    return () => {
      stopAllSpeech();
      if (voiceSessionRef.current) {
        voiceSessionRef.current.cancel();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const startCamera = async (mode: "environment" | "user" = "environment") => {
    setIsCameraOpen(true);
    setCameraLoading(true);
    setCameraError(null);

    // Stop existing stream if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported on this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
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
        err?.name === "NotAllowedError" || err?.message?.includes("Permission")
          ? "Camera permission was denied. Please allow camera access in your browser, or tap below to use device camera."
          : "Unable to start live camera stream directly. Tap below to capture with your device camera."
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
    setIsCameraOpen(false);
    setCameraError(null);
    setCameraLoading(false);
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
        
        // Approximate size calculation
        const sizeInKb = Math.round((dataUrl.length * 3) / 4 / 1024);
        const sizeStr = sizeInKb > 1024 ? `${(sizeInKb / 1024).toFixed(1)} MB` : `${sizeInKb} KB`;

        setAttachedFile({
          name: `crop_capture_${Date.now()}.jpg`,
          type: "image/jpeg",
          sizeStr: sizeStr,
          base64: dataUrl,
          previewUrl: dataUrl,
          isImage: true,
        });

        stopCamera();
      }
    } catch (err) {
      console.error("Failed to capture snapshot:", err);
    }
  };

  // Sync chat to Supabase when new messages arrive and user is authenticated
  useEffect(() => {
    if (user?.id && messages.length > 1) {
      saveChatToSupabase(user.id, {
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          time: m.time,
          model: m.modelUsed,
          citations: m.citations,
        })),
      }).catch(() => {});
    }
  }, [messages, user?.id]);

  const processFile = (file: File) => {
    if (!file) return;

    // Check size limit: 12MB
    if (file.size > 12 * 1024 * 1024) {
      alert("File size exceeds 12MB. Please upload a smaller photo or document.");
      return;
    }

    const isImg = file.type.startsWith("image/");
    const sizeInKb = (file.size / 1024).toFixed(1);
    const sizeStr = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${sizeInKb} KB`;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setAttachedFile({
        name: file.name,
        type: file.type || (isImg ? "image/jpeg" : "application/octet-stream"),
        sizeStr,
        base64,
        previewUrl: isImg ? base64 : undefined,
        isImage: isImg,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    if (e.target) e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputPrompt;
    if ((!textToSend.trim() && !attachedFile) || isLoading) return;

    const currentAttachment = attachedFile;
    const userMsg: ChatMessage = {
      id: "usr_" + Date.now(),
      role: "user",
      content: textToSend || (currentAttachment ? `Attached: ${currentAttachment.name}` : ""),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      attachment: currentAttachment
        ? {
            name: currentAttachment.name,
            type: currentAttachment.type,
            previewUrl: currentAttachment.previewUrl,
            isImage: currentAttachment.isImage,
          }
        : undefined,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputPrompt("");
    setAttachedFile(null);
    setIsLoading(true);

    stopAllSpeech();
    if (isListening) {
      cancelVoiceRecording();
    }

    try {
      const historyPayload = newMessages.slice(-8).map((m) => ({
        role: m.role === "user" ? "user" : "model",
        content: m.content,
      }));

      const response = await fetch("/api/kisan-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: textToSend,
          conversationHistory: historyPayload,
          language: language,
          modelTier: modelTier,
          enableSearch: enableSearch,
          cropContext: user ? `Farmer: ${farmerRegisteredName}, Location: ${user.location}` : undefined,
          farmerName: farmerRegisteredName,
          userName: farmerRegisteredName,
          attachmentBase64: currentAttachment?.base64,
          attachmentMimeType: currentAttachment?.type,
          attachmentName: currentAttachment?.name,
        }),
      });

      const json = await response.json();
      setIsLoading(false);

      if (json.success && json.text) {
        const assistantMsg: ChatMessage = {
          id: "ast_" + Date.now(),
          role: "assistant",
          content: json.text,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          modelUsed: json.modelUsed,
          modelTier: json.modelTier || modelTier,
          citations: json.citations || [],
          groundedWithSearch: json.groundedWithSearch,
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // Auto-play speech if Voice Agent is active
        if (isVoiceAgentActive) {
          speakText(json.text, assistantMsg.id);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: "err_" + Date.now(),
            role: "assistant",
            content: currentAttachment
              ? "⚠️ Unable to analyze the photo due to a network connection issue. Please ensure the image clearly shows a crop leaf or farm plant, and try again."
              : "Namaste! For general crop protection: balance Urea with DAP and Potash to strengthen plant immunity. Check your local APMC Mandi rates and weather forecast.",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            modelTier: modelTier,
          },
        ]);
      }
    } catch (err) {
      setIsLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          id: "err_" + Date.now(),
          role: "assistant",
          content: currentAttachment
            ? "⚠️ Unable to process photo. Please capture a clear, well-lit photo of your crop leaf or plant and try again."
            : "Kisan AI notice: Please check your internet connection and try asking your farming question again.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          modelTier: modelTier,
        },
      ]);
    }
  };

  const clearChat = () => {
    stopAllSpeech();
    setAttachedFile(null);
    setMessages([
      {
        id: "msg_init_" + Date.now(),
        role: "assistant",
        content: getInitialGreeting(farmerRegisteredName, language),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        modelTier: modelTier,
      },
    ]);
  };

  // Voice to Text Handlers
  const startVoiceRecording = async () => {
    setVoiceError(null);
    setLiveVoiceTranscript("");
    stopAllSpeech();

    const session = new VoiceRecordingSession(language);
    voiceSessionRef.current = session;

    const started = await session.start(
      (liveText) => {
        setLiveVoiceTranscript(liveText);
      },
      (errorMsg) => {
        setVoiceError(errorMsg);
        setTimeout(() => setVoiceError(null), 5000);
      }
    );

    if (started) {
      setIsListening(true);
    }
  };

  const finishVoiceRecording = async () => {
    setIsListening(false);
    setIsTranscribing(true);

    if (voiceSessionRef.current) {
      try {
        const transcript = await voiceSessionRef.current.stop();
        if (transcript && transcript.trim()) {
          setInputPrompt((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
        } else if (!liveVoiceTranscript.trim()) {
          setVoiceError("No clear speech detected. Please speak closer to the microphone and try again.");
          setTimeout(() => setVoiceError(null), 4000);
        }
      } catch (err) {
        console.warn("Voice finish error:", err);
      } finally {
        setIsTranscribing(false);
        voiceSessionRef.current = null;
      }
    } else {
      setIsTranscribing(false);
    }
  };

  const cancelVoiceRecording = () => {
    if (voiceSessionRef.current) {
      voiceSessionRef.current.cancel();
      voiceSessionRef.current = null;
    }
    setIsListening(false);
    setIsTranscribing(false);
    setLiveVoiceTranscript("");
  };

  const toggleMicSpeech = () => {
    if (isListening) {
      finishVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  // Voice Agent Audio Read Aloud
  const speakText = (text: string, msgId: string) => {
    if (speakingMsgId === msgId) {
      stopAllSpeech();
      setSpeakingMsgId(null);
      return;
    }

    setSpeakingMsgId(msgId);
    playVoiceAgentSpeech({
      text,
      language,
      onStart: () => setSpeakingMsgId(msgId),
      onEnd: () => setSpeakingMsgId(null),
      onError: () => setSpeakingMsgId(null),
    });
  };

  return (
    <div
      className={`max-w-4xl mx-auto space-y-4 ${
        isDragging ? "ring-2 ring-emerald-500 rounded-3xl transition-all" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,application/pdf,.doc,.docx,.txt"
        className="hidden"
      />

      {/* Fallback direct device camera input */}
      <input
        type="file"
        ref={fallbackCameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Live Camera Viewfinder Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-bold">Kisan Live Camera Viewfinder</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={switchCameraFacing}
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                  title="Switch Front/Back Camera"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-rose-900/60 text-zinc-300 hover:text-rose-400 transition-colors"
                  title="Close Camera"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Video Stream Container */}
            <div className="relative aspect-4/3 sm:aspect-16/9 bg-black flex items-center justify-center overflow-hidden">
              {cameraLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-emerald-400 bg-black/70 z-10">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                  <span className="text-xs font-semibold">Starting camera stream...</span>
                </div>
              )}

              {cameraError ? (
                <div className="p-6 text-center space-y-3 z-10 max-w-sm">
                  <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
                  <p className="text-xs text-rose-200">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      fallbackCameraInputRef.current?.click();
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md inline-flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Use Device Native Camera</span>
                  </button>
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
                  {/* Viewfinder Target Framing Guidelines */}
                  <div className="absolute inset-6 border border-white/30 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                    <div className="flex justify-between">
                      <div className="w-4 h-4 border-t-2 border-l-2 border-emerald-400"></div>
                      <div className="w-4 h-4 border-t-2 border-r-2 border-emerald-400"></div>
                    </div>
                    <div className="text-center">
                      <span className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[11px] text-emerald-300 font-medium">
                        Align crop leaf, plant, or soil card
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <div className="w-4 h-4 border-b-2 border-l-2 border-emerald-400"></div>
                      <div className="w-4 h-4 border-b-2 border-r-2 border-emerald-400"></div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Capture Shutter Action Bar */}
            <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  fallbackCameraInputRef.current?.click();
                }}
                className="text-xs text-zinc-400 hover:text-zinc-200 font-medium flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Device App</span>
              </button>

              <button
                type="button"
                onClick={capturePhoto}
                disabled={cameraLoading || !!cameraError}
                className="w-16 h-16 rounded-full bg-white hover:bg-emerald-400 p-1 flex items-center justify-center transition-all disabled:opacity-40 shadow-lg group active:scale-95"
                title="Take Snapshot"
              >
                <div className="w-13 h-13 rounded-full border-2 border-zinc-950 bg-emerald-600 group-hover:bg-emerald-500 transition-colors flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </button>

              <button
                type="button"
                onClick={stopCamera}
                className="text-xs text-zinc-400 hover:text-rose-400 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-stone-900 dark:text-zinc-100">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-xl shrink-0">
            🤖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-stone-900 dark:text-emerald-200 tracking-tight">
                {t.kisanAiTitle}
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                Live Multilingual Voice
              </span>
            </div>
            <p className="text-xs text-stone-700 dark:text-zinc-300">
              Agronomy advisor in {LANGUAGE_NAMES[language]?.native || "Indian Languages"} ({LANGUAGE_NAMES[language]?.name})
            </p>
          </div>
        </div>

        {/* Voice Agent & Clear Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Voice Agent Auto-Speak Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !isVoiceAgentActive;
              setIsVoiceAgentActive(next);
              if (!next) stopAllSpeech();
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
              isVoiceAgentActive
                ? "bg-emerald-600 text-white border-emerald-500 shadow-xs"
                : "bg-stone-50 dark:bg-zinc-800 border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-200"
            }`}
            title="Auto-read agricultural answers via AI Voice Agent"
          >
            {isVoiceAgentActive ? (
              <>
                <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                <span>Voice Agent: ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>Voice Agent: OFF</span>
              </>
            )}
          </button>

          {/* Clear Chat */}
          <button
            type="button"
            onClick={clearChat}
            className="p-2 rounded-xl bg-stone-50 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-300 border border-stone-200 dark:border-zinc-700 transition-colors"
            title="Reset conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Voice Error Notification Banner */}
      {voiceError && (
        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{voiceError}</span>
          </div>
          <button
            onClick={() => setVoiceError(null)}
            className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900 rounded-lg text-amber-700 dark:text-amber-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Quick Question Chips */}
      <div className="flex space-x-2 overflow-x-auto py-1 no-scrollbar text-xs">
        {(attachedFile ? FILE_QUICK_PROMPTS : QUICK_PROMPTS).map((prompt: string, idx: number) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            className={`px-3.5 py-1.5 rounded-full border font-medium whitespace-nowrap transition-colors shadow-2xs ${
              attachedFile
                ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100"
                : "bg-white dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-zinc-700 border-stone-200 dark:border-zinc-700 text-stone-700 dark:text-emerald-300"
            }`}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Drag & Drop Overlay Indicator */}
      {isDragging && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border-2 border-dashed border-emerald-500 flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-bold animate-pulse">
          <Upload className="w-4 h-4" />
          <span>Drop your crop photo or document here to attach to Kisan AI</span>
        </div>
      )}

      {/* Chat Messages Container */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 shadow-xs min-h-[420px] max-h-[520px] overflow-y-auto space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                isUser ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                  isUser
                    ? "bg-emerald-600 text-white"
                    : "bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-emerald-800 dark:text-emerald-300"
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] p-4 rounded-2xl text-xs sm:text-sm space-y-2 shadow-2xs ${
                  isUser
                    ? "bg-emerald-600 text-white font-medium rounded-tr-none"
                    : "bg-stone-50 dark:bg-zinc-800/80 border border-stone-200 dark:border-zinc-700 text-stone-800 dark:text-zinc-100 rounded-tl-none"
                }`}
              >
                {/* User Message Attachment Preview */}
                {isUser && msg.attachment && (
                  <div className="mb-2 p-2 rounded-xl bg-black/15 border border-white/20 flex items-center gap-2.5">
                    {msg.attachment.isImage && msg.attachment.previewUrl ? (
                      <img
                        src={msg.attachment.previewUrl}
                        alt="Uploaded leaf or document"
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 object-cover rounded-lg border border-white/30 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div className="overflow-hidden text-xs">
                      <p className="font-bold truncate text-white max-w-[180px]">
                        {msg.attachment.name}
                      </p>
                      <p className="text-[10px] text-emerald-100 opacity-90">
                        Attached for AI diagnosis
                      </p>
                    </div>
                  </div>
                )}

                <div className="leading-relaxed whitespace-pre-wrap space-y-1">
                  {msg.content}
                </div>

                {/* Read Aloud Voice Action */}
                {!isUser && (
                  <div className="flex items-center justify-end pt-1">
                    <button
                      onClick={() => speakText(msg.content, msg.id)}
                      className="p-1 px-2 rounded-lg hover:bg-stone-200/50 dark:hover:bg-zinc-700/50 text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 text-xs transition-colors"
                      title="Listen to Advice (Audio)"
                    >
                      {speakingMsgId === msg.id ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">Stop Audio</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-medium">Listen</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <AdBanner slotId="chat-inline" className="max-w-xl mx-auto" />

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 p-2.5 bg-stone-50 dark:bg-zinc-800/80 rounded-xl border border-stone-200 dark:border-zinc-700 w-fit">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Kisan Mitra AI is analyzing your input and agricultural documents...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Attachment Preview Box Above Input */}
      {attachedFile && (
        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between gap-3 shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-3 overflow-hidden">
            {attachedFile.isImage && attachedFile.previewUrl ? (
              <img
                src={attachedFile.previewUrl}
                alt="Upload preview"
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-xl object-cover border border-emerald-300 dark:border-emerald-700 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
                <FileText className="w-6 h-6" />
              </div>
            )}
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 truncate max-w-[220px]">
                  {attachedFile.name}
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-200/60 dark:bg-emerald-900/60 px-1.5 py-0.2 rounded font-mono">
                  {attachedFile.sizeStr}
                </span>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <FileCheck className="w-3 h-3" />
                <span>Ready for Gemini Multimodal Analysis</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAttachedFile(null)}
            className="p-1.5 rounded-xl hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 transition-colors"
            title="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Voice Recording Listening Status Overlay */}
      {isListening && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border-2 border-rose-400 dark:border-rose-700 shadow-md animate-fadeIn flex flex-col sm:flex-row items-center justify-between gap-3 text-rose-900 dark:text-rose-100">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex items-center justify-center shrink-0">
              <span className="absolute inline-flex h-8 w-8 rounded-full bg-rose-400 opacity-75 animate-ping"></span>
              <div className="relative w-9 h-9 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xs">
                <Mic className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold flex items-center gap-1.5">
                <span>🎙️ Listening in {LANGUAGE_NAMES[language]?.native || "your language"} ({LANGUAGE_NAMES[language]?.name})</span>
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-300">
                {liveVoiceTranscript ? `"${liveVoiceTranscript}"` : "Speak your crop question clearly into your microphone..."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={finishVoiceRecording}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Done & Convert</span>
            </button>
            <button
              type="button"
              onClick={cancelVoiceRecording}
              className="p-2 rounded-xl bg-white dark:bg-zinc-800 text-stone-600 dark:text-zinc-300 hover:text-rose-600 text-xs font-medium border border-rose-200 dark:border-rose-800"
              title="Cancel recording"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Voice Transcribing Spinner */}
      {isTranscribing && (
        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 text-xs flex items-center gap-2.5 animate-fadeIn">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
          <span className="font-semibold">
            Converting your voice into {LANGUAGE_NAMES[language]?.name || "English"} text using Gemini Audio AI...
          </span>
        </div>
      )}

      {/* Input Box, Camera, File Upload & Voice Controls */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center gap-2"
      >
        {/* Upload File Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-3 rounded-2xl bg-white dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-zinc-700 border border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all shadow-2xs shrink-0"
          title="Attach Leaf Image or Agricultural Document"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Live Camera Scanner Button */}
        <button
          type="button"
          onClick={() => startCamera("environment")}
          className="p-3 rounded-2xl bg-white dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-zinc-700 border border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all shadow-2xs shrink-0"
          title="Open Live Camera Scanner"
        >
          <Camera className="w-5 h-5" />
        </button>

        {/* Voice Speech to Text Button */}
        <button
          type="button"
          onClick={toggleMicSpeech}
          className={`p-3 rounded-2xl border text-sm font-bold transition-all shrink-0 ${
            isListening
              ? "bg-rose-600 text-white border-rose-500 animate-pulse shadow-md"
              : "bg-white dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-zinc-700 border-stone-200 dark:border-zinc-700 text-emerald-700 dark:text-emerald-400"
          }`}
          title={isListening ? "Stop Voice Recording" : "Speak to Type (Voice-to-Text)"}
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <input
          type="text"
          placeholder={
            attachedFile
              ? "Ask a question about this file (e.g., 'What disease is this and how to treat it?')"
              : t.askAiPlaceholder
          }
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          className="flex-1 px-4 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 text-sm text-stone-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-600 shadow-2xs"
        />

        <button
          type="submit"
          disabled={isLoading || (!inputPrompt.trim() && !attachedFile)}
          className="p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all disabled:opacity-50 shadow-2xs shrink-0"
          title="Send Question"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};
