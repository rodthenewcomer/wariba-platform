import { IBM_Plex_Mono, Manrope } from 'next/font/google';

/**
 * Design System §11 — Manrope Variable for UI, IBM Plex Mono for data.
 * Exposed as CSS variables so tokens.css's --wariba-font-sans/--wariba-font-mono
 * (which list "Manrope"/"IBM Plex Mono" by family name) resolve to the actual
 * loaded, subsetted font instead of falling through to the system fallback.
 */
export const manrope = Manrope({
  subsets: ['latin'],
  variable: '--wariba-font-sans-loaded',
  display: 'swap',
});

export const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--wariba-font-mono-loaded',
  display: 'swap',
});
