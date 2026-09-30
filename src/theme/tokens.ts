// Tokens do Servos Mobile — espelho da paleta do web (Servos-v3
// app/src/index.css), convertida de HSL para hex. Componentes usam SÓ os
// semânticos (`color.*`); a paleta crua fica aqui dentro.

const palette = {
  brand: {
    50: "#FEF4F2", 100: "#FEE7E1", 200: "#FED0C5", 500: "#F4532A",
    600: "#D83B0C", 700: "#B32D03", 800: "#8B2407",
  },
  // Neutro "Linho" (quente) — o mesmo do web.
  neutral: {
    0: "#FFFFFF", 25: "#FCFBF8", 50: "#F9F6F3", 100: "#F2F0EC", 150: "#ECE9E5",
    200: "#E2DFDB", 300: "#CFCBC6", 400: "#A8A49E", 450: "#95918C", 500: "#716C67",
    600: "#5E5A55", 700: "#48443F", 800: "#312D29", 900: "#1E1B18", 950: "#100E0B",
  },
  success: { 50: "#EBFBEE", 100: "#D6F4DD", 600: "#058C46", 700: "#037138" },
  warning: { 50: "#FFF5EA", 100: "#FEE9D1", 500: "#F09C17", 600: "#B87501", 700: "#8A5601" },
  danger: { 50: "#FEF3F3", 100: "#FFE4E5", 600: "#CF2850", 700: "#AB153E" },
  info: { 50: "#F0F7FE", 100: "#DEEDFF", 600: "#2076C9", 700: "#105FA6" },
} as const;

export const color = {
  // Laranja Servos: ação principal e marca.
  primary: palette.brand[600],
  primaryPressed: palette.brand[700],
  primaryForeground: palette.neutral[0],
  primarySoft: palette.brand[50],
  /** Texto/ícone laranja sobre `primarySoft` (5.9:1). `primary` ali dá só 4.3:1. */
  primaryText: palette.brand[700],
  brandMark: palette.brand[500],
  /** Creme do símbolo sobre o laranja da marca. */
  primaryForegroundOnBrand: "#F5EDE4",

  background: palette.neutral[100], // "mesa" — fundo das telas
  surface: palette.neutral[0], // "folha" — cartões e listas
  surfaceSunken: palette.neutral[50],
  surfacePressed: palette.neutral[150],
  foreground: palette.neutral[900],
  foregroundSecondary: palette.neutral[600],
  muted: palette.neutral[100],
  mutedForeground: palette.neutral[500], // 4.9:1 sobre branco (AA)
  disabled: palette.neutral[400],
  border: palette.neutral[200],
  borderStrong: palette.neutral[300],
  inverse: palette.neutral[900],
  inverseForeground: palette.neutral[0],
  scrim: "rgba(16, 14, 11, 0.32)",
  shadow: palette.neutral[950],
  /** Ícones sobre fundo escuro (toast). */
  successOnInverse: palette.success[100],
  dangerOnInverse: palette.danger[100],

  // Cartão herói escuro (Próxima escala na Home): destaca do resto da tela.
  heroSurface: palette.neutral[900],
  heroForeground: palette.neutral[0],
  /** 10.9:1 sobre heroSurface. */
  heroSecondary: palette.neutral[300],
  /** 6.8:1 sobre heroSurface (AA). */
  heroMuted: palette.neutral[400],
  heroBorder: "rgba(255, 255, 255, 0.14)",
  heroPressed: "rgba(255, 255, 255, 0.08)",
  /** Laranja claro para texto/ação sobre o escuro (o `primaryText` some ali). */
  heroAccent: palette.brand[200],
  heroSuccess: palette.success[100],

  success: palette.success[700],
  successSoft: palette.success[50],
  warning: palette.warning[700],
  warningSoft: palette.warning[50],
  warningStrong: palette.warning[500],
  danger: palette.danger[600],
  dangerPressed: palette.danger[700],
  dangerSoft: palette.danger[50],
  info: palette.info[700],
  infoSoft: palette.info[50],
} as const;

/** Grade de 4px (briefing §43). Só estes valores. */
export const space = {
  1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48,
} as const;

/** Margem lateral padrão das telas. */
export const gutter = space[5];

export const radius = {
  sm: 8,
  md: 12,
  lg: 16, // cartões (§47: 16–20)
  xl: 20, // cartão herói, sheets
  full: 999,
} as const;

/** Toque mínimo 44×44 (§45). */
export const hitSize = 44;
export const buttonHeight = { md: 44, lg: 52 } as const;

export const font = {
  regular: "Geist_400Regular",
  medium: "Geist_500Medium",
  semibold: "Geist_600SemiBold",
  bold: "Geist_700Bold",
} as const;

/**
 * Escala tipográfica (§46): poucos degraus. `lineHeight` explícito para
 * alinhar à grade; Dynamic Type é respeitado (allowFontScaling padrão) com
 * teto por componente onde layout quebraria.
 */
export const type = {
  display: { fontFamily: font.semibold, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  title: { fontFamily: font.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  heading: { fontFamily: font.semibold, fontSize: 17, lineHeight: 24, letterSpacing: -0.1 },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: font.medium, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: font.medium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  overline: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.6 },
} as const;

export type TypeVariant = keyof typeof type;

export const duration = { fast: 150, base: 220, slow: 300 } as const;
