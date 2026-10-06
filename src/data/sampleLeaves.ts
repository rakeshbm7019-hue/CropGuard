export interface SampleLeaf {
  id: string;
  cropName: string;
  cropKey: string;
  diseaseName: string;
  icon: string;
  previewSvg: string;
  description: string;
}

export const SAMPLE_LEAVES: SampleLeaf[] = [
  {
    id: "sample_tomato_early_blight",
    cropName: "Tomato",
    cropKey: "Tomato (टमाटर)",
    diseaseName: "Early Blight (Alternaria solani)",
    icon: "🍅",
    description: "Concentric target-board brown spots on lower leaves",
    previewSvg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><rect width="400" height="300" fill="%2327422b"/><path d="M200 40 C280 90, 310 180, 240 260 C170 280, 120 220, 110 160 C100 100, 150 50, 200 40 Z" fill="%23487c4d" stroke="%23305835" stroke-width="4"/><path d="M200 40 Q190 150 200 260" stroke="%232d5631" stroke-width="4" fill="none"/><circle cx="170" cy="120" r="28" fill="%235c3a21" stroke="%233e2412" stroke-width="3"/><circle cx="170" cy="120" r="16" fill="%237e502e" stroke="%235c3a21" stroke-width="2"/><circle cx="230" cy="180" r="32" fill="%235c3a21" stroke="%233e2412" stroke-width="3"/><circle cx="230" cy="180" r="18" fill="%237e502e" stroke="%235c3a21" stroke-width="2"/><circle cx="150" cy="200" r="16" fill="%234a2c16"/><text x="200" y="285" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23ffffff" text-anchor="middle">Tomato - Early Blight Specimen</text></svg>`,
  },
  {
    id: "sample_paddy_blast",
    cropName: "Paddy / Rice",
    cropKey: "Paddy / Rice (धान)",
    diseaseName: "Rice Blast (Magnaporthe oryzae)",
    icon: "🌾",
    description: "Spindle-shaped diamond lesions with ash-grey centers",
    previewSvg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><rect width="400" height="300" fill="%231e3b2b"/><path d="M50 240 Q180 180 350 70 Q300 120 100 270 Z" fill="%23689f38" stroke="%2333691e" stroke-width="3"/><path d="M120 200 Q200 140 280 90" stroke="%2333691e" stroke-width="3" fill="none"/><ellipse cx="180" cy="155" rx="35" ry="12" transform="rotate(-30 180 155)" fill="%239e9e9e" stroke="%238d6e63" stroke-width="3"/><ellipse cx="240" cy="120" rx="25" ry="8" transform="rotate(-30 240 120)" fill="%239e9e9e" stroke="%238d6e63" stroke-width="2.5"/><text x="200" y="285" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23ffffff" text-anchor="middle">Rice - Blast Foliar Lesions</text></svg>`,
  },
  {
    id: "sample_potato_late_blight",
    cropName: "Potato",
    cropKey: "Potato (आलू)",
    diseaseName: "Late Blight (Phytophthora infestans)",
    icon: "🥔",
    description: "Water-soaked dark brown decaying patches",
    previewSvg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><rect width="400" height="300" fill="%232b3827"/><path d="M190 50 C260 70, 290 150, 260 230 C210 270, 150 260, 130 190 C110 120, 140 60, 190 50 Z" fill="%23558b2f" stroke="%2333691e" stroke-width="3"/><path d="M185 50 Q195 150 200 250" stroke="%2333691e" stroke-width="3" fill="none"/><path d="M140 120 Q190 130 200 180 Q170 210 130 170 Z" fill="%233e2723" opacity="0.9"/><path d="M220 180 Q270 200 250 240 Q210 240 210 200 Z" fill="%233e2723" opacity="0.9"/><text x="200" y="285" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23ffffff" text-anchor="middle">Potato - Late Blight Water Soaking</text></svg>`,
  },
  {
    id: "sample_chilli_leaf_curl",
    cropName: "Chilli",
    cropKey: "Chilli (मिर्च)",
    diseaseName: "Chilli Murda & Leaf Curl Complex",
    icon: "🌶️",
    description: "Upward boat-shaped leaf cupping and floral drop",
    previewSvg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><rect width="400" height="300" fill="%2326382b"/><path d="M200 40 C270 100, 260 210, 220 260 C180 270, 150 220, 140 160 C130 100, 160 50, 200 40 Z" fill="%237cb342" stroke="%23558b2f" stroke-width="3"/><path d="M160 90 Q200 130 180 190" stroke="%23fdd835" stroke-width="4" fill="none" opacity="0.85"/><path d="M230 110 Q210 160 220 220" stroke="%23fdd835" stroke-width="3.5" fill="none" opacity="0.85"/><text x="200" y="285" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23ffffff" text-anchor="middle">Chilli - Leaf Curl & Thrips Murda</text></svg>`,
  },
  {
    id: "sample_maize_fall_armyworm",
    cropName: "Maize / Corn",
    cropKey: "Maize / Corn (मक्का)",
    diseaseName: "Fall Armyworm (Spodoptera frugiperda)",
    icon: "🌽",
    description: "Window-pane leaf feeding holes and sawdust frass",
    previewSvg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><rect width="400" height="300" fill="%23203828"/><path d="M70 260 Q170 120 330 60 Q270 160 140 275 Z" fill="%238bc34a" stroke="%23689f38" stroke-width="3"/><ellipse cx="180" cy="160" rx="14" ry="9" fill="%23203828" stroke="%234e342e" stroke-width="2"/><ellipse cx="230" cy="125" rx="18" ry="11" fill="%23203828" stroke="%234e342e" stroke-width="2"/><ellipse cx="210" cy="140" rx="6" ry="6" fill="%235d4037"/><text x="200" y="285" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23ffffff" text-anchor="middle">Maize - Fall Armyworm Feeding</text></svg>`,
  },
  {
    id: "sample_cotton_bollworm",
    cropName: "Cotton",
    cropKey: "Cotton (कपास)",
    diseaseName: "Pink Bollworm & Whitefly Damage",
    icon: "🌿",
    description: "Rosette flower damage & honey-dew sooty mold",
    previewSvg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><rect width="400" height="300" fill="%232d3b2d"/><path d="M200 50 C260 80, 280 130, 290 180 C270 210, 240 240, 200 250 C160 240, 130 210, 110 180 C120 130, 140 80, 200 50 Z" fill="%2343a047" stroke="%232e7d32" stroke-width="3"/><circle cx="160" cy="140" r="14" fill="%23212121" opacity="0.8"/><circle cx="230" cy="160" r="18" fill="%23212121" opacity="0.8"/><circle cx="190" cy="190" r="12" fill="%23d81b60"/><text x="200" y="285" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23ffffff" text-anchor="middle">Cotton - Bollworm & Foliar Soot</text></svg>`,
  },
  {
    id: "sample_wheat_rust",
    cropName: "Wheat",
    cropKey: "Wheat (गेहूं)",
    diseaseName: "Yellow / Stripe Rust (Puccinia striiformis)",
    icon: "🌾",
    description: "Yellow powdery pustules in longitudinal stripes",
    previewSvg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><rect width="400" height="300" fill="%23253826"/><path d="M80 260 Q180 160 320 60 Q270 150 120 270 Z" fill="%237cb342" stroke="%23558b2f" stroke-width="3"/><path d="M120 220 Q190 150 260 90" stroke="%23fbc02d" stroke-width="5" stroke-dasharray="8 4" fill="none"/><path d="M140 210 Q200 145 270 85" stroke="%23f57f17" stroke-width="4" stroke-dasharray="6 3" fill="none"/><text x="200" y="285" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23ffffff" text-anchor="middle">Wheat - Stripe Rust Pustules</text></svg>`,
  },
  {
    id: "sample_sugarcane_red_rot",
    cropName: "Sugarcane",
    cropKey: "Sugarcane (गन्ना)",
    diseaseName: "Red Rot (Colletotrichum falcatum)",
    icon: "🎋",
    description: "Third leaf yellowing and internal stalk reddening",
    previewSvg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><rect width="400" height="300" fill="%2326382b"/><path d="M90 260 Q180 140 310 50 Q260 140 140 270 Z" fill="%23689f38" stroke="%2333691e" stroke-width="3"/><path d="M130 220 Q190 140 260 70" stroke="%23d32f2f" stroke-width="6" fill="none"/><text x="200" y="285" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23ffffff" text-anchor="middle">Sugarcane - Red Rot Midrib Lesion</text></svg>`,
  },
];
