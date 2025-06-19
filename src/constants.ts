export const JAAZ_IMAGE_MODELS = [
  "google/imagen-4",
  "google/imagen-4-ultra",
  "black-forest-labs/flux-1.1-pro",
  "black-forest-labs/flux-kontext-pro",
  "black-forest-labs/flux-kontext-max",
  "recraft-ai/recraft-v3",
  "ideogram-ai/ideogram-v3-balanced",
  "openai/gpt-image-1",
];

export const JAAZ_IMAGE_MODELS_INFO = {
  "google/imagen-4": {
    name: "Imagen 4",
    description: "Google AI",
    price: 0.04,
  },
  "google/imagen-4-ultra": {
    name: "Imagen 4 Ultra",
    description: "Google AI",
    price: 0.06,
  },
  "black-forest-labs/flux-1.1-pro": {
    name: "Flux 1.1 Pro",
    description: "Black Forest Labs",
    price: 0.04,
  },
  "black-forest-labs/flux-kontext-pro": {
    name: "Flux Kontext Pro",
    description: "Black Forest Labs",
    price: 0.04,
  },
  "black-forest-labs/flux-kontext-max": {
    name: "Flux Kontext Max",
    description: "Black Forest Labs",
    price: 0.08,
  },
  "recraft-ai/recraft-v3": {
    name: "Recraft V3",
    description: "Recraft AI",
    price: 0.04,
  },
  "ideogram-ai/ideogram-v3-balanced": {
    name: "Ideogram V3 Balanced",
    description: "Ideogram AI",
    price: 0.06,
  },
  "openai/gpt-image-1": {
    name: "GPT Image 1",
    description: "OpenAI",
    price: 0.04,
  },
};

export const IMAGE_RATIO_OPTIONS = {
  "1:1": {
    label: "正方形 (1:1)",
  },
  "3:4": {
    label: "竖屏 (3:4)",
  },
  "4:3": {
    label: "横屏 (4:3)",
  },

  "9:16": {
    label: "长竖屏 (9:16)",
  },
  "16:9": {
    label: "宽屏 (16:9)",
  },
};
