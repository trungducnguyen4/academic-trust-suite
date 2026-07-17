export const THEME_OPTIONS = ["light", "dark", "system"] as const;

export const THEME_PROVIDER_OPTIONS = {
  attribute: "class",
  defaultTheme: "system",
  enableSystem: true,
  disableTransitionOnChange: true,
} as const;
