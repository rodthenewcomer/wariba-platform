import { color } from '@wariba/design-tokens';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { ibmPlexMono, manrope } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'WARIBA',
  description:
    'Infrastructure de progression pour traders disciplinés — bêta privée en préparation.',
};

// The only justified hex literals in this app: Next.js's <meta name="theme-color">
// API takes a plain string, not a CSS custom property — sourced from the token
// export (not hand-typed) so it can never drift from tokens.json.
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: color['bone.50'] },
    { media: '(prefers-color-scheme: dark)', color: color['ink.950'] },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${manrope.variable} ${ibmPlexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
