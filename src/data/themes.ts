import { AppTheme } from "../types";

export interface ThemeConfig {
  id: AppTheme;
  name: string;
  nativeLabelKey: string;
  dotColor: string;
  primaryColor: string;
  activeTabClass: string;
  accentBg: string;
  badgeBg: string;
  headerAccent: string;
}

export const APP_THEMES: ThemeConfig[] = [
  {
    id: "emerald",
    name: "Emerald Field",
    nativeLabelKey: "themeEmerald",
    dotColor: "#059669",
    primaryColor: "emerald",
    activeTabClass: "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
    accentBg: "bg-emerald-600 hover:bg-emerald-700 text-white",
    badgeBg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300",
    headerAccent: "text-emerald-700 dark:text-emerald-400",
  },
  {
    id: "harvest",
    name: "Golden Harvest",
    nativeLabelKey: "themeHarvest",
    dotColor: "#d97706",
    primaryColor: "amber",
    activeTabClass: "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
    accentBg: "bg-amber-600 hover:bg-amber-700 text-white",
    badgeBg: "bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-300",
    headerAccent: "text-amber-700 dark:text-amber-400",
  },
  {
    id: "forest",
    name: "Deep Forest",
    nativeLabelKey: "themeForest",
    dotColor: "#15803d",
    primaryColor: "green",
    activeTabClass: "bg-green-50 text-green-900 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
    accentBg: "bg-green-700 hover:bg-green-800 text-white",
    badgeBg: "bg-green-100 text-green-900 dark:bg-green-900/60 dark:text-green-300",
    headerAccent: "text-green-800 dark:text-green-400",
  },
  {
    id: "earth",
    name: "Warm Earth",
    nativeLabelKey: "themeEarth",
    dotColor: "#ea580c",
    primaryColor: "orange",
    activeTabClass: "bg-orange-50 text-orange-900 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
    accentBg: "bg-orange-600 hover:bg-orange-700 text-white",
    badgeBg: "bg-orange-100 text-orange-900 dark:bg-orange-900/60 dark:text-orange-300",
    headerAccent: "text-orange-700 dark:text-orange-400",
  },
  {
    id: "ocean",
    name: "Monsoon Blue",
    nativeLabelKey: "themeOcean",
    dotColor: "#0284c7",
    primaryColor: "sky",
    activeTabClass: "bg-sky-50 text-sky-900 border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800",
    accentBg: "bg-sky-600 hover:bg-sky-700 text-white",
    badgeBg: "bg-sky-100 text-sky-900 dark:bg-sky-900/60 dark:text-sky-300",
    headerAccent: "text-sky-700 dark:text-sky-400",
  },
];
