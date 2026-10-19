export const SHOW_THEME_COLOR_PICKER = true; // Set to false to hide in dev if needed

export interface ThemeColor {
  name: string;
  hex: string;
}

export const PRESET_THEME_COLORS: ThemeColor[] = [
  // Row 1: Greens, Cyans & Blues
  { name: 'Emerald Green', hex: '#059669' },
  { name: 'Forest Green', hex: '#10B981' },
  { name: 'Lime Green', hex: '#65A30D' },
  { name: 'Olive Green', hex: '#4D7C0F' },
  { name: 'Teal Cyan', hex: '#0D9488' },
  { name: 'Vibrant Cyan', hex: '#06B6D4' },
  { name: 'Sky Blue', hex: '#0284C7' },
  { name: 'Cobalt Blue', hex: '#2563EB' },

  // Row 2: Deep Blues, Purples & Pinks
  { name: 'Navy Blue', hex: '#1D4ED8' },
  { name: 'Royal Indigo', hex: '#4F46E5' },
  { name: 'Iris Violet', hex: '#6366F1' },
  { name: 'Purple Bloom', hex: '#8B5CF6' },
  { name: 'Deep Violet', hex: '#7C3AED' },
  { name: 'Fuchsia Magenta', hex: '#C026D3' },
  { name: 'Hot Pink', hex: '#DB2777' },
  { name: 'Crimson Rose', hex: '#E11D48' },

  // Row 3: Warm Reds, Oranges, Ambers & Slate
  { name: 'Scuderia Red', hex: '#DC2626' },
  { name: 'Coral Flame', hex: '#EA580C' },
  { name: 'Tangerine Orange', hex: '#F97316' },
  { name: 'Amber Gold', hex: '#D97706' },
  { name: 'Caramel Ochre', hex: '#B45309' },
  { name: 'Bronze Cinnamon', hex: '#9A3412' },
  { name: 'Slate Blue', hex: '#475569' },
  { name: 'Dark Charcoal', hex: '#1E293B' },
];

export const DEFAULT_THEME_COLOR = '#059669';

export function applyAccentColor(hexColor: string) {
  if (!hexColor) return;
  try {
    localStorage.setItem('zoaib_ali_accent_color', hexColor);
  } catch (_) {}

  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--color-primary', hexColor);
    const hex = hexColor.replace('#', '');
    let r = 5, g = 150, b = 105;
    if (hex.length === 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
      document.documentElement.style.setProperty('--color-primary-rgb', `${r} ${g} ${b}`);
    }

    const darkerR = Math.max(0, Math.round(r * 0.82));
    const darkerG = Math.max(0, Math.round(g * 0.82));
    const darkerB = Math.max(0, Math.round(b * 0.82));
    const darkerHex = `rgb(${darkerR}, ${darkerG}, ${darkerB})`;

    // Dynamic style tag that globally overrides brand primary classes to the active accent color
    let styleTag = document.getElementById('zoaib-ali-dynamic-theme');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'zoaib-ali-dynamic-theme';
      document.head.appendChild(styleTag);
    }

    styleTag.innerHTML = `
      :root {
        --color-primary: ${hexColor};
        --color-primary-rgb: ${r}, ${g}, ${b};
      }

      /* Solid Backgrounds */
      .bg-emerald-600,
      .bg-emerald-500,
      .bg-emerald-700,
      .bg-primary {
        background-color: ${hexColor} !important;
      }

      /* Hover Backgrounds */
      .hover\\:bg-emerald-700:hover,
      .hover\\:bg-emerald-800:hover,
      .hover\\:bg-emerald-600:hover,
      .hover\\:bg-primary-hover:hover {
        background-color: ${darkerHex} !important;
      }

      /* Light / Translucent Background Tints */
      .bg-emerald-50,
      .bg-emerald-50\\/80,
      .bg-emerald-600\\/10,
      .bg-emerald-500\\/10,
      .bg-emerald-500\\/20,
      .bg-primary\\/10,
      .bg-primary\\/5 {
        background-color: rgba(${r}, ${g}, ${b}, 0.1) !important;
      }

      /* Dark Mode Translucent Backgrounds */
      .dark .bg-emerald-500\\/15,
      .dark .bg-emerald-950\\/30,
      .dark .bg-emerald-900\\/30,
      .dark .bg-emerald-500\\/20,
      .dark .bg-primary\\/20 {
        background-color: rgba(${r}, ${g}, ${b}, 0.18) !important;
      }

      .bg-emerald-400 {
        background-color: ${hexColor} !important;
        opacity: 0.75 !important;
      }

      /* Text Colors */
      .text-emerald-600,
      .text-emerald-500,
      .text-emerald-700,
      .dark .text-emerald-400,
      .text-primary {
        color: ${hexColor} !important;
      }

      /* Hover Text Colors */
      .hover\\:text-emerald-600:hover,
      .hover\\:text-emerald-700:hover,
      .hover\\:text-primary:hover {
        color: ${hexColor} !important;
      }

      /* Borders */
      .border-emerald-600,
      .border-emerald-500,
      .border-emerald-500\\/20,
      .border-primary,
      .focus\\:border-emerald-500:focus,
      .focus\\:border-emerald-600:focus,
      .focus\\:border-primary:focus {
        border-color: ${hexColor} !important;
      }

      /* Glow / Shadows */
      .shadow-emerald-600\\/30,
      .shadow-emerald-600\\/20 {
        box-shadow: 0 10px 15px -3px rgba(${r}, ${g}, ${b}, 0.28) !important;
      }

      /* Gradients */
      .from-emerald-600 {
        --tw-gradient-from: ${hexColor} var(--tw-gradient-from-position) !important;
        --tw-gradient-to: rgba(${r}, ${g}, ${b}, 0) var(--tw-gradient-to-position) !important;
        --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important;
      }
      .via-emerald-600 {
        --tw-gradient-to: rgba(${r}, ${g}, ${b}, 0) var(--tw-gradient-to-position) !important;
        --tw-gradient-stops: var(--tw-gradient-from), ${hexColor} var(--tw-gradient-via-position), var(--tw-gradient-to) !important;
      }
      .to-emerald-700 {
        --tw-gradient-to: ${darkerHex} var(--tw-gradient-to-position) !important;
      }

      .fill-primary {
        fill: ${hexColor} !important;
      }
      .stroke-primary {
        stroke: ${hexColor} !important;
      }
    `;
  }
}

export function getSavedAccentColor(): string {
  if (typeof window === 'undefined') return DEFAULT_THEME_COLOR;
  return localStorage.getItem('zoaib_ali_accent_color') || DEFAULT_THEME_COLOR;
}
