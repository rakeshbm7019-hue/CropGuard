import React from "react";
import fullLogo from "../assets/images/cropguard_creative_fullfit_logo_1789282729066.jpg";
import { motion } from "motion/react";
import { AdBanner } from "./AdBanner";
import {
  ArrowRight,
  CheckCircle2,
  Globe,
  ShieldCheck,
  Camera,
  Calculator,
  TrendingUp,
  CloudSun,
  Radio,
  Layers,
  Landmark,
  Store,
  Mic,
  BookOpen,
  Sparkles,
} from "lucide-react";

interface LandingPageProps {
  onGetStarted: () => void;
  onOpenAdmin?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onOpenAdmin }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 100, damping: 20 },
    },
  };

  const features = [
    {
      icon: Camera,
      title: "AI Leaf Disease Scanner",
      description: "Instant computer vision diagnosis for 50+ foliar diseases and insect pests with severity grading and high-precision visual verification.",
      badge: "Real-time AI",
      color: "emerald",
    },
    {
      icon: ShieldCheck,
      title: "ICAR 3-Tier Treatment Plans",
      description: "Certified Integrated Pest Management (IPM) featuring organic botanical remedies, biological controls, and chemical dosages with safe harvest waiting intervals.",
      badge: "ICAR Aligned",
      color: "teal",
    },
    {
      icon: Calculator,
      title: "Sprayer Tank Dilution Calculator",
      description: "Compute exact chemical and water proportions for 15L, 16L, 20L knapsack tanks and tractor sprayers to eliminate chemical waste and leaf burn.",
      badge: "Cost Saver",
      color: "blue",
    },
    {
      icon: TrendingUp,
      title: "Live APMC Mandi Rates",
      description: "Track real-time market arrivals, daily modal prices, Minimum Support Price (MSP) benchmarks, and price trends across 250+ mandis.",
      badge: "Live Mandi",
      color: "amber",
    },
    {
      icon: CloudSun,
      title: "Agri Weather & Spray Window",
      description: "Hyperlocal farm weather forecasting wind speed, rain probability, humidity, and optimal spray safety time windows.",
      badge: "Smart Advisory",
      color: "sky",
    },
    {
      icon: Radio,
      title: "15km Community Outbreak Radar",
      description: "Geofenced radar network that alerts neighboring farmers when contagious blight, pests, or viral infections are reported nearby.",
      badge: "Early Warning",
      color: "rose",
    },
    {
      icon: Layers,
      title: "Soil & Crop Match Advisor",
      description: "Match soil types (Black, Red, Alluvial, Laterite) with high-yield crop varieties and customized basal NPK fertilizer schedules.",
      badge: "Soil Health",
      color: "amber",
    },
    {
      icon: Landmark,
      title: "Govt Schemes & Subsidies",
      description: "Direct application guides for PM-KISAN, PM Fasal Bima Yojana (PMFBY), PM-KUSUM solar irrigation, and state subsidy portals.",
      badge: "Farmer Welfare",
      color: "indigo",
    },
    {
      icon: Store,
      title: "Certified Agri-Shop Finder",
      description: "Locate nearby licensed seed, pesticide, and fertilizer retailers with contact numbers, addresses, and navigation assistance.",
      badge: "Local Network",
      color: "emerald",
    },
    {
      icon: Mic,
      title: "Kisan Voice AI (11 Languages)",
      description: "Speak and listen to crop advisories and diagnosis in Hindi, Kannada, Telugu, Tamil, Punjabi, Marathi, Gujarati, Bengali, Malayalam, and English.",
      badge: "Voice & Audio",
      color: "violet",
    },
  ];

  return (
    <div className="min-h-screen py-6 sm:py-10 px-4 sm:px-6 lg:px-8 space-y-16 sm:space-y-24 text-stone-900 dark:text-zinc-100">
      {/* 1. HERO SECTION */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-5xl mx-auto flex flex-col items-center text-center"
      >
        {/* Graphical Logo Presentation from Second Photo */}
        <motion.div variants={itemVariants} className="mb-8 relative group flex flex-col items-center">
          <div className="absolute inset-0 bg-emerald-500/25 blur-3xl opacity-40 rounded-full w-56 h-56 sm:w-72 sm:h-72 mx-auto group-hover:opacity-60 transition-opacity duration-700 pointer-events-none"></div>
          <div className="relative z-10 w-48 h-48 sm:w-60 sm:h-60 lg:w-72 lg:h-72 rounded-3xl sm:rounded-[2.5rem] overflow-hidden shadow-2xl border-2 border-emerald-500/40 bg-emerald-950 flex items-center justify-center transition-all duration-500 hover:scale-105 group-hover:shadow-emerald-500/25">
            <img
              src={fullLogo}
              alt="CropGuard Logo & Graphical Emblem"
              className="w-full h-full object-cover select-none"
            />
          </div>
        </motion.div>

        {/* Main Display Headline with High-Contrast Dark Mode */}
        <motion.h1
          variants={itemVariants}
          className="text-3xl sm:text-5xl lg:text-7xl font-black tracking-tight text-stone-900 dark:text-zinc-50 mb-6 leading-[1.15]"
        >
          Protect Your Harvest with{" "}
          <span className="text-emerald-600 dark:text-emerald-400 drop-shadow-xs">
            CropGuard
          </span>
        </motion.h1>

        {/* Subtitle / Value Proposition */}
        <motion.p
          variants={itemVariants}
          className="text-base sm:text-lg lg:text-xl text-stone-600 dark:text-zinc-200 max-w-3xl mb-8 font-normal leading-relaxed"
        >
          Your dedicated digital agronomist for smarter, healthier, and higher-yielding crops. Detect leaf diseases instantly from photos, receive ICAR-certified organic and chemical treatment plans, calculate exact sprayer tank dilutions to reduce input costs, monitor live APMC Mandi prices, and receive real-time farm weather spray advisories across 11 Indian languages.
        </motion.p>

        {/* Call to Action */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-center w-full sm:w-auto"
        >
          <button
            onClick={onGetStarted}
            className="w-full sm:w-auto group flex items-center justify-center gap-3 px-10 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-base sm:text-lg transition-all duration-300 shadow-lg shadow-emerald-700/25 hover:shadow-xl hover:shadow-emerald-700/35 active:scale-95 cursor-pointer"
            id="landing-hero-register-btn"
          >
            <span>Register</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          variants={itemVariants}
          className="mt-10 pt-6 border-t border-stone-200 dark:border-zinc-800 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs sm:text-sm font-semibold"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-stone-800 dark:text-zinc-100 font-bold">98.4% Leaf Diagnostic Accuracy</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-stone-800 dark:text-zinc-100 font-bold">11 Indian Regional Languages</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-stone-800 dark:text-zinc-100 font-bold">ICAR & CIBRC Aligned Dosages</span>
          </div>
        </motion.div>
      </motion.div>

      {/* 2. CORE FEATURES SHOWCASE SECTION */}
      <section className="w-full max-w-6xl mx-auto space-y-10" id="landing-features-section">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-4xl font-black text-stone-900 dark:text-zinc-50 tracking-tight">
            Features & Smart Farming Tools
          </h2>
          <p className="text-sm sm:text-base text-stone-600 dark:text-zinc-300 max-w-2xl mx-auto">
            From instant AI leaf pathology to precision knapsack sprayer math and live APMC mandi tickers, CropGuard equips you with everything you need in the field.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 shadow-xs hover:border-emerald-500/50 dark:hover:border-emerald-500/50 hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60 group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300 border border-stone-200 dark:border-zinc-700">
                      {feature.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-stone-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-600 dark:text-zinc-300 mt-2 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <AdBanner slotId="landing-mid-bottom" />

      {/* 3. FINAL CALL TO ACTION BANNER */}
      <section className="max-w-4xl mx-auto text-center py-6 sm:py-10 space-y-6">
        <h2 className="text-3xl sm:text-5xl font-black text-stone-900 dark:text-zinc-50 tracking-tight">
          Ready to Upgrade Your Farm with AI?
        </h2>
        <p className="text-stone-600 dark:text-zinc-200 text-sm sm:text-lg max-w-xl mx-auto leading-relaxed font-normal">
          Create your free farmer profile now to register, scan crop leaves, track local APMC mandis, and join the community alert network.
        </p>

        <div className="pt-2">
          <button
            onClick={onGetStarted}
            className="group inline-flex items-center justify-center gap-3 px-10 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-lg transition-all duration-300 shadow-xl shadow-emerald-700/25 hover:shadow-2xl hover:shadow-emerald-700/35 active:scale-95 cursor-pointer"
            id="landing-footer-register-btn"
          >
            <span>Register</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
          </button>
        </div>

        <div className="text-xs text-stone-500 dark:text-zinc-400 font-medium pt-2">
          Free Agricultural Resource • No Mandatory Hardware Required • Works on Mobile & Desktop
        </div>
      </section>
    </div>
  );
};
