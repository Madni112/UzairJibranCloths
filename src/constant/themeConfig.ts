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
  { name: 'Pure White', hex: '#FFFFFF' },
  { name: 'Pitch Black', hex: '#000000' },
];

export const DEFAULT_THEME_COLOR = '#6366F1'; // Royal Blurple (Purple & Blue Fusion)

export function applyAccentColor(hexColor: string) {
  if (!hexColor) return;
  try {
    localStorage.setItem('uzair_jibran_accent_color', hexColor);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('uzair_jibran_theme_color_changed'));
    }
  } catch (_) {}

  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--color-primary', hexColor);
    const hex = hexColor.replace('#', '');
    let r = 99, g = 102, b = 241;
    if (hex.length === 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
      document.documentElement.style.setProperty('--color-primary-rgb', `${r} ${g} ${b}`);
    }

    // Calculate relative luminance to determine if the color is light or dark
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const isDark = luminance < 0.55;

    // Light version of the color (for dark colors): clean lighter tone of the same color
    const lightR = Math.min(255, Math.round(r + (255 - r) * 0.38));
    const lightG = Math.min(255, Math.round(g + (255 - g) * 0.38));
    const lightB = Math.min(255, Math.round(b + (255 - b) * 0.38));
    const lightHex = `rgb(${lightR}, ${lightG}, ${lightB})`;

    // Dark version of the color (for light colors): deeper shade of the same color
    const darkR = Math.max(0, Math.round(r * 0.60));
    const darkG = Math.max(0, Math.round(g * 0.60));
    const darkB = Math.max(0, Math.round(b * 0.60));
    const darkHex = `rgb(${darkR}, ${darkG}, ${darkB})`;

    // Rule: Use simple light version if dark color is selected, and dark version if light color is selected
    const companionShade = isDark ? lightHex : darkHex;

    const darkerR = Math.max(0, Math.round(r * 0.82));
    const darkerG = Math.max(0, Math.round(g * 0.82));
    const darkerB = Math.max(0, Math.round(b * 0.82));
    const darkerHex = `rgb(${darkerR}, ${darkerG}, ${darkerB})`;

    // Dynamic style tag that globally overrides brand primary classes to the active accent color
    let styleTag = document.getElementById('uj-cloth-dynamic-theme');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'uj-cloth-dynamic-theme';
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
      .bg-emerald-800,
      .bg-teal-600,
      .bg-teal-500,
      .bg-teal-700,
      .bg-teal-800,
      .bg-primary {
        background-color: ${hexColor} !important;
      }

      /* Hover Backgrounds */
      .hover\\:bg-emerald-700:hover,
      .hover\\:bg-emerald-800:hover,
      .hover\\:bg-emerald-600:hover,
      .hover\\:bg-teal-700:hover,
      .hover\\:bg-teal-800:hover,
      .hover\\:bg-teal-600:hover,
      .hover\\:bg-primary-hover:hover {
        background-color: ${darkerHex} !important;
      }

      /* Light / Translucent Background Tints */
      .bg-emerald-50,
      .bg-emerald-50\\/80,
      .bg-emerald-600\\/10,
      .bg-emerald-500\\/10,
      .bg-emerald-500\\/20,
      .bg-teal-50,
      .bg-teal-50\\/80,
      .bg-teal-600\\/10,
      .bg-teal-500\\/10,
      .bg-teal-500\\/20,
      .bg-primary\\/10,
      .bg-primary\\/5 {
        background-color: rgba(${r}, ${g}, ${b}, 0.1) !important;
      }

      /* Dark Mode Translucent Backgrounds */
      .dark .bg-emerald-500\\/15,
      .dark .bg-emerald-950\\/30,
      .dark .bg-emerald-900\\/30,
      .dark .bg-emerald-500\\/20,
      .dark .bg-teal-500\\/15,
      .dark .bg-teal-950\\/30,
      .dark .bg-teal-900\\/30,
      .dark .bg-teal-500\\/20,
      .dark .bg-teal-950\\/20,
      .dark .bg-primary\\/20 {
        background-color: rgba(${r}, ${g}, ${b}, 0.18) !important;
      }

      .bg-emerald-400,
      .bg-teal-400 {
        background-color: ${hexColor} !important;
        opacity: 0.75 !important;
      }

      /* Text Colors */
      .text-emerald-600,
      .text-emerald-500,
      .text-emerald-700,
      .dark .text-emerald-400,
      .text-teal-600,
      .text-teal-500,
      .text-teal-700,
      .dark .text-teal-400,
      .text-primary {
        color: ${hexColor} !important;
      }

      /* Hover Text Colors */
      .hover\\:text-emerald-600:hover,
      .hover\\:text-emerald-700:hover,
      .hover\\:text-teal-600:hover,
      .hover\\:text-teal-700:hover,
      .hover\\:text-primary:hover {
        color: ${hexColor} !important;
      }

      /* Borders */
      .border-emerald-600,
      .border-emerald-500,
      .border-emerald-500\\/20,
      .border-teal-600,
      .border-teal-500,
      .border-teal-500\\/20,
      .border-primary,
      .border-primary\\/40,
      .focus\\:border-emerald-500:focus,
      .focus\\:border-emerald-600:focus,
      .focus\\:border-teal-500:focus,
      .focus\\:border-teal-600:focus,
      .focus\\:border-primary:focus {
        border-color: ${hexColor} !important;
      }

      /* Glow / Shadows */
      .shadow-emerald-600\\/30,
      .shadow-emerald-600\\/20,
      .shadow-teal-600\\/30,
      .shadow-teal-600\\/20,
      .shadow-primary\\/30,
      .shadow-primary\\/20,
      .shadow-primary {
        box-shadow: 0 10px 15px -3px rgba(${r}, ${g}, ${b}, 0.28) !important;
      }

      /* Gradients: Start at active accent color */
      .from-emerald-400,
      .from-emerald-500,
      .from-emerald-600,
      .from-emerald-700,
      .from-emerald-800,
      .from-teal-400,
      .from-teal-500,
      .from-teal-600,
      .from-teal-700,
      .from-teal-800,
      .from-primary {
        --tw-gradient-from: ${hexColor} var(--tw-gradient-from-position) !important;
      }

      /* Gradients: End at companion shade (light version for dark colors, dark version for light colors) */
      .to-emerald-500,
      .to-emerald-600,
      .to-emerald-700,
      .to-emerald-800,
      .to-emerald-900,
      .to-teal-500,
      .to-teal-600,
      .to-teal-700,
      .to-teal-800,
      .to-teal-900,
      .to-cyan-700,
      .to-cyan-800,
      .to-primary {
        --tw-gradient-to: ${companionShade} var(--tw-gradient-to-position) !important;
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
  const stored = localStorage.getItem('uzair_jibran_accent_color');
  if (!stored || stored === '#059669' || stored === '#10B981') {
    return DEFAULT_THEME_COLOR;
  }
  return stored;
}

export function isThemeColorPickerEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem('show_navbar_theme_color_picker');
  return stored !== 'false';
}

export function setThemeColorPickerEnabled(enabled: boolean) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('show_navbar_theme_color_picker', enabled ? 'true' : 'false');
    window.dispatchEvent(new Event('theme_color_picker_visibility_changed'));
  }
}

export const DEFAULT_SIDEBAR_COLOR = '#F8FAFC'; // Crisp light high-contrast for black sidebar

export function isDarkModeActive(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const stored = localStorage.getItem('color-theme');
    if (stored === '"dark"' || stored === 'dark') return true;
    if (stored === '"light"' || stored === 'light') return false;
  } catch (_) {}
  return document.body.classList.contains('dark') || document.documentElement.classList.contains('dark');
}

/**
 * Ensures a color has sufficient contrast against the sidebar background.
 * - In Light Mode (App): Sidebar is BLACK (#0B0F17) -> Font CAN be white! Blocks black/dark invisible colors.
 * - In Dark Mode (App): Sidebar is WHITE (#FFFFFF) -> Font CAN be black! Blocks white/light invisible colors.
 */
export function getSafeSidebarColor(hexColor: string, isDarkMode?: boolean): { safeColor: string; wasAdjusted: boolean } {
  const inDark = typeof isDarkMode === 'boolean' ? isDarkMode : isDarkModeActive();
  const defaultFallback = inDark ? '#0F172A' : '#FFFFFF';

  if (!hexColor) return { safeColor: defaultFallback, wasAdjusted: false };
  
  let cleanHex = hexColor.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  if (cleanHex.length !== 6 || !/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    return { safeColor: defaultFallback, wasAdjusted: false };
  }

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  // Relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  if (!inDark) {
    // LIGHT MODE APP: Sidebar background is BLACK (#0B0F17)
    // White and bright colors are fully allowed!
    // Block black or dark colors that would make text invisible against black:
    if (luminance < 0.35) {
      if (luminance <= 0.18) {
        // Pure black or dark charcoal -> adjust to crisp high-contrast white
        return { safeColor: '#FFFFFF', wasAdjusted: true };
      }
      // For chromatic dark colors, brighten to be visible
      const scale = 0.55 / Math.max(0.01, luminance);
      const safeR = Math.min(255, Math.max(0, Math.round(r * scale + (255 - r) * 0.35)));
      const safeG = Math.min(255, Math.max(0, Math.round(g * scale + (255 - g) * 0.35)));
      const safeB = Math.min(255, Math.max(0, Math.round(b * scale + (255 - b) * 0.35)));
      const safeHex = `#${safeR.toString(16).padStart(2, '0')}${safeG.toString(16).padStart(2, '0')}${safeB.toString(16).padStart(2, '0')}`;
      return { safeColor: safeHex, wasAdjusted: true };
    }
  } else {
    // DARK MODE APP: Sidebar background is WHITE (#FFFFFF)
    // Black and dark colors are fully allowed!
    // Block white or light colors that would make text invisible against white:
    if (luminance > 0.65) {
      if (luminance >= 0.85) {
        // Pure white or pale light -> adjust to crisp high-contrast dark charcoal/black
        return { safeColor: '#0F172A', wasAdjusted: true };
      }
      // For chromatic pale colors, darken to be readable on white
      const scale = 0.45 / luminance;
      const safeR = Math.min(255, Math.max(0, Math.round(r * scale)));
      const safeG = Math.min(255, Math.max(0, Math.round(g * scale)));
      const safeB = Math.min(255, Math.max(0, Math.round(b * scale)));
      const safeHex = `#${safeR.toString(16).padStart(2, '0')}${safeG.toString(16).padStart(2, '0')}${safeB.toString(16).padStart(2, '0')}`;
      return { safeColor: safeHex, wasAdjusted: true };
    }
  }

  return { safeColor: `#${cleanHex}`, wasAdjusted: false };
}

export function getSavedSidebarColor(isDarkMode?: boolean): string {
  const inDark = typeof isDarkMode === 'boolean' ? isDarkMode : isDarkModeActive();
  const defaultFallback = inDark ? '#0F172A' : '#FFFFFF';
  if (typeof window === 'undefined') return defaultFallback;

  const raw = localStorage.getItem('uzair_jibran_sidebar_raw_color') 
    || localStorage.getItem('uzair_jibran_sidebar_color');

  // If cached value was an old invisible color for current mode, reset to proper default
  if (!inDark && (raw === '#0F172A' || raw === '#1E293B' || raw === '#475569' || raw === '#000000')) {
    return '#FFFFFF';
  }
  if (inDark && (raw === '#FFFFFF' || raw === '#F8FAFC' || raw === '#F1F5F9')) {
    return '#0F172A';
  }

  if (!raw) return defaultFallback;
  return getSafeSidebarColor(raw, inDark).safeColor;
}

export function applySidebarColor(hexColor: string, isDarkMode?: boolean): { safeColor: string; wasAdjusted: boolean } {
  if (!hexColor) return { safeColor: DEFAULT_SIDEBAR_COLOR, wasAdjusted: false };
  try {
    localStorage.setItem('uzair_jibran_sidebar_raw_color', hexColor);
  } catch (_) {}

  const { safeColor, wasAdjusted } = getSafeSidebarColor(hexColor, isDarkMode);
  try {
    localStorage.setItem('uzair_jibran_sidebar_color', safeColor);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('uzair_jibran_sidebar_color_changed'));
    }
  } catch (_) {}

  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--sidebar-font-color', safeColor);
  }

  return { safeColor, wasAdjusted };
}