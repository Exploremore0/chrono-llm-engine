import React from 'react';
import { BookOpen, Cpu } from 'lucide-react';

interface ChamberFooterNoteProps {
  explanation: string;
  realWorldScale: string;
}

export const ChamberFooterNote: React.FC<ChamberFooterNoteProps> = ({
  explanation,
  realWorldScale,
}) => {
  return (
    <div className="mt-6 pt-4 border-t border-slate-200 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start text-sm">
      <div className="lg:col-span-8 flex items-start gap-2.5 text-slate-700 leading-relaxed">
        <BookOpen className="w-4 h-4 text-amber-600 shrink-0 mt-1" aria-hidden="true" />
        <div>
          <span className="font-semibold text-amber-800 mr-1.5">What happens in this chamber:</span>
          <span className="text-slate-700">{explanation}</span>
        </div>
      </div>
      <div className="lg:col-span-4 flex items-start gap-2.5 lg:justify-end text-xs text-cyan-800 font-mono">
        <Cpu className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="lg:text-right">
          <div className="text-[11px] text-slate-500 font-sans font-medium">Real-World LLM Scale</div>
          <div className="text-cyan-700 font-semibold mt-0.5">{realWorldScale}</div>
        </div>
      </div>
    </div>
  );
};
