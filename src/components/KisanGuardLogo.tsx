import React from "react";
import emblemLogo from "../assets/images/cropguard_creative_fullfit_logo_1789282729066.jpg";
import fullLogo from "../assets/images/cropguard_creative_fullfit_logo_1789282729066.jpg";

interface CropGuardLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  variant?: "icon" | "full" | "horizontal";
  showFeatures?: boolean;
}

export const CropGuardLogo: React.FC<CropGuardLogoProps> = ({
  className = "",
  size = "md",
  variant = "icon",
  showFeatures = false,
}) => {
  // Size mapping for emblem image
  const sizeClasses = {
    sm: "w-8 h-8 rounded-xl",
    md: "w-11 h-11 rounded-2xl",
    lg: "w-16 h-16 rounded-2xl",
    xl: "w-24 h-24 sm:w-28 sm:h-28 rounded-3xl",
    hero: "w-36 h-36 sm:w-44 sm:h-44 rounded-3xl",
  };

  const emblemImg = (
    <div className={`${sizeClasses[size]} shrink-0 overflow-hidden shadow-md shadow-emerald-600/20 border-2 border-emerald-500/40 bg-emerald-950 flex items-center justify-center`}>
      <img
        src={emblemLogo}
        alt="CropGuard Emblem"
        className="w-full h-full object-cover select-none"
      />
    </div>
  );

  if (variant === "icon") {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        {emblemImg}
      </div>
    );
  }

  if (variant === "horizontal") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {emblemImg}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-xl sm:text-2xl tracking-tight text-stone-900 dark:text-zinc-50 font-sans">
              CropGuard
            </span>
            <div className="relative inline-flex items-center">
              <span className="font-black text-xl sm:text-2xl tracking-tight text-emerald-600 dark:text-emerald-400">
                AI
              </span>
            </div>
          </div>
          <span className="text-[11px] sm:text-xs font-semibold tracking-wide text-stone-600 dark:text-zinc-300">
            Early Detection • Smart Advisory • Crop Care
          </span>
        </div>
      </div>
    );
  }

  // Full Variant: Graphic Emblem + CropGuard typography + Features & Taglines
  return (
    <div className={`flex flex-col items-center text-center select-none ${className}`}>
      {/* Emblem with glow */}
      <div className="relative group mb-4">
        <div className="absolute inset-0 bg-emerald-500/25 blur-2xl rounded-full transform scale-90 group-hover:scale-110 transition-transform duration-500" />
        <div className="relative z-10 transition-transform duration-300 group-hover:scale-105">
          {emblemImg}
        </div>
      </div>

      {/* CropGuard Brand Typography */}
      <div className="flex items-center justify-center gap-2 mb-1.5">
        <span className="font-black text-3xl sm:text-4xl lg:text-5xl tracking-tight text-stone-900 dark:text-zinc-50">
          CropGuard
        </span>
        <div className="relative inline-flex items-center">
          <span className="font-black text-3xl sm:text-4xl lg:text-5xl tracking-tight text-emerald-600 dark:text-emerald-400">
            AI
          </span>
        </div>
      </div>

      {/* Sub-tagline with precision delimiter lines */}
      <div className="flex items-center justify-center gap-3 text-xs sm:text-sm font-extrabold text-stone-800 dark:text-zinc-200 tracking-wider uppercase mb-5">
        <span className="w-8 sm:w-12 h-0.5 bg-stone-300 dark:bg-zinc-700 rounded-full" />
        <span>Detect. Protect. Grow Better.</span>
        <span className="w-8 sm:w-12 h-0.5 bg-stone-300 dark:bg-zinc-700 rounded-full" />
      </div>

      {/* 4 Feature Badges from the logo graphic */}
      {showFeatures && (
        <div className="w-full max-w-lg grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 my-4">
          <div className="p-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 flex flex-col items-center text-center shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1.5">
              <span className="text-sm">🔍</span>
            </div>
            <span className="text-[10px] font-black uppercase text-stone-800 dark:text-zinc-200 leading-tight">
              Disease Detection
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 flex flex-col items-center text-center shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1.5">
              <span className="text-sm">🌦️</span>
            </div>
            <span className="text-[10px] font-black uppercase text-stone-800 dark:text-zinc-200 leading-tight">
              Weather Insights
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 flex flex-col items-center text-center shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1.5">
              <span className="text-sm">🌾</span>
            </div>
            <span className="text-[10px] font-black uppercase text-stone-800 dark:text-zinc-200 leading-tight">
              Smart Advisory
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 flex flex-col items-center text-center shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1.5">
              <span className="text-sm">🛡️</span>
            </div>
            <span className="text-[10px] font-black uppercase text-stone-800 dark:text-zinc-200 leading-tight">
              Crop Protection
            </span>
          </div>
        </div>
      )}

      {/* Pill Badge: AI POWERED • FARMER FIRST */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-700 text-white shadow-md text-xs font-black uppercase tracking-wider">
        <span>AI Powered • Farmer First</span>
      </div>
    </div>
  );
};

// Backwards compatibility alias
export const KisanGuardLogo = CropGuardLogo;
