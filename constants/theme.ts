/**
 * wordshot theme — Starbucks-inspired design tokens.
 * Source: DESIGN.md at repo root (do not edit tokens without re-reading the spec).
 *
 * Anchor: 1rem = 16px (RN doesn't use rem, all values are px).
 * Universal rhythm constant: 16px.
 */

import { Platform, TextStyle, ViewStyle } from 'react-native';

// ---------- Colors ----------
export const palette = {
  // Greens — four-tier brand system, each mapped to a surface role.
  starbucksGreen: '#006241', // historic brand green, primary headings
  greenAccent: '#00754A',    // primary CTA fill, the Frap circle
  houseGreen: '#1E3932',     // dark feature bands, footer
  greenUplift: '#2b5148',    // sparing decorative dark accents
  greenLight: '#d4e9e2',     // valid-state tint
  greenLightWash: 'rgba(212, 233, 226, 0.33)',

  // Gold — Rewards-status only (we use it for "saved" badges).
  gold: '#cba258',
  goldLight: '#dfc49d',
  goldLightest: '#faf6ee',

  // Surfaces — warm-neutral canvas, references café materials.
  white: '#ffffff',
  neutralCool: '#f9f9f9',
  neutralWarm: '#f2f0eb', // primary page canvas
  ceramic: '#edebe9',
  black: '#000000',

  // Text — never pure black on light; warm 87%-alpha.
  textBlack: 'rgba(0, 0, 0, 0.87)',
  textBlackSoft: 'rgba(0, 0, 0, 0.58)',
  textWhite: 'rgba(255, 255, 255, 1)',
  textWhiteSoft: 'rgba(255, 255, 255, 0.70)',
  rewardsGreen: '#33433d',

  // Semantic.
  red: '#c82014',
  redTint: 'rgba(200, 32, 20, 0.05)',
  yellow: '#fbbc05',

  // Alpha ladders for overlays.
  black06: 'rgba(0, 0, 0, 0.06)',
  black14: 'rgba(0, 0, 0, 0.14)',
  black24: 'rgba(0, 0, 0, 0.24)',
  black58: 'rgba(0, 0, 0, 0.58)',
  black87: 'rgba(0, 0, 0, 0.87)',
  white10: 'rgba(255, 255, 255, 0.10)',
  white70: 'rgba(255, 255, 255, 0.70)',
  white90: 'rgba(255, 255, 255, 0.90)',

  // Inputs.
  inputBorder: '#d6dbde',
} as const;

// ---------- Spacing (16px rhythm anchor) ----------
export const space = {
  s1: 4,
  s2: 8,
  s3: 16,
  s4: 24,
  s5: 32,
  s6: 40,
  s7: 48,
  s8: 56,
  s9: 64,
} as const;

export const gutter = {
  default: 16,
  medium: 24,
  large: 40,
} as const;

// ---------- Radii ----------
export const radii = {
  card: 12,
  pill: 999, // full-pill on RN — DESIGN.md spec is 50px, but 999 ensures full pill at any height
  field: 4,
  circle: 9999,
} as const;

// ---------- Shadows (translated to RN style) ----------
// RN shadow props differ between iOS (shadow*) and Android (elevation).
// Card spec: 0 0 .5px rgba(0,0,0,0.14), 0 1px 1px rgba(0,0,0,0.24)
export const shadows: Record<string, ViewStyle> = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  // Frap: layered base + ambient. RN can only do one shadow per view, so we approximate.
  frap: {
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  nav: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
} as const;

// ---------- Typography ----------
// SoDoSans is proprietary; Inter is the documented open-source substitute.
// We reference 'Inter' families that we'll register via expo-font (see app/_layout.tsx).
const fontFamily = Platform.select({
  ios: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semibold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },
  android: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semibold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },
  default: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semibold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },
})!;

export const fonts = fontFamily;

// Tight negative tracking is the SoDoSans signature; -0.01em ≈ -0.16px at 16px.
const TRACKING_NORMAL = -0.16;
const TRACKING_LOOSE = 1.6;

export const type: Record<string, TextStyle> = {
  display: {
    fontFamily: fonts.semibold,
    fontSize: 56,
    lineHeight: 67,
    letterSpacing: TRACKING_NORMAL,
    color: palette.textBlack,
  },
  hero: {
    fontFamily: fonts.semibold,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: TRACKING_NORMAL,
    color: palette.textBlack,
  },
  h1: {
    fontFamily: fonts.semibold,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: TRACKING_NORMAL,
    color: palette.starbucksGreen,
  },
  h2: {
    fontFamily: fonts.regular,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: TRACKING_NORMAL,
    color: palette.textBlack,
  },
  bodyLarge: {
    fontFamily: fonts.regular,
    fontSize: 19,
    lineHeight: 28,
    letterSpacing: -0.19,
    color: palette.textBlack,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: TRACKING_NORMAL,
    color: palette.textBlack,
  },
  bodyMedium: {
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: TRACKING_NORMAL,
    color: palette.textBlack,
  },
  small: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: -0.14,
    color: palette.textBlack,
  },
  smallStrong: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: -0.14,
    color: palette.textBlack,
  },
  micro: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.13,
    color: palette.textBlackSoft,
  },
  buttonLabel: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 19,
    letterSpacing: TRACKING_NORMAL,
  },
  uppercaseLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: TRACKING_LOOSE,
    textTransform: 'uppercase',
  },
} as const;

// ---------- Theme bundle ----------
export const theme = {
  palette,
  space,
  gutter,
  radii,
  shadows,
  fonts,
  type,
  // Active-press scale used across all CTAs.
  activeScale: 0.95,
  // Standard transition durations (use with Animated/Reanimated).
  duration: {
    fast: 150,
    base: 200,
    expander: 300,
  },
} as const;

export type Theme = typeof theme;

// ---------- Legacy compat (for files that import { Colors, Fonts } from existing scaffold) ----------
export const Colors = {
  light: {
    text: palette.textBlack,
    background: palette.neutralWarm,
    tint: palette.greenAccent,
    icon: palette.textBlackSoft,
    tabIconDefault: palette.textBlackSoft,
    tabIconSelected: palette.greenAccent,
  },
  dark: {
    text: palette.textWhite,
    background: palette.houseGreen,
    tint: palette.white,
    icon: palette.textWhiteSoft,
    tabIconDefault: palette.textWhiteSoft,
    tabIconSelected: palette.white,
  },
};

export const Fonts = {
  sans: fonts.regular,
  serif: 'Georgia',
  rounded: fonts.medium,
  mono: 'Courier',
};
