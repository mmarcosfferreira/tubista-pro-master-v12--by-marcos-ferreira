import React, { useState } from 'react';
import { Ruler, Scale, Cog, Triangle } from 'lucide-react';
import FabricationCalc from './FabricationCalc';
import WeightCalc from './WeightCalc';
import LiftingCalc from './LiftingCalc';

enum CalcMode {
  FAB = 'FAB',
  WEIGHT = 'WEIGHT',
  LIFT = 'LIFT'
}

const CalculatorHub: React.FC = () => {
  const [mode, setMode] = useState<CalcMode | null>(CalcMode.FAB); // Null allows hiding all

  const toggleMode = (selectedMode: CalcMode) => {
    if (mode === selectedMode) {
      setMode(null); // Toggle OFF (Hide)
    } else {
      setMode(selectedMode); // Toggle ON (Show)
    }
  };

  const tabs = [
    { id: CalcMode.FAB, label: 'Traçagem', icon: Ruler },
    { id: CalcMode.WEIGHT, label: 'Peso Chapa', icon: Scale },
    { id: CalcMode.LIFT, label: 'Olhao', icon: Cog },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-950">
      <div className="flex border-b border-slate-800 bg-slate-900 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => toggleMode(tab.id)}
            className={`flex-1 min-w-[100px] py-4 px-2 flex flex-col items-center gap-2 border-b-2 transition-colors ${
              mode === tab.id 
                ? 'border-safety-yellow text-safety-yellow bg-slate-800' 
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <tab.icon size={20} />
            <span className="text-sm font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {mode === CalcMode.FAB && <FabricationCalc />}
        {mode === CalcMode.WEIGHT && <WeightCalc />}
        {mode === CalcMode.LIFT && <LiftingCalc />}
        
        {!mode && (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
            <Triangle size={64} className="mb-4 text-slate-700" />
            <p className="text-center text-sm">Selecione uma ferramenta acima para começar.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalculatorHub;