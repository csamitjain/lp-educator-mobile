/**
 * LP Educator Hub — Design System Tokens
 *
 * Single source of truth for all design values.
 * Use these in StyleSheet.create(), inline styles, and LinearGradient.
 * NativeWind utility classes mirror these via tailwind.config.js.
 */

// ─── Colors ────────────────────────────────────────────────────────────────

export const Colors = {
  // Forest greens (primary brand)
  forestDeep: '#0F3D2E',
  forest: '#1A5C44',
  forestLight: '#2E7D5A',

  // Leaf (accent green)
  leaf: '#4CAF82',
  leafPale: '#E8F5EE',

  // Terra (warm accent — errors, alerts)
  terra: '#C96A4A',
  terraPale: '#FCE9E1',

  // Amber (fee, warnings)
  amber: '#E8A93B',
  amberPale: '#FFF3DC',

  // Neutrals
  cream: '#FDF8F2',
  creamDark: '#F3ECE0',
  ink: '#1F2A24',
  inkMuted: '#4F5B53',
  inkFaint: '#8A968F',
  border: '#E5E0D6',

  // Semantic aliases
  primary: '#1A5C44',
  primaryLight: '#2E7D5A',
  primaryDark: '#0F3D2E',
  success: '#4CAF82',
  warning: '#E8A93B',
  error: '#C96A4A',
  background: '#FDF8F2',
  surface: '#FFFFFF',
  surfaceAlt: '#F3ECE0',

  // Status colors (attendance)
  statusPresent: '#4CAF82',
  statusAbsent: '#C96A4A',
  statusLate: '#E8A93B',
  statusExcused: '#8A968F',

  // White / Black
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type ColorKey = keyof typeof Colors;

// ─── Gradients ──────────────────────────────────────────────────────────────

export const Gradients = {
  /** Main header gradient — used on AppHeader, onboarding header */
  header: {
    colors: ['#0F3D2E', '#1A5C44', '#2E7D5A'] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    locations: [0, 0.55, 1] as const,
  },
  /** Stat card — students / green theme */
  leafCard: {
    colors: ['#E8F5EE', '#D4EDE0'] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  /** Stat card — fee / amber theme */
  amberCard: {
    colors: ['#FFF3DC', '#FDECC4'] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  /** Stat card — observations / terra theme */
  terraCard: {
    colors: ['#FCE9E1', '#F9D8CC'] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  /** Splash / onboarding background */
  splash: {
    colors: ['#0F3D2E', '#1A5C44'] as const,
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
} as const;

// ─── Typography ─────────────────────────────────────────────────────────────

export const FontFamily = {
  regular: 'Baloo2_400Regular',
  medium: 'Baloo2_500Medium',
  semiBold: 'Baloo2_600SemiBold',
  bold: 'Baloo2_700Bold',
  extraBold: 'Baloo2_800ExtraBold',
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 38,
} as const;

export const LineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.7,
} as const;

// ─── Spacing ────────────────────────────────────────────────────────────────

export const Spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

// ─── Border Radius ──────────────────────────────────────────────────────────

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  card: 16,
  sheet: 24,
  full: 9999,
} as const;

// ─── Shadows ────────────────────────────────────────────────────────────────

export const Shadows = {
  soft: {
    shadowColor: '#1F2A24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  card: {
    shadowColor: '#1F2A24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  sheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
} as const;

// ─── Layout ─────────────────────────────────────────────────────────────────

export const Layout = {
  screenPaddingH: 16,
  screenPaddingV: 20,
  cardPadding: 14,
  headerHeight: 64,
  tabBarHeight: 64,
  bottomSheetHandleHeight: 24,
  avatarSm: 32,
  avatarMd: 44,
  avatarLg: 64,
  avatarXl: 96,
} as const;

// ─── Role Colors ────────────────────────────────────────────────────────────

export const RoleColors: Record<string, { bg: string; text: string; border: string }> = {
  teacher: {
    bg: Colors.leafPale,
    text: Colors.forest,
    border: Colors.leaf,
  },
  subject_teacher: {
    bg: Colors.leafPale,
    text: Colors.forest,
    border: Colors.leaf,
  },
  tutor: {
    bg: Colors.amberPale,
    text: '#7A5200',
    border: Colors.amber,
  },
  principal: {
    bg: '#EEE8FF',
    text: '#4A2D8F',
    border: '#9B7EE8',
  },
  counselor: {
    bg: Colors.terraPale,
    text: '#7A2E10',
    border: Colors.terra,
  },
} as const;

// ─── Attendance Status Colors ────────────────────────────────────────────────

export const AttendanceColors: Record<string, { bg: string; text: string; dot: string }> = {
  present: { bg: Colors.leafPale, text: Colors.forest, dot: Colors.leaf },
  absent: { bg: Colors.terraPale, text: Colors.terra, dot: Colors.terra },
  late: { bg: Colors.amberPale, text: '#7A5200', dot: Colors.amber },
  excused: { bg: Colors.creamDark, text: Colors.inkMuted, dot: Colors.inkFaint },
} as const;

// ─── Animation ──────────────────────────────────────────────────────────────

export const Animation = {
  fast: 150,
  normal: 250,
  slow: 400,
} as const;
