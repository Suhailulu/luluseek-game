export interface CustomizationData {
  color: string;
  accessory: string; // headwear
  hair: string;      // hairstyle
  outfit: string;    // clothing
  glasses: string;   // face glasses
}

export const DEFAULT_CUSTOMIZATION: CustomizationData = {
  color: '#38bdf8',
  accessory: 'none',
  hair: 'none',
  outfit: 'none',
  glasses: 'none',
};

export const COLOR_OPTIONS = [
  { value: '#ef4444', label: 'Cherry Red' },
  { value: '#f97316', label: 'Sunset Orange' },
  { value: '#facc15', label: 'Sunny Yellow' },
  { value: '#4ade80', label: 'Lime Green' },
  { value: '#14b8a6', label: 'Mint Teal' },
  { value: '#38bdf8', label: 'Sky Blue' },
  { value: '#6366f1', label: 'Indigo Velvet' },
  { value: '#a855f7', label: 'Grape Purple' },
  { value: '#f472b6', label: 'Bubblegum Pink' },
  { value: '#64748b', label: 'Cool Slate' },
  { value: '#059669', label: 'Emerald' },
  { value: '#d97706', label: 'Amber' },
];

export const ACCESSORY_OPTIONS = [
  { id: 'none', name: 'No Hat', emoji: '🟢' },
  { id: 'cat_ears', name: 'Cat Ears 🐱', emoji: '🔺' },
  { id: 'crown', name: 'Shiny Crown 👑', emoji: '👑' },
  { id: 'cowboy_hat', name: 'Cowboy Hat 🤠', emoji: '🤠' },
  { id: 'ninja', name: 'Ninja Band 🥷', emoji: '🧣' },
  { id: 'space', name: 'Astro Dome 👩‍🚀', emoji: '🪐' },
  { id: 'chef', name: 'Chef Hat 👨‍🍳', emoji: '🧁' },
  { id: 'pirate', name: 'Pirate Hat 🏴‍☠️', emoji: '🏴‍☠️' },
  { id: 'party_hat', name: 'Party Cone 🎉', emoji: '🎉' },
  { id: 'halo', name: 'Angel Halo 😇', emoji: '😇' },
];

export const HAIR_OPTIONS = [
  { id: 'none', name: 'Bald / None', emoji: '👩' },
  { id: 'afro', name: 'Afro Hair 🧑‍🦱', emoji: '🧑‍🦱' },
  { id: 'spiky', name: 'Spiky Cut ⚡', emoji: '⚡' },
  { id: 'long', name: 'Long Locks 💇‍♀️', emoji: '💇‍♀️' },
  { id: 'bob', name: 'Cute Bob 💇', emoji: '💇' },
  { id: 'curly', name: 'Curly Waves 🦱', emoji: '🦱' },
  { id: 'pony', name: 'Ponytail 👧', emoji: '👧' },
];

export const OUTFIT_OPTIONS = [
  { id: 'none', name: 'Plain Tee', emoji: '👕' },
  { id: 'stripe', name: 'Stripes 🦓', emoji: '🦓' },
  { id: 'star', name: 'Star Hero ⭐', emoji: '⭐' },
  { id: 'suit', name: 'Gentle Suit 👔', emoji: '👔' },
  { id: 'hoodie', name: 'Cozy Hoodie 🧥', emoji: '🧥' },
  { id: 'jersey', name: 'Sports 77 ⚽', emoji: '⚽' },
  { id: 'dots', name: 'Polka Dots ⚪', emoji: '⚪' },
];

export const GLASSES_OPTIONS = [
  { id: 'none', name: 'No Glasses', emoji: '👀' },
  { id: 'sunglasses', name: 'Cool Shades 😎', emoji: '😎' },
  { id: 'nerd_glasses', name: 'Nerd Specs 🤓', emoji: '🤓' },
  { id: 'eyepatch', name: 'Eye Patch 🏴‍☠️', emoji: '👁️' },
  { id: 'vr_headset', name: 'VR Goggles 🥽', emoji: '🥽' },
];

const LOCAL_STORAGE_KEY = 'lulu_seek_customization';

export function getSavedCustomization(): CustomizationData {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        color: parsed.color || DEFAULT_CUSTOMIZATION.color,
        accessory: parsed.accessory || DEFAULT_CUSTOMIZATION.accessory,
        hair: parsed.hair || DEFAULT_CUSTOMIZATION.hair,
        outfit: parsed.outfit || DEFAULT_CUSTOMIZATION.outfit,
        glasses: parsed.glasses || DEFAULT_CUSTOMIZATION.glasses,
      };
    }
  } catch (e) {
    console.warn('Failed to read customization from localStorage', e);
  }
  return { ...DEFAULT_CUSTOMIZATION };
}

export function saveCustomization(data: Partial<CustomizationData>): CustomizationData {
  const current = getSavedCustomization();
  const updated = { ...current, ...data };
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save customization to localStorage', e);
  }
  return updated;
}

export function getRandomCustomization(): CustomizationData {
  const randCol = COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)].value;
  const randAcc = ACCESSORY_OPTIONS[Math.floor(Math.random() * ACCESSORY_OPTIONS.length)].id;
  const randHair = HAIR_OPTIONS[Math.floor(Math.random() * HAIR_OPTIONS.length)].id;
  const randOutfit = OUTFIT_OPTIONS[Math.floor(Math.random() * OUTFIT_OPTIONS.length)].id;
  const randGlasses = GLASSES_OPTIONS[Math.floor(Math.random() * GLASSES_OPTIONS.length)].id;

  return {
    color: randCol,
    accessory: randAcc,
    hair: randHair,
    outfit: randOutfit,
    glasses: randGlasses,
  };
}
