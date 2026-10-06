import React, { useEffect } from "react";
import { motion } from "motion/react";
import { showBanner, hideBanner } from "../lib/admob";

interface AdBannerProps {
  className?: string;
  slotId?: string; // For real AdMob/AdSense integration later
}

const BANNER_UNIT_ID = 'ca-app-pub-6652067022010690/7039101892';

export const AdBanner: React.FC<AdBannerProps> = ({ className = "", slotId = "default-slot" }) => {
  useEffect(() => {
    // Show banner when component mounts
    // Note: In Capacitor AdMob, showBanner usually creates a global overlay.
    // We only call it if we want the native banner to appear.
    // For specific "inline" ads, Native Ads are preferred.
    if (slotId === "native-inline") {
       // Placeholder for native ads logic
    } else {
       showBanner();
    }
    
    return () => {
      // Hide banner when component unmounts
      hideBanner();
    };
  }, [slotId]);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full overflow-hidden my-4 px-4 ${className}`}
      id={`ad-slot-${slotId}`}
    >
      <div className="w-full h-24 sm:h-32 bg-stone-100 dark:bg-zinc-800/50 rounded-2xl border-2 border-dashed border-stone-300 dark:border-zinc-700 flex flex-col items-center justify-center relative group">
        <div className="absolute top-2 right-3 text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-zinc-500">
          Advertisement
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <span className="text-emerald-600 dark:text-emerald-400 font-black text-xs">$</span>
          </div>
          <div>
            <div className="text-sm font-bold text-stone-600 dark:text-zinc-300">Sponsored Ad Space</div>
            <div className="text-xs text-stone-400 dark:text-zinc-500">Google Mobile Ads Network</div>
          </div>
        </div>
        
        <div className="hidden" aria-hidden="true">
          {/* Native Ad Integration would go here */}
          {/* data-ad-unit={BANNER_UNIT_ID} */}
        </div>
      </div>
    </motion.div>
  );
};
