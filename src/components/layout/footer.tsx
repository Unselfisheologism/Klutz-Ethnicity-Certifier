'use client';

import React from 'react';

export function Footer() {
  // Get current year dynamically
  const [currentYear, setCurrentYear] = React.useState<number | null>(null);

  React.useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="bg-secondary py-4 mt-auto">
      <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
        <p>
          &copy; {currentYear ? currentYear : 'Loading...'} Ethical Eye. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
