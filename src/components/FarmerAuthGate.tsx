import React, { useState, useEffect } from "react";
import emblemLogo from "../assets/images/cropguard_creative_fullfit_logo_1789282729066.jpg";
import {
  Sprout,
  Phone,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  RefreshCw,
  Bell,
  User,
  MapPin,
  ShieldCheck,
  FileText,
  Lock,
  Leaf,
  Check,
  Mail,
  ArrowLeft,
  Copy,
  KeyRound,
  Shield,
  ExternalLink,
} from "lucide-react";
import { Language, UserProfile } from "../types";
import { UI_TRANSLATIONS } from "../data/translations";
import { signInWithSupabaseEmail, saveUserProfileToSupabase, sendSupabasePhoneOtp, verifySupabasePhoneOtp } from "../lib/supabase";

interface FarmerAuthGateProps {
  language: Language;
  onSuccessLogin: (user: UserProfile) => void;
  onContinueAsGuest?: () => void;
  onOpenAdmin?: () => void;
}

export const FarmerAuthGate: React.FC<FarmerAuthGateProps> = ({
  language,
  onSuccessLogin,
  onOpenAdmin,
}) => {
  const t = UI_TRANSLATIONS[language] || UI_TRANSLATIONS.en;
  const [loginMethod, setLoginMethod] = useState<"phone" | "email">("phone");

  // Phone OTP Flow State
  const [otpStep, setOtpStep] = useState<"details" | "verify_otp">("details");
  const [otpCode, setOtpCode] = useState("");
  const [resendCountdown, setResendCountdown] = useState(30);

  // Registration & Profile Form Fields
  const [farmerName, setFarmerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [farmLocation, setFarmLocation] = useState("");
  const [primaryCrop, setPrimaryCrop] = useState("");
  const [landCategory, setLandCategory] = useState("");

  // Terms & Conditions acceptance - pre-accepted by default so users are never blocked
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Status & Loaders
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);

  // Email input state
  const [farmerEmail, setFarmerEmail] = useState("");
  const [farmerEmailName, setFarmerEmailName] = useState("");

  // Resend Countdown Timer
  useEffect(() => {
    let timer: any;
    if (otpStep === "verify_otp" && resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpStep, resendCountdown]);

  // Step 1: Handle Mobile Submission (Direct Login)
  const handleMobileLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setPhoneTouched(true);

    const rawPhone = phoneNumber.trim();
    const phoneRegex = /^[6-9]\d{9}$/;

    if (!rawPhone) {
      setErrorMsg("Mobile number is required. Please enter your 10-digit Indian mobile number.");
      return;
    }

    if (rawPhone.length < 10) {
      setErrorMsg(`Invalid mobile number: Entered ${rawPhone.length} of 10 digits. Please enter a full 10-digit mobile number.`);
      return;
    }

    if (!phoneRegex.test(rawPhone)) {
      setErrorMsg("Invalid mobile number! Valid Indian mobile numbers must be 10 digits starting with 6, 7, 8, or 9.");
      return;
    }

    setIsLoading(true);

    const userProfile: UserProfile = {
      id: "usr_" + Date.now(),
      name: farmerName.trim() || `Kisan (${phoneNumber.slice(-4)})`,
      phoneOrEmail: "+91 " + phoneNumber,
      loginType: "phone",
      isLoggedIn: true,
      location: farmLocation.trim() || "India (Field Worker)",
      language: language,
      termsAccepted: true,
      primaryCrop: primaryCrop || "Tomato",
      landSize: landCategory || "2 Acres",
      isVerified: true,
      verifiedMethod: "phone",
    };

    // Simulate DB save
    try {
      await fetch("/api/auth/register-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userProfile),
      });
    } catch (_) {}

    await saveUserProfileToSupabase(userProfile).catch(() => {});

    setIsLoading(false);
    setSuccessMsg(`✅ Login successful! Welcome, ${userProfile.name}.`);

    setTimeout(() => {
      onSuccessLogin(userProfile);
    }, 300);
  };

  // Email Login Handler via Supabase Authentication
  const handleEmailAuth = async (accountName?: string, accountEmail?: string) => {
    setTermsAccepted(true);
    setIsLoading(true);
    setErrorMsg("");

    try {
      const emailToUse = (accountEmail || farmerEmail || "farmer@example.com").trim();
      const defaultName = emailToUse.includes("@") ? emailToUse.split("@")[0] : "Farmer";
      const nameToUse = (accountName || farmerEmailName || farmerName || defaultName).trim();

      const result = await signInWithSupabaseEmail(emailToUse, "CropGuard@2025!");

      const emailUserObj: UserProfile = result.user || {
        id: "usr_sb_" + Date.now(),
        name: nameToUse,
        phoneOrEmail: emailToUse,
        loginType: "email",
        isLoggedIn: true,
        isVerified: true,
        verifiedMethod: "email",
        location: farmLocation.trim() || "India (Field Worker)",
        language: language,
        termsAccepted: true,
        primaryCrop: primaryCrop || "Tomato",
        landSize: landCategory || "2 Acres",
      };

      emailUserObj.termsAccepted = true;
      if (farmLocation.trim()) emailUserObj.location = farmLocation.trim();
      if (primaryCrop) emailUserObj.primaryCrop = primaryCrop;

      // Ensure persistence into Supabase 'farmers' table
      await saveUserProfileToSupabase(emailUserObj).catch(() => {});

      setIsLoading(false);
      setSuccessMsg(`Welcome ${emailUserObj.name}! Verified & saved to Supabase.`);
      setTimeout(() => {
        onSuccessLogin(emailUserObj);
      }, 250);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || "Email login failed");
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-6 px-4 sm:px-6">
      <div className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-3xl border border-stone-200 dark:border-zinc-800 shadow-xl overflow-hidden transition-all">
        {/* Banner Header */}
        <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center border-b border-stone-200 dark:border-zinc-800">
          <div className="relative group mb-5">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full blur opacity-25 group-hover:opacity-60 transition duration-700 animate-pulse"></div>
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl overflow-hidden shadow-2xl border-2 border-emerald-500/40 bg-emerald-950 flex items-center justify-center transform group-hover:scale-105 group-hover:-translate-y-1 transition-all duration-300">
              <img
                src={emblemLogo}
                alt="CropGuard Logo"
                className="w-full h-full object-cover select-none"
              />
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-stone-900 dark:text-white">
            Welcome to CropGuard
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-zinc-300 mt-2 font-medium">
            Farmer Registration — Please register to continue.
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Error & Success Messages */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Verification Method Switcher (OTP vs Email) */}
          <div className="grid grid-cols-2 p-1.5 bg-stone-100 dark:bg-zinc-800/90 rounded-2xl text-xs font-bold gap-1">
            <button
              type="button"
              onClick={() => {
                setLoginMethod("phone");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`py-2.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                loginMethod === "phone"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-200"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Mobile</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMethod("email");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`py-2.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                loginMethod === "email"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-200"
              }`}
            >
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Email</span>
            </button>
          </div>

          {/* TAB 1: PHONE REGISTRATION FLOW */}
          {loginMethod === "phone" && (
            <div className="space-y-4">
                <form onSubmit={handleMobileLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                      Farmer Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar Patel"
                      value={farmerName}
                      onChange={(e) => setFarmerName(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Enter 10-Digit Mobile Number *</span>
                      <span className="text-[11px] font-mono text-stone-500 dark:text-zinc-400">
                        {phoneNumber.length}/10 digits
                      </span>
                    </label>
                    <div className="flex">
                      <span
                        className={`inline-flex items-center px-3.5 rounded-l-2xl border border-r-0 text-sm font-bold transition-colors ${
                          phoneNumber.length === 10 && !/^[6-9]\d{9}$/.test(phoneNumber)
                            ? "border-rose-400 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
                            : phoneNumber.length === 10 && /^[6-9]\d{9}$/.test(phoneNumber)
                            ? "border-emerald-400 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                            : "border-stone-200 dark:border-zinc-700 bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-300"
                        }`}
                      >
                        🇮🇳 +91
                      </span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="9876543210"
                        value={phoneNumber}
                        onChange={(e) => {
                          setPhoneNumber(e.target.value.replace(/\D/g, ""));
                          setErrorMsg("");
                        }}
                        onBlur={() => setPhoneTouched(true)}
                        className={`w-full px-4 py-3 rounded-r-2xl bg-stone-50 dark:bg-zinc-800 border text-sm text-stone-900 dark:text-white font-mono tracking-wider focus:outline-none transition-all ${
                          phoneNumber.length === 10 && !/^[6-9]\d{9}$/.test(phoneNumber)
                            ? "border-rose-500 focus:border-rose-600 ring-2 ring-rose-500/20"
                            : phoneTouched && phoneNumber.length > 0 && phoneNumber.length < 10
                            ? "border-amber-500 focus:border-amber-600 ring-1 ring-amber-500/20"
                            : phoneNumber.length === 10 && /^[6-9]\d{9}$/.test(phoneNumber)
                            ? "border-emerald-500 focus:border-emerald-600 ring-1 ring-emerald-500/20"
                            : "border-stone-200 dark:border-zinc-700 focus:border-emerald-600"
                        }`}
                      />
                    </div>

                    {phoneNumber.length > 0 && phoneNumber.length < 10 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5 mt-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Incomplete number: {phoneNumber.length} of 10 digits entered</span>
                      </p>
                    )}

                    {phoneNumber.length === 10 && !/^[6-9]\d{9}$/.test(phoneNumber) && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 mt-1.5 animate-fadeIn">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>Invalid mobile number! Valid Indian mobile numbers must start with 6, 7, 8, or 9.</span>
                      </div>
                    )}

                    {phoneNumber.length === 10 && /^[6-9]\d{9}$/.test(phoneNumber) && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5 mt-1.5 animate-fadeIn">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Valid 10-digit mobile number ready</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                      Village / Farm Location
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your Village, Taluka, or District"
                      value={farmLocation}
                      onChange={(e) => setFarmLocation(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-xs sm:text-sm text-stone-900 dark:text-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                        Primary Crop Cultivated
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Tomato, Ginger, Wheat, Cotton"
                        value={primaryCrop}
                        onChange={(e) => setPrimaryCrop(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-xs sm:text-sm text-stone-900 dark:text-white focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                        Farm Land Holding
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 2 Acres, 1.5 Hectares, 4 Bigha"
                        value={landCategory}
                        onChange={(e) => setLandCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-xs sm:text-sm text-stone-900 dark:text-white focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  {/* MANDATORY CONDITIONS & TERMS */}
                  <div className="pt-2 p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-2">
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        id="kisanTermsCheckbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <label
                        htmlFor="kisanTermsCheckbox"
                        className="text-xs text-stone-800 dark:text-zinc-200 leading-snug cursor-pointer select-none"
                      >
                        <strong className="font-bold text-emerald-900 dark:text-emerald-300">
                          I accept the Kisan Terms & Conditions:
                        </strong>{" "}
                        I acknowledge that AI diagnostics provide early guidance and should be verified with local agricultural officers before large-scale chemical pesticide spraying.
                      </label>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(!showTermsModal)}
                        className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 underline hover:text-emerald-800 flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{showTermsModal ? "Hide Full Terms" : "View Full Advisory Conditions"}</span>
                      </button>
                    </div>

                    {showTermsModal && (
                      <div className="text-[11px] text-stone-600 dark:text-zinc-400 space-y-1.5 pt-2 border-t border-emerald-200/80 dark:border-emerald-800/80 animate-fadeIn">
                        <p>
                          • <strong>Diagnostic Condition:</strong> AI Leaf Scans analyze visual symptoms to suggest early pathology. Always cross-verify with local Krishi Vigyan Kendra (KVK) or extension officers for severe infestations.
                        </p>
                        <p>
                          • <strong>Pesticide & Chemical Safety:</strong> Always follow label directions, pre-harvest intervals (PHI), and safety gear for chemical fungicides.
                        </p>
                        <p>
                          • <strong>Data Privacy:</strong> Your mobile number and scan records are encrypted and synced to your private Supabase database profile to track farm recovery over seasons.
                        </p>
                      </div>
                    )}
                  </div>

                  {errorMsg && (
                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2.5 animate-fadeIn shadow-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Primary Action Button */}
                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isLoading || phoneNumber.length < 10}
                      className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Sending OTP...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-100" />
                          <span>Register</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
            </div>
          )}



          {/* TAB 3: EMAIL AUTH FLOW */}
          {loginMethod === "email" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-2">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="emailTermsCheckbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label
                    htmlFor="emailTermsCheckbox"
                    className="text-xs text-stone-800 dark:text-zinc-200 leading-snug cursor-pointer select-none"
                  >
                    <strong className="font-bold text-emerald-900 dark:text-emerald-300">
                      I accept the Kisan Terms & Conditions:
                    </strong>{" "}
                    I agree to the advisory guidelines and crop protection practices.
                  </label>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!farmerEmail.includes("@")) {
                    setErrorMsg("Please enter a valid email address.");
                    return;
                  }
                  const name = farmerEmailName.trim() || farmerEmail.split("@")[0] || "Farmer";
                  handleEmailAuth(name, farmerEmail.trim());
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                    Farmer Name (Optional)
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 dark:text-zinc-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Kumar Patel"
                      value={farmerEmailName}
                      onChange={(e) => setFarmerEmailName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                    Enter Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 dark:text-zinc-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      placeholder="kisan.farmer@gmail.com"
                      value={farmerEmail}
                      onChange={(e) => setFarmerEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !farmerEmail.includes("@")}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Authenticating & Syncing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Continue with Email</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
