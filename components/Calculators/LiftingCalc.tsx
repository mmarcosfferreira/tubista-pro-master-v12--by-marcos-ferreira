import React, { useState } from 'react';
import { Info } from 'lucide-react';

const LiftingCalc: React.FC = () => {
  const [thickness, setThickness] = useState(12.7); // mm (1/2")
  const [holeDist, setHoleDist] = useState(25); // distance from hole center to edge
  const [yieldStress, setYieldStress] = useState(250); // MPa (A36 approx)

  // Simplified Calculation based on shearing area
  // Capacity = 0.6 * Yield * Area
  // This is a VERY simplified approximation for estimation only.
  const calculateCapacity = () => {
    // Area resisting tear-out approx = 2 * (edge_dist - hole_radius) * thickness ??
    // Using simplified shear calculation: P = 0.4 * Fy * A_shear
    // Where A_shear approx = 2 * e * t (where e is distance from hole center to edge)
    
    // Safety Factor 4
    const area = 2 * holeDist * thickness; // mm2
    const capacityN = 0.4 * yieldStress * area; // Newtons
    const capacityKg = capacityN / 9.81; 
    const safeLoad = capacityKg / 4; // Safety Factor

    return Math.round(safeLoad);
  };

  const area = 2 * holeDist * thickness; // mm2
  const capacityN = 0.4 * yieldStress * area; // Newtons
  const capacityKg = capacityN / 9.81; 
  const safeLoad = capacityKg / 4; // Safety Factor

  return (
    <div className="space-y-4 pb-24">
      <div className="bg-red-900/30 border border-red-500/50 p-4 rounded text-red-200 text-xs">
        ⚠️ ATENÇÃO: Estes cálculos são apenas estimativas para referência de campo. Não substituem projeto de engenharia ou ART. Use com responsabilidade.
      </div>

      <h2 className="text-lg font-bold">Capacidade do Olhão</h2>
      
      <div className="space-y-3">
        <div>
             <label className="block text-xs text-slate-400">Tensão Esc. Material (MPa)</label>
             <input type="number" className="w-full bg-slate-800 border border-slate-700 p-3 rounded" value={yieldStress} onChange={(e) => setYieldStress(Number(e.target.value))} />
             <span className="text-xs text-slate-500">Ex: A36 ≈ 250 MPa</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
           <div>
             <label className="block text-xs text-slate-400">Espessura Chapa (mm)</label>
             <input type="number" className="w-full bg-slate-800 border border-slate-700 p-3 rounded" value={thickness} onChange={(e) => setThickness(Number(e.target.value))} />
           </div>
           <div>
             <label className="block text-xs text-slate-400">Dist. Furo-Borda (mm)</label>
             <input type="number" className="w-full bg-slate-800 border border-slate-700 p-3 rounded" value={holeDist} onChange={(e) => setHoleDist(Number(e.target.value))} />
           </div>
        </div>
      </div>

      <div className="mt-6 bg-slate-800 p-6 rounded-lg text-center border border-slate-700">
        <span className="block text-sm text-slate-400 uppercase tracking-widest">Carga Segura (FS=4)</span>
        <span className="text-4xl font-black text-white">{Math.round(safeLoad)} <span className="text-lg text-slate-400">kg</span></span>
      </div>

      {/* 3. FORMULAS & STEP-BY-STEP */}
      <div className="w-full bg-slate-900/50 rounded-xl border border-slate-800 p-4 mt-4">
        <h4 className="text-safety-yellow font-bold text-sm mb-3 flex items-center gap-2">
            <Info size={16} /> Memória de Cálculo (Passo a Passo)
        </h4>
        <div className="text-xs text-slate-300 space-y-3 font-mono">
            <p><strong className="text-blue-400">Tensão de Escoamento (Fy):</strong> {yieldStress} MPa</p>
            <p><strong className="text-blue-400">Espessura (t):</strong> {thickness} mm</p>
            <p><strong className="text-blue-400">Distância Furo-Borda (e):</strong> {holeDist} mm</p>
            
            <div className="bg-slate-900 p-3 rounded border border-slate-700 mt-2">
                <p className="text-slate-400 mb-2">Fórmula de Cisalhamento Simplificada:</p>
                <p className="text-white">Carga Máx (N) = 0.4 × Fy × Área de Cisalhamento</p>
                <p className="text-white mt-1">Área de Cisalhamento = 2 × e × t</p>
            </div>

            <div className="mt-3">
                <ul className="list-disc list-inside space-y-2 ml-2 text-slate-300">
                    <li><strong>Passo 1:</strong> Calcular a Área de Cisalhamento.<br/><span className="text-zinc-500 ml-4">2 × {holeDist} × {thickness} = {area.toFixed(2)} mm²</span></li>
                    
                    <li><strong>Passo 2:</strong> Calcular a Carga Máxima de Ruptura em Newtons (N).<br/><span className="text-zinc-500 ml-4">0.4 × {yieldStress} × {area.toFixed(2)} = {capacityN.toFixed(2)} N</span></li>
                    
                    <li><strong>Passo 3:</strong> Converter Newtons para Quilogramas (kg) (dividir por 9.81).<br/><span className="text-zinc-500 ml-4">{capacityN.toFixed(2)} / 9.81 = {capacityKg.toFixed(2)} kg</span></li>
                    
                    <li><strong>Passo 4:</strong> Aplicar Fator de Segurança (FS = 4).<br/><span className="text-zinc-500 ml-4">{capacityKg.toFixed(2)} / 4 = <span className="text-safety-yellow font-bold">{Math.round(safeLoad)} kg</span></span></li>
                </ul>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LiftingCalc;