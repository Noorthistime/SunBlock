import Link from "next/link";
import { MoveLeft, HelpCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-black text-white">
      <div className="glass-panel p-8 max-w-md w-full text-center border border-glass flex flex-col items-center">
        <div className="h-12 w-12 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-accent mb-4">
          <HelpCircle className="h-6 w-6" />
        </div>
        
        <h2 className="text-xl font-bold font-serif mb-2 text-primary">
          Page Not Found
        </h2>
        <p className="text-sm text-text-secondary mb-6 leading-relaxed">
          The weather dashboard page you are looking for does not exist or has been moved.
        </p>

        <Link
          href="/"
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-accent hover:bg-accent-hover text-white text-sm font-semibold shadow-lg shadow-accent/20 transition-all duration-300 active:scale-95"
        >
          <MoveLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
