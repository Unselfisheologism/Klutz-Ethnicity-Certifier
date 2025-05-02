import { Eye } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-secondary py-4 shadow-sm">
      <div className="container mx-auto px-4 flex items-center gap-2">
        <Eye className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-bold text-primary">Ethical Eye</h1>
      </div>
    </header>
  );
}
