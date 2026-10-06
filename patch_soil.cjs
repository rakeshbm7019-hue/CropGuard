const fs = require('fs');
const file = 'src/components/SoilCropAdvisor.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import { useRef } from "react";')) {
  content = content.replace(
    'import React, { useState, useMemo, useEffect } from "react";',
    'import React, { useState, useMemo, useEffect, useRef } from "react";'
  );
}

if (!content.includes('Camera')) {
  content = content.replace(
    'import { Language, UserProfile } from "../types";',
    'import { Camera } from "lucide-react";\nimport { Language, UserProfile } from "../types";'
  );
}

if (!content.includes('const fileInputRef = useRef<HTMLInputElement>(null);')) {
  content = content.replace(
    'const [aiResponse, setAiResponse] = useState<string | null>(null);',
    'const [aiResponse, setAiResponse] = useState<string | null>(null);\n  const fileInputRef = useRef<HTMLInputElement>(null);\n  const [selectedImage, setSelectedImage] = useState<string | null>(null);\n\n  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {\n    const file = e.target.files?.[0];\n    if (file) {\n      const reader = new FileReader();\n      reader.onload = (event) => {\n        setSelectedImage(event.target?.result as string);\n      };\n      reader.readAsDataURL(file);\n    }\n  };'
  );
}

content = content.replace(
  'question: `Regarding soil type and crop selection: ${aiPrompt}. Soil type context: ${selectedSoil.name}, pH: ${selectedSoil.phRange.optimal}, Region: ${user?.state || "India"}. Provide 3 top crops to grow, soil treatment before sowing, and NPK dosage in ${language}.`,',
  'prompt: `Regarding soil type and crop selection: ${aiPrompt || "Analyze this soil photo."}. ${selectedImage ? "I have attached a photo of my soil. Please visually analyze the soil type, texture, and color. Suggest the exact top crops to grow." : `Soil type context: ${selectedSoil.name}, pH: ${selectedSoil.phRange.optimal}.`} Region: ${user?.state || "India"}. Provide top crops to grow, soil treatment before sowing, and fertilizer dosage in ${language}.`,\n          attachmentBase64: selectedImage || undefined,'
);

content = content.replace(
  'disabled={aiLoading || !aiPrompt.trim()}',
  'disabled={aiLoading || (!aiPrompt.trim() && !selectedImage)}'
);

const textareaHtml = `<textarea
                rows={3}
                placeholder="Describe your soil (color, location, water source) or ask which crop to sow..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="w-full p-4 rounded-2xl bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-emerald-600 resize-none"
              />`;

const replacementTextareaHtml = `<textarea
                rows={3}
                placeholder="Describe your soil or take a photo of your soil for exact crop suggestions..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="w-full p-4 pr-12 rounded-2xl bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-emerald-600 resize-none"
              />
              <div className="absolute right-3 bottom-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400 transition-colors cursor-pointer shadow-sm"
                  title="Take Soil Photo"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>`;

content = content.replace(textareaHtml, replacementTextareaHtml);

const formHtml = `<form onSubmit={handleAskSoilAi} className="space-y-3">`;
const replacementFormHtml = `<form onSubmit={handleAskSoilAi} className="space-y-3">
            {/* Image Preview */}
            {selectedImage && (
              <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-emerald-500/30 shadow-sm">
                <img src={selectedImage} alt="Soil Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-1 right-1 p-1.5 bg-black/60 rounded-full text-white hover:bg-black transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
              capture="environment"
            />`;

content = content.replace(formHtml, replacementFormHtml);

fs.writeFileSync(file, content);
