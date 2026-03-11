/**
 * Purple bird theme - Light mode only
 * Minimalistic, calm, white + purple design system
 */

// Primary purple colors
export const Purple = {
  primary: '#6564c7',      // Main purple
  light: '#8B5CF6',         // Lighter purple
  dark: '#5B21B6',          // Darker purple for text
  accent: '#7C3AED',         // Accent purple
  tint: '#F4EEFF',           // Very light purple tint
  background: '#F8F9FA',     // Light neutral background
};

// Neutral colors
export const Neutral = {
  white: '#FFFFFF',
  light: '#F8F9FA',
  border: '#E9ECEF',
  text: '#212529',
  textSecondary: '#6C757D',
  textTertiary: '#9CA3AF',
};

export const Colors = {
  light: {
    text: Neutral.text,
    background: Neutral.white,
    tint: Purple.primary,
    icon: Neutral.textSecondary,
    tabIconDefault: Neutral.textTertiary,
    tabIconSelected: Purple.primary,
  },
  // Keep dark for compatibility but use light colors
  dark: {
    text: Neutral.text,
    background: Neutral.white,
    tint: Purple.primary,
    icon: Neutral.textSecondary,
    tabIconDefault: Neutral.textTertiary,
    tabIconSelected: Purple.primary,
  },
};
