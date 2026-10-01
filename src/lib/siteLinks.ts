import * as WebBrowser from "expo-web-browser";

// Páginas do site (servosapp.com) abertas dentro do app.
export const SITE = {
  support: "https://www.servosapp.com/suporte/",
  privacy: "https://www.servosapp.com/privacidade/",
  terms: "https://www.servosapp.com/termos/",
} as const;

export function openSite(page: keyof typeof SITE) {
  void WebBrowser.openBrowserAsync(SITE[page]);
}
