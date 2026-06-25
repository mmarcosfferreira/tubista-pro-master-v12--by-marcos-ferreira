import React, { useState, useMemo, useEffect } from 'react';
import { Save, X, Download, Trash2, FolderOpen, Settings } from 'lucide-react';

interface PlateData {
    id: string;
    name: string;
    length: number;
    width: number;
    thickness: number;
    material: 'CarbonSteel' | 'StainlessSteel' | 'Aluminum';
    date: string;
}

interface PlateSketcherProps {
    onClose: () => void;
}

const MATERIALS = {
    CarbonSteel: { name: 'Aço Carbono', density: 7.85 },
    StainlessSteel: { name: 'Aço Inox', density: 7.90 },
    Aluminum: { name: 'Alumínio', density: 2.70 }
};

const PlateSketcher: React.FC<PlateSketcherProps> = ({ onClose }) => {
    const [length, setLength] = useState<number>(1000);
    const [width, setWidth] = useState<number>(500);
    const [thickness, setThickness] = useState<number>(6.35);
    const [material, setMaterial] = useState<keyof typeof MATERIALS>('CarbonSteel');
    const [name, setName] = useState<string>('Nova Chapa');
    
    const [editingField, setEditingField] = useState<'length' | 'width' | 'thickness' | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    const [savedPlates, setSavedPlates] = useState<PlateData[]>([]);
    const [showProjects, setShowProjects] = useState(false);

    const [showPanel, setShowPanel] = useState(true);

    // Panel Drag State
    const [panelPos, setPanelPos] = useState({ x: window.innerWidth - 340, y: window.innerHeight - 400 });
    const [isPanelDragging, setIsPanelDragging] = useState(false);
    const [panelDragOffset, setPanelDragOffset] = useState({ x: 0, y: 0 });

    const handlePanelDragStart = (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsPanelDragging(true);
        setPanelDragOffset({
            x: e.clientX - panelPos.x,
            y: e.clientY - panelPos.y
        });
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePanelDragMove = (e: React.PointerEvent) => {
        if (!isPanelDragging) return;
        e.preventDefault();
        e.stopPropagation();
        setPanelPos({
            x: e.clientX - panelDragOffset.x,
            y: e.clientY - panelDragOffset.y
        });
    };

    const handlePanelDragEnd = (e: React.PointerEvent) => {
        e.preventDefault();
        setIsPanelDragging(false);
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    };

    useEffect(() => {
        const saved = localStorage.getItem('tubista_plate_projects');
        if (saved) {
            try {
                setSavedPlates(JSON.parse(saved));
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    const saveProjects = (projects: PlateData[]) => {
        localStorage.setItem('tubista_plate_projects', JSON.stringify(projects));
        setSavedPlates(projects);
    };

    const handleSave = () => {
        const newPlate: PlateData = {
            id: Date.now().toString(),
            name,
            length,
            width,
            thickness,
            material,
            date: new Date().toISOString()
        };
        saveProjects([...savedPlates, newPlate]);
        alert('Croqui de chapa salvo com sucesso!');
    };

    const loadPlate = (plate: PlateData) => {
        setName(plate.name);
        setLength(plate.length);
        setWidth(plate.width);
        setThickness(plate.thickness);
        setMaterial(plate.material);
        setShowProjects(false);
    };

    const deletePlate = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = savedPlates.filter(p => p.id !== id);
        setSavedPlates(updated);
        localStorage.setItem('tubista_plate_projects', JSON.stringify(updated));
    };

    const weight = useMemo(() => {
        const volumeCm3 = (length / 10) * (width / 10) * (thickness / 10);
        const massKg = (volumeCm3 * MATERIALS[material].density) / 1000;
        return massKg.toFixed(2);
    }, [length, width, thickness, material]);

    const handleLabelClick = (field: 'length' | 'width' | 'thickness', currentValue: number) => {
        setEditingField(field);
        setEditValue(currentValue.toString());
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const val = Number(editValue);
        if (!isNaN(val) && val > 0) {
            if (editingField === 'length') setLength(val);
            if (editingField === 'width') setWidth(val);
            if (editingField === 'thickness') setThickness(val);
        }
        setEditingField(null);
    };

    const scale = Math.min(0.34, 320 / Math.max(length, width, 1));
    const angle30 = Math.PI / 6;
    const cos30 = Math.cos(angle30);
    const sin30 = Math.sin(angle30);
    const thicknessVisual = Math.max(18, thickness * scale * 4.8);

    const projectPoint = (x: number, y: number, z: number) => ({
        x: 390 + ((x - y) * cos30 * scale),
        y: 250 + ((x + y) * sin30 * scale) - (z * thicknessVisual / Math.max(thickness, 1)),
    });

    const topFrontLeft = projectPoint(0, width, thickness);
    const topFrontRight = projectPoint(length, width, thickness);
    const topBackRight = projectPoint(length, 0, thickness);
    const topBackLeft = projectPoint(0, 0, thickness);
    const bottomFrontLeft = projectPoint(0, width, 0);
    const bottomFrontRight = projectPoint(length, width, 0);
    const bottomBackRight = projectPoint(length, 0, 0);
    const bottomBackLeft = projectPoint(0, 0, 0);

    const lengthMid = {
        x: (topBackLeft.x + topBackRight.x) / 2,
        y: (topBackLeft.y + topBackRight.y) / 2 - 18
    };
    const widthMid = {
        x: (topFrontLeft.x + topBackLeft.x) / 2 - 30,
        y: (topFrontLeft.y + topBackLeft.y) / 2 + 10
    };
    const thicknessMid = {
        x: bottomFrontLeft.x - 38,
        y: (topFrontLeft.y + bottomFrontLeft.y) / 2
    };

    return (
        <div className="absolute inset-0 bg-zinc-950 z-[100] flex flex-col font-sans text-white pointer-events-auto">
            {/* Header */}
            <div className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors">
                        <X size={20} className="text-zinc-400" />
                    </button>
                    <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-transparent border-b border-zinc-700 text-lg font-bold focus:outline-none focus:border-orange-500 w-48"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowProjects(true)} className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors flex items-center gap-2 text-blue-400">
                        <FolderOpen size={18} /> <span className="hidden sm:inline">Abrir</span>
                    </button>
                    <button onClick={handleSave} className="p-2 bg-orange-600 rounded-lg hover:bg-orange-500 transition-colors flex items-center gap-2 font-bold">
                        <Save size={18} /> <span className="hidden sm:inline">Salvar</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 relative overflow-hidden flex">
                {/* Canvas Area */}
                <div className="flex-1 relative bg-zinc-950 flex items-center justify-center">
                    <svg width="100%" height="100%" viewBox="0 0 800 600" className="drop-shadow-2xl pointer-events-auto">
                        <polygon
                            points={`${bottomFrontLeft.x},${bottomFrontLeft.y} ${bottomFrontRight.x},${bottomFrontRight.y} ${topFrontRight.x},${topFrontRight.y} ${topFrontLeft.x},${topFrontLeft.y}`}
                            fill="#3f3f46"
                            stroke="#18181b"
                            strokeWidth="2"
                        />
                        <polygon
                            points={`${bottomFrontRight.x},${bottomFrontRight.y} ${bottomBackRight.x},${bottomBackRight.y} ${topBackRight.x},${topBackRight.y} ${topFrontRight.x},${topFrontRight.y}`}
                            fill="#52525b"
                            stroke="#18181b"
                            strokeWidth="2"
                        />
                        <polygon
                            points={`${topFrontLeft.x},${topFrontLeft.y} ${topFrontRight.x},${topFrontRight.y} ${topBackRight.x},${topBackRight.y} ${topBackLeft.x},${topBackLeft.y}`}
                            fill="#8b8b95"
                            stroke="#18181b"
                            strokeWidth="2"
                        />
                        <line x1={topFrontLeft.x} y1={topFrontLeft.y} x2={topBackRight.x} y2={topBackRight.y} stroke="#a1a1aa" strokeWidth="1.2" opacity="0.45" />
                        <line x1={topBackLeft.x} y1={topBackLeft.y} x2={topFrontRight.x} y2={topFrontRight.y} stroke="#a1a1aa" strokeWidth="1" opacity="0.25" />

                        {/* Labels */}
                        <g transform={`translate(${lengthMid.x}, ${lengthMid.y})`} className="cursor-pointer hover:opacity-80 pointer-events-auto" onClick={(e) => { e.stopPropagation(); handleLabelClick('length', length); }}>
                            <rect x="-40" y="-12" width="80" height="24" rx="4" fill="#09090b" stroke="#f97316" strokeWidth="1" />
                            <text x="0" y="4" textAnchor="middle" fill="#f97316" fontSize="12" fontWeight="bold" fontFamily="monospace">C: {length}</text>
                        </g>

                        <g transform={`translate(${widthMid.x}, ${widthMid.y})`} className="cursor-pointer hover:opacity-80 pointer-events-auto" onClick={(e) => { e.stopPropagation(); handleLabelClick('width', width); }}>
                            <rect x="-40" y="-12" width="80" height="24" rx="4" fill="#09090b" stroke="#3b82f6" strokeWidth="1" />
                            <text x="0" y="4" textAnchor="middle" fill="#3b82f6" fontSize="12" fontWeight="bold" fontFamily="monospace">L: {width}</text>
                        </g>

                        <g transform={`translate(${thicknessMid.x}, ${thicknessMid.y})`} className="cursor-pointer hover:opacity-80 pointer-events-auto" onClick={(e) => { e.stopPropagation(); handleLabelClick('thickness', thickness); }}>
                            <rect x="-40" y="-12" width="80" height="24" rx="4" fill="#09090b" stroke="#10b981" strokeWidth="1" />
                            <text x="0" y="4" textAnchor="middle" fill="#10b981" fontSize="12" fontWeight="bold" fontFamily="monospace">E: {thickness}</text>
                        </g>
                    </svg>

                    {/* Edit Modal Overlay */}
                    {editingField && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
                            <form onSubmit={handleEditSubmit} className="bg-zinc-900 p-6 rounded-xl border border-zinc-700 shadow-2xl flex flex-col gap-4">
                                <h3 className="text-lg font-bold text-white uppercase">
                                    Editar {editingField === 'length' ? 'Comprimento' : editingField === 'width' ? 'Largura' : 'Espessura'}
                                </h3>
                                <input 
                                    type="number" 
                                    step="0.1"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="bg-black border border-zinc-600 rounded p-3 text-white text-xl text-center focus:outline-none focus:border-orange-500"
                                    autoFocus
                                />
                                <div className="flex gap-2 mt-2">
                                    <button type="button" onClick={() => setEditingField(null)} className="flex-1 p-3 bg-zinc-800 rounded-lg text-zinc-300 font-bold hover:bg-zinc-700">Cancelar</button>
                                    <button type="submit" className="flex-1 p-3 bg-orange-600 rounded-lg text-white font-bold hover:bg-orange-500">Confirmar</button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                {/* Real-time Weight Panel (Non-obstructive) */}
                {!showPanel ? (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowPanel(true); }}
                        style={{ top: panelPos.y, left: panelPos.x }}
                        className="absolute bg-zinc-900 border border-zinc-700 p-3 rounded-xl shadow-2xl text-zinc-400 hover:text-white flex items-center gap-2 pointer-events-auto transition-colors z-50"
                    >
                        <Settings size={20} />
                        <span className="text-sm font-bold">Propriedades</span>
                    </button>
                ) : (
                    <div 
                        style={{ top: panelPos.y, left: panelPos.x }}
                        className="absolute bg-zinc-900/90 backdrop-blur-md border border-zinc-700 p-4 rounded-2xl shadow-2xl w-80 pointer-events-auto flex flex-col gap-4 max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom-4 z-50"
                    >
                        <div 
                            className="flex justify-between items-center border-b border-zinc-800 pb-2 cursor-move select-none touch-none"
                            onPointerDown={handlePanelDragStart}
                            onPointerMove={handlePanelDragMove}
                            onPointerUp={handlePanelDragEnd}
                            onPointerCancel={handlePanelDragEnd}
                        >
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider pointer-events-none">Propriedades da Chapa</h3>
                            <button 
                                className="text-zinc-400 hover:text-white cursor-pointer" 
                                onClick={(e) => { e.stopPropagation(); setShowPanel(false); }}
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                <X size={16} />
                            </button>
                        </div>
                        
                        <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2" onPointerDown={(e) => e.stopPropagation()}>
                            <div>
                                <label className="text-[10px] text-zinc-400 uppercase font-bold mb-1 block">Material</label>
                                <select 
                                    className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-orange-500"
                                    value={material}
                                    onChange={(e) => setMaterial(e.target.value as any)}
                                >
                                    {Object.entries(MATERIALS).map(([key, mat]) => (
                                        <option key={key} value={key}>{mat.name} ({mat.density} g/cm³)</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] text-zinc-400 uppercase font-bold mb-1 block">Comp. (mm)</label>
                                    <input 
                                        type="number" 
                                        className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-orange-500"
                                        value={length}
                                        onChange={(e) => setLength(Number(e.target.value) || 0)}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-zinc-400 uppercase font-bold mb-1 block">Largura (mm)</label>
                                    <input 
                                        type="number" 
                                        className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-orange-500"
                                        value={width}
                                        onChange={(e) => setWidth(Number(e.target.value) || 0)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] text-zinc-400 uppercase font-bold mb-1 block">Espessura (mm)</label>
                                <input 
                                    type="number" 
                                    step="0.1"
                                    className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-orange-500"
                                    value={thickness}
                                    onChange={(e) => setThickness(Number(e.target.value) || 0)}
                                />
                            </div>

                            <div className="bg-black/50 p-4 rounded-xl border border-zinc-800 flex flex-col items-center justify-center mt-2">
                                <span className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Peso Estimado</span>
                                <div className="text-4xl font-black text-orange-500 tracking-tighter">
                                    {weight} <span className="text-lg text-zinc-500 font-bold">kg</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Projects Modal */}
            {showProjects && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2"><FolderOpen size={20} className="text-blue-400"/> Croquis Salvos</h2>
                            <button onClick={() => setShowProjects(false)} className="text-zinc-400 hover:text-white"><X size={24}/></button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {savedPlates.length === 0 ? (
                                <div className="col-span-full text-center py-12 text-zinc-500">Nenhum croqui salvo.</div>
                            ) : (
                                savedPlates.map(plate => (
                                    <div key={plate.id} className="bg-black border border-zinc-800 p-4 rounded-xl hover:border-zinc-600 transition-colors cursor-pointer group" onClick={() => loadPlate(plate)}>
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-white text-lg">{plate.name}</h3>
                                            <button onClick={(e) => deletePlate(plate.id, e)} className="text-zinc-600 hover:text-red-500 transition-colors p-1">
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                        <div className="text-xs text-zinc-400 space-y-1 font-mono">
                                            <div>Dim: {plate.length} x {plate.width} x {plate.thickness}mm</div>
                                            <div>Mat: {MATERIALS[plate.material].name}</div>
                                            <div className="text-zinc-600 mt-2 text-[10px]">{new Date(plate.date).toLocaleString()}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlateSketcher;
