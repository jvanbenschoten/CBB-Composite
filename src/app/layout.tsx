import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CBB Composite Rankings',
  description:
    'Aggregated men\'s college basketball rankings from NET, ESPN BPI, Torvik, AP Poll, and Coaches Poll.',
  keywords: ['college basketball', 'CBB', 'rankings', 'NET', 'BPI', 'Torvik', 'AP Poll'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50 text-gray-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}
