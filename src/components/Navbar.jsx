import Link from 'next/link';
import { Terminal } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/60 dark:bg-gray-950/60 border-b border-gray-200/50 dark:border-gray-800/50 supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold group">
          <div className="p-2 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-lg text-white shadow-lg shadow-violet-500/30 group-hover:shadow-violet-500/50 transition-all duration-300">
            <Terminal size={20} />
          </div>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 group-hover:from-violet-600 group-hover:to-fuchsia-600 transition-all duration-300">
            Problem Viewer
          </span>
        </Link>
        <div className="flex gap-6">
          {/* Home link removed as per request */}
        </div>
      </div>
    </nav>
  );
}
