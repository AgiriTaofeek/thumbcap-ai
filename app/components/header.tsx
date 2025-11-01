import { Sparkles } from "lucide-react";

export function Header() {
  return (
    <header className="border-b xbg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl">ThumbCap AI</h1>
              <p className="text-sm">Powered by Google Cloud</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1 bg-purple-50 px-3 py-1.5 rounded-full">
              <span className="text-xs text-purple-700">
                ⚡ Save 2-3 hours per video
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
