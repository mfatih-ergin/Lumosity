import React from 'react';
import { Brain } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t-[2.5px] border-black bg-[#fbf7ee] py-6 text-black mt-auto">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center sm:justify-between gap-4">
        
        {/* Info */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#ff6b6b] border-2 border-black shadow-[2px_2px_0px_0px_#000] flex items-center justify-center">
            <Brain className="w-4 h-4 text-black" />
          </div>
          <div>
            <span className="font-black text-sm tracking-tight text-black">NeuroCraft Cognitive Labs</span>
            <span className="text-xs font-bold text-neutral-700 ml-2 hidden md:inline">— Bilimsel adaptif beyin egzersizleri</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
