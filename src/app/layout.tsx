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
  title: 'Klutz Ethics',
  description: 'Analyze content for ethical considerations.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Add the 'dark' class here to enable dark mode
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          // Gradient is already applied via globals.css using theme variables
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
