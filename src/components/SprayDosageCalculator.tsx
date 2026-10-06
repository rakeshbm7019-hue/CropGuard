import React, { useState, useEffect } from "react";
import {
  Droplets,
  Calculator,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Wind,
  CheckCircle2,
  Sparkles,
  Info,
  X,
  Gauge,
  HelpCircle,
} from "lucide-react";
import { Language, SprayDosageAdvice } from "../types";
import { UI_TRANSLATIONS } from "../data/translations";

interface SprayDosageCalculatorProps {
  language: Language;
  initialDosage?: SprayDosageAdvice | null;
  cropName?: string;
  diseaseName?: string;
  onClose?: () => void;
  isModal?: boolean;
}

export const SprayDosageCalculator: React.FC<SprayDosageCalculatorProps> = ({
  language,
  initialDosage,
  cropName = "Crop",
  diseaseName = "Pest / Disease",
  onClose,
  isModal = false,
}) => {
  const t = UI_TRANSLATIONS[language] || UI_TRANSLATIONS.en;

  // State inputs
  const [tankCapacity, setTankCapacity] = useState<number>(16); // Default 16L Battery Sprayer
  const [tankType, setTankType] = useState<string>("battery");
  const [customTankVolume, setCustomTankVolume] = useState<string>("16");

  const [farmArea, setFarmArea] = useState<number>(1.0); // Acres
  const [areaUnit, setAreaUnit] = useState<"acre" | "guntha" | "hectare">("acre");

  const [chemicalName, setChemicalName] = useState<string>(
    initialDosage?.recommendedChemical || "Mancozeb 75% WP / Neem Oil"
  );
  const [dosePerLiter, setDosePerLiter] = useState<number>(
    initialDosage?.standardDosePerLiter || 2.5
  );
  const [chemicalUnit, setChemicalUnit] = useState<"g" | "ml">(
    initialDosage?.unit || "g"
  );

  const [waterPerAcre, setWaterPerAcre] = useState<number>(
    initialDosage?.waterVolumeLitersPerAcre || 160
  );
  const [phiDays, setPhiDays] = useState<number>(initialDosage?.phiDays || 7);

  // Update if initialDosage changes
  useEffect(() => {
    if (initialDosage) {
      if (initialDosage.recommendedChemical) {
        setChemicalName(initialDosage.recommendedChemical);
      }
      if (initialDosage.standardDosePerLiter) {
        setDosePerLiter(initialDosage.standardDosePerLiter);
      }
      if (initialDosage.unit) {
        setChemicalUnit(initialDosage.unit);
      }
      if (initialDosage.waterVolumeLitersPerAcre) {
        setWaterPerAcre(initialDosage.waterVolumeLitersPerAcre);
      }
      if (initialDosage.phiDays) {
        setPhiDays(initialDosage.phiDays);
      }
    }
  }, [initialDosage]);

  // Convert area into effective acres
  const effectiveAcres =
    areaUnit === "guntha"
      ? farmArea / 40
      : areaUnit === "hectare"
      ? farmArea * 2.471
      : farmArea;

  const activeTankVolume =
    tankType === "custom" ? Number(customTankVolume) || 16 : tankCapacity;

  // Core Math Calculations
  const dosePerTank = Number((activeTankVolume * dosePerLiter).toFixed(1));
  const totalWaterVolume = Math.round(effectiveAcres * waterPerAcre);
  const totalTanksRequired = Math.ceil(totalWaterVolume / Math.max(1, activeTankVolume));
  const totalChemicalRequired = Number((totalWaterVolume * dosePerLiter).toFixed(1));

  const tankPresets = [
    { id: "knapsack", label: "15 L Knapsack Sprayer", capacity: 15, icon: "🎒" },
    { id: "battery", label: "16 L Battery Sprayer", capacity: 16, icon: "⚡" },
    { id: "power", label: "20 L Power Sprayer", capacity: 20, icon: "🚀" },
    { id: "tractor", label: "200 L Tractor Tank", capacity: 200, icon: "🚜" },
    { id: "custom", label: "Custom Volume", capacity: activeTankVolume, icon: "⚙️" },
  ];

  const content = (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/20 text-white backdrop-blur-xs">
                ICAR Precision Ag Calculator
              </span>
              {cropName && cropName !== "Crop" && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-stone-900">
                  {cropName} • {diseaseName}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              {t.sprayDosageTitle || "Pesticide & Spray Tank Dosage Calculator"}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100 max-w-2xl">
              {t.sprayDosageSubtitle || "Prevents over-spraying, pesticide residue toxicity, and spray drift by computing exact chemical dilution per tank and per acre."}
            </p>
          </div>

          {isModal && onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors self-end sm:self-auto"
              aria-label="Close Calculator"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Grid: Inputs on Left, Output Metrics on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Parameters (7 Cols) */}
        <div className="lg:col-span-7 space-y-5 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-stone-200/80 dark:border-zinc-800 shadow-xs">
          <h3 className="text-base font-bold text-stone-900 dark:text-zinc-100 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>{t.sprayEquip || "1. Select Spray Equipment \>1. Select Spray Equipment & Field Size< Field Size"}</span>
          </h3>

          {/* Tank Preset Buttons */}
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-zinc-300 mb-2">
              {t.tankCapacity || "Spray Tank Capacity"}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {tankPresets.map((preset) => {
                const isSelected = tankType === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setTankType(preset.id);
                      if (preset.id !== "custom") {
                        setTankCapacity(preset.capacity);
                      }
                    }}
                    className={`p-3 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                      isSelected
                        ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-900 dark:text-emerald-200 shadow-2xs font-bold"
                        : "bg-stone-50 hover:bg-stone-100 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 border-stone-200 dark:border-zinc-700 text-stone-800 dark:text-zinc-200"
                    }`}
                  >
                    <span className="text-xl mb-1">{preset.icon}</span>
                    <span className="text-xs font-semibold leading-tight">{preset.label}</span>
                  </button>
                );
              })}
            </div>

            {tankType === "custom" && (
              <div className="mt-3 flex items-center gap-2">
                <label className="text-xs font-medium text-stone-600 dark:text-zinc-400">
                  Custom Liters:
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={customTankVolume}
                  onChange={(e) => setCustomTankVolume(e.target.value)}
                  className="w-24 px-3 py-1.5 rounded-xl border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-bold text-stone-900 dark:text-white"
                />
                <span className="text-xs text-stone-500">Liters</span>
              </div>
            )}
          </div>

          {/* Land Area Input */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-zinc-300 mb-1.5">
                Area to Spray
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.1"
                  step="0.25"
                  max="100"
                  value={farmArea}
                  onChange={(e) => setFarmArea(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-sm font-bold text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
                <select
                  value={areaUnit}
                  onChange={(e) => setAreaUnit(e.target.value as any)}
                  className="px-3 py-2.5 rounded-2xl border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-xs font-bold text-stone-800 dark:text-zinc-200"
                >
                  <option value="acre">Acre(s)</option>
                  <option value="guntha">Guntha / Bigha (1/40 Acre)</option>
                  <option value="hectare">Hectare(s)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-zinc-300 mb-1.5">
                Water Volume / Acre (Liters)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="50"
                  max="500"
                  step="10"
                  value={waterPerAcre}
                  onChange={(e) => setWaterPerAcre(Math.max(50, parseInt(e.target.value) || 160))}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-sm font-bold text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
                <span className="text-xs text-stone-500 whitespace-nowrap">L / Acre</span>
              </div>
            </div>
          </div>

          <div className="border-t border-stone-200 dark:border-zinc-800 pt-4 space-y-4">
            <h3 className="text-base font-bold text-stone-900 dark:text-zinc-100 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span>2. Chemical Formulation & Dilution Rate</span>
            </h3>

            {/* Chemical Name */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-zinc-300 mb-1.5">
                Active Chemical / Fungicide / Bio-Pesticide Name
              </label>
              <input
                type="text"
                value={chemicalName}
                onChange={(e) => setChemicalName(e.target.value)}
                placeholder="e.g. Chlorantraniliprole 18.5% SC, Mancozeb 75% WP, or Neem Oil"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-sm text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            {/* Dose Rate + Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-zinc-300 mb-1.5">
                  Standard Dose per 1 Liter of Water
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    max="50"
                    value={dosePerLiter}
                    onChange={(e) => setDosePerLiter(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-sm font-bold text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <select
                    value={chemicalUnit}
                    onChange={(e) => setChemicalUnit(e.target.value as any)}
                    className="px-3 py-2.5 rounded-2xl border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-xs font-bold text-stone-800 dark:text-zinc-200"
                  >
                    <option value="g">grams / L (Powder)</option>
                    <option value="ml">ml / L (Liquid)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-zinc-300 mb-1.5">
                  Pre-Harvest Interval (PHI Safety Days)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={phiDays}
                    onChange={(e) => setPhiDays(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-sm font-bold text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <span className="text-xs text-stone-500 whitespace-nowrap">Days to Wait</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Output: The Farmer's Mixing Guide (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Primary Output Highlight Card */}
          <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500 dark:border-emerald-600 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-200 dark:border-emerald-800/80">
              <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-100">
                <Gauge className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h4 className="font-extrabold text-base">Tank Mixing Recipe</h4>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-600 text-white">
                {activeTankVolume}L Tank
              </span>
            </div>

            {/* Giant Metric: Per Tank Quantity */}
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800 text-center space-y-1 shadow-2xs">
              <p className="text-xs uppercase font-black text-stone-500 dark:text-zinc-400 tracking-wider">
                Add To Each Single Tank ({activeTankVolume} L)
              </p>
              <div className="text-3xl sm:text-4xl font-black text-emerald-700 dark:text-emerald-300 tracking-tight">
                {dosePerTank} <span className="text-xl font-bold">{chemicalUnit === "g" ? "grams" : "ml"}</span>
              </div>
              <p className="text-xs text-stone-600 dark:text-zinc-300 pt-1">
                Fill tank 50% with water, add <strong>{dosePerTank} {chemicalUnit}</strong> of {chemicalName.slice(0, 24)}..., stir well, then fill to {activeTankVolume}L mark.
              </p>
            </div>

            {/* Total Acre Requirements Summary */}
            <div className="grid grid-cols-2 gap-2.5 text-center">
              <div className="p-3 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-emerald-200/80 dark:border-emerald-800">
                <p className="text-[11px] font-bold text-stone-500 dark:text-zinc-400">Total Tanks Required</p>
                <p className="text-2xl font-black text-stone-900 dark:text-white mt-0.5">
                  {totalTanksRequired} <span className="text-xs font-semibold">Tanks</span>
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-emerald-200/80 dark:border-emerald-800">
                <p className="text-[11px] font-bold text-stone-500 dark:text-zinc-400">Total Water Volume</p>
                <p className="text-2xl font-black text-stone-900 dark:text-white mt-0.5">
                  {totalWaterVolume} <span className="text-xs font-semibold">Liters</span>
                </p>
              </div>
            </div>

            {/* Total Chemical to purchase */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-stone-600 dark:text-zinc-400">Total Chemical Needed for Farm</p>
                <p className="text-xs text-stone-400 dark:text-zinc-500">For {farmArea} {areaUnit}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-emerald-800 dark:text-emerald-300">
                  {totalChemicalRequired >= 1000
                    ? `${(totalChemicalRequired / 1000).toFixed(2)} ${chemicalUnit === "g" ? "kg" : "L"}`
                    : `${totalChemicalRequired} ${chemicalUnit}`}
                </p>
              </div>
            </div>

            {/* Pre-Harvest Safety Interval (PHI) Warning */}
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 flex items-start gap-2.5">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Pre-Harvest Safety Waiting Interval (PHI): {phiDays} Days
                </p>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                  Do NOT harvest or consume {cropName} within {phiDays} days after spraying to ensure zero harmful pesticide chemical residues.
                </p>
              </div>
            </div>
          </div>

          {/* Personal Protective Equipment (PPE) Safety Card */}
          <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-stone-200/80 dark:border-zinc-800 shadow-xs space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-stone-500 dark:text-zinc-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Mandatory Farmer Safety Checklist</span>
            </h4>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-stone-50 dark:bg-zinc-800/60 text-stone-700 dark:text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>N95 Mask & Goggles</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-stone-50 dark:bg-zinc-800/60 text-stone-700 dark:text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Nitrile Rubber Gloves</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-stone-50 dark:bg-zinc-800/60 text-stone-700 dark:text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Spray Along Wind Only</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-stone-50 dark:bg-zinc-800/60 text-stone-700 dark:text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>No Livestock for 48 hrs</span>
              </div>
            </div>

            <p className="text-[11px] text-stone-500 dark:text-zinc-400 leading-relaxed pt-1">
              💡 <strong>Weather Spray Rule:</strong> Never spray when wind speed exceeds 15 km/h (to prevent drift onto neighboring fields) or when rain is expected within 3 hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl my-8">
          {content}
        </div>
      </div>
    );
  }

  return content;
};
