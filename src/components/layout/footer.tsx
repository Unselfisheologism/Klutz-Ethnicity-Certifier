'use client';

import React from 'react';

export function Footer() {
  // Get current year dynamically
  const [currentYear, setCurrentYear] = React.useState<number | null>(null);

  React.useEffect(() => {
    // This check ensures the code only runs on the client side.
    if (typeof window !== 'undefined') {
      setCurrentYear(new Date().getFullYear());
    }
  }, []);

  return (
    <footer className="bg-background py-4 mt-auto border-t">
      <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
        <p>
          &copy; {currentYear ? currentYear : new Date().getFullYear()} Klutz Ethics. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
