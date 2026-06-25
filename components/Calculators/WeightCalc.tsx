import React, { useState } from 'react';
import { Info } from 'lucide-react';

const WeightCalc: React.FC = () => {
  const [length, setLength] = useState(1000); // mm
  const [width, setWidth] = useState(1000); // mm
  const [thickness, setThickness] = useState(6.35); // mm
  const [material, setMaterial] = useState('STEEL');

  const DENSITIES: Record<string, number> = {
    'STEEL': 7.85, // g/cm3
    'SS304': 7.9,
    'ALUMINUM': 2.7,
  };

  const calculateWeight = () => {
    // Vol in mm3 = L * W * T
    // Vol in cm3 = Vol_mm3 / 1000
    // Weight (kg) = (Vol_cm3 * Density) / 1000
    const vol_mm3 = length * width * thickness;
    const vol_cm3 = vol_mm3 / 1000;
    const weight_g = vol_cm3 * DENSITIES[material];
    return (weight_g / 1000).toFixed(2);
  };

  const vol_mm3 = length * width * thickness;
  const vol_cm3 = vol_mm3 / 1000;
  const weight_g = vol_cm3 * DENSITIES[material];
  const weight_kg = (weight_g / 1000).toFixed(2);

  return (
    <div className="space-y-4 pb-24">
      <h2 className="text-lg font-bold">Calculadora de Peso de Chapa</h2>
      
      <div className="space-y-3">
        <div>
           <label className="block text-xs text-slate-400">Material</label>
           <select className="w-full bg-slate-800 border border-slate-700 p-3 rounded" value={material} onChange={(e) => setMaterial(e.target.value)}>
             <option value="STEEL">Aço Carbono (7.85 g/cm³)</option>
             <option value="SS304">Aço Inox (7.90 g/cm³)</option>
             <option value="ALUMINUM">Alumínio (2.70 g/cm³)</option>
           </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
           <div>
             <label className="block text-xs text-slate-400">Comprimento (mm)</label>
             <input type="number" className="w-full bg-slate-800 border border-slate-700 p-3 rounded" value={length} onChange={(e) => setLength(Number(e.target.value))} />
           </div>
           <div>
             <label className="block text-xs text-slate-400">Largura (mm)</label>
             <input type="number" className="w-full bg-slate-800 border border-slate-700 p-3 rounded" value={width} onChange={(e) => setWidth(Number(e.target.value))} />
           </div>
        </div>

        <div>
             <label className="block text-xs text-slate-400">Espessura (mm)</label>
             <input type="number" className="w-full bg-slate-800 border border-slate-700 p-3 rounded" value={thickness} onChange={(e) => setThickness(Number(e.target.value))} />
        </div>
      </div>

      <div className="mt-6 bg-slate-800 p-6 rounded-lg text-center border border-slate-700">
        <span className="block text-sm text-slate-400 uppercase tracking-widest">Peso Total</span>
        <span className="text-4xl font-black text-safety-yellow">{weight_kg} <span className="text-lg text-white">kg</span></span>
      </div>

      {/* 3. FORMULAS & STEP-BY-STEP */}
      <div className="w-full bg-slate-900/50 rounded-xl border border-slate-800 p-4 mt-4">
        <h4 className="text-safety-yellow font-bold text-sm mb-3 flex items-center gap-2">
            <Info size={16} /> Memória de Cálculo (Passo a Passo)
        </h4>
        <div className="text-xs text-slate-300 space-y-3 font-mono">
            <p><strong className="text-blue-400">Comprimento (C):</strong> {length} mm</p>
            <p><strong className="text-blue-400">Largura (L):</strong> {width} mm</p>
            <p><strong className="text-blue-400">Espessura (E):</strong> {thickness} mm</p>
            <p><strong className="text-blue-400">Densidade (D):</strong> {DENSITIES[material]} g/cm³</p>
            
            <div className="bg-slate-900 p-3 rounded border border-slate-700 mt-2">
                <p className="text-slate-400 mb-2">Fórmula do Volume (mm³):</p>
                <p className="text-white">Volume = C × L × E</p>
            </div>

            <div className="mt-3">
                <ul className="list-disc list-inside space-y-2 ml-2 text-slate-300">
                    <li><strong>Passo 1:</strong> Calcular o Volume em mm³.<br/><span className="text-zinc-500 ml-4">{length} × {width} × {thickness} = {vol_mm3.toFixed(2)} mm³</span></li>
                    
                    <li><strong>Passo 2:</strong> Converter Volume para cm³ (dividir por 1000).<br/><span className="text-zinc-500 ml-4">{vol_mm3.toFixed(2)} / 1000 = {vol_cm3.toFixed(2)} cm³</span></li>
                    
                    <li><strong>Passo 3:</strong> Calcular o Peso em gramas (Volume × Densidade).<br/><span className="text-zinc-500 ml-4">{vol_cm3.toFixed(2)} × {DENSITIES[material]} = {weight_g.toFixed(2)} g</span></li>
                    
                    <li><strong>Passo 4:</strong> Converter Peso para kg (dividir por 1000).<br/><span className="text-zinc-500 ml-4">{weight_g.toFixed(2)} / 1000 = <span className="text-safety-yellow font-bold">{weight_kg} kg</span></span></li>
                </ul>
            </div>
        </div>
      </div>
    </div>
  );
};

export default WeightCalc;