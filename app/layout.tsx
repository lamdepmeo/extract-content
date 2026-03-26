import './styles.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Sitemap Content Extractor',
  description: 'Extract URLs, classify type, and detect content cannibalization.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
