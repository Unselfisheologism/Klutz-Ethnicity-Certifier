import { Eye } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-background py-4 shadow-sm border-b">
      <div className="container mx-auto px-4 flex items-center gap-2">
        <Eye className="w-6 h-6 md:w-8 md:h-8 text-primary" /> {/* Adjusted icon size */}
        <h1 className="text-xl md:text-2xl font-bold text-primary">Ethical Eye</h1> {/* Adjusted text size */}
      </div>
    </header>
  );
}
