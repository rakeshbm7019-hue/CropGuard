// Unified Voice Service for CropGuard AI - Dual-Layer Speech-to-Text & High-Fidelity Voice Agent TTS
import { Language } from "../types";
import { LANGUAGE_NAMES } from "../data/translations";

// Get BCP-47 language tag for Indian regional languages
export function getLangBcp47Code(lang: Language): string {
  switch (lang) {
    case "hi": return "hi-IN";
    case "kn": return "kn-IN";
    case "pa": return "pa-IN";
    case "ta": return "ta-IN";
    case "te": return "te-IN";
    case "gu": return "gu-IN";
    case "mr": return "mr-IN";
    case "bn": return "bn-IN";
    case "ml": return "ml-IN";
    case "or": return "or-IN";
    default: return "en-IN";
  }
}

// Clean markdown artifacts and symbols for human-like speech output
export function cleanTextForSpeech(text: string): string {
  if (!text) return "";
  return text
    .replace(/\[\d+\]/g, "") // Remove citation numbers [1], [2]
    .replace(/[*#_`~]/g, " ") // Remove markdown formatting chars
    .replace(/https?:\/\/[^\s]+/g, "") // Remove URLs
    .replace(/\|.*?\|/g, " ") // Remove markdown tables
    .replace(/•/g, ". ")
    .replace(/([0-9]+)\.\s+/g, "$1. ")
    .replace(/\s+/g, " ")
    .trim();
}

// Global active audio element for single-voice playback
let currentAudioElement: HTMLAudioElement | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;

// Stop any currently active speech playback (both TTS audio and Web Speech)
export function stopAllSpeech(): void {
  if (currentAudioElement) {
    try {
      currentAudioElement.pause();
      currentAudioElement.currentTime = 0;
    } catch (e) {}
    currentAudioElement = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
  currentUtterance = null;
}

export interface PlayVoiceOptions {
  text: string;
  language: Language;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

// Play Voice Agent Solution using Gemini Flash TTS with Web Speech fallback
export async function playVoiceAgentSpeech(options: PlayVoiceOptions): Promise<void> {
  const { text, language, onStart, onEnd, onError } = options;
  stopAllSpeech();

  const cleanText = cleanTextForSpeech(text);
  if (!cleanText) {
    onEnd?.();
    return;
  }

  onStart?.();

  const langCode = getLangBcp47Code(language);
  const langName = LANGUAGE_NAMES[language]?.name || "English";

  // Pre-create and unlock audio element synchronously during user gesture
  const audio = new Audio();
  currentAudioElement = audio;

  // 1. Try High-Quality Gemini Flash TTS Audio first
  try {
    const res = await fetch("/api/voice-speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: cleanText,
        language,
        languageName: langName,
        voiceName: "Kore", // Friendly, clear AI voice
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.audioUrl) {
        audio.src = data.audioUrl;

        audio.onended = () => {
          currentAudioElement = null;
          onEnd?.();
        };

        audio.onerror = (e) => {
          currentAudioElement = null;
          fallbackToWebSpeech(cleanText, langCode, onEnd, onError);
        };

        try {
          await audio.play();
          return;
        } catch (playErr) {
          console.warn("Audio play rejected, falling back to Web Speech:", playErr);
          fallbackToWebSpeech(cleanText, langCode, onEnd, onError);
          return;
        }
      }
    }
  } catch (err) {
    console.warn("Server TTS playback notice, falling back to Web Speech:", err);
  }

  // 2. Fallback to Native Browser Speech Synthesis
  fallbackToWebSpeech(cleanText, langCode, onEnd, onError);
}

function fallbackToWebSpeech(
  text: string,
  langCode: string,
  onEnd?: () => void,
  onError?: (err: any) => void
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd?.();
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const langPrefix = langCode.split("-")[0].toLowerCase();
    const matchedVoice = voices.find(
      (v) =>
        v.lang.toLowerCase() === langCode.toLowerCase() ||
        v.lang.toLowerCase().startsWith(langPrefix)
    );
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onend = () => {
      currentUtterance = null;
      onEnd?.();
    };

    utterance.onerror = (e) => {
      currentUtterance = null;
      console.warn("SpeechSynthesis error notice:", e);
      onError?.(e);
      onEnd?.();
    };

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("SpeechSynthesis exception:", err);
    onError?.(err);
    onEnd?.();
  }
}

// Dual-layer voice capture session
export class VoiceRecordingSession {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private speechRecognition: any = null;
  private accumulatedLiveText = "";
  private language: Language;
  private isRecording = false;

  constructor(language: Language) {
    this.language = language;
  }

  public async start(
    onLiveTranscript?: (text: string) => void,
    onError?: (errorMsg: string) => void
  ): Promise<boolean> {
    this.accumulatedLiveText = "";
    this.audioChunks = [];
    this.isRecording = true;

    // 1. Capture microphone stream for high-quality audio
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        this.audioStream = stream;

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
          this.mediaRecorder = recorder;

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              this.audioChunks.push(e.data);
            }
          };

          recorder.start(250);
        }
      }
    } catch (micErr: any) {
      console.warn("Microphone access notice:", micErr);
      if (
        micErr.name === "NotAllowedError" ||
        micErr.name === "PermissionDeniedError"
      ) {
        onError?.(
          "Microphone permission was denied. Please allow microphone access in your browser settings."
        );
        this.cleanup();
        return false;
      }
    }

    // 2. Real-time browser speech recognition (if available)
    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        this.speechRecognition = recognition;
        recognition.lang = getLangBcp47Code(this.language);
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let fullTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            fullTranscript += event.results[i][0].transcript + " ";
          }
          const cleaned = fullTranscript.trim();
          if (cleaned) {
            this.accumulatedLiveText = cleaned;
            onLiveTranscript?.(cleaned);
          }
        };

        recognition.onerror = (e: any) => {
          console.warn("Browser SpeechRecognition notice:", e.error);
        };

        recognition.start();
      }
    } catch (recErr) {
      console.warn("SpeechRecognition start notice:", recErr);
    }

    return true;
  }

  public async stop(): Promise<string> {
    this.isRecording = false;

    // Stop Web Speech recognition
    if (this.speechRecognition) {
      try {
        this.speechRecognition.stop();
      } catch (e) {}
      this.speechRecognition = null;
    }

    // If live transcript captured substantial speech, return it
    const liveText = this.accumulatedLiveText.trim();

    // Stop MediaRecorder and transcribe audio via backend Gemini if needed
    const recorder = this.mediaRecorder;
    let transcribedText = "";

    if (recorder && recorder.state !== "inactive") {
      transcribedText = await new Promise<string>((resolve) => {
        recorder.onstop = async () => {
          try {
            const mimeType = recorder.mimeType || "audio/webm";
            const blob = new Blob(this.audioChunks, { type: mimeType });

            // If audio is too short and live text exists, return live text
            if (blob.size < 300) {
              resolve(liveText);
              return;
            }

            // Convert to base64 and call backend /api/voice-transcribe
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
                    language: this.language,
                    languageName: LANGUAGE_NAMES[this.language]?.name || "English",
                  }),
                });

                const data = await res.json();
                if (data.success && data.transcript && data.transcript.trim()) {
                  resolve(data.transcript.trim());
                } else {
                  resolve(liveText);
                }
              } catch (err) {
                console.warn("Transcribe request error:", err);
                resolve(liveText);
              }
            };
            reader.readAsDataURL(blob);
          } catch (err) {
            console.warn("Recorder onstop error:", err);
            resolve(liveText);
          }
        };

        try {
          recorder.stop();
        } catch (e) {
          resolve(liveText);
        }
      });
    }

    this.cleanup();
    return (transcribedText || liveText).trim();
  }

  public cancel(): void {
    this.isRecording = false;
    if (this.speechRecognition) {
      try {
        this.speechRecognition.stop();
      } catch (e) {}
      this.speechRecognition = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
    }
    this.cleanup();
  }

  private cleanup(): void {
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }
}
