import React, { useState } from 'react';
import { Triangle, RotateCcw, Calculator, ChevronRight } from 'lucide-react';

const TrigCalc: React.FC = () => {
  const [sideA, setSideA] = useState<string>(''); // Cateto Oposto (Altura)
  const [sideB, setSideB] = useState<string>(''); // Cateto Adjacente (Base)
  const [sideC, setSideC] = useState<string>(''); // Hipotenusa
  const [angle, setAngle] = useState<string>(''); // Ângulo Alfa
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const calculate = () => {
    setError('');
    setResult(null);

    const a = parseFloat(sideA);
    const b = parseFloat(sideB);
    const c = parseFloat(sideC);
    const ang = parseFloat(angle);

    // Convert degrees to radians
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;

    let resA = a, resB = b, resC = c, resAng = ang, resAngBeta = 0;
    let method = '';

    // Contar inputs válidos
    const hasA = !isNaN(a);
    const hasB = !isNaN(b);
    const hasC = !isNaN(c);
    const hasAng = !isNaN(ang);

    try {
      if (hasA && hasB) {
        // Pitágoras: C = sqrt(A^2 + B^2)
        resC = Math.sqrt(a * a + b * b);
        // Tan(ang) = A / B
        resAng = toDeg(Math.atan(a / b));
        method = 'Pitágoras (C) & Tangente (Ângulo)';
      } else if (hasA && hasC) {
        if (a >= c) throw new Error("Cateto não pode ser maior que a Hipotenusa");
        // Pitágoras: B = sqrt(C^2 - A^2)
        resB = Math.sqrt(c * c - a * a);
        // Sin(ang) = A / C
        resAng = toDeg(Math.asin(a / c));
        method = 'Pitágoras (B) & Seno (Ângulo)';
      } else if (hasB && hasC) {
        if (b >= c) throw new Error("Cateto não pode ser maior que a Hipotenusa");
        // Pitágoras: A = sqrt(C^2 - B^2)
        resA = Math.sqrt(c * c - b * b);
        // Cos(ang) = B / C
        resAng = toDeg(Math.acos(b / c));
        method = 'Pitágoras (A) & Cosseno (Ângulo)';
      } else if (hasA && hasAng) {
        // Sin(ang) = A / C -> C = A / Sin(ang)
        resC = a / Math.sin(toRad(ang));
        // Tan(ang) = A / B -> B = A / Tan(ang)
        resB = a / Math.tan(toRad(ang));
        method = 'Seno (C) & Tangente (B)';
      } else if (hasB && hasAng) {
        // Cos(ang) = B / C -> C = B / Cos(ang)
        resC = b / Math.cos(toRad(ang));
        // Tan(ang) = A / B -> A = B * Tan(ang)
        resA = b * Math.tan(toRad(ang));
        method = 'Cosseno (C) & Tangente (A)';
      } else if (hasC && hasAng) {
        // Sin(ang) = A / C -> A = C * Sin(ang)
        resA = c * Math.sin(toRad(ang));
        // Cos(ang) = B / C -> B = C * Cos(ang)
        resB = c * Math.cos(toRad(ang));
        method = 'Seno (A) & Cosseno (B)';
      } else {
        setError('Preencha pelo menos 2 campos (ex: 2 lados OU 1 lado e 1 ângulo).');
        return;
      }

      resAngBeta = 90 - resAng;

      setResult({
        a: resA.toFixed(2),
        b: resB.toFixed(2),
        c: resC.toFixed(2),
        angle: resAng.toFixed(2),
        angleBeta: resAngBeta.toFixed(2),
        method
      });

    } catch (e: any) {
      setError(e.message || "Erro no cálculo");
    }
  };

  const clear = () => {
    setSideA('');
    setSideB('');
    setSideC('');
    setAngle('');
    setResult(null);
    setError('');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-xl">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <Triangle size={20} className="text-safety-yellow fill-safety-yellow/20" /> 
          Simulador Trigonométrico
        </h3>

        {/* Diagrama Visual */}
        <div className="flex justify-center mb-6 bg-slate-950 p-4 rounded-xl border border-slate-800">
          <svg width="200" height="150" viewBox="0 0 200 150">
            {/* Triângulo */}
            <path d="M 40 130 L 160 130 L 160 30 Z" fill="none" stroke="#3b82f6" strokeWidth="2" />
            {/* Ângulo Reto */}
            <path d="M 160 120 L 150 120 L 150 130" fill="none" stroke="#475569" strokeWidth="1" />
            
            {/* Labels */}
            <text x="170" y="80" fill={sideA || result?.a ? "#fbbf24" : "#64748b"} fontSize="12" fontWeight="bold">A (Oposto)</text>
            <text x="100" y="145" fill={sideB || result?.b ? "#fbbf24" : "#64748b"} fontSize="12" fontWeight="bold" textAnchor="middle">B (Adjacente)</text>
            <text x="90" y="70" fill={sideC || result?.c ? "#fbbf24" : "#64748b"} fontSize="12" fontWeight="bold" transform="rotate(-38 100 80)">C (Hipotenusa)</text>
            
            {/* Ângulo Alfa */}
            <path d="M 60 130 A 20 20 0 0 1 58 122" stroke="#ef4444" fill="none" />
            <text x="70" y="125" fill={angle || result?.angle ? "#ef4444" : "#64748b"} fontSize="10">α</text>
          </svg>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Lado A (Oposto)</label>
            <input 
              type="number" 
              className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white focus:border-safety-yellow outline-none"
              placeholder="0"
              value={sideA}
              onChange={e => setSideA(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Lado B (Adjacente)</label>
            <input 
              type="number" 
              className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white focus:border-safety-yellow outline-none"
              placeholder="0"
              value={sideB}
              onChange={e => setSideB(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Lado C (Hipotenusa)</label>
            <input 
              type="number" 
              className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white focus:border-safety-yellow outline-none"
              placeholder="0"
              value={sideC}
              onChange={e => setSideC(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Ângulo α (Graus)</label>
            <input 
              type="number" 
              className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white focus:border-safety-yellow outline-none"
              placeholder="0°"
              value={angle}
              onChange={e => setAngle(e.target.value)}
            />
          </div>
        </div>

        {error && <div className="text-red-400 text-xs mb-4 p-2 bg-red-900/20 rounded border border-red-900">{error}</div>}

        <div className="flex gap-2">
          <button 
            onClick={clear}
            className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-slate-700"
          >
            <RotateCcw size={18} /> Limpar
          </button>
          <button 
            onClick={calculate}
            className="flex-[2] py-3 bg-blue-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-500 shadow-lg shadow-blue-900/20"
          >
            <Calculator size={18} /> Calcular
          </button>
        </div>

        {/* Resultados */}
        {result && (
          <div className="mt-6 bg-slate-950 p-4 rounded-xl border border-slate-800 animate-in slide-in-from-top-2">
            <h4 className="text-safety-yellow font-bold text-sm mb-3 border-b border-slate-800 pb-2">Resultados Calculados</h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Hipotenusa (C):</span>
                <span className="font-mono text-white">{result.c}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cateto Oposto (A):</span>
                <span className="font-mono text-white">{result.a}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cateto Adjacente (B):</span>
                <span className="font-mono text-white">{result.b}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ângulo Alfa:</span>
                <span className="font-mono text-safety-yellow">{result.angle}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ângulo Beta:</span>
                <span className="font-mono text-slate-300">{result.angleBeta}°</span>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Método Utilizado</span>
              <div className="text-xs text-blue-400 flex items-center gap-1">
                <ChevronRight size={10} /> {result.method}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrigCalc;