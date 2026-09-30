import { Appearance, DynamicColorIOS, Platform, type ColorValue } from "react-native";

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

// Modo escuro: cada cor semântica tem par claro/escuro. No iOS a troca é ao
// vivo (DynamicColorIOS, resolvida pelo sistema). No Android o esquema é
// lido quando o app abre.
const launchScheme = Appearance.getColorScheme();
const pair = (light: string, dark: string): ColorValue =>
  Platform.OS === "ios" && typeof DynamicColorIOS === "function"
    ? DynamicColorIOS({ light, dark })
    : launchScheme === "dark"
      ? dark
      : light;

/** Neutros do escuro: mesma família "Linho", quente. */
const night = {
  bg: "#100E0B", surface: "#1C1916", sunken: "#171411", pressed: "#2A2622", muted: "#25211D",
  border: "#2E2A26", borderStrong: "#48443F", hero: "#2A2521",
} as const;

export const color = {
  // Laranja Servos: ação principal e marca.
  primary: pair(palette.brand[600], palette.brand[600]),
  primaryPressed: pair(palette.brand[700], palette.brand[700]),
  primaryForeground: pair(palette.neutral[0], palette.neutral[0]),
  primarySoft: pair(palette.brand[50], "#3A1D13"),
  /** Texto/ícone laranja sobre `primarySoft` (5.9:1 no claro, 6.4:1 no escuro). */
  primaryText: pair(palette.brand[700], "#FF936F"),
  brandMark: pair(palette.brand[500], palette.brand[500]),
  /** Creme do símbolo sobre o laranja da marca. */
  primaryForegroundOnBrand: pair("#F5EDE4", "#F5EDE4"),

  background: pair(palette.neutral[100], night.bg), // "mesa" — fundo das telas
  surface: pair(palette.neutral[0], night.surface), // "folha" — cartões e listas
  surfaceSunken: pair(palette.neutral[50], night.sunken),
  surfacePressed: pair(palette.neutral[150], night.pressed),
  foreground: pair(palette.neutral[900], palette.neutral[50]),
  foregroundSecondary: pair(palette.neutral[600], palette.neutral[300]),
  muted: pair(palette.neutral[100], night.muted),
  mutedForeground: pair(palette.neutral[500], palette.neutral[400]), // AA nos dois
  disabled: pair(palette.neutral[400], palette.neutral[600]),
  border: pair(palette.neutral[200], night.border),
  borderStrong: pair(palette.neutral[300], night.borderStrong),
  inverse: pair(palette.neutral[900], palette.neutral[100]),
  inverseForeground: pair(palette.neutral[0], palette.neutral[900]),
  scrim: pair("rgba(16, 14, 11, 0.32)", "rgba(0, 0, 0, 0.6)"),
  shadow: pair(palette.neutral[950], "#000000"),
  /** Ícones sobre fundo invertido (toast). */
  successOnInverse: pair(palette.success[100], palette.success[700]),
  dangerOnInverse: pair(palette.danger[100], palette.danger[700]),

  // Cartão herói escuro (Próxima escala na Home): destaca do resto da tela.
  heroSurface: pair(palette.neutral[900], night.hero),
  heroForeground: pair(palette.neutral[0], palette.neutral[0]),
  /** 10.9:1 sobre heroSurface. */
  heroSecondary: pair(palette.neutral[300], palette.neutral[300]),
  /** 6.8:1 sobre heroSurface (AA). */
  heroMuted: pair(palette.neutral[400], palette.neutral[400]),
  heroBorder: pair("rgba(255, 255, 255, 0.14)", "rgba(255, 255, 255, 0.12)"),
  heroPressed: pair("rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.08)"),
  /** Laranja claro para texto/ação sobre o escuro (o `primaryText` some ali). */
  heroAccent: pair(palette.brand[200], palette.brand[200]),
  heroSuccess: pair(palette.success[100], palette.success[100]),

  success: pair(palette.success[700], "#5CCB86"),
  successSoft: pair(palette.success[50], "#10281A"),
  warning: pair(palette.warning[700], "#F2B45A"),
  warningSoft: pair(palette.warning[50], "#2E2210"),
  warningStrong: pair(palette.warning[500], palette.warning[500]),
  danger: pair(palette.danger[600], "#E0405F"),
  dangerPressed: pair(palette.danger[700], "#B8284A"),
  dangerSoft: pair(palette.danger[50], "#3A1419"),
  info: pair(palette.info[700], "#7DB8F5"),
  infoSoft: pair(palette.info[50], "#10233A"),
} as const satisfies Record<string, ColorValue>;

/** Cores fixas para o que precisa ser sempre igual (QR code: preto no branco). */
export const fixed = { ink: palette.neutral[950], paper: palette.neutral[0], brand: palette.brand[600] } as const;

/** Para APIs nativas que só aceitam texto de cor (ex.: botão de colar do iOS). */
export const solid = {
  light: { muted: palette.neutral[150], foreground: palette.neutral[900], background: palette.neutral[100], primary: palette.brand[600] },
  dark: { muted: night.muted, foreground: palette.neutral[50], background: night.bg, primary: "#FF936F" },
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
