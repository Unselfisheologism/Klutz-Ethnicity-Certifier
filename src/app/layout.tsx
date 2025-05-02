import type { Metadata } from 'next';
import Script from 'next/script'; // Import next/script
import { Inter } from 'next/font/google'; // Using Inter as a standard clean font
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Ethical Eye',
  description: 'Analyze content for ethical considerations.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          inter.variable
        )}
      >
        {children}
        <Toaster />
        {/* Add Puter.js script */}
        <Script src="https://js.puter.com/v2/" strategy="lazyOnload" />
      </body>
    </html>
  );
}
