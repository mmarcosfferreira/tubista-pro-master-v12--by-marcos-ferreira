import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { 
  Undo2, Redo2, CircleDot, Ruler, FolderOpen, Save, Trash2, Calendar, X, 
  Wand2, Move, Plus, Check, Minus,
  Compass, Download, Upload,
  ZoomIn, ZoomOut, AlignCenter, Maximize,
  Square, Triangle, Hexagon, Circle,
  ChevronUp, ChevronDown, 
  ArrowUpRight, ArrowDownLeft, ArrowDownRight, ArrowUpLeft,
  ArrowUp, ArrowDown,
  LayoutGrid, List, Settings, Hammer, FileText, MousePointer2,
  CornerDownLeft, RotateCw, FileUp, Link2, Info, Calculator,
  AlertTriangle, Palette, RotateCcw, GripHorizontal, Crosshair,
  Share2, Image as ImageIcon, FileType, Eye, EyeOff, ArrowLeftRight, HardDrive,
  CloudUpload, CloudDownload, Activity, XCircle, Flag, MoveRight,
  FlipHorizontal, Compass as CompassIcon, Lock, Unlock, Settings2,
  ChevronRight, Scissors, AlignRight, Menu, RefreshCw
} from 'lucide-react';
import { PipeSegment, Point3D, ComponentCategory, ProjectData, HatchType, IsoFitting, DefaultWeldType, ElbowProfileCode, FluidIdentificationCode, FluidIdentificationStandardCode, FlangeType, GasketType, PipeConstructionType, PipeFinishType, PipeMaterialStandardCode, PipeScheduleCode, PipeConnectionType, ProjectSettings } from '../../types';
import { projectIso, COS_30, SIN_30, PIPE_SCHEDULE, VALVE_FACE_TO_FACE, TEE_CENTER_TO_FACE, FLANGE_DIMENSIONS, FLANGE_METADATA, GASKET_METADATA, TEE_STANDARD_METADATA, TEE_STANDARD_OPTIONS, AVAILABLE_SIZES, DEFAULT_FLUID_IDENTIFICATION_STANDARD, DEFAULT_PIPE_SCHEDULE_CODE, ELBOW_PROFILE_OPTIONS, FLUID_IDENTIFICATION_OPTIONS, FLUID_IDENTIFICATION_STANDARD_OPTIONS, PIPE_MATERIAL_STANDARD_OPTIONS, PIPE_SCHEDULE_OPTIONS, VALVE_CALCULATION_METADATA, getFluidIdentificationOptionLabel, getFluidIdentificationOptions, getPipeScheduleLabel, getPipeScheduleOption, getPipeScheduleWall, ASME_B16_11_DIMENSIONS, PIPE_CONNECTION_TYPE_OPTIONS, DEFAULT_PIPE_CONNECTION_TYPE } from '../../constants';
import { saveProject, loadProjects, deleteProject, importBatchProjects } from '../../services/storageService';
import { shareAsImage, shareAsPDF } from '../../services/exportService';
import { generate3DFromImage } from '../../services/geminiService';

import PlateSketcher from './PlateSketcher';
import PhotoFrame from './PhotoFrame';

// Função segura para gerar ID
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// Conversão: 1 Unidade de Grid = 100mm
const GRID_SCALE = 100; 

const smartBtnClass = "bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-[9px] text-white hover:bg-zinc-700 active:bg-blue-600 transition-colors";
const DEFAULT_FLUID_OPTION = FLUID_IDENTIFICATION_OPTIONS[0];
const DEFAULT_PIPE_MATERIAL_OPTION = PIPE_MATERIAL_STANDARD_OPTIONS[0];
const DEFAULT_ELBOW_PROFILE_OPTION = ELBOW_PROFILE_OPTIONS.find(option => option.code === 'LR_1_5D') || ELBOW_PROFILE_OPTIONS[0];
const FLOATING_PANEL_DRAG_THRESHOLD = 6;
const FLOATING_LAYOUT_STORAGE_KEY = 'tubista_pro_floating_layout_v2';

type PanelPlacement = { x: number; y: number; locked: boolean };

type FloatingPanelPositions = {
  symbology: PanelPlacement;
  material: PanelPlacement;
  smart: PanelPlacement;
  quickCuts: PanelPlacement;
  trig: PanelPlacement;
  plate: PanelPlacement;
};

const getDefaultFloatingPanelPositions = (): FloatingPanelPositions => {
  const isMobile = window.innerWidth < 768;
  return {
    symbology: { x: 10, y: 80, locked: false },
    smart: { x: isMobile ? 66 : 130, y: 80, locked: false },
    material: { x: isMobile ? 122 : 250, y: 80, locked: false },
    quickCuts: { x: isMobile ? 178 : 370, y: 80, locked: false },
    trig: { x: isMobile ? 234 : 490, y: 80, locked: false },
    plate: { x: isMobile ? 290 : 610, y: 80, locked: false },
  };
};

interface ToolDef {
    id: ComponentCategory | 'DIMENSION_WIDTH' | 'ELBOW_CUSTOM';
    label: string;
    icon: any;
    description: string; // Tooltip / Help text
    sigla?: string; // Optional short code display
}

interface ToolCategoryDef {
    name: string;
    tools: ToolDef[];
}

const TOOL_CATEGORIES: ToolCategoryDef[] = [
  {
    name: 'Tubulação',
    tools: [
      { 
          id: 'PIPE', 
          label: 'Tubo', 
          icon: Minus,
          description: "Tubo padrão industrial. Representado com linha de centro (eixo)."
      },
      { 
          id: 'PIPE_FLEX', 
          label: 'Tubo Flexível', 
          icon: Activity,
          description: "Mangueiras ou tubulações flexíveis. Representado por linha tracejada."
      },
      {
          id: 'FLOW_ARROW',
          label: 'Fluxo',
          icon: MoveRight,
          description: "Indica o sentido do fluido na tubulação. Essencial para check de processo."
      }
    ]
  },
  {
    name: 'Curvas & Conexões',
    tools: [
      { 
          id: 'ELBOW_LR', 
          label: 'Curva 90° Selecionada', 
          icon: CornerDownLeft, 
          sigla: 'CUR',
          description: "Usa o raio padrão escolhido no projeto: SR 1D, LR 1,5D, 3D, 5D ou 10D."
      },
      { 
          id: 'ELBOW_SR', 
          label: 'Curva 90° SR', 
          icon: CornerDownLeft, 
          sigla: 'SR',
          description: "Atalho para cotovelo curto 1D quando o espaço físico está apertado."
      },
      {
          id: 'ELBOW_CUSTOM',
          label: 'Curva Ajustável',
          icon: Settings2,
          sigla: 'VAR',
          description: "Curva com grau personalizado (45°, 30°, 60°...). O raio usado seguirá a família escolhida no projeto."
      },
      { 
          id: 'TEE', 
          label: 'Tê Reto', 
          icon: ArrowUpRight, 
          sigla: 'T',
          description: "Derivação de fluxo. Tê normal (diâmetros iguais)."
      },
      { 
          id: 'REDUCER_CON', 
          label: 'Red. Concêntrica', 
          icon: Triangle, 
          description: "Reduz o diâmetro mantendo o centro alinhado. Ideal para linhas verticais."
      },
      { 
          id: 'REDUCER_ECC', 
          label: 'Red. Excêntrica', 
          icon: Triangle, 
          description: "Mantém um lado nivelado (BOP/TOP). Usada em sucção de bombas para evitar cavitação."
      },
      { 
          id: 'CAP', 
          label: 'Cap', 
          icon: Circle, 
          description: "Tampão para fechar a extremidade da tubulação soldada."
      }
    ]
  },
  {
    name: 'Flanges',
    tools: [
      { 
          id: 'FLANGE_WN', 
          label: 'Pescoço (WN)', 
          icon: CircleDot, 
          sigla: 'WN',
          description: "Welding Neck. Solda de topo. Alta resistência, ideal para altas pressões e temperaturas."
      },
      { 
          id: 'FLANGE_SO', 
          label: 'Sobreposto (SO)', 
          icon: Circle, 
          sigla: 'SO',
          description: "Slip-On. Solda em ângulo interna e externa. Mais barato, mas menor resistência à fadiga."
      },
      { 
          id: 'FLANGE_BLIND', 
          label: 'Cego', 
          icon: Circle, 
          sigla: 'Blind',
          description: "Disco sólido usado para fechar extremidades de tubulação flangeada."
      }
    ]
  },
  {
     name: 'Válvulas',
     tools: [
         { id: 'VALVE_GATE', label: 'Gaveta', icon: Square, description: "Bloqueio on/off. Baixa perda de carga. Não serve para regular fluxo." },
         { id: 'VALVE_GLOBE', label: 'Globo', icon: Circle, description: "Regulagem de fluxo. Alta perda de carga." },
         { id: 'VALVE_BALL', label: 'Esfera', icon: CircleDot, description: "Bloqueio rápido. Abertura plena ou reduzida." },
         { id: 'VALVE_CHECK', label: 'Retenção', icon: ArrowUp, description: "Permite fluxo em apenas um sentido. Evita contrafluxo." },
     ]
  },
  {
    name: 'Soldas & Medidas',
    tools: [
      { id: 'WELD_SHOP', label: 'Solda Oficina', icon: Circle, description: "Ponto de solda realizado em fábrica/oficina (controlado)." },
      { id: 'WELD_FIELD', label: 'Solda Campo', icon: XCircle, description: "Solda realizada na montagem (campo). Requer ajuste." },
      { id: 'DIMENSION_WIDTH', label: 'Cota (Medida)', icon: ArrowLeftRight, description: "Insere uma anotação de medida manualmente." },
    ]
  }
];

interface SketchState {
  segments: PipeSegment[];
  fittings: IsoFitting[];
}

const IsoSketcher: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Ref for Long Press
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);
  
  // Data State
  const [segments, setSegments] = useState<PipeSegment[]>([]);
  const [fittings, setFittings] = useState<IsoFitting[]>([]);
  
  const [history, setHistory] = useState<{ past: SketchState[], future: SketchState[] }>({ past: [], future: [] });
  
  // Selection & Edit State
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [selectedFittingId, setSelectedFittingId] = useState<string | null>(null);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [showCalcDetailId, setShowCalcDetailId] = useState<string | null>(null);

  // Visual Settings State
  const [pipeThickness, setPipeThickness] = useState<number>(6);
  const [showViewSettings, setShowViewSettings] = useState(false);
  const [showDimensions, setShowDimensions] = useState(true); 
  const [hiddenDimensionIds, setHiddenDimensionIds] = useState<string[]>([]);

  // Estado do Projeto Atual
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  // Project Manager State
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [savedProjects, setSavedProjects] = useState<ProjectData[]>([]);
  const [newProjectName, setNewProjectName] = useState('');

  // Export Menu State
  const [showExportMenu, setShowExportMenu] = useState(false);

  // --- FLOATING PANELS COMPREHENSIVE STATE ---
  const [panelPositions, setPanelPositions] = useState<FloatingPanelPositions>(getDefaultFloatingPanelPositions());
  
  const togglePanelLock = (panelId: keyof FloatingPanelPositions) => {
      setPanelPositions(prev => ({
          ...prev,
          [panelId]: { ...prev[panelId], locked: !prev[panelId].locked }
      }));
  };

  const updatePanelPos = useCallback((panelId: keyof FloatingPanelPositions, x: number, y: number) => {
      setPanelPositions(prev => {
          if (prev[panelId].locked) return prev;
          if (prev[panelId].x === x && prev[panelId].y === y) return prev;
          return {
              ...prev,
              [panelId]: { ...prev[panelId], x, y }
          };
      });
  }, []);

  // Smart Tool State (Caneta Magica - Agora Toggle Flutuante)
  const [showSmartTool, setShowSmartTool] = useState(false);
  const [smartAngle, setSmartAngle] = useState<string>("45");
  const [smartLength, setSmartLength] = useState<number>(1000);
  const [isSmartToolDragging, setIsSmartToolDragging] = useState(false);
  const [smartToolDragOffset, setSmartToolDragOffset] = useState({ x: 0, y: 0 });

  // --- TRIGONOMETRY TOOL STATE ---
  const [showTrigTool, setShowTrigTool] = useState(false);
  const [trigState, setTrigState] = useState({
     sideA: '', // Oposto (Vertical)
     sideB: '', // Adjacente (Horizontal)
     sideC: '', // Hipotenusa
     angle: ''  // Angulo
  });
  const [trigResultType, setTrigResultType] = useState<string[]>([]);
  
  // Floating Window State (Trig)
  const [isTrigDragging, setIsTrigDragging] = useState(false);
  const [trigDragOffset, setTrigDragOffset] = useState({ x: 0, y: 0 });

  // --- SYMBOLOGY STATE ---
  const [showSymbologyMenu, setShowSymbologyMenu] = useState(false);
  const [isSymbologyDragging, setIsSymbologyDragging] = useState(false);
  const [symbologyDragOffset, setSymbologyDragOffset] = useState({ x: 0, y: 0 });

  // --- MATERIAL LIST STATE (Floating Toggle) ---
  const [showMaterialList, setShowMaterialList] = useState(false);
  const [isMaterialListDragging, setIsMaterialListDragging] = useState(false);
  const [materialListDragOffset, setMaterialListDragOffset] = useState({ x: 0, y: 0 });
  
  // List Settings
  const [weldGap, setWeldGap] = useState<number>(5); // Default 5mm gap
  const [activeElbowDegree, setActiveElbowDegree] = useState<number>(90);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // --- QUICK CUTS LIST STATE (Floating Toggle) ---
  const [showQuickCuts, setShowQuickCuts] = useState(false); // Controls expansion
  const [quickCutsOpacity, setQuickCutsOpacity] = useState<number>(0.9);
  const [isQuickCutsDragging, setIsQuickCutsDragging] = useState(false);
  const [quickCutsDragOffset, setQuickCutsDragOffset] = useState({ x: 0, y: 0 });
  const [expandedQuickCutId, setExpandedQuickCutId] = useState<string | null>(null);

  // --- 3D PLATE SKETCH STATE (Floating Toggle) ---
  const [showPlateSketch, setShowPlateSketch] = useState(false);
  const [showPhotoFrame, setShowPhotoFrame] = useState(false);
  const [isGenerating3D, setIsGenerating3D] = useState(false);
  const [isPlateSketchDragging, setIsPlateSketchDragging] = useState(false);
  const [plateSketchDragOffset, setPlateSketchDragOffset] = useState({ x: 0, y: 0 });
  const [plateWidth, setPlateWidth] = useState<number>(1000);
  const [plateLength, setPlateLength] = useState<number>(1000);
  const [plateThickness, setPlateThickness] = useState<number>(6.35); // 1/4"
  const [plateMaterial, setPlateMaterial] = useState<'CarbonSteel' | 'StainlessSteel' | 'Aluminum'>('CarbonSteel');

  // --- ORGANIZE STATE ---
  const [organizeState, setOrganizeState] = useState(0); // 0: Normal, 1: Horizontal Top, 2: Vertical Right
  const prevOrganizeState = useRef(organizeState);

  // --- SETUP & INSIGHTS ---
  const [showInsights, setShowInsights] = useState(false);
  const [showFittingDiagram, setShowFittingDiagram] = useState(false);
  const [isDiagramZoomed, setIsDiagramZoomed] = useState(false);
  const [diagramType, setDiagramType] = useState<'TEE' | 'ELBOW'>('TEE');

  // NEW PARAMETERS STATE
  const [currentFlangeSize, setCurrentFlangeSize] = useState<string>("4");
  const [valveLength, setValveLength] = useState<number>(229);
  const [autoValveLength, setAutoValveLength] = useState(true);
  
  const formatPipeSize = (size: string | number) => {
    const s = String(size);
    if (s === "0.5") return '1/2"';
    if (s === "0.75") return '3/4"';
    if (s === "1.25") return '1 1/4"';
    if (s === "1.5") return '1 1/2"';
    if (s === "2.5") return '2 1/2"';
    return `${s}"`;
  };
  
  // NEW: FLANGE & GASKET SETTINGS
  const [defaultFlangeType, setDefaultFlangeType] = useState<FlangeType>('WN');
  const [gasketType, setGasketType] = useState<GasketType>('NonMetallic');
  const [gasketThickness, setGasketThickness] = useState<number>(3);
  const [fittingStandard, setFittingStandard] = useState<string>('ANSI B16.9');
  const [defaultWeldType, setDefaultWeldType] = useState<DefaultWeldType>('WELD_SHOP');
  const [fluidIdentificationStandard, setFluidIdentificationStandard] = useState<FluidIdentificationStandardCode>(DEFAULT_FLUID_IDENTIFICATION_STANDARD);
  const [fluidIdentificationCode, setFluidIdentificationCode] = useState<FluidIdentificationCode>(DEFAULT_FLUID_OPTION.code);
  const [pipeMaterialStandard, setPipeMaterialStandard] = useState<PipeMaterialStandardCode>(DEFAULT_PIPE_MATERIAL_OPTION.code);
  const [pipeConstructionType, setPipeConstructionType] = useState<PipeConstructionType>(DEFAULT_PIPE_MATERIAL_OPTION.defaultConstruction);
  const [pipeFinishType, setPipeFinishType] = useState<PipeFinishType>(DEFAULT_PIPE_MATERIAL_OPTION.defaultFinish);
  const [defaultPipeSchedule, setDefaultPipeSchedule] = useState<PipeScheduleCode>(DEFAULT_PIPE_SCHEDULE_CODE);
  const [defaultElbowProfile, setDefaultElbowProfile] = useState<ElbowProfileCode>(DEFAULT_ELBOW_PROFILE_OPTION.code);
  const [connectionType, setConnectionType] = useState<PipeConnectionType>('BUTT_WELD');

  const handleSizeChange = (size: string) => {
    setCurrentSize(size);
    // Inteligência: Se a bitola for <= 2", sugere Socket Weld, caso contrário Butt Weld
    const numericSize = parseFloat(size);
    if (numericSize <= 2) {
        setConnectionType('SOCKET_WELD');
    } else {
        setConnectionType('BUTT_WELD');
    }
  };

  // Color State
  const [activeColor, setActiveColor] = useState<string>(DEFAULT_FLUID_OPTION.color);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(true);

  const COLOR_PALETTE = [
    { hex: '#cbd5e1', name: 'Padrão (Cinza)' },
    { hex: '#fbbf24', name: 'Amarelo' },
    { hex: '#ef4444', name: 'Vermelho' },
    { hex: '#3b82f6', name: 'Azul' },
    { hex: '#22c55e', name: 'Verde' },
    { hex: '#a855f7', name: 'Roxo' },
  ];

  // UI State
  const [activeTool, setActiveTool] = useState<ComponentCategory | 'DIMENSION_WIDTH' | 'ELBOW_CUSTOM'>('PIPE');

  const currentToolDef = useMemo(() => {
    for (const cat of TOOL_CATEGORIES) {
        const tool = cat.tools.find(t => t.id === activeTool);
        if (tool) return tool;
    }
    return null;
  }, [activeTool]);

  const [currentSize, setCurrentSize] = useState<string>("4");
  const [offsetAngle, setOffsetAngle] = useState<number>(0); 
  
  // Interaction State
  const [cursor, setCursor] = useState<Point3D>({ x: 0, y: 0, z: 0 });
  const [startPoint, setStartPoint] = useState<Point3D | null>(null); 
  
  // Viewport State
  const [scale, setScale] = useState(55);
  const [pan, setPan] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  
  // Pointer Logic
  const [isDragging, setIsDragging] = useState(false);
  const [lastPointerPos, setLastPointerPos] = useState({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  
  // Pinch to Zoom Logic
  const activePointers = useRef<Map<number, {x: number, y: number}>>(new Map());
  const initialPinchDistance = useRef<number | null>(null);
  const initialScale = useRef<number>(55);
  const manualFloatingPositionsRef = useRef<FloatingPanelPositions>(getDefaultFloatingPanelPositions());
  const hasHydratedFloatingLayoutRef = useRef(false);
  const hasHydratedDraftRef = useRef(false);
  const floatingPanelDragRef = useRef<Record<'trig' | 'smart' | 'material' | 'symbology' | 'quickCuts' | 'plate', { startX: number; startY: number; moved: boolean }>>({
      trig: { startX: 0, startY: 0, moved: false },
      smart: { startX: 0, startY: 0, moved: false },
      material: { startX: 0, startY: 0, moved: false },
      symbology: { startX: 0, startY: 0, moved: false },
      quickCuts: { startX: 0, startY: 0, moved: false },
      plate: { startX: 0, startY: 0, moved: false },
  });
  const smartDockButtonRef = useRef<HTMLButtonElement | null>(null);
  const quickCutsDockButtonRef = useRef<HTMLButtonElement | null>(null);
  const symbologyDockButtonRef = useRef<HTMLButtonElement | null>(null);
  const materialDockButtonRef = useRef<HTMLButtonElement | null>(null);
  const trigDockButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setSavedProjects(loadProjects());
    const defaults = getDefaultFloatingPanelPositions();
    manualFloatingPositionsRef.current = defaults;
    try {
        const savedLayoutRaw = localStorage.getItem(FLOATING_LAYOUT_STORAGE_KEY);
        if (savedLayoutRaw) {
            const savedLayout = JSON.parse(savedLayoutRaw);
            const savedPositions = savedLayout?.positions;
            if (savedPositions) {
                const mergedPositions: FloatingPanelPositions = {
                    symbology: { ...defaults.symbology, ...savedPositions.symbology },
                    material: { ...defaults.material, ...savedPositions.material },
                    smart: { ...defaults.smart, ...savedPositions.smart },
                    quickCuts: { ...defaults.quickCuts, ...savedPositions.quickCuts },
                    trig: { ...defaults.trig, ...savedPositions.trig },
                    plate: { ...defaults.plate, ...savedPositions.plate },
                };
                manualFloatingPositionsRef.current = mergedPositions;
                setPanelPositions(mergedPositions);
            }
            if (savedLayout?.organizeState !== undefined) {
                setOrganizeState(savedLayout.organizeState);
            }
        }
    } catch (error) {
        console.warn('Falha ao carregar layout flutuante salvo.', error);
    }
    hasHydratedFloatingLayoutRef.current = true;
    setShowMaterialList(false);
  }, []);

  // ORGANIZE EFFECT
  useEffect(() => {
      if (!hasHydratedFloatingLayoutRef.current) return;
      if (organizeState === 0) {
          manualFloatingPositionsRef.current = panelPositions;
      }
      try {
          localStorage.setItem(FLOATING_LAYOUT_STORAGE_KEY, JSON.stringify({
              organizeState,
              positions: manualFloatingPositionsRef.current,
          }));
      } catch (error) {
          console.warn('Falha ao persistir layout flutuante.', error);
      }
  }, [organizeState, panelPositions]);

  useEffect(() => {
      if (prevOrganizeState.current !== organizeState) {
          if (organizeState === 1 || organizeState === 2) {
              // Close panels to avoid overlap when organizing
              setShowSmartTool(false);
              setShowTrigTool(false);
              setShowSymbologyMenu(false);
              setShowMaterialList(false);
              setShowQuickCuts(false);
          }
          prevOrganizeState.current = organizeState;
      }

      if (organizeState === 1) { // COMPACT (Horizontal Top)
          const startY = 70;
          const startX = 10;
          const spacingX = window.innerWidth < 768 ? 58 : 66;
          setPanelPositions(prev => ({
              ...prev,
              symbology: { ...prev.symbology, x: startX, y: startY },
              smart: { ...prev.smart, x: startX + spacingX, y: startY },
              material: { ...prev.material, x: startX + spacingX * 2, y: startY },
              quickCuts: { ...prev.quickCuts, x: startX + spacingX * 3, y: startY },
              trig: { ...prev.trig, x: startX + spacingX * 4, y: startY },
          }));
      } else if (organizeState === 2) { // VERTICAL RIGHT
          const startX = window.innerWidth > 768 ? window.innerWidth - 320 : window.innerWidth - 280;
          let currentY = 70;
          const spacingY = 60;

          setPanelPositions(prev => {
              const res = { ...prev };
              res.smart = { ...res.smart, x: startX, y: currentY };
              currentY += spacingY;
              res.trig = { ...res.trig, x: startX, y: currentY };
              currentY += spacingY;
              res.symbology = { ...res.symbology, x: startX, y: currentY };
              currentY += spacingY;
              res.material = { ...res.material, x: startX, y: currentY };
              currentY += spacingY;
              res.quickCuts = { ...res.quickCuts, x: startX, y: currentY };
              return res;
          });
      } else if (organizeState === 0) {
          setPanelPositions(manualFloatingPositionsRef.current);
      }
  }, [organizeState]);

  // Update Valve Length Automatically when Pipe Size changes (if Auto is ON)
  useEffect(() => {
      if (autoValveLength) {
          const stdLength = VALVE_FACE_TO_FACE[currentSize];
          if (stdLength) {
              setValveLength(stdLength);
          }
      }
  }, [currentSize, autoValveLength]);

  const availableFluidIdentificationOptions = useMemo(() => (
      getFluidIdentificationOptions(fluidIdentificationStandard)
  ), [fluidIdentificationStandard]);

  const selectedFluidOption = useMemo(() => {
      return availableFluidIdentificationOptions.find(option => option.code === fluidIdentificationCode) || availableFluidIdentificationOptions[0] || DEFAULT_FLUID_OPTION;
  }, [availableFluidIdentificationOptions, fluidIdentificationCode]);

  const selectedFluidStandardOption = useMemo(() => (
      FLUID_IDENTIFICATION_STANDARD_OPTIONS.find(option => option.code === fluidIdentificationStandard) || FLUID_IDENTIFICATION_STANDARD_OPTIONS[0]
  ), [fluidIdentificationStandard]);

  const groupedFluidIdentificationOptions = useMemo(() => {
      const groups = new Map<string, typeof availableFluidIdentificationOptions>();
      availableFluidIdentificationOptions.forEach(option => {
          const key = option.category || 'Outros';
          const currentGroup = groups.get(key) || [];
          currentGroup.push(option);
          groups.set(key, currentGroup);
      });
      return Array.from(groups.entries()).map(([category, options]) => ({ category, options }));
  }, [availableFluidIdentificationOptions]);

  const selectedPipeMaterialOption = useMemo(() => {
      return PIPE_MATERIAL_STANDARD_OPTIONS.find(option => option.code === pipeMaterialStandard) || DEFAULT_PIPE_MATERIAL_OPTION;
  }, [pipeMaterialStandard]);

  const selectedPipeScheduleOption = useMemo(() => (
      getPipeScheduleOption(defaultPipeSchedule)
  ), [defaultPipeSchedule]);

  const activeScheduleReference = useMemo(() => (
      PIPE_SCHEDULE[currentSize] || PIPE_SCHEDULE["4"]
  ), [currentSize]);

  const activeScheduleWall = useMemo(() => (
      getPipeScheduleWall(activeScheduleReference, defaultPipeSchedule)
  ), [activeScheduleReference, defaultPipeSchedule]);

  const activeInternalDiameter = useMemo(() => (
      Math.max(0, activeScheduleReference.od - (activeScheduleWall * 2))
  ), [activeScheduleReference.od, activeScheduleWall]);

  const selectedElbowProfileOption = useMemo(() => {
      return ELBOW_PROFILE_OPTIONS.find(option => option.code === defaultElbowProfile) || DEFAULT_ELBOW_PROFILE_OPTION;
  }, [defaultElbowProfile]);

  const selectedFitting = useMemo(() => {
      return fittings.find(fit => fit.id === selectedFittingId) || null;
  }, [fittings, selectedFittingId]);

  const isSetupReady = weldGap > 0 && gasketThickness >= 0 && !!fittingStandard && !!gasketType && !!defaultWeldType && !!fluidIdentificationCode && !!pipeMaterialStandard && !!defaultPipeSchedule && !!defaultElbowProfile;
  const defaultWeldLabel = defaultWeldType === 'WELD_SHOP' ? 'Solda de Oficina' : 'Solda de Campo';
  const gasketTypeLabel = gasketType === 'NonMetallic'
      ? 'Não metálica'
      : gasketType === 'SemiMetallic'
          ? 'Semimetálica'
          : 'Metálica / RTJ';
  const pipeConstructionLabel = pipeConstructionType === 'COM_COSTURA'
      ? 'Com costura'
      : pipeConstructionType === 'SEM_COSTURA'
          ? 'Sem costura'
          : 'Com ou sem costura';
  const pipeFinishLabel = pipeFinishType === 'PRETO'
      ? 'Preto'
      : pipeFinishType === 'GALVANIZADO'
          ? 'Galvanizado'
          : 'Preto ou galvanizado';
  const pipeMaterialSummaryLabel = `${selectedPipeMaterialOption.label} • ${getPipeScheduleLabel(defaultPipeSchedule)} • ${pipeConstructionLabel} • ${pipeFinishLabel}`;
  const elbowConstructionLabel = selectedElbowProfileOption.construction === 'STANDARD_ELBOW'
      ? 'Cotovelo padrão'
      : 'Curva fabricada';
  const elbowProfileSummaryLabel = `${selectedElbowProfileOption.label} • ${elbowConstructionLabel}`;
  const selectedTeeStandardMeta = TEE_STANDARD_METADATA[fittingStandard] || TEE_STANDARD_METADATA['ANSI B16.9'];
  const selectedGasketMeta = GASKET_METADATA[gasketType];
  const selectedFlangeMeta = FLANGE_METADATA[defaultFlangeType];
  const fluidCategoryLabel = selectedFluidOption.category || 'Categoria não classificada';
  const flangeStandardLabel = 'ASME B16.5';
  const safeTeeCalculationStandard = selectedTeeStandardMeta.calculationValidation === 'VALIDATED' ? fittingStandard : 'ANSI B16.9';
  const isSelectedTeeStandardValidated = selectedTeeStandardMeta.calculationValidation === 'VALIDATED';
  const teeCalculationWarning = isSelectedTeeStandardValidated
      ? `Desconto automático do tê validado pela tabela ${selectedTeeStandardMeta.calculationBase}.`
      : `A norma ${selectedTeeStandardMeta.label} está disponível como referência informativa. O desconto automático continua travado na base segura ${selectedTeeStandardMeta.calculationBase}.`;
  const flangeCalculationWarning = `${selectedFlangeMeta.calculationNote} Tipo atual: ${selectedFlangeMeta.label}.`;
  const valveCalculationWarning = `${VALVE_CALCULATION_METADATA.calculationNote} ${VALVE_CALCULATION_METADATA.usage}`;

  const applyFluidColorToSegments = useCallback((color: string) => {
      setActiveColor(color);
      setSegments(prev => prev.map(seg => ({ ...seg, color })));
  }, []);

  const buildProjectSettings = useCallback((): ProjectSettings => ({
      weldGap,
      fittingStandard,
      defaultFlangeType,
      gasketType,
      gasketThickness,
      defaultWeldType,
      fluidIdentificationStandard,
      fluidIdentificationCode,
      fluidColor: selectedFluidOption.color,
      pipeMaterialStandard,
      pipeConstructionType,
      pipeFinishType,
      defaultPipeSchedule,
      defaultElbowProfile,
      connectionType,
  }), [weldGap, fittingStandard, defaultFlangeType, gasketType, gasketThickness, defaultWeldType, fluidIdentificationStandard, fluidIdentificationCode, selectedFluidOption.color, pipeMaterialStandard, pipeConstructionType, pipeFinishType, defaultPipeSchedule, defaultElbowProfile, connectionType]);

  const applyProjectSettings = useCallback((settings?: ProjectSettings) => {
      const nextFluidCode = settings?.fluidIdentificationCode || DEFAULT_FLUID_OPTION.code;
      const nextFluidColor = settings?.fluidColor || DEFAULT_FLUID_OPTION.color;
      const nextPipeMaterial = PIPE_MATERIAL_STANDARD_OPTIONS.find(option => option.code === settings?.pipeMaterialStandard) || DEFAULT_PIPE_MATERIAL_OPTION;
      setWeldGap(settings?.weldGap ?? 5);
      setFittingStandard(settings?.fittingStandard ?? 'ANSI B16.9');
      setDefaultFlangeType(settings?.defaultFlangeType ?? 'WN');
      setGasketType(settings?.gasketType ?? 'NonMetallic');
      setGasketThickness(settings?.gasketThickness ?? 3);
      setDefaultWeldType(settings?.defaultWeldType ?? 'WELD_SHOP');
      setFluidIdentificationStandard((settings?.fluidIdentificationStandard as FluidIdentificationStandardCode) ?? DEFAULT_FLUID_IDENTIFICATION_STANDARD);
      setFluidIdentificationCode(nextFluidCode);
      setActiveColor(nextFluidColor);
      setPipeMaterialStandard(nextPipeMaterial.code);
      setPipeConstructionType(settings?.pipeConstructionType ?? nextPipeMaterial.defaultConstruction);
      setPipeFinishType(settings?.pipeFinishType ?? nextPipeMaterial.defaultFinish);
      setDefaultPipeSchedule(settings?.defaultPipeSchedule ?? DEFAULT_PIPE_SCHEDULE_CODE);
      setDefaultElbowProfile(settings?.defaultElbowProfile ?? DEFAULT_ELBOW_PROFILE_OPTION.code);
      setConnectionType(settings?.connectionType ?? DEFAULT_PIPE_CONNECTION_TYPE);
  }, []);

  const handlePipeMaterialStandardChange = (code: PipeMaterialStandardCode) => {
      const option = PIPE_MATERIAL_STANDARD_OPTIONS.find(item => item.code === code) || DEFAULT_PIPE_MATERIAL_OPTION;
      setPipeMaterialStandard(option.code);
      setPipeConstructionType(option.defaultConstruction);
      setPipeFinishType(option.defaultFinish);
  };

  const getElbowProfileOption = useCallback((fit?: Pick<IsoFitting, 'type' | 'elbowProfile'> | null) => {
      if (fit?.elbowProfile) {
          return ELBOW_PROFILE_OPTIONS.find(option => option.code === fit.elbowProfile) || DEFAULT_ELBOW_PROFILE_OPTION;
      }
      if (fit?.type === 'ELBOW_SR') {
          return ELBOW_PROFILE_OPTIONS.find(option => option.code === 'SR_1D') || DEFAULT_ELBOW_PROFILE_OPTION;
      }
      return ELBOW_PROFILE_OPTIONS.find(option => option.code === 'LR_1_5D') || DEFAULT_ELBOW_PROFILE_OPTION;
  }, []);

  const getElbowRadiusFromSchedule = useCallback((size: number, profileCode: ElbowProfileCode) => {
      const sch = PIPE_SCHEDULE[size];
      if (!sch) return 0;
      const nominalDiameterMm = sch.longRadius90 / 1.5;
      const profile = ELBOW_PROFILE_OPTIONS.find(option => option.code === profileCode) || DEFAULT_ELBOW_PROFILE_OPTION;
      return nominalDiameterMm * profile.radiusFactor;
  }, []);

  const getFittingDisplayLabel = useCallback((fit: IsoFitting) => {
      if (fit.type === 'WELD_SHOP') return 'Solda de Oficina';
      if (fit.type === 'WELD_FIELD') return 'Solda de Campo';
      if (fit.type === 'ELBOW_LR' || fit.type === 'ELBOW_SR') {
          const profile = getElbowProfileOption(fit);
          const family = profile.construction === 'FABRICATED_BEND' ? 'Curva fabricada' : 'Cotovelo';
          return `${family} ${profile.label}`;
      }
      return getFittingLabel(fit.type);
  }, [getElbowProfileOption]);

  const updateSelectedFittingElbowProfile = (profileCode: ElbowProfileCode) => {
      if (!selectedFittingId) return;
      saveToHistory();
      setFittings(prev => prev.map(fit => {
          if (fit.id !== selectedFittingId) return fit;
          return {
              ...fit,
              elbowProfile: profileCode,
              type: profileCode === 'SR_1D' ? 'ELBOW_SR' : 'ELBOW_LR'
          };
      }));
  };

  const handleFluidIdentificationStandardChange = (standard: FluidIdentificationStandardCode) => {
      const nextOptions = getFluidIdentificationOptions(standard);
      const nextOption = nextOptions.find(item => item.code === fluidIdentificationCode) || nextOptions[0] || DEFAULT_FLUID_OPTION;
      setFluidIdentificationStandard(standard);
      setFluidIdentificationCode(nextOption.code);
      applyFluidColorToSegments(nextOption.color);
  };

  const handleFluidIdentificationChange = (code: FluidIdentificationCode) => {
      const option = availableFluidIdentificationOptions.find(item => item.code === code) || availableFluidIdentificationOptions[0] || DEFAULT_FLUID_OPTION;
      setFluidIdentificationCode(option.code);
      applyFluidColorToSegments(option.color);
  };

  const handleConfirmRequiredSetup = () => {
      applyFluidColorToSegments(selectedFluidOption.color);
      setShowMaterialList(false);
      setShowSetupModal(false);
  };

  const applyLoadedProject = (project: ProjectData) => {
      const loadedColor = project.settings?.fluidColor || DEFAULT_FLUID_OPTION.color;
      applyProjectSettings(project.settings);
      setSegments((project.segments || []).map(seg => ({ ...seg, color: loadedColor })));
      setFittings(project.fittings || []);
      setCurrentProjectId(project.id);
      setNewProjectName(project.name);
      setHistory({ past: [], future: [] });
      setSelectedSegmentId(null);
      setSelectedFittingId(null);
      setStartPoint(null);
      setShowProjectModal(false);
      setShowMaterialList(false);
      setShowSetupModal(!project.settings);
  };

  // DRAFT HYDRATION EFFECT
  useEffect(() => {
    try {
        const draftStr = localStorage.getItem('tubista_draft_session_v2');
        if (draftStr) {
            const draft = JSON.parse(draftStr);
            if (draft) {
                if (draft.currentProjectId) setCurrentProjectId(draft.currentProjectId);
                if (draft.newProjectName) setNewProjectName(draft.newProjectName);
                if (draft.segments && Array.isArray(draft.segments)) setSegments(draft.segments);
                if (draft.fittings && Array.isArray(draft.fittings)) setFittings(draft.fittings);
                if (draft.cursor) setCursor(draft.cursor);
                if (draft.startPoint) setStartPoint(draft.startPoint);
                if (draft.currentSize) setCurrentSize(draft.currentSize);
                if (draft.settings) {
                    applyProjectSettings(draft.settings);
                    setShowSetupModal(false);
                }
            }
        }
    } catch (e) {
        console.warn('Erro ao carregar rascunho de sessão:', e);
    }
    hasHydratedDraftRef.current = true;
  }, [applyProjectSettings]);

  // DRAFT AUTO-SAVE EFFECT
  useEffect(() => {
    if (!hasHydratedDraftRef.current) return;
    
    const draftData = {
        currentProjectId,
        newProjectName,
        segments,
        fittings,
        cursor,
        startPoint,
        currentSize,
        settings: buildProjectSettings(),
    };
    try {
        localStorage.setItem('tubista_draft_session_v2', JSON.stringify(draftData));
    } catch (e) {
        console.warn('Erro ao auto-salvar rascunho de sessão:', e);
    }
  }, [
      currentProjectId,
      newProjectName,
      segments,
      fittings,
      cursor,
      startPoint,
      currentSize,
      buildProjectSettings
  ]);

  const saveToHistory = useCallback(() => {
    setHistory(prev => ({ 
        past: [...prev.past, { segments: [...segments], fittings: [...fittings] }], 
        future: [] 
    }));
  }, [segments, fittings]);

  const handleUndo = () => {
    if (history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    setHistory(prev => ({ past: prev.past.slice(0, -1), future: [{ segments: [...segments], fittings: [...fittings] }, ...prev.future] }));
    setSegments(previous.segments);
    setFittings(previous.fittings);
    setSelectedSegmentId(previous.segments.length > 0 ? previous.segments[previous.segments.length - 1].id : null);
    setSelectedFittingId(null);
    setStartPoint(null); 
  };

  const handleRedo = () => {
    if (history.future.length === 0) return;
    const next = history.future[0];
    setHistory(prev => ({
        past: [...prev.past, { segments: [...segments], fittings: [...fittings] }],
        future: prev.future.slice(1)
    }));
    setSegments(next.segments);
    setFittings(next.fittings);
    setSelectedSegmentId(next.segments.length > 0 ? next.segments[next.segments.length - 1].id : null);
    setSelectedFittingId(null);
    setStartPoint(null);
  };

  const handleZoomIn = () => setScale(s => Math.min(s + 5, 100));
  const handleZoomOut = () => setScale(s => Math.max(s - 5, 20));

  const handleZoomToFit = () => {
      if (segments.length === 0) return;
      
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      const points = segments.flatMap(s => [s.start, s.end]);
      points.forEach(p => {
          const scr = projectIso(p.x, p.y, p.z, 1, 0, 0); // Project with scale 1, pan 0
          if (scr.x < minX) minX = scr.x;
          if (scr.x > maxX) maxX = scr.x;
          if (scr.y < minY) minY = scr.y;
          if (scr.y > maxY) maxY = scr.y;
      });

      const padding = 100;
      const width = maxX - minX;
      const height = maxY - minY;
      
      const scaleX = (window.innerWidth - padding * 2) / (width || 1);
      const scaleY = (window.innerHeight - padding * 2) / (height || 1);
      
      const newScale = Math.min(scaleX, scaleY, 100); // Max scale 100
      const clampedScale = Math.max(newScale, 10); // Min scale 10
      
      const centerX = minX + width / 2;
      const centerY = minY + height / 2;
      
      setScale(clampedScale);
      setPan({
          x: window.innerWidth / 2 - centerX * clampedScale,
          y: window.innerHeight / 2 - centerY * clampedScale
      });
  };

  const handleCenterView = () => {
    setPan({ x: 80, y: 100 });
    setScale(45); 
  };

  const handleShareImage = () => {
      if (svgRef.current) {
          shareAsImage(svgRef.current, newProjectName || "projeto-tubista");
          setShowExportMenu(false);
      }
  };

  const handleSharePDF = () => {
      if (svgRef.current) {
          shareAsPDF(svgRef.current, newProjectName || "projeto-tubista");
          setShowExportMenu(false);
      }
  };

  const handleDownloadBackup = (project: ProjectData) => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `${project.name}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  const handleClearCanvas = () => {
      if (window.confirm("Deseja realmente limpar todo o desenho atual?")) {
          saveToHistory();
          setSegments([]);
          setFittings([]);
          setStartPoint(null);
          setCurrentProjectId(null);
          setNewProjectName("");
          try {
              localStorage.removeItem('tubista_draft_session_v2');
          } catch (e) {
              console.warn(e);
          }
          setShowProjectModal(false);
      }
  };

  const handleSmartSaveToDisk = async () => {
      const project: ProjectData = {
          id: currentProjectId || generateId(),
          name: newProjectName || "Sem Título",
          updatedAt: Date.now(),
          segments: segments,
          fittings: fittings,
          settings: buildProjectSettings(),
      };

      saveProject(project);
      setSavedProjects(loadProjects());
      if (!currentProjectId) setCurrentProjectId(project.id);

      const jsonString = JSON.stringify(project, null, 2);

      try {
          if ('showSaveFilePicker' in window) {
              const handle = await (window as any).showSaveFilePicker({
                  suggestedName: `${project.name}.json`,
                  types: [{
                      description: 'Projeto Tubista (.json)',
                      accept: { 'application/json': ['.json'] },
                  }],
              });
              
              const writable = await handle.createWritable();
              await writable.write(jsonString);
              await writable.close();
              alert("✅ Salvo com sucesso! O arquivo foi atualizado no seu disco.");
          } else {
              handleDownloadBackup(project);
          }
      } catch (err) {
          console.log("Salvamento em disco cancelado pelo usuário.");
      }
  };

  const handleSmartOpenFromDisk = async () => {
    try {
        if ('showOpenFilePicker' in window) {
            const [fileHandle] = await (window as any).showOpenFilePicker({
                types: [{
                    description: 'Projeto Tubista (.json)',
                    accept: { 'application/json': ['.json'] },
                }],
                multiple: false
            });
            
            const file = await fileHandle.getFile();
            const text = await file.text();
            
            try {
                const parsedData = JSON.parse(text);
                
                if (Array.isArray(parsedData)) {
                    const result = importBatchProjects(parsedData);
                    setSavedProjects(result.total);
                    alert(`Importado: ${result.added} novos, ${result.updated} atualizados.`);
                } else if (parsedData.id && parsedData.segments) {
                    saveProject(parsedData);
                    setSavedProjects(loadProjects());
                    alert("Projeto importado com sucesso!");
                    applyLoadedProject(parsedData);
                } else {
                    alert("Formato de arquivo inválido.");
                }
            } catch (e) {
                alert("Erro ao ler o arquivo JSON.");
            }
        } else {
            handleImportClick();
        }
    } catch (err) {
        if ((err as any).name !== 'AbortError') {
            handleImportClick();
        }
    }
  };

  const handleImportClick = () => {
      if (fileInputRef.current) {
          fileInputRef.current.click();
      } else {
          const tempInput = document.createElement('input');
          tempInput.type = 'file';
          tempInput.accept = '.json,application/json';
          tempInput.style.display = 'none';
          tempInput.addEventListener('change', () => {
              const file = tempInput.files?.[0];
              if (file) {
                  importProjectFile(file);
              }
              tempInput.remove();
          }, { once: true });
          document.body.appendChild(tempInput);
          tempInput.click();
      }
  };

  const handleLoadProject = (e: React.MouseEvent, project: ProjectData) => {
    e.stopPropagation();
    if (segments.length > 0 && currentProjectId !== project.id) {
        if (!window.confirm("Abrir projeto substituirá o atual. Continuar?")) return;
    }
    
    // Set state immediately instead of using setTimeout which can cause race conditions
    // and prevent subsequent loads
    applyLoadedProject(project);
  };

  const handleGenerate3DFromImage = async (imageSrc: string) => {
      try {
          setIsGenerating3D(true);
          const newSegments = await generate3DFromImage(imageSrc);
          
          if (newSegments && newSegments.length > 0) {
              saveToHistory();
              setSegments(newSegments.map(seg => ({ ...seg, color: selectedFluidOption.color })));
              setShowPhotoFrame(false);
              alert("Modelo 3D gerado com sucesso!");
          } else {
              alert("Não foi possível identificar tubulações na imagem.");
          }
      } catch (error) {
          console.error(error);
          alert("Erro ao processar a imagem com IA. Verifique sua conexão e chave API.");
      } finally {
          setIsGenerating3D(false);
      }
  };

  const handleDeleteProject = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (window.confirm("Tem certeza que deseja excluir permanentemente este projeto?")) {
        const updatedList = deleteProject(id);
        setSavedProjects(updatedList);
        if (currentProjectId === id) {
            setCurrentProjectId(null);
            setNewProjectName("");
        }
    }
  };

  const handleTrigChange = (field: keyof typeof trigState, value: string) => {
     setTrigState(prev => ({ ...prev, [field]: value }));
     setTrigResultType([]);
  };

  const calculateTrig = () => {
      const a = parseFloat(trigState.sideA);
      const b = parseFloat(trigState.sideB);
      const c = parseFloat(trigState.sideC);
      const ang = parseFloat(trigState.angle);
      
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const toDeg = (rad: number) => (rad * 180) / Math.PI;

      let newA = a, newB = b, newC = c, newAng = ang;
      let calculatedFields: string[] = [];

      try {
        if (!isNaN(a) && !isNaN(b)) {
            newC = Math.sqrt(a*a + b*b);
            newAng = toDeg(Math.atan(a/b));
            calculatedFields = ['sideC', 'angle'];
        } else if (!isNaN(a) && !isNaN(c)) {
            if (a >= c) { alert("Cateto não pode ser maior que Hipotenusa"); return; }
            newB = Math.sqrt(c*c - a*a);
            newAng = toDeg(Math.asin(a/c));
            calculatedFields = ['sideB', 'angle'];
        } else if (!isNaN(b) && !isNaN(c)) {
            if (b >= c) { alert("Cateto não pode ser maior que Hipotenusa"); return; }
            newA = Math.sqrt(c*c - b*b);
            newAng = toDeg(Math.acos(b/c));
            calculatedFields = ['sideA', 'angle'];
        } else if (!isNaN(a) && !isNaN(ang)) {
            newC = a / Math.sin(toRad(ang));
            newB = a / Math.tan(toRad(ang));
            calculatedFields = ['sideC', 'sideB'];
        } else if (!isNaN(b) && !isNaN(ang)) {
            newC = b / Math.cos(toRad(ang));
            newA = b * Math.tan(toRad(ang));
            calculatedFields = ['sideC', 'sideA'];
        } else if (!isNaN(c) && !isNaN(ang)) {
            newA = c * Math.sin(toRad(ang));
            newB = c * Math.cos(toRad(ang));
            calculatedFields = ['sideA', 'sideB'];
        } else {
            alert("Preencha 2 campos para calcular.");
            return;
        }

        setTrigState({
            sideA: isNaN(newA) ? '' : newA.toFixed(1),
            sideB: isNaN(newB) ? '' : newB.toFixed(1),
            sideC: isNaN(newC) ? '' : newC.toFixed(1),
            angle: isNaN(newAng) ? '' : newAng.toFixed(1)
        });
        setTrigResultType(calculatedFields);

      } catch (e) {
          alert("Erro no cálculo.");
      }
  };

  const clearTrig = () => {
      setTrigState({ sideA: '', sideB: '', sideC: '', angle: '' });
      setTrigResultType([]);
  };

  const startFloatingPanelDrag = (panel: keyof typeof floatingPanelDragRef.current, clientX: number, clientY: number) => {
      floatingPanelDragRef.current[panel] = { startX: clientX, startY: clientY, moved: false };
  };

  const markFloatingPanelDragIfMoved = (panel: keyof typeof floatingPanelDragRef.current, clientX: number, clientY: number) => {
      const state = floatingPanelDragRef.current[panel];
      if (!state.moved) {
          const deltaX = clientX - state.startX;
          const deltaY = clientY - state.startY;
          if (Math.hypot(deltaX, deltaY) >= FLOATING_PANEL_DRAG_THRESHOLD) {
              state.moved = true;
          }
      }
  };

  const consumeFloatingPanelDrag = (panel: keyof typeof floatingPanelDragRef.current) => {
      const moved = floatingPanelDragRef.current[panel].moved;
      floatingPanelDragRef.current[panel].moved = false;
      return moved;
  };

  const syncDockPanelPosition = useCallback((panelId: keyof FloatingPanelPositions) => {
      if (organizeState !== 1) return;
      const refMap: Record<string, React.RefObject<HTMLButtonElement | HTMLDivElement | null>> = {
          smart: smartDockButtonRef,
          quickCuts: quickCutsDockButtonRef,
          symbology: symbologyDockButtonRef,
          material: materialDockButtonRef,
          trig: trigDockButtonRef,
          plate: { current: null }
      };
      
      const targetRef = refMap[panelId as string]?.current;
      if (!targetRef) return;
      const rect = targetRef.getBoundingClientRect();
      const nextX = rect.left;
      const nextY = rect.bottom + 6;
      
      updatePanelPos(panelId, nextX, nextY);
  }, [organizeState, updatePanelPos]);

  useEffect(() => {
      if (organizeState !== 1) return;
      const syncOpenDockPanels = () => {
          if (showSmartTool) syncDockPanelPosition('smart');
          if (showQuickCuts) syncDockPanelPosition('quickCuts');
          if (showSymbologyMenu) syncDockPanelPosition('symbology');
          if (showMaterialList) syncDockPanelPosition('material');
          if (showTrigTool) syncDockPanelPosition('trig');
      };
      syncOpenDockPanels();
      window.addEventListener('resize', syncOpenDockPanels);
      return () => window.removeEventListener('resize', syncOpenDockPanels);
  }, [organizeState, showSmartTool, showQuickCuts, showSymbologyMenu, showMaterialList, showTrigTool, syncDockPanelPosition]);

  // --- DRAG HANDLERS: COMMON LOGIC ---
  
  // TRIG TOOL
  const handleTrigDragStart = (e: React.PointerEvent) => {
      if (panelPositions.trig.locked) return;
      e.preventDefault();
      e.stopPropagation();
      startFloatingPanelDrag('trig', e.clientX, e.clientY);
      setIsTrigDragging(true);
      setTrigDragOffset({
          x: e.clientX - panelPositions.trig.x,
          y: e.clientY - panelPositions.trig.y
      });
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleTrigDragMove = (e: React.PointerEvent) => {
      if(!isTrigDragging || panelPositions.trig.locked) return;
      e.preventDefault();
      e.stopPropagation();
      markFloatingPanelDragIfMoved('trig', e.clientX, e.clientY);
      updatePanelPos('trig', e.clientX - trigDragOffset.x, e.clientY - trigDragOffset.y);
  };

  const handleTrigDragEnd = (e: React.PointerEvent) => {
      e.preventDefault();
      setIsTrigDragging(false);
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  // SMART TOOL (MAGIC WAND)
  const handleSmartToolDragStart = (e: React.PointerEvent) => {
      if (panelPositions.smart.locked) return;
      e.preventDefault();
      e.stopPropagation();
      startFloatingPanelDrag('smart', e.clientX, e.clientY);
      setIsSmartToolDragging(true);
      setSmartToolDragOffset({
          x: e.clientX - panelPositions.smart.x,
          y: e.clientY - panelPositions.smart.y
      });
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleSmartToolDragMove = (e: React.PointerEvent) => {
      if(!isSmartToolDragging || panelPositions.smart.locked) return;
      e.preventDefault();
      e.stopPropagation();
      markFloatingPanelDragIfMoved('smart', e.clientX, e.clientY);
      updatePanelPos('smart', e.clientX - smartToolDragOffset.x, e.clientY - smartToolDragOffset.y);
  };

  const handleSmartToolDragEnd = (e: React.PointerEvent) => {
      e.preventDefault();
      setIsSmartToolDragging(false);
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const toggleSmartTool = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isSmartToolDragging || consumeFloatingPanelDrag('smart')) return;
      setShowSmartTool(!showSmartTool);
  };

  // MATERIAL LIST (FLOATING TOGGLE)
  const handleMaterialListDragStart = (e: React.PointerEvent) => {
      if (panelPositions.material.locked) return;
      e.preventDefault();
      e.stopPropagation();
      startFloatingPanelDrag('material', e.clientX, e.clientY);
      setIsMaterialListDragging(true);
      setMaterialListDragOffset({
          x: e.clientX - panelPositions.material.x,
          y: e.clientY - panelPositions.material.y
      });
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleMaterialListDragMove = (e: React.PointerEvent) => {
      if (!isMaterialListDragging || panelPositions.material.locked) return;
      e.preventDefault();
      e.stopPropagation();
      markFloatingPanelDragIfMoved('material', e.clientX, e.clientY);
      updatePanelPos('material', e.clientX - materialListDragOffset.x, e.clientY - materialListDragOffset.y);
  };

  const handleMaterialListDragEnd = (e: React.PointerEvent) => {
      e.preventDefault();
      setIsMaterialListDragging(false);
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const toggleMaterialList = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isMaterialListDragging || consumeFloatingPanelDrag('material')) return;
      setShowMaterialList(!showMaterialList);
  };

  // SYMBOLOGY MENU
  const handleSymbologyDragStart = (e: React.PointerEvent) => {
      if (panelPositions.symbology.locked) return;
      e.preventDefault();
      e.stopPropagation();
      startFloatingPanelDrag('symbology', e.clientX, e.clientY);
      setIsSymbologyDragging(true);
      setSymbologyDragOffset({
          x: e.clientX - panelPositions.symbology.x,
          y: e.clientY - panelPositions.symbology.y
      });
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleSymbologyDragMove = (e: React.PointerEvent) => {
      if (!isSymbologyDragging || panelPositions.symbology.locked) return;
      e.preventDefault();
      e.stopPropagation();
      markFloatingPanelDragIfMoved('symbology', e.clientX, e.clientY);
      updatePanelPos('symbology', e.clientX - symbologyDragOffset.x, e.clientY - symbologyDragOffset.y);
  };

  const handleSymbologyDragEnd = (e: React.PointerEvent) => {
      e.preventDefault();
      setIsSymbologyDragging(false);
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const toggleSymbologyMenu = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isSymbologyDragging || consumeFloatingPanelDrag('symbology')) return;
      setShowSymbologyMenu(!showSymbologyMenu);
  };

  // QUICK CUTS LIST DRAG HANDLERS
  const handleQuickCutsDragStart = (e: React.PointerEvent) => {
      if (panelPositions.quickCuts.locked) return;
      e.preventDefault();
      e.stopPropagation();
      startFloatingPanelDrag('quickCuts', e.clientX, e.clientY);
      setIsQuickCutsDragging(true);
      setQuickCutsDragOffset({
          x: e.clientX - panelPositions.quickCuts.x,
          y: e.clientY - panelPositions.quickCuts.y
      });
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleQuickCutsDragMove = (e: React.PointerEvent) => {
      if (!isQuickCutsDragging || panelPositions.quickCuts.locked) return;
      e.preventDefault();
      e.stopPropagation();
      markFloatingPanelDragIfMoved('quickCuts', e.clientX, e.clientY);
      updatePanelPos('quickCuts', e.clientX - quickCutsDragOffset.x, e.clientY - quickCutsDragOffset.y);
  };

  const handleQuickCutsDragEnd = (e: React.PointerEvent) => {
      e.preventDefault();
      setIsQuickCutsDragging(false);
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const toggleQuickCuts = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isQuickCutsDragging || consumeFloatingPanelDrag('quickCuts')) return;
      setShowQuickCuts(!showQuickCuts);
  };

  // --- 3D PLATE SKETCH DRAG HANDLERS ---
  const handlePlateSketchDragStart = (e: React.PointerEvent) => {
      if (panelPositions.plate.locked) return;
      e.preventDefault();
      e.stopPropagation();
      startFloatingPanelDrag('plate', e.clientX, e.clientY);
      setIsPlateSketchDragging(true);
      setPlateSketchDragOffset({
          x: e.clientX - panelPositions.plate.x,
          y: e.clientY - panelPositions.plate.y
      });
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePlateSketchDragMove = (e: React.PointerEvent) => {
      if (!isPlateSketchDragging || panelPositions.plate.locked) return;
      e.preventDefault();
      e.stopPropagation();
      markFloatingPanelDragIfMoved('plate', e.clientX, e.clientY);
      updatePanelPos('plate', e.clientX - plateSketchDragOffset.x, e.clientY - plateSketchDragOffset.y);
  };

  const handlePlateSketchDragEnd = (e: React.PointerEvent) => {
      e.preventDefault();
      setIsPlateSketchDragging(false);
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const togglePlateSketch = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isPlateSketchDragging || consumeFloatingPanelDrag('plate')) return;
      setShowPlateSketch(!showPlateSketch);
  };

  const uniqueNodes = useMemo(() => {
    const map = new Map<string, Point3D>();
    segments.forEach(seg => {
        const startKey = `${seg.start.x.toFixed(3)},${seg.start.y.toFixed(3)},${seg.start.z.toFixed(3)}`;
        const endKey = `${seg.end.x.toFixed(3)},${seg.end.y.toFixed(3)},${seg.end.z.toFixed(3)}`;
        map.set(startKey, seg.start);
        map.set(endKey, seg.end);
    });
    return Array.from(map.values());
  }, [segments]);

  const isFittingTool = useMemo(() => {
     // Include ELBOW_CUSTOM in isFittingTool logic
     return TOOL_CATEGORIES.flatMap(c => c.tools).map(t => t.id).filter(id => id !== 'PIPE' && id !== 'PIPE_FLEX').includes(activeTool as any);
  }, [activeTool]);

  const snapToIsoAngle = (deg: number) => {
      const norm = (deg + 360) % 360;
      return Math.round(norm / 30) * 30;
  };

  const getAutoRotationForNode = (p: Point3D): number => {
      const connected = segments.filter(s => 
          (s.start.x === p.x && s.start.y === p.y && s.start.z === p.z) || 
          (s.end.x === p.x && s.end.y === p.y && s.end.z === p.z)
      );

      if (connected.length === 0) return 0;

      const getSegmentVector = (seg: PipeSegment) => {
          const otherP = (seg.start.x === p.x && seg.start.y === p.y && seg.start.z === p.z) ? seg.end : seg.start;
          const node2D = projectIso(p.x, p.y, p.z, 1, 0, 0);
          const other2D = projectIso(otherP.x, otherP.y, otherP.z, 1, 0, 0);
          return { x: other2D.x - node2D.x, y: other2D.y - node2D.y };
      };

      if (connected.length === 1) {
          const v = getSegmentVector(connected[0]);
          return snapToIsoAngle(Math.atan2(v.y, v.x) * 180 / Math.PI);
      }
      
      if (connected.length === 2) {
          const v1 = getSegmentVector(connected[0]);
          const v2 = getSegmentVector(connected[1]);
          
          const len1 = Math.sqrt(v1.x*v1.x + v1.y*v1.y);
          const len2 = Math.sqrt(v2.x*v2.x + v2.y*v2.y);
          const nv1 = { x: v1.x/len1, y: v1.y/len1 };
          const nv2 = { x: v2.x/len2, y: v2.y/len2 };

          const midX = nv1.x + nv2.x;
          const midY = nv1.y + nv2.y;
          
          let angle = 0;
          if (Math.abs(midX) < 0.001 && Math.abs(midY) < 0.001) {
              angle = Math.atan2(nv1.y, nv1.x) * 180 / Math.PI + 90;
          } else {
              angle = Math.atan2(midY, midX) * 180 / Math.PI;
          }
          return snapToIsoAngle(angle);
      }

      if (connected.length === 3) {
          // Find the two segments that are most collinear (the main run)
          // Collinear segments will have a dot product close to -1 (opposite directions)
          const vecs = connected.map(getSegmentVector);
          let minDot = Infinity;
          let branchIdx = 2;
          for (let i = 0; i < 3; i++) {
              for (let j = i + 1; j < 3; j++) {
                  const v1 = vecs[i];
                  const v2 = vecs[j];
                  const len1 = Math.sqrt(v1.x*v1.x + v1.y*v1.y);
                  const len2 = Math.sqrt(v2.x*v2.x + v2.y*v2.y);
                  const dot = (v1.x*v2.x + v1.y*v2.y) / (len1*len2);
                  if (dot < minDot) {
                      minDot = dot;
                      branchIdx = 3 - i - j; // The remaining index is the branch
                  }
              }
          }
          const branchVec = vecs[branchIdx];
          return snapToIsoAngle(Math.atan2(branchVec.y, branchVec.x) * 180 / Math.PI + 90);
      }

      const v = getSegmentVector(connected[0]);
      return snapToIsoAngle(Math.atan2(v.y, v.x) * 180 / Math.PI);
  };

  const determineHatchType = (start: Point3D, end: Point3D): HatchType => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dz = end.z - start.z;

    const isStraightX = dx !== 0 && dy === 0 && dz === 0;
    const isStraightY = dx === 0 && dy !== 0 && dz === 0;
    const isStraightZ = dx === 0 && dy === 0 && dz !== 0;

    if (isStraightX || isStraightY || isStraightZ) {
      return 'NONE'; 
    }

    if (dz !== 0 && (dx !== 0 || dy !== 0)) {
      return 'VERTICAL';
    }

    if (dz === 0 && dx !== 0 && dy !== 0) {
      return 'HORIZONTAL';
    }

    return 'NONE';
  };

  // --- NEW: LONG PRESS LOGIC IMPLEMENTATION ---
  const handleNodePointerDown = (p: Point3D, e: React.PointerEvent) => {
      // Prevent canvas drag
      e.stopPropagation();
      e.preventDefault();
      
      // Reset trigger flag
      isLongPressTriggeredRef.current = false;
      
      // Start timer
      longPressTimerRef.current = setTimeout(() => {
          setShowSymbologyMenu(true);
          isLongPressTriggeredRef.current = true;
          // Haptic feedback if supported
          if (navigator.vibrate) navigator.vibrate(50);
      }, 1000); // Changed to 1 Second as requested
  };

  const handleNodePointerUp = (p: Point3D, e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      
      // Clear timer
      if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
      }
      
      // If long press was NOT triggered, execute normal click
      if (!isLongPressTriggeredRef.current) {
          handleNodeClick(p);
      }
      
      // Reset flag
      isLongPressTriggeredRef.current = false;
  };
  
  const handleNodePointerLeave = (e: React.PointerEvent) => {
      // If user slides finger off the node, cancel timer
      if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
      }
  };

  const handleNodeClick = (p: Point3D) => {
    // Regular interaction logic
    if (activeTool === 'DIMENSION_WIDTH') {
        const text = prompt("Digite a medida da largura (ex: 300mm):");
        if (!text) return;
        saveToHistory();
        const rotation = getAutoRotationForNode(p);
        const newFitting: IsoFitting = {
            id: generateId(),
            position: p,
            type: activeTool as ComponentCategory,
            rotation: rotation,
            size: text, 
            color: activeColor
        };
        setFittings([...fittings, newFitting]);
        setActiveTool('PIPE'); 
        return;
    }

    // --- NEW: CUSTOM ELBOW LOGIC ---
    if (activeTool === 'ELBOW_CUSTOM') {
        const degInput = prompt("Grau da Curva? (ex: 45, 22.5, 11)", "45");
        if (degInput === null) return;
        
        const deg = parseFloat(degInput);
        if (isNaN(deg)) { alert("Grau inválido."); return; }

        const baseType = defaultElbowProfile === 'SR_1D' ? 'ELBOW_SR' : 'ELBOW_LR';
        const defaultColor = activeColor === '#cbd5e1' ? '#3b82f6' : activeColor;

        saveToHistory();
        const cleanFittings = fittings.filter(f => 
            !(Math.abs(f.position.x - p.x) < 0.01 && Math.abs(f.position.y - p.y) < 0.01 && Math.abs(f.position.z - p.z) < 0.01)
        );
        
        let rotation = getAutoRotationForNode(p);
        rotation = snapToIsoAngle(rotation - 90);

        const newFitting: IsoFitting = {
            id: generateId(),
            position: p,
            type: baseType,
            rotation: rotation,
            degree: deg, // Stores the custom degree for calculation
            elbowProfile: defaultElbowProfile,
            size: currentSize,
            color: defaultColor,
            flip: false 
        };
        setFittings([...cleanFittings, newFitting]);
        setShowSymbologyMenu(false);
        setActiveTool('PIPE');
        return;
    }

    if (isFittingTool) {
        saveToHistory();
        const cleanFittings = fittings.filter(f => 
            !(Math.abs(f.position.x - p.x) < 0.01 && Math.abs(f.position.y - p.y) < 0.01 && Math.abs(f.position.z - p.z) < 0.01)
        );
        
        let rotation = getAutoRotationForNode(p);
        
        if (activeTool.includes('ELBOW')) {
             rotation = snapToIsoAngle(rotation - 90);
        } else if (activeTool === 'TEE') {
             // For TEE, we want the branch to point perpendicular to the main run.
             // The getAutoRotationForNode logic for 2 connections returns the bisector angle.
             // We need to adjust this based on how the TEE component is drawn.
             // Assuming TEE is drawn with branch pointing UP (90 deg) or similar.
             // Let's try aligning it with the calculated angle directly or with a 180 shift.
             // If it's "wrong", it usually means it's rotated 90 or 180 degrees off.
             // Let's try removing the -90 offset first, as the bisector might be the correct direction for the branch.
             rotation = snapToIsoAngle(rotation + 270); 
        }

        const isTeeOrElbow = activeTool === 'TEE' || activeTool.includes('ELBOW');
        const defaultColor = (activeColor === '#cbd5e1' && isTeeOrElbow) ? '#3b82f6' : activeColor;

        const newFitting: IsoFitting = {
            id: generateId(),
            position: p,
            type: activeTool === 'ELBOW_LR'
                ? (defaultElbowProfile === 'SR_1D' ? 'ELBOW_SR' : 'ELBOW_LR')
                : activeTool as ComponentCategory,
            rotation: rotation,
            degree: (activeTool.includes('ELBOW')) ? activeElbowDegree : undefined,
            elbowProfile: activeTool.includes('ELBOW')
                ? (activeTool === 'ELBOW_SR' ? 'SR_1D' : defaultElbowProfile)
                : undefined,
            size: activeTool.includes('FLANGE') ? currentFlangeSize : currentSize,
            color: defaultColor,
            flip: false 
        };
        setFittings([...cleanFittings, newFitting]);
        setShowSymbologyMenu(false);
        setActiveTool('PIPE');
        return; 
    }

    setCursor(p);
    setStartPoint(p);
  };

  const handleBackgroundTap = (clientX: number, clientY: number) => {
    setSelectedSegmentId(null);
    setSelectedFittingId(null);
    setShowColorPicker(false);
    setShowExportMenu(false);
    setShowViewSettings(false);

    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    const z = cursor.z; 
    const A = (screenX - pan.x) / (scale * COS_30);
    const B = (screenY - pan.y + (z * scale)) / (scale * SIN_30);

    const rawX = (A + B) / 2;
    const rawY = (B - A) / 2;

    const newX = Math.round(rawX);
    const newY = Math.round(rawY);

    setCursor({ x: newX, y: newY, z: z });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 2) {
      // Start pinch
      const pointers = Array.from(activePointers.current.values());
      const dist = Math.sqrt(Math.pow(pointers[0].x - pointers[1].x, 2) + Math.pow(pointers[0].y - pointers[1].y, 2));
      initialPinchDistance.current = dist;
      initialScale.current = scale;
      setIsDragging(false); // Stop panning when pinching
    } else if (activePointers.current.size === 1) {
      setIsDragging(true);
      setLastPointerPos({ x: e.clientX, y: e.clientY });
      setDragStartPos({ x: e.clientX, y: e.clientY });
    }
    
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (activePointers.current.has(e.pointerId)) {
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (activePointers.current.size === 2 && initialPinchDistance.current !== null) {
      // Handle pinch zoom
      const pointers = Array.from(activePointers.current.values());
      const dist = Math.sqrt(Math.pow(pointers[0].x - pointers[1].x, 2) + Math.pow(pointers[0].y - pointers[1].y, 2));
      const zoomFactor = dist / initialPinchDistance.current;
      
      // Calculate new scale with limits
      const newScale = Math.min(Math.max(initialScale.current * zoomFactor, 10), 200);
      setScale(newScale);
    } else if (isDragging && activePointers.current.size === 1) {
      // Handle pan
      const dx = e.clientX - lastPointerPos.x;
      const dy = e.clientY - lastPointerPos.y;
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      setLastPointerPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);
    
    if (activePointers.current.size < 2) {
      initialPinchDistance.current = null;
    }

    if (activePointers.current.size === 0) {
      setIsDragging(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      
      // Only trigger tap if it was a single touch and didn't move much
      if (initialPinchDistance.current === null) {
        const dist = Math.sqrt(Math.pow(e.clientX - dragStartPos.x, 2) + Math.pow(e.clientY - dragStartPos.y, 2));
        if (dist < 5) {
          handleBackgroundTap(e.clientX, e.clientY);
        }
      }
    } else if (activePointers.current.size === 1) {
      // If one finger is left, resume panning from its current position
      const remainingPointer = Array.from(activePointers.current.values())[0];
      setLastPointerPos({ x: remainingPointer.x, y: remainingPointer.y });
      setIsDragging(true);
    }
  };

  const handleEditClick = (segId: string, currentLen: number, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingSegmentId(segId);
      setEditValue(currentLen.toString());
  };
  
  const handleSegmentClick = (e: React.MouseEvent, segId: string) => {
      e.stopPropagation();
      setSelectedSegmentId(prev => prev === segId ? null : segId);
      setSelectedFittingId(null);
  };

  const handleFittingClick = (e: React.MouseEvent, fitId: string) => {
      e.stopPropagation();
      setSelectedFittingId(prev => prev === fitId ? null : fitId);
      setSelectedSegmentId(null);
  };

  const handleColorChange = (newColor: string) => {
      setActiveColor(newColor);
      if (selectedSegmentId || selectedFittingId) {
          saveToHistory();
          if (selectedSegmentId) setSegments(prev => prev.map(s => s.id === selectedSegmentId ? { ...s, color: newColor } : s));
          if (selectedFittingId) setFittings(prev => prev.map(f => f.id === selectedFittingId ? { ...f, color: newColor } : f));
      }
      setShowColorPicker(false);
  };

  const rotateSelectedFitting = (delta: number) => {
      if (!selectedFittingId) return;
      saveToHistory();
      setFittings(prev => prev.map(f => {
          if (f.id === selectedFittingId) return { ...f, rotation: f.rotation + delta };
          return f;
      }));
  };

  const setFittingDirection = (dir: 'N' | 'S' | 'E' | 'W' | 'U' | 'D') => {
      if (!selectedFittingId) return;
      saveToHistory();
      
      let targetAngle = 0;
      
      switch (dir) {
          case 'N': targetAngle = 330; break; 
          case 'S': targetAngle = 150; break; 
          case 'E': targetAngle = 30; break;  
          case 'W': targetAngle = 210; break; 
          case 'U': targetAngle = 270; break; 
          case 'D': targetAngle = 90; break;  
      }
      
      const rotation = (targetAngle + 90) % 360;

      setFittings(prev => prev.map(f => {
          if (f.id === selectedFittingId) return { ...f, rotation: rotation };
          return f;
      }));
  };

  const flipSelectedFitting = () => {
      if (!selectedFittingId) return;
      saveToHistory();
      setFittings(prev => prev.map(f => {
          if (f.id === selectedFittingId) return { ...f, flip: !f.flip };
          return f;
      }));
  };

  const deleteSelection = () => {
      if (!selectedSegmentId && !selectedFittingId) return;
      saveToHistory();
      if (selectedSegmentId) {
          setHiddenDimensionIds(prev => prev.filter(id => id !== selectedSegmentId));
          setSegments(prev => prev.filter(s => s.id !== selectedSegmentId));
          setSelectedSegmentId(null);
      }
      if (selectedFittingId) {
          setFittings(prev => prev.filter(f => f.id !== selectedFittingId));
          setSelectedFittingId(null);
      }
  };

  const submitEditLength = () => {
      if (!editingSegmentId) return;
      const newLenMm = parseFloat(editValue);
      if (isNaN(newLenMm) || newLenMm <= 0) {
          alert("Medida inválida");
          return;
      }
      saveToHistory();
      setSegments(prev => {
          const targetIndex = prev.findIndex(s => s.id === editingSegmentId);
          if (targetIndex === -1) return prev;
          const targetSeg = prev[targetIndex];
          const dx = targetSeg.end.x - targetSeg.start.x;
          const dy = targetSeg.end.y - targetSeg.start.y;
          const dz = targetSeg.end.z - targetSeg.start.z;
          const currentGridLen = Math.sqrt(dx*dx + dy*dy + dz*dz);
          if (currentGridLen === 0) return prev;
          const newGridLen = newLenMm / GRID_SCALE;
          const dirX = dx / currentGridLen;
          const dirY = dy / currentGridLen;
          const dirZ = dz / currentGridLen;
          const newEndX = targetSeg.start.x + (dirX * newGridLen);
          const newEndY = targetSeg.start.y + (dirY * newGridLen);
          const newEndZ = targetSeg.start.z + (dirZ * newGridLen);
          const updatedTarget = {
              ...targetSeg,
              end: { x: newEndX, y: newEndY, z: newEndZ },
              customLength: newLenMm.toString()
          };
          const newSegments = [...prev];
          newSegments[targetIndex] = updatedTarget;
          return newSegments;
      });
      setEditingSegmentId(null);
      setEditValue("");
  };

  const handleSymbologySelect = (toolId: ComponentCategory | 'DIMENSION_WIDTH' | 'ELBOW_CUSTOM') => {
    setActiveTool(toolId);
    setShowSymbologyMenu(false); 
  };
  
  // --- NEW: GLOBAL SIZE UPDATE ---
  const handleGlobalSizeChange = (newSize: string) => {
      saveToHistory();
      handleSizeChange(newSize);
      // Update ALL existing segments
      setSegments(prev => prev.map(s => ({
          ...s,
          size: parseFloat(newSize)
      })));
      // Update ALL existing fittings
      setFittings(prev => prev.map(f => ({
          ...f,
          size: newSize
      })));
  };

  const renderHatchLines = (seg: PipeSegment) => {
    if (!seg.hatchType || seg.hatchType === 'NONE') return null;
    const sx = seg.start.x, sy = seg.start.y, sz = seg.start.z;
    const ex = seg.end.x, ey = seg.end.y, ez = seg.end.z;
    let cx = 0, cy = 0, cz = 0; 
    let leg1Len = 0;
    let leg2Len = 0;
    
    if (seg.hatchType === 'VERTICAL') {
        cx = ex; cy = ey; cz = sz;
        const dx = ex - sx;
        const dy = ey - sy;
        leg1Len = Math.round(Math.sqrt(dx*dx + dy*dy) * GRID_SCALE);
        leg2Len = Math.round(Math.abs(ez - sz) * GRID_SCALE);
    } else if (seg.hatchType === 'HORIZONTAL') {
        cx = ex; cy = sy; cz = sz;
        leg1Len = Math.round(Math.abs(ex - sx) * GRID_SCALE);
        leg2Len = Math.round(Math.abs(ey - sy) * GRID_SCALE);
    } else {
        return null; 
    }

    const s = projectIso(sx, sy, sz, scale, pan.x, pan.y);
    const e = projectIso(ex, ey, ez, scale, pan.x, pan.y);
    const c = projectIso(cx, cy, cz, scale, pan.x, pan.y);
    const isHorizontal = seg.hatchType === 'HORIZONTAL';
    const strokeColor = isHorizontal ? "#f97316" : "#ef4444";
    const fillColor = isHorizontal ? "url(#hatch-horizontal)" : "url(#hatch-vertical)";
    const legA = { x: s.x - c.x, y: s.y - c.y };
    const legB = { x: e.x - c.x, y: e.y - c.y };
    const legALength = Math.hypot(legA.x, legA.y) || 1;
    const legBLength = Math.hypot(legB.x, legB.y) || 1;
    const unitA = { x: legA.x / legALength, y: legA.y / legALength };
    const unitB = { x: legB.x / legBLength, y: legB.y / legBLength };
    const markerSize = isHorizontal ? 18 : 14;
    const markerP1 = { x: c.x + unitA.x * markerSize, y: c.y + unitA.y * markerSize };
    const markerP2 = { x: c.x + unitB.x * markerSize, y: c.y + unitB.y * markerSize };
    const markerCorner = { x: markerP1.x + unitB.x * markerSize, y: markerP1.y + unitB.y * markerSize };

    return (
        <g className="pointer-events-none">
            <path d={`M ${s.x} ${s.y} L ${c.x} ${c.y} L ${e.x} ${e.y} Z`} fill={fillColor} stroke={strokeColor} strokeWidth="1" strokeDasharray="4 3" strokeLinecap="butt" opacity="0.5" />
            <line x1={s.x} y1={s.y} x2={c.x} y2={c.y} stroke={strokeColor} strokeWidth="1.25" strokeDasharray="4 3" opacity="0.8" />
            <line x1={c.x} y1={c.y} x2={e.x} y2={e.y} stroke={strokeColor} strokeWidth="1.25" strokeDasharray="4 3" opacity="0.8" />
            <polyline
                points={`${markerP1.x},${markerP1.y} ${markerCorner.x},${markerCorner.y} ${markerP2.x},${markerP2.y}`}
                fill="none"
                stroke={strokeColor}
                strokeWidth="1.5"
                opacity="0.95"
            />
        </g>
    );
  };

  const renderHatchLabels = (seg: PipeSegment) => {
    if (!seg.hatchType || seg.hatchType === 'NONE') return null;
    const sx = seg.start.x, sy = seg.start.y, sz = seg.start.z;
    const ex = seg.end.x, ey = seg.end.y, ez = seg.end.z;
    let cx = 0, cy = 0, cz = 0; 
    let leg1Len = 0;
    let leg2Len = 0;
    
    if (seg.hatchType === 'VERTICAL') {
        cx = ex; cy = ey; cz = sz;
        const dx = ex - sx;
        const dy = ey - sy;
        leg1Len = Math.round(Math.sqrt(dx*dx + dy*dy) * GRID_SCALE);
        leg2Len = Math.round(Math.abs(ez - sz) * GRID_SCALE);
    } else if (seg.hatchType === 'HORIZONTAL') {
        cx = ex; cy = sy; cz = sz;
        leg1Len = Math.round(Math.abs(ex - sx) * GRID_SCALE);
        leg2Len = Math.round(Math.abs(ey - sy) * GRID_SCALE);
    } else {
        return null; 
    }

    const isHorizontal = seg.hatchType === 'HORIZONTAL';
    const s = projectIso(sx, sy, sz, scale, pan.x, pan.y);
    const e = projectIso(ex, ey, ez, scale, pan.x, pan.y);
    const c = projectIso(cx, cy, cz, scale, pan.x, pan.y);

    let otherAngle = "";
    if (seg.angleLabel) {
        const angVal = parseFloat(seg.angleLabel.replace('°', ''));
        if (!isNaN(angVal)) {
            otherAngle = `${(90 - angVal).toFixed(1).replace('.0', '')}°`;
        }
    }

    // Determine Label Color based on type
    const labelColor = isHorizontal ? "#f97316" : "#94a3b8";
    const buildLabelPoint = (from: { x: number; y: number }, to: { x: number; y: number }, offset: number, along: number = 0) => {
        const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.hypot(dx, dy) || 1;
        const normal = { x: -dy / length, y: dx / length };
        const tangent = { x: dx / length, y: dy / length };
        return {
            x: mid.x + normal.x * offset + tangent.x * along,
            y: mid.y + normal.y * offset + tangent.y * along
        };
    };
    const shortLegBoost = (leg1Len < 180 || leg2Len < 180) ? 8 : 0;
    const baseOffset = (isHorizontal ? 18 : 14) + shortLegBoost;
    const alongOffset = isHorizontal ? 8 : 5;
    const labelPoint1 = buildLabelPoint(c, s, baseOffset, alongOffset);
    const labelPoint2 = buildLabelPoint(c, e, -baseOffset, -alongOffset);
    const labelDistance = Math.hypot(labelPoint1.x - labelPoint2.x, labelPoint1.y - labelPoint2.y);
    const adjustedLabelPoint2 = labelDistance < 38
        ? buildLabelPoint(c, e, -(baseOffset + 16), -(alongOffset + 8))
        : labelPoint2;

    return (
        <g className="pointer-events-none">
            {leg1Len > 0 && (
                <g transform={`translate(${labelPoint1.x}, ${labelPoint1.y})`}>
                    <rect x="-18" y="-8" width="36" height="16" rx="3" fill="#0f172a" opacity="0.88" />
                    <text x="0" y="3" textAnchor="middle" fill={labelColor} fontSize="9" fontFamily="monospace">{leg1Len}</text>
                </g>
            )}
            {leg2Len > 0 && (
                <g transform={`translate(${adjustedLabelPoint2.x}, ${adjustedLabelPoint2.y})`}>
                    <rect x="-18" y="-8" width="36" height="16" rx="3" fill="#0f172a" opacity="0.88" />
                    <text x="0" y="3" textAnchor="middle" fill={labelColor} fontSize="9" fontFamily="monospace">{leg2Len}</text>
                </g>
            )}
            {seg.angleLabel && (
                <g transform={`translate(${s.x}, ${s.y})`}>
                    {/* Fixed Offset to avoid line overlap */}
                    <rect x="-14" y="-35" width="28" height="14" rx="2" fill="#0f172a" stroke="#fbbf24" strokeWidth="1" />
                    <text x="0" y="-25" textAnchor="middle" fill="#fbbf24" fontSize="9" fontWeight="bold">{seg.angleLabel}</text>
                </g>
            )}
            {otherAngle && (
                 <g transform={`translate(${e.x}, ${e.y})`}>
                    <rect x="-14" y="20" width="28" height="14" rx="2" fill="#0f172a" stroke="#fbbf24" strokeWidth="1" />
                    <text x="0" y="30" textAnchor="middle" fill="#fbbf24" fontSize="9" fontWeight="bold">{otherAngle}</text>
                </g>
            )}
        </g>
    );
  };

  const renderRightAngleIndicators = () => {
      const nodeMap = new Map<string, PipeSegment[]>();
      segments.forEach(seg => {
          const startKey = `${seg.start.x.toFixed(3)},${seg.start.y.toFixed(3)},${seg.start.z.toFixed(3)}`;
          const endKey = `${seg.end.x.toFixed(3)},${seg.end.y.toFixed(3)},${seg.end.z.toFixed(3)}`;
          if (!nodeMap.has(startKey)) nodeMap.set(startKey, []);
          if (!nodeMap.has(endKey)) nodeMap.set(endKey, []);
          nodeMap.get(startKey)!.push(seg);
          nodeMap.get(endKey)!.push(seg);
      });
      const indicators: React.ReactElement[] = [];
      nodeMap.forEach((connectedSegs, key) => {
          if (connectedSegs.length !== 2) return;
          const [s1, s2] = connectedSegs;
          const [nx, ny, nz] = key.split(',').map(Number);
          const p = { x: nx, y: ny, z: nz };
          const getVector = (seg: PipeSegment, node: Point3D) => {
              const other = (Math.abs(seg.start.x - node.x) < 0.01 && Math.abs(seg.start.y - node.y) < 0.01 && Math.abs(seg.start.z - node.z) < 0.01) ? seg.end : seg.start;
              const dx = other.x - node.x;
              const dy = other.y - node.y;
              const dz = other.z - node.z;
              const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
              return { x: dx/len, y: dy/len, z: dz/len };
          };
          const v1 = getVector(s1, p);
          const v2 = getVector(s2, p);
          const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
          if (Math.abs(dot) > 0.01) return;
          
          const SQUARE_SIZE = 40; 
          
          const scaleSize = SQUARE_SIZE / GRID_SCALE;
          const p1 = { x: p.x + v1.x * scaleSize, y: p.y + v1.y * scaleSize, z: p.z + v1.z * scaleSize };
          const p2 = { x: p.x + v2.x * scaleSize, y: p.y + v2.y * scaleSize, z: p.z + v2.z * scaleSize };
          const pCorner = { x: p.x + (v1.x + v2.x) * scaleSize, y: p.y + (v1.y + v2.y) * scaleSize, z: p.z + (v1.z + v2.z) * scaleSize };
          const pCenter = { x: p.x + (v1.x + v2.x) * scaleSize * 0.5, y: p.y + (v1.y + v2.y) * scaleSize * 0.5, z: p.z + (v1.z + v2.z) * scaleSize * 0.5 };
          const scrP1 = projectIso(p1.x, p1.y, p1.z, scale, pan.x, pan.y);
          const scrP2 = projectIso(p2.x, p2.y, p2.z, scale, pan.x, pan.y);
          const scrCorner = projectIso(pCorner.x, pCorner.y, pCorner.z, scale, pan.x, pan.y);
          const scrCenter = projectIso(pCenter.x, pCenter.y, pCenter.z, scale, pan.x, pan.y);
          indicators.push(
              <g key={`sq-${key}`} className="pointer-events-none">
                  <polyline points={`${scrP1.x},${scrP1.y} ${scrCorner.x},${scrCorner.y} ${scrP2.x},${scrP2.y}`} fill="none" stroke="#94a3b8" strokeWidth="1" />
                  <circle cx={scrCenter.x} cy={scrCenter.y} r={1.5} fill="#94a3b8" />
              </g>
          );
      });
      return indicators;
  };

  const cursorScreenPos = projectIso(cursor.x, cursor.y, cursor.z, scale, pan.x, pan.y);
  const startScreenPos = startPoint ? projectIso(startPoint.x, startPoint.y, startPoint.z, scale, pan.x, pan.y) : null;

  const getDirectionLabel = (seg: PipeSegment) => {
    const dx = seg.end.x - seg.start.x;
    const dy = seg.end.y - seg.start.y;
    const dz = seg.end.z - seg.start.z;
    
    // Calculate grid length for default label
    const distGrid = Math.sqrt(dx*dx + dy*dy + dz*dz);
    // Use custom length if available, otherwise calculated
    const lenMm = seg.customLength ? seg.customLength : Math.round(distGrid * GRID_SCALE).toString();
    
    let dirCode = "";
    const E = 0.001; // Tolerance for float comparison

    // 1. Vertical
    if (Math.abs(dx) < E && Math.abs(dy) < E) {
        if (dz > 0) dirCode = "BA"; // Z increases (Low to High)
        else if (dz < 0) dirCode = "AB"; // Z decreases (High to Low)
    } 
    // 2. Horizontal
    else if (Math.abs(dz) < E) {
        // Cardinals
        if (Math.abs(dy) < E) {
            // y is constant. Moving along x.
            if (dx > 0) dirCode = "OL"; // West to East (+X)
            else dirCode = "LO"; // East to West (-X)
        } else if (Math.abs(dx) < E) {
            // x is constant. Moving along y.
            if (dy > 0) dirCode = "NS"; // North to South (+Y)
            else dirCode = "SN"; // South to North (-Y)
        } else {
            // Horizontal Offset
            // Calculate angle relative to X axis
            const angleRad = Math.atan(Math.abs(dy) / Math.abs(dx));
            let degree = Math.round(angleRad * 180 / Math.PI);
            
            let quad = "";
            if (Math.abs(dx) >= Math.abs(dy)) {
                // Primary axis is X (Leste/Oeste)
                if (dx > 0 && dy < 0) quad = "LN"; // Leste-Norte
                else if (dx > 0 && dy > 0) quad = "LS"; // Leste-Sul
                else if (dx < 0 && dy < 0) quad = "ON"; // Oeste-Norte
                else if (dx < 0 && dy > 0) quad = "OS"; // Oeste-Sul
            } else {
                // Primary axis is Y (Norte/Sul)
                // Angle should be relative to Y axis for the label
                degree = Math.round((Math.PI/2 - angleRad) * 180 / Math.PI);
                if (dy < 0 && dx > 0) quad = "NL"; // Norte-Leste
                else if (dy < 0 && dx < 0) quad = "NO"; // Norte-Oeste
                else if (dy > 0 && dx > 0) quad = "SL"; // Sul-Leste
                else if (dy > 0 && dx < 0) quad = "SO"; // Sul-Oeste
            }
            
            if (quad) dirCode = `Desloc ${degree}° ${quad}`;
        }
    }
    // 3. Rolling Offset (implied if not pure vert/horiz) - Leaving generic for now

    return `${lenMm}mm${dirCode ? ` [${dirCode}]` : ''}`;
  };

  const renderValveSymbol = (seg: PipeSegment, midX: number, midY: number, angleDeg: number, isSelected: boolean) => {
      if (seg.type.startsWith('VALVE')) {
          const color = isSelected ? "#fbbf24" : (seg.color || "#cbd5e1");
          return (
              <g transform={`translate(${midX},${midY}) rotate(${angleDeg})`}>
                 <path d="M -6 -4 L 6 4 L 6 -4 L -6 4 Z" fill={color} stroke="black" strokeWidth="1" />
              </g>
          );
      }
      return null;
  };

  const getFittingLabel = (type: ComponentCategory) => {
      for (const cat of TOOL_CATEGORIES) {
          const tool = cat.tools.find(t => t.id === type);
          if (tool) return tool.label;
      }
      return type;
  };

  const getPipeConnections = (seg: PipeSegment) => {
      const startFit = fittings.find(f => Math.abs(f.position.x - seg.start.x) < 0.01 && Math.abs(f.position.y - seg.start.y) < 0.01 && Math.abs(f.position.z - seg.start.z) < 0.01);
      const endFit = fittings.find(f => Math.abs(f.position.x - seg.end.x) < 0.01 && Math.abs(f.position.y - seg.end.y) < 0.01 && Math.abs(f.position.z - seg.end.z) < 0.01);
      
      const sName = startFit ? getFittingDisplayLabel(startFit) : "Ponta";
      const eName = endFit ? getFittingDisplayLabel(endFit) : "Ponta";
      
      return `${sName} / ${eName} • ${selectedFluidOption.fluid} • ${defaultWeldLabel} • ${selectedPipeMaterialOption.label}`;
  };

  // --- NEW: AUTO ELBOW DETECTION LOGIC ---
  const calculateAutomaticElbowAngle = (node: Point3D, currentSeg: PipeSegment): number | null => {
      // Find the "other" segment connected to this node
      const otherSeg = segments.find(s => 
          s.id !== currentSeg.id &&
          (
              (Math.abs(s.start.x - node.x) < 0.01 && Math.abs(s.start.y - node.y) < 0.01 && Math.abs(s.start.z - node.z) < 0.01) ||
              (Math.abs(s.end.x - node.x) < 0.01 && Math.abs(s.end.y - node.y) < 0.01 && Math.abs(s.end.z - node.z) < 0.01)
          )
      );

      if (!otherSeg) return null; // No connection = Open end (Cap or Weld, but no elbow)

      // --- CRITICAL FIX: Check for explicit Angle Labels (e.g. "45°") ---
      // If the current segment OR the connected segment has a label, honor it.
      if (currentSeg.angleLabel) {
          const manualAngle = parseFloat(currentSeg.angleLabel.replace('°', ''));
          if (!isNaN(manualAngle)) return manualAngle;
      }
      if (otherSeg.angleLabel) {
          const manualAngle = parseFloat(otherSeg.angleLabel.replace('°', ''));
          if (!isNaN(manualAngle)) return manualAngle;
      }

      // Calculate vectors pointing AWAY from the node to find the angle between the pipes
      const getVectorAway = (seg: PipeSegment, n: Point3D) => {
          // If node is start, vector is end - start
          if (Math.abs(seg.start.x - n.x) < 0.01) {
              return { x: seg.end.x - seg.start.x, y: seg.end.y - seg.start.y, z: seg.end.z - seg.start.z };
          }
          // If node is end, vector is start - end
          return { x: seg.start.x - seg.end.x, y: seg.start.y - seg.end.y, z: seg.start.z - seg.end.z };
      };

      const v1 = getVectorAway(currentSeg, node);
      const v2 = getVectorAway(otherSeg, node);

      const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
      const mag1 = Math.sqrt(v1.x*v1.x + v1.y*v1.y + v1.z*v1.z);
      const mag2 = Math.sqrt(v2.x*v2.x + v2.y*v2.y + v2.z*v2.z);

      if (mag1 === 0 || mag2 === 0) return null;

      // Clamp value for acos stability
      const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
      const angleRad = Math.acos(cosTheta);
      const angleDeg = angleRad * (180 / Math.PI);

      // The angle between vectors is the "straight line deviation" if 180. 
      // If 180, pipes are straight, no elbow (0 degree turn).
      // If 90, pipes are perpendicular, 90 degree turn.
      // If 135 (obtuse), pipes turn 45 degrees.
      // Elbow Angle = 180 - AngleBetweenVectors
      
      const elbowAngle = Math.round(180 - angleDeg);
      
      // Filter out straight pipes (tolerance for floating point)
      if (elbowAngle < 1) return null;

      return elbowAngle;
  };

  const calculateCutLength = (seg: PipeSegment) => {
      let nominalLen = parseFloat(seg.customLength || "0");
      
      // Fallback: If no custom length, use geometry length
      if (nominalLen <= 0) {
          const dx = seg.end.x - seg.start.x;
          const dy = seg.end.y - seg.start.y;
          const dz = seg.end.z - seg.start.z;
          nominalLen = Math.round(Math.sqrt(dx*dx + dy*dy + dz*dz) * GRID_SCALE);
      }

      if (nominalLen <= 0) return { value: 0, details: "Medida não def." };
      
      let deduction = 0;
      let formulaSteps: string[] = [`${nominalLen}mm (Nominal)`];
      
      const startFit = fittings.find(f => Math.abs(f.position.x - seg.start.x) < 0.01 && Math.abs(f.position.y - seg.start.y) < 0.01 && Math.abs(f.position.z - seg.start.z) < 0.01);
      const endFit = fittings.find(f => Math.abs(f.position.x - seg.end.x) < 0.01 && Math.abs(f.position.y - seg.end.y) < 0.01 && Math.abs(f.position.z - seg.end.z) < 0.01);

      let extraGaps = 0;
      const isSocketOrThreaded = connectionType === 'SOCKET_WELD' || connectionType === 'THREADED';

      const processNode = (node: Point3D, fit: IsoFitting | undefined) => {
          const sch = PIPE_SCHEDULE[seg.size];
          if (!sch) return 0;

          // 1. Explicit Fitting (Priority)
          if (fit) {
              if (!isSocketOrThreaded) extraGaps++; // Gap only for BW
              
              const sizeStr = String(seg.size);
              
              // NEW: FORGED FITTINGS (Socket/Threaded) - ASME B16.11
              if (isSocketOrThreaded && ASME_B16_11_DIMENSIONS[sizeStr]) {
                  const forgedDim = ASME_B16_11_DIMENSIONS[sizeStr];
                  const labelSuffix = connectionType === 'SOCKET_WELD' ? 'SW' : 'THD';

                  if (fit.type === 'ELBOW_LR' || fit.type === 'ELBOW_SR') {
                      if (connectionType === 'SOCKET_WELD') {
                          const val = forgedDim.centerToBottom;
                          formulaSteps.push(`- ${val}mm (Cotovelo SW ASME B16.11 Centro-Fundo da Bolsa)`);
                          return val;
                      } else {
                          const val = forgedDim.centerToFace - forgedDim.threadEngagement;
                          formulaSteps.push(`- ${val}mm (Cotovelo THD ASME B16.11: Centro-Face ${forgedDim.centerToFace}mm - Engajamento ${forgedDim.threadEngagement}mm)`);
                          return val;
                      }
                  }
                  if (fit.type === 'TEE') {
                      if (connectionType === 'SOCKET_WELD') {
                          const val = forgedDim.centerToBottom;
                          formulaSteps.push(`- ${val}mm (Tê SW ASME B16.11 Centro-Fundo da Bolsa)`);
                          return val;
                      } else {
                          const val = forgedDim.centerToFace - forgedDim.threadEngagement;
                          formulaSteps.push(`- ${val}mm (Tê THD ASME B16.11: Centro-Face ${forgedDim.centerToFace}mm - Engajamento ${forgedDim.threadEngagement}mm)`);
                          return val;
                      }
                  }
              }

              // 2. BUTT WELD FITTINGS - ASME B16.9
              if (fit.type === 'ELBOW_LR' || fit.type === 'ELBOW_SR') {
                  const profile = getElbowProfileOption(fit);
                  const radius = getElbowRadiusFromSchedule(seg.size, profile.code);
                  const degree = fit.degree || 90;
                  const rads = (degree / 2) * (Math.PI / 180);
                  const val = Math.round(radius * Math.tan(rads));
                  formulaSteps.push(`- ${val}mm (${profile.construction === 'FABRICATED_BEND' ? 'Curva fabricada' : 'Cotovelo'} ${profile.shortLabel} ${degree}°)`);
                  return val;
              }
              if (fit.type === 'TEE') {
                  const sizeToCheck = fit.size || seg.size.toString();
                  const stdTable = TEE_CENTER_TO_FACE[safeTeeCalculationStandard] || TEE_CENTER_TO_FACE['ANSI B16.9'];
                  const val = stdTable[sizeToCheck] || sch.longRadius90; 
                  formulaSteps.push(
                      isSelectedTeeStandardValidated
                          ? `- ${val}mm (Tê ${safeTeeCalculationStandard})`
                          : `- ${val}mm (Tê ${safeTeeCalculationStandard} aplicado como base segura; ${fittingStandard} apenas informativo)`
                  );
                  return val;
              }

              // 3. FLANGES
              if (fit.type.startsWith('FLANGE')) {
                  const dims = FLANGE_DIMENSIONS[sizeStr];
                  if (dims) {
                      let type: FlangeType = defaultFlangeType; 
                      if (fit.type === 'FLANGE_WN') type = 'WN';
                      if (fit.type === 'FLANGE_SO') type = 'SO';
                      if (fit.type === 'FLANGE_BLIND') type = 'Blind';

                      // Inteligência: Se global é SW/THD, força o tipo de flange se compatível
                      if (isSocketOrThreaded) {
                          if (connectionType === 'SOCKET_WELD') type = 'SW';
                          if (connectionType === 'THREADED') type = 'Threaded';
                      }

                      const val = dims[type];
                      if (!isSocketOrThreaded) extraGaps--; // Remove general weld gap from BW if flange handles its own logic
                      
                      const totalDed = val + (isSocketOrThreaded ? 0 : gasketThickness);
                      const gasketString = isSocketOrThreaded ? "" : ` - ${gasketThickness}mm (Junta)`;
                      formulaSteps.push(`- ${val}mm (Flange ${type} base ${selectedFlangeMeta.calculationBase})${gasketString}`);
                      return totalDed;
                  }
              }
              return 0;
          }

          // 4. Automatic Geometry Check (Secondary)
          const autoAngle = calculateAutomaticElbowAngle(node, seg);
          if (autoAngle && autoAngle > 1) {
              if (!isSocketOrThreaded) extraGaps++; 
              const radius = getElbowRadiusFromSchedule(seg.size, defaultElbowProfile);
              const rads = (autoAngle / 2) * (Math.PI / 180);
              const val = Math.round(radius * Math.tan(rads));
              formulaSteps.push(`- ${val}mm (Curva Auto ${selectedElbowProfileOption.shortLabel} ${autoAngle}°)`);
              return val;
          }
          return 0;
      };

      deduction += processNode(seg.start, startFit);
      deduction += processNode(seg.end, endFit);

      // Apply Gaps
      if (extraGaps > 0) {
          const gapDed = extraGaps * weldGap;
          deduction += gapDed;
          formulaSteps.push(`- ${gapDed}mm (Gap ${extraGaps}x)`);
      }

      const finalVal = nominalLen - deduction;
      const formulaString = `${formulaSteps.join(' ')} = ${parseFloat(finalVal.toFixed(1))}mm`;

      return { value: parseFloat(finalVal.toFixed(1)), details: formulaString };
  };

  const renderFittingSymbol = (fit: IsoFitting, isSelected: boolean, key: string) => {
    const p = projectIso(fit.position.x, fit.position.y, fit.position.z, scale, pan.x, pan.y);
    const color = isSelected ? "#fbbf24" : (fit.color || "#cbd5e1");
    const rotation = fit.rotation || 0;
    
    // Transform string for SVG
    const transform = `translate(${p.x},${p.y}) rotate(${rotation}) ${fit.flip ? 'scale(1, -1)' : ''}`;
    const strokeProps = { stroke: color, strokeWidth: 2, fill: "none" };

    // Note: 'key' prop is added here to satisfy React list requirements when returned directly from map
    const commonProps = { transform, pointerEvents: "none" as const };
    const pointProps = { transform: `translate(${p.x},${p.y})`, pointerEvents: "none" as const };

    switch (fit.type) {
        case 'TEE':
            return (
                <g key={key}>
                    <g {...commonProps}>
                        <line x1="-12" y1="0" x2="12" y2="0" {...strokeProps} />
                        <line x1="0" y1="0" x2="0" y2="-14" {...strokeProps} />
                    </g>
                    <g {...pointProps}>
                        <text x="0" y="-15" textAnchor="middle" fill={color} fontSize="12" fontWeight="black" style={{ textShadow: '1px 1px 2px black' }}>T</text>
                    </g>
                </g>
            );
        case 'ELBOW_LR':
        case 'ELBOW_SR':
        case 'ELBOW_CUSTOM': {
            const label = getElbowProfileOption(fit).shortLabel;
            return (
                <g key={key} {...pointProps}>
                    <text x="0" y="-10" textAnchor="middle" fill={color} fontSize="10" fontWeight="bold" style={{ textShadow: '1px 1px 2px black' }}>{label}</text>
                </g>
            );
        }
        case 'REDUCER_CON':
            return (
                <g key={key} {...commonProps}>
                     <polygon points="-6,-8 6,0 -6,8" fill={color} opacity="0.3" stroke={color} strokeWidth="1.5" />
                </g>
            );
        case 'REDUCER_ECC':
            return (
                <g key={key} {...commonProps}>
                     <polygon points="-6,-8 6,0 -6,8" fill={color} opacity="0.3" stroke={color} strokeWidth="1.5" />
                     <line x1="-6" y1="8" x2="6" y2="0" stroke={color} strokeWidth="2" />
                </g>
            );
        case 'CAP':
             return (
                <g key={key} {...commonProps}>
                     <line x1="-5" y1="-6" x2="-5" y2="6" stroke={color} strokeWidth="2" />
                     <path d="M -5 -6 C 5 -6 5 6 -5 6" {...strokeProps} />
                </g>
             );
        case 'FLANGE_WN':
            return (
                <g key={key} {...commonProps}>
                    <line x1="0" y1="-8" x2="0" y2="8" stroke={color} strokeWidth="3" />
                    <rect x="-4" y="-3" width="4" height="6" fill={color} />
                </g>
            );
        case 'FLANGE_SO':
        case 'FLANGE_FLAT':
            return (
                <g key={key} {...commonProps}>
                    <line x1="0" y1="-8" x2="0" y2="8" stroke={color} strokeWidth="2" />
                    <line x1="-3" y1="-8" x2="-3" y2="8" stroke={color} strokeWidth="2" />
                </g>
            );
        case 'FLANGE_BLIND':
            return (
                 <g key={key} {...commonProps}>
                    <line x1="0" y1="-8" x2="0" y2="8" stroke={color} strokeWidth="2" />
                    <circle cx="3" cy="0" r="2.5" fill={color} />
                </g>
            );
        case 'WELD_SHOP':
            return (
                <g key={key} {...pointProps}>
                    <circle r="3" fill="black" stroke={color} strokeWidth="1.5" />
                </g>
            );
        case 'WELD_FIELD':
             return (
                <g key={key} {...pointProps}>
                    <line x1="-4" y1="-4" x2="4" y2="4" stroke={color} strokeWidth="2" />
                    <line x1="-4" y1="4" x2="4" y2="-4" stroke={color} strokeWidth="2" />
                </g>
            );
        case 'DIMENSION_WIDTH':
            return (
                <g key={key} {...pointProps}>
                    <rect x="-16" y="-22" width="32" height="14" rx="2" fill="#0f172a" stroke={color} strokeWidth="1" />
                    <text y="-12" textAnchor="middle" fill={color} fontSize="9" fontWeight="bold">{fit.size}</text>
                    <line x1="-12" y1="0" x2="12" y2="0" stroke={color} strokeWidth="1.5" />
                    <line x1="-12" y1="-3" x2="-12" y2="3" stroke={color} strokeWidth="1.5" />
                    <line x1="12" y1="-3" x2="12" y2="3" stroke={color} strokeWidth="1.5" />
                </g>
            );
        default:
            return null;
    }
  };

  const handleOpenProjects = () => {
      setSavedProjects(loadProjects());
      setShowProjectModal(true);
  };

  const importProjectFile = (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const text = e.target?.result as string;
              const json = JSON.parse(text);
              if (Array.isArray(json)) {
                  const res = importBatchProjects(json);
                  setSavedProjects(res.total);
                  alert(`Importado com sucesso!`);
              } else if (json.id) {
                  saveProject(json);
                  setSavedProjects(loadProjects());
                  alert("Projeto importado!");
                  if (confirm("Deseja abrir o projeto agora?")) {
                      applyLoadedProject(json);
                  }
              }
          } catch (err) {
              console.error(err);
              alert("Erro ao ler arquivo.");
          }
      };
      reader.readAsText(file);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      importProjectFile(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const moveCursor = (axis: 'x' | 'y' | 'z', dir: 1 | -1) => {
      setCursor(prev => ({ ...prev, [axis]: prev[axis] + dir }));
  };

  const handlePointConfirm = () => {
      if (isFittingTool) {
          handleNodeClick(cursor);
          return;
      }
      if (!startPoint) {
          setStartPoint(cursor);
      } else {
          if (startPoint.x === cursor.x && startPoint.y === cursor.y && startPoint.z === cursor.z) return;
          
          const newSeg: PipeSegment = {
              id: generateId(),
              start: startPoint,
              end: cursor,
              type: activeTool as ComponentCategory,
              size: parseFloat(currentSize) || 4,
              color: selectedFluidOption.color,
              hatchType: determineHatchType(startPoint, cursor), 
          };
          saveToHistory();
          setSegments(prev => [...prev, newSeg]);
          setStartPoint(cursor);
      }
  };

  const applyVerticalOffset = (vert: 'UP' | 'DOWN', card: 'N' | 'S' | 'E' | 'W') => {
      if (!startPoint) { alert("Defina um ponto inicial primeiro (Use o 'X' para confirmar)"); return; }
      
      const len = (smartLength || 1000) / GRID_SCALE;
      const angRad = (parseFloat(smartAngle) || 45) * Math.PI / 180;
      
      const dV = len * Math.sin(angRad); 
      const dH = len * Math.cos(angRad); 
      
      const newP = { ...startPoint };
      
      newP.z += (vert === 'UP' ? dV : -dV);
      
      if (card === 'N') newP.y -= dH;
      if (card === 'S') newP.y += dH;
      if (card === 'E') newP.x += dH;
      if (card === 'W') newP.x -= dH;
      
      setCursor(newP);
      
      const newSeg: PipeSegment = {
          id: generateId(),
          start: startPoint,
          end: newP,
          type: activeTool as ComponentCategory,
          size: parseFloat(currentSize) || 4,
          color: selectedFluidOption.color,
          customLength: smartLength.toString(),
          angleLabel: `${smartAngle}°`,
          hatchType: determineHatchType(startPoint, newP), 
      };
      saveToHistory();
      setSegments(prev => [...prev, newSeg]);
      setStartPoint(newP);
  };

  const applyHorizontalOffset = (quad: 'NE' | 'NW' | 'SE' | 'SW') => {
      if (!startPoint) { alert("Defina um ponto inicial primeiro (Use o 'X' para confirmar)"); return; }

      const len = (smartLength || 1000) / GRID_SCALE;
      const angRad = (parseFloat(smartAngle) || 45) * Math.PI / 180;
      
      // Determine primary axis based on the last segment connected to startPoint
      let primaryAxis: 'X' | 'Y' = 'X'; // Default to East/West
      if (segments.length > 0) {
          const prevSeg = segments.find(s => 
              Math.abs(s.end.x - startPoint.x) < 0.001 && 
              Math.abs(s.end.y - startPoint.y) < 0.001 && 
              Math.abs(s.end.z - startPoint.z) < 0.001
          );
          if (prevSeg) {
              const prevDx = Math.abs(prevSeg.end.x - prevSeg.start.x);
              const prevDy = Math.abs(prevSeg.end.y - prevSeg.start.y);
              if (prevDy > prevDx) {
                  primaryAxis = 'Y';
              }
          }
      }

      let dX = 0, dY = 0;
      if (primaryAxis === 'Y') {
          // Angle is relative to Y axis (North/South)
          dY = len * Math.cos(angRad);
          dX = len * Math.sin(angRad);
      } else {
          // Angle is relative to X axis (East/West)
          dX = len * Math.cos(angRad);
          dY = len * Math.sin(angRad);
      }
      
      const newP = { ...startPoint };
      
      switch(quad) {
          case 'NE': newP.x += dX; newP.y -= dY; break; 
          case 'NW': newP.x -= dX; newP.y -= dY; break; 
          case 'SE': newP.x += dX; newP.y += dY; break; 
          case 'SW': newP.x -= dX; newP.y += dY; break; 
      }
      
      setCursor(newP);
      
       const newSeg: PipeSegment = {
          id: generateId(),
          start: startPoint,
          end: newP,
          type: activeTool as ComponentCategory,
          size: parseFloat(currentSize) || 4,
          color: selectedFluidOption.color,
          customLength: smartLength.toString(),
          angleLabel: `${smartAngle}°`,
          hatchType: determineHatchType(startPoint, newP),
      };
      saveToHistory();
      setSegments(prev => [...prev, newSeg]);
      setStartPoint(newP);
  };

  const toggleDimensionVisibility = (segmentId: string) => {
    setHiddenDimensionIds(prev => 
      prev.includes(segmentId) ? prev.filter(id => id !== segmentId) : [...prev, segmentId]
    );
  };

  const isDockMode = organizeState === 1;

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none font-sans">
        {showSetupModal && (
            <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
                <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-zinc-700 bg-zinc-950 shadow-2xl">
                    <div className="shrink-0 border-b border-zinc-800 bg-zinc-900/80 p-6 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400">
                                <Lock size={22} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white">Parametrização do croqui</h2>
                                <p className="text-sm text-zinc-400">Defina os parâmetros da lista de material e a cor global da tubulação.</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowSetupModal(false)}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-850 rounded-xl transition-colors"
                            title="Fechar"
                        >
                            <X size={22} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
                    <div className="space-y-5">
                        {/* NOVO: INSIGHTS TUBISTA MASTER */}
                        <div className="overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/5 transition-all">
                            <button 
                                onClick={() => setShowInsights(!showInsights)}
                                className="flex w-full items-center justify-between p-4 hover:bg-amber-500/10"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-black">
                                        <Wand2 size={16} />
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-widest text-amber-500">Tubista Master: Insights de Campo</span>
                                </div>
                                <div className="text-amber-500">
                                    {showInsights ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </div>
                            </button>
                            
                            {showInsights && (
                                <div className="border-t border-amber-500/20 p-4 pt-2">
                                    <div className="space-y-4 text-[10px] leading-relaxed text-amber-100/80">
                                        <div>
                                            <p className="font-bold text-amber-400 uppercase mb-1">📐 Por que o método muda?</p>
                                            <p>Em bitolas menores (≤ 2"), o padrão é **Encaixe (Socket Weld)** pois conexões forjadas são mais práticas em tubos finos. Em bitolas maiores, usamos **Topo (Butt Weld)**, que permite inspeção por Raio-X e Ultrassom.</p>
                                        </div>
                                        <div>
                                            <p className="font-bold text-amber-400 uppercase mb-1">🛠️ O Segredo do Desconto (Ex: Spool de 1/2")</p>
                                            <p>Se seu projeto indica **1000mm Eixo-a-Eixo** com dois joelhos de 1/2" SW: o corte real será **943mm**. O sistema desconta **28.5mm** de cada ponta (ASME B16.11) e remove o gap de solda automaticamente.</p>
                                        </div>
                                        <div className="rounded-lg bg-amber-500/10 p-2 border border-amber-500/20">
                                            <p className="text-amber-300 italic">"Lembre-se: Conexões Forjadas são blocos maciços. O tubo entra dentro da peça até o ombro interno."</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* NOVO: SELEÇÃO DE BITOLA INICIAL */}
                        <div className="rounded-2xl border-2 border-orange-500/30 bg-orange-500/5 p-4 mb-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-orange-500 rounded-lg text-black">
                                    <Ruler size={20} />
                                </div>
                                <div>
                                    <label className="text-xs font-black uppercase tracking-wider text-orange-400">Diâmetro Nominal Principal (NPS)</label>
                                    <p className="text-[10px] text-zinc-500">Com qual bitola de tubulação você vai iniciar o projeto?</p>
                                </div>
                            </div>
                            <select 
                                className="w-full rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-3 text-xl font-black text-white outline-none focus:border-orange-500" 
                                value={currentSize} 
                                onChange={(e) => handleSizeChange(e.target.value)}
                            >
                                {AVAILABLE_SIZES.map(size => (
                                    <option key={size} value={size}>{formatPipeSize(size)}</option>
                                ))}
                            </select>

                            <div className="mt-4 pt-4 border-t border-orange-500/10">
                                <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Método de União (Automático por Bitola)</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {PIPE_CONNECTION_TYPE_OPTIONS.map(opt => (
                                        <button
                                            key={opt.code}
                                            onClick={() => setConnectionType(opt.code)}
                                            className={`rounded-lg border p-2 text-center transition-all ${connectionType === opt.code ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700'}`}
                                        >
                                            <div className="text-[10px] font-bold">{opt.label}</div>
                                        </button>
                                    ))}
                                </div>
                                <p className="mt-2 text-[10px] text-zinc-400 italic text-center">
                                    {PIPE_CONNECTION_TYPE_OPTIONS.find(o => o.code === connectionType)?.desc}
                                </p>
                            </div>

                            {/* MINI CARTÃO TÉCNICO DE DESCONTO */}
                            <div className="mt-4 flex items-center justify-between rounded-xl bg-black/40 border-2 border-cyan-500/10 p-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-cyan-500/20 rounded-lg text-cyan-400">
                                        <Calculator size={16} />
                                    </div>
                                    <div>
                                        <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Regra de Desconto p/ Tê e Elbow</div>
                                        <div className="text-[10px] font-bold text-white">
                                            {connectionType === 'BUTT_WELD' ? 'ASME B16.9 (Raio 1.5D)' : 'ASME B16.11 (Socket/Forged)'}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <button 
                                        onClick={() => setShowFittingDiagram(!showFittingDiagram)}
                                        className="group flex flex-col items-end"
                                    >
                                        <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500 group-hover:text-cyan-400 transition-colors">
                                            Desconto Unitário
                                            <Info size={10} />
                                        </div>
                                        <div className="text-xl font-black text-cyan-400 group-hover:scale-105 transition-transform">
                                            {(() => {
                                                if (connectionType === 'BUTT_WELD') {
                                                    return PIPE_SCHEDULE[currentSize]?.longRadius90 || 0;
                                                } else if (connectionType === 'SOCKET_WELD') {
                                                    return ASME_B16_11_DIMENSIONS[currentSize]?.centerToBottom || 0;
                                                } else {
                                                    const dim = ASME_B16_11_DIMENSIONS[currentSize];
                                                    return dim ? (dim.centerToFace - dim.threadEngagement) : 0;
                                                }
                                            })()} mm
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* DIAGRAMA TÉCNICO (SVG) - RASCUNHO DIDÁTICO */}
                            {(showFittingDiagram || isDiagramZoomed) && (
                                <div className={isDiagramZoomed 
                                    ? "fixed inset-0 z-[250] flex flex-col items-center justify-center bg-black p-6 backdrop-blur-xl animate-in zoom-in"
                                    : "mt-2 overflow-hidden rounded-xl bg-zinc-900 border border-cyan-500/20 p-4 animate-in fade-in slide-in-from-top-2"
                                }>
                                    <div className="mb-4 flex items-center justify-between w-full border-b border-zinc-800 pb-3">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Selecione a Peça:</div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setDiagramType('TEE'); }}
                                                className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all border ${diagramType === 'TEE' ? 'bg-cyan-500 text-black border-cyan-400 shadow-lg shadow-cyan-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'}`}
                                            >
                                                Ver Tê
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setDiagramType('ELBOW'); }}
                                                className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all border ${diagramType === 'ELBOW' ? 'bg-cyan-500 text-black border-cyan-400 shadow-lg shadow-cyan-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'}`}
                                            >
                                                Ver Joelho
                                            </button>
                                        </div>
                                    </div>

                                    {isDiagramZoomed && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setIsDiagramZoomed(false); }}
                                            className="absolute top-6 right-6 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-white shadow-xl border border-zinc-700"
                                        >
                                            <X size={24} />
                                        </button>
                                    )}
                                    <div className={isDiagramZoomed ? "flex flex-col items-center gap-10 w-full" : "flex flex-col md:flex-row items-center gap-6"}>
                                        <div 
                                            onClick={() => !isDiagramZoomed && setIsDiagramZoomed(true)}
                                            className={`shrink-0 bg-black/40 p-2 rounded-lg border border-zinc-800 transition-all ${!isDiagramZoomed ? 'cursor-zoom-in hover:border-cyan-500/50' : 'scale-110 md:scale-125'}`}
                                        >
                                            <svg viewBox="0 0 160 160" width={isDiagramZoomed ? "320" : "120"} height={isDiagramZoomed ? "320" : "120"} className="text-cyan-500/80">
                                                {/* Eixos de Referência */}
                                                <line x1="10" y1="80" x2="150" y2="80" stroke="currentColor" strokeDasharray="4 2" strokeWidth="0.5" opacity="0.3" />
                                                <line x1="80" y1="10" x2="80" y2="150" stroke="currentColor" strokeDasharray="4 2" strokeWidth="0.5" opacity="0.3" />
                                                
                                                {/* Ponto de Centro (Onde a trena começa) */}
                                                <circle cx="80" cy="80" r="3" fill="#f59e0b" />
                                                <text x="85" y="75" fill="#f59e0b" fontSize="8" fontWeight="black">CENTRO (EIXO)</text>

                                                {diagramType === 'TEE' ? (
                                                    <g>
                                                        {connectionType === 'BUTT_WELD' ? (
                                                            <g>
                                                                <path d="M 40 80 L 120 80 M 80 80 L 80 40" stroke="currentColor" strokeWidth="20" strokeLinecap="butt" />
                                                                <line x1="80" y1="110" x2="120" y2="110" stroke="#22d3ee" strokeWidth="1.5" />
                                                                <path d="M 80 105 L 80 115 M 120 105 L 120 115" stroke="#22d3ee" strokeWidth="1.5" />
                                                                <text x="100" y="125" fill="#22d3ee" fontSize="8" fontWeight="bold" textAnchor="middle">DESCONTO "A"</text>
                                                            </g>
                                                        ) : (
                                                            <g>
                                                                <path d="M 30 65 L 130 65 L 130 95 L 30 95 Z" fill="currentColor" opacity="0.15" />
                                                                <path d="M 65 30 L 95 30 L 95 65 L 65 65 Z" fill="currentColor" opacity="0.15" />
                                                                <rect x="115" y="68" width="25" height="24" fill="black" stroke="currentColor" strokeWidth="1" />
                                                                <line x1="115" y1="68" x2="115" y2="92" stroke="white" strokeWidth="2" strokeLinecap="square" />
                                                                <rect x="115" y="72" width="40" height="16" fill="currentColor" opacity="0.4" />
                                                                <text x="145" y="95" fill="currentColor" fontSize="7" fontWeight="bold" textAnchor="end">TUBO {formatPipeSize(currentSize)}</text>
                                                                <line x1="80" y1="110" x2="115" y2="110" stroke="#22d3ee" strokeWidth="1.5" />
                                                                <path d="M 80 105 L 80 115 M 115 105 L 115 115" stroke="#22d3ee" strokeWidth="2" />
                                                                <text x="97" y="135" fill="#22d3ee" fontSize={isDiagramZoomed ? "10" : "11"} fontWeight="black" textAnchor="middle">
                                                                    {(() => {
                                                                        if (connectionType === 'SOCKET_WELD') {
                                                                            const val = ASME_B16_11_DIMENSIONS[currentSize]?.centerToBottom || 0;
                                                                            return `DESCONTO "C" (${val}mm)`;
                                                                        } else {
                                                                            const dim = ASME_B16_11_DIMENSIONS[currentSize];
                                                                            const val = dim ? (dim.centerToFace - dim.threadEngagement) : 0;
                                                                            return `DESCONTO (${val}mm)`;
                                                                        }
                                                                    })()}
                                                                </text>
                                                                <path d="M 97 125 L 97 115" stroke="#22d3ee" strokeWidth="1" markerEnd="url(#arrowCyan)" />
                                                                <g transform="translate(115, 68)">
                                                                    <text x="-5" y="-30" fill="#fbbf24" fontSize="11" fontWeight="black" textAnchor="end">Fundo da Bolsa</text>
                                                                    <path d="M -5 -25 L 2 -2" stroke="#fbbf24" strokeWidth="1.5" fill="none" markerEnd="url(#arrowAmber)" />
                                                                </g>
                                                            </g>
                                                        )}
                                                    </g>
                                                ) : (
                                                    <g>
                                                        {/* COTOWELO (ELBOW) 90° */}
                                                        {connectionType === 'BUTT_WELD' ? (
                                                            <g>
                                                                <path d="M 80 120 Q 80 80 120 80" fill="none" stroke="currentColor" strokeWidth="20" strokeLinecap="butt" />
                                                                <line x1="80" y1="80" x2="120" y2="80" stroke="#22d3ee" strokeWidth="1.5" />
                                                                <path d="M 80 75 L 80 85 M 120 75 L 120 85" stroke="#22d3ee" strokeWidth="1.5" />
                                                                <text x="100" y="70" fill="#22d3ee" fontSize="8" fontWeight="bold" textAnchor="middle">DESCONTO "A"</text>
                                                            </g>
                                                        ) : (
                                                            <g>
                                                                {/* Corpo Elbow SW */}
                                                                <path d="M 65 130 L 95 130 L 95 95 L 130 95 L 130 65 L 65 65 Z" fill="currentColor" opacity="0.15" />
                                                                
                                                                {/* Bolsa Fundo */}
                                                                <rect x="68" y="115" width="24" height="25" fill="black" stroke="currentColor" strokeWidth="1" />
                                                                {/* Bolsa Direita */}
                                                                <rect x="115" y="68" width="25" height="24" fill="black" stroke="currentColor" strokeWidth="1" />
                                                                
                                                                <line x1="115" y1="68" x2="115" y2="92" stroke="white" strokeWidth="2" strokeLinecap="square" />
                                                                
                                                                {/* Tubulação Encaixada Direita */}
                                                                <rect x="115" y="72" width="40" height="16" fill="currentColor" opacity="0.4" />
                                                                
                                                                {/* Cota A */}
                                                                <line x1="80" y1="110" x2="115" y2="110" stroke="#22d3ee" strokeWidth="1.5" />
                                                                <path d="M 80 105 L 80 115 M 115 105 L 115 115" stroke="#22d3ee" strokeWidth="2" />
                                                                
                                                                <text x="97" y="135" fill="#22d3ee" fontSize="11" fontWeight="black" textAnchor="middle">
                                                                    {(() => {
                                                                        if (connectionType === 'SOCKET_WELD') {
                                                                            const val = ASME_B16_11_DIMENSIONS[currentSize]?.centerToBottom || 0;
                                                                            return `DESCONTO "C" (${val}mm)`;
                                                                        } else {
                                                                            const dim = ASME_B16_11_DIMENSIONS[currentSize];
                                                                            const val = dim ? (dim.centerToFace - dim.threadEngagement) : 0;
                                                                            return `DESCONTO (${val}mm)`;
                                                                        }
                                                                    })()}
                                                                </text>
                                                                <path d="M 97 125 L 97 115" stroke="#22d3ee" strokeWidth="1" markerEnd="url(#arrowCyan)" />

                                                                <g transform="translate(115, 68)">
                                                                    <text x="-5" y="-30" fill="#fbbf24" fontSize="11" fontWeight="black" textAnchor="end">Fundo da Bolsa</text>
                                                                    <path d="M -5 -25 L 2 -2" stroke="#fbbf24" strokeWidth="1.5" fill="none" markerEnd="url(#arrowAmber)" />
                                                                </g>
                                                            </g>
                                                        )}
                                                    </g>
                                                )}

                                                {/* Definição das Setas */}
                                                <defs>
                                                    <marker id="arrowCyan" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                                                        <path d="M 0 0 L 6 3 L 0 6 Z" fill="#22d3ee" />
                                                    </marker>
                                                    <marker id="arrowAmber" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                                                        <path d="M 0 0 L 6 3 L 0 6 Z" fill="#fbbf24" />
                                                    </marker>
                                                </defs>
                                            </svg>
                                        </div>
                                        <div className={`flex-1 space-y-2 ${isDiagramZoomed ? 'text-center max-w-sm' : ''}`}>
                                            <div className={`${isDiagramZoomed ? 'text-sm' : 'text-[10px]'} font-black text-cyan-400 uppercase tracking-wider`}>Como medir:</div>
                                            <p className={`${isDiagramZoomed ? 'text-xs text-zinc-300' : 'text-[9px] text-zinc-400'} leading-normal`}>
                                                {connectionType === 'BUTT_WELD' 
                                                  ? "A medida 'A' é do centro da conexão até a face de solda. Desconte este valor do tubo, lembrando de adicionar o Gap de Solda depois."
                                                  : "No encaixe (SW), a medida 'A' é do centro até o ombro interno (fundo da bolsa). O bico do tubo deve bater exatamente aqui para o cálculo de spool bater."}
                                            </p>
                                            <div className={`flex items-center gap-2 mt-1 ${isDiagramZoomed ? 'justify-center border-t border-zinc-800 pt-4' : ''}`}>
                                                <div className="h-1.5 w-1.5 rounded-full bg-orange-500"></div>
                                                <span className={`${isDiagramZoomed ? 'text-xs' : 'text-[8px]'} text-zinc-500 font-bold uppercase`}>Referência: {connectionType === 'BUTT_WELD' ? 'ASME B16.9' : 'ASME B16.11'}</span>
                                            </div>
                                            {isDiagramZoomed && (
                                                <button 
                                                    onClick={() => setIsDiagramZoomed(false)}
                                                    className="mt-6 w-full py-3 bg-cyan-600 rounded-xl font-bold text-white text-sm"
                                                >
                                                    Fechar Visualização
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">
                                    Gap de Solda (mm)
                                    {(connectionType === 'SOCKET_WELD' || connectionType === 'THREADED') && (
                                        <span className="ml-2 text-orange-500 font-black">N/A</span>
                                    )}
                                </label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        disabled={connectionType === 'SOCKET_WELD' || connectionType === 'THREADED'}
                                        className={`w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-white outline-none focus:border-orange-500 ${(connectionType === 'SOCKET_WELD' || connectionType === 'THREADED') ? 'opacity-50 cursor-not-allowed border-orange-500/30' : ''}`} 
                                        value={(connectionType === 'SOCKET_WELD' || connectionType === 'THREADED') ? 0 : weldGap} 
                                        onChange={(e) => setWeldGap(Number(e.target.value))} 
                                    />
                                    {(connectionType === 'SOCKET_WELD' || connectionType === 'THREADED') && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-orange-400 font-bold uppercase">
                                            Auto-zero
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">Tipo de Solda / União</label>
                                <select 
                                    disabled={connectionType === 'THREADED'}
                                    className={`w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-white outline-none focus:border-orange-500 ${connectionType === 'THREADED' ? 'opacity-50 cursor-not-allowed' : ''}`} 
                                    value={connectionType === 'THREADED' ? 'WELD_SHOP' : defaultWeldType} 
                                    onChange={(e) => setDefaultWeldType(e.target.value as DefaultWeldType)}
                                >
                                    <option value="WELD_SHOP">{connectionType === 'THREADED' ? 'União Roscada' : 'Solda de Oficina'}</option>
                                    <option value="WELD_FIELD">{connectionType === 'THREADED' ? 'União Roscada (Campo)' : 'Solda de Campo'}</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">Tipo de Junta</label>
                                <select className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-white outline-none focus:border-orange-500" value={gasketType} onChange={(e) => setGasketType(e.target.value as GasketType)}>
                                    <option value="NonMetallic">Papelão Hidráulico / Borracha</option>
                                    <option value="SemiMetallic">Espiralada / Semi-metálica</option>
                                    <option value="Metallic">Metálica / RTJ</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">Norma de Conexões (Tê)</label>
                                <select className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-white outline-none focus:border-orange-500" value={fittingStandard} onChange={(e) => setFittingStandard(e.target.value)}>
                                    {TEE_STANDARD_OPTIONS.map(option => (
                                        <option key={option.code} value={option.code}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">Tipo de Flange Padrão</label>
                                <select className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-white outline-none focus:border-orange-500" value={defaultFlangeType} onChange={(e) => setDefaultFlangeType(e.target.value as FlangeType)}>
                                    <option value="WN">Pescoço (Weld Neck)</option>
                                    <option value="SO">Sobreposto (Slip-On)</option>
                                    <option value="SW">Encaixe (Socket Weld)</option>
                                    <option value="Blind">Cego (Blind)</option>
                                    <option value="Threaded">Roscado (Threaded)</option>
                                    <option value="LapJoint">Solto (Lap Joint)</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">Espessura da Junta (mm)</label>
                                <input type="number" className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-white outline-none focus:border-orange-500" value={gasketThickness} onChange={(e) => setGasketThickness(Number(e.target.value))} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Tipo de junta ativo</div>
                                <div className="mt-1 text-sm font-bold text-white">{selectedGasketMeta.label}</div>
                                <div className="mt-2 text-xs text-zinc-400">{selectedGasketMeta.usage}</div>
                                <div className="mt-2 text-[10px] text-amber-300">Por que usar: {selectedGasketMeta.why}</div>
                                <div className="mt-2 text-[10px] text-zinc-500">Espessura padrão atual: {gasketThickness.toFixed(1)} mm</div>
                            </div>
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Norma do tê ativa</div>
                                <div className="mt-1 flex items-center gap-2">
                                    <div className="text-sm font-bold text-white">{selectedTeeStandardMeta.label}</div>
                                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] ${isSelectedTeeStandardValidated ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'}`}>
                                        {isSelectedTeeStandardValidated ? 'Calculável' : 'Informativa'}
                                    </span>
                                </div>
                                <div className="mt-2 text-xs text-zinc-400">{selectedTeeStandardMeta.usage}</div>
                                <div className="mt-2 text-[10px] text-cyan-300">Família: {selectedTeeStandardMeta.family}</div>
                                <div className="mt-2 text-[10px] text-orange-300">Quando faz sentido: {selectedTeeStandardMeta.why}</div>
                                <div className="mt-2 text-[10px] text-zinc-500">{selectedTeeStandardMeta.note}</div>
                                <div className={`mt-2 rounded-lg border px-2 py-2 text-[10px] ${isSelectedTeeStandardValidated ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100' : 'border-amber-500/20 bg-amber-500/10 text-amber-100'}`}>
                                    {teeCalculationWarning}
                                </div>
                            </div>
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Base de flange do projeto</div>
                                <div className="mt-1 flex items-center gap-2">
                                    <div className="text-sm font-bold text-white">{selectedFlangeMeta.label}</div>
                                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-300">
                                        Calculável
                                    </span>
                                </div>
                                <div className="mt-2 text-xs text-zinc-400">{selectedFlangeMeta.desc}</div>
                                <div className="mt-2 text-[10px] text-cyan-300">Norma-base: {flangeStandardLabel}</div>
                                <div className="mt-2 text-[10px] text-orange-300">Cenário de uso: {selectedFlangeMeta.usage}</div>
                                <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-2 text-[10px] text-emerald-100">
                                    {flangeCalculationWarning}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">Norma de Identificação de Fluidos</label>
                                <select className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-white outline-none focus:border-orange-500" value={fluidIdentificationStandard} onChange={(e) => handleFluidIdentificationStandardChange(e.target.value as FluidIdentificationStandardCode)}>
                                    {FLUID_IDENTIFICATION_STANDARD_OPTIONS.map(option => (
                                        <option key={option.code} value={option.code}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">Fluido / Cor Global</label>
                                <select className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-white outline-none focus:border-orange-500" value={fluidIdentificationCode} onChange={(e) => handleFluidIdentificationChange(e.target.value as FluidIdentificationCode)}>
                                    {groupedFluidIdentificationOptions.map(group => (
                                        <optgroup key={group.category} label={group.category}>
                                            {group.options.map(option => (
                                                <option key={option.code} value={option.code}>{getFluidIdentificationOptionLabel(option, fluidIdentificationStandard)}</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Norma ativa de fluidos</div>
                            <div className="mt-1 text-sm font-bold text-white">{selectedFluidStandardOption.label}</div>
                            <div className="mt-1 text-xs text-zinc-400">{selectedFluidStandardOption.usage}</div>
                            {selectedFluidOption.category && (
                                <div className="mt-2 text-[10px] text-orange-300">Categoria visual atual: {selectedFluidOption.category}</div>
                            )}
                        </div>

                        <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Material de fabricação do tubo</div>
                                    <div className="mt-1 text-sm text-zinc-400">Seleção assistida por aplicação para não perder tempo decidindo a norma do tubo.</div>
                                </div>
                                <div className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
                                    Modo rápido
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                <div className="md:col-span-3">
                                    <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">Material / Norma do tubo</label>
                                    <select className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-white outline-none focus:border-cyan-500" value={pipeMaterialStandard} onChange={(e) => handlePipeMaterialStandardChange(e.target.value as PipeMaterialStandardCode)}>
                                        {PIPE_MATERIAL_STANDARD_OPTIONS.map(option => <option key={option.code} value={option.code}>{option.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">Escala / Schedule</label>
                                    <select className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-white outline-none focus:border-cyan-500" value={defaultPipeSchedule} onChange={(e) => setDefaultPipeSchedule(e.target.value as PipeScheduleCode)}>
                                        {PIPE_SCHEDULE_OPTIONS.map(option => (
                                            <option key={option.code} value={option.code}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">Construção</label>
                                    <select className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-white outline-none focus:border-cyan-500" value={pipeConstructionType} onChange={(e) => setPipeConstructionType(e.target.value as PipeConstructionType)}>
                                        {selectedPipeMaterialOption.constructionOptions.map(option => (
                                            <option key={option} value={option}>
                                                {option === 'COM_COSTURA' ? 'Com costura' : option === 'SEM_COSTURA' ? 'Sem costura' : 'Com ou sem costura'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">Acabamento</label>
                                    <select className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-white outline-none focus:border-cyan-500" value={pipeFinishType} onChange={(e) => setPipeFinishType(e.target.value as PipeFinishType)}>
                                        {selectedPipeMaterialOption.finishOptions.map(option => (
                                            <option key={option} value={option}>
                                                {option === 'PRETO' ? 'Preto' : option === 'GALVANIZADO' ? 'Galvanizado' : 'Preto ou galvanizado'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="rounded-xl border border-zinc-700 bg-black/50 p-3">
                                    <div className="text-[10px] font-bold uppercase text-zinc-500">Schedule padrão</div>
                                    <div className="mt-1 text-sm font-bold text-white">{selectedPipeScheduleOption.label}</div>
                                    <div className="mt-2 text-[10px] text-zinc-400">{selectedPipeScheduleOption.description}</div>
                                </div>
                                <div className="rounded-xl border border-zinc-700 bg-black/50 p-3">
                                    <div className="text-[10px] font-bold uppercase text-zinc-500">Leitura rápida no diâmetro ativo</div>
                                    <div className="mt-1 text-sm font-bold text-white">
                                        {currentSize}" = parede {activeScheduleWall.toFixed(2)} mm
                                    </div>
                                    <div className="mt-2 text-[10px] text-zinc-400">
                                        DE {activeScheduleReference.od.toFixed(1)} mm • DI {activeInternalDiameter.toFixed(2)} mm
                                    </div>
                                    <div className="mt-2 text-[10px] text-cyan-300">
                                        O mesmo schedule muda em mm conforme o NPS do tubo.
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                <div className="rounded-xl border border-zinc-700 bg-black/50 p-3 md:col-span-2">
                                    <div className="text-[10px] font-bold uppercase text-zinc-500">Aplicação sugerida</div>
                                    <div className="mt-1 text-sm font-bold text-white">{selectedPipeMaterialOption.usage}</div>
                                    <div className="mt-2 text-xs text-zinc-400">{selectedPipeMaterialOption.summary}</div>
                                </div>
                                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                                    <div className="text-[10px] font-bold uppercase text-amber-300">Atenção</div>
                                    <div className="mt-1 text-xs text-amber-100">{selectedPipeMaterialOption.avoid}</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Curvas e cotovelos</div>
                                    <div className="mt-1 text-sm text-zinc-400">Escolha uma família de raio. O cálculo continua trigonométrico, mas agora respeita SR, LR, 3D, 5D e 10D.</div>
                                </div>
                                <div className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${selectedElbowProfileOption.construction === 'STANDARD_ELBOW' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-orange-500/30 bg-orange-500/10 text-orange-300'}`}>
                                    {elbowConstructionLabel}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div className="md:col-span-2">
                                    <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">Família padrão da curva</label>
                                    <select className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-white outline-none focus:border-emerald-500" value={defaultElbowProfile} onChange={(e) => setDefaultElbowProfile(e.target.value as ElbowProfileCode)}>
                                        {ELBOW_PROFILE_OPTIONS.map(option => (
                                            <option key={option.code} value={option.code}>
                                                {option.label} ({option.construction === 'STANDARD_ELBOW' ? 'Cotovelo padrão' : 'Curva fabricada'})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="rounded-xl border border-zinc-700 bg-black/50 p-3">
                                    <div className="text-[10px] font-bold uppercase text-zinc-500">Perfil ativo</div>
                                    <div className="mt-1 text-sm font-bold text-white">{selectedElbowProfileOption.shortLabel}</div>
                                    <div className="mt-2 text-[10px] text-zinc-400">Raio de centro = {selectedElbowProfileOption.radiusFactor} x D nominal</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div className="rounded-xl border border-zinc-700 bg-black/50 p-3">
                                    <div className="text-[10px] font-bold uppercase text-zinc-500">Quando usar</div>
                                    <div className="mt-1 text-sm font-bold text-white">{selectedElbowProfileOption.usage}</div>
                                    <div className="mt-2 text-xs text-zinc-400">{selectedElbowProfileOption.summary}</div>
                                </div>
                                <div className="rounded-xl border border-zinc-700 bg-black/50 p-3">
                                    <div className="text-[10px] font-bold uppercase text-zinc-500">Guia rápido</div>
                                    <div className="mt-2 grid grid-cols-1 gap-2">
                                        {ELBOW_PROFILE_OPTIONS.map(option => (
                                            <div key={option.code} className={`rounded-lg border px-3 py-2 text-xs ${option.code === defaultElbowProfile ? 'border-emerald-500/40 bg-emerald-500/10 text-white' : 'border-zinc-800 bg-zinc-950/70 text-zinc-300'}`}>
                                                <div className="font-bold">{option.label} • {option.construction === 'STANDARD_ELBOW' ? 'Cotovelo padrão' : 'Curva fabricada'}</div>
                                                <div className="mt-1 text-[11px] text-zinc-400">{option.summary}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <div className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">Cor aplicada no croqui</div>
                                <div className="mt-1 text-lg font-bold text-white">{selectedFluidOption.fluid}</div>
                                <div className="text-sm text-zinc-400">{selectedFluidOption.description}</div>
                            </div>
                            <div className="flex items-center gap-3 rounded-2xl border border-zinc-700 bg-black/60 px-4 py-3">
                                <div className="h-12 w-12 rounded-xl border border-white/20" style={{ backgroundColor: selectedFluidOption.color }} />
                                <div>
                                    <div className="text-xs uppercase text-zinc-500">Cor global</div>
                                    <div className="font-mono text-sm font-bold text-white">{selectedFluidOption.color}</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400">Resumo técnico do projeto</div>
                                    <div className="mt-1 text-sm text-zinc-400">Conferência rápida das predefinições antes de liberar o croqui. A ideia é o tubista bater o olho e confirmar se a linha está coerente.</div>
                                </div>
                                <div className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300">
                                    Pré-check
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                <div className="rounded-xl border border-zinc-800 bg-black/50 p-3">
                                    <div className="text-[10px] font-bold uppercase text-zinc-500">Montagem</div>
                                    <div className="mt-1 text-sm font-bold text-white">{defaultWeldLabel}</div>
                                    <div className="mt-2 text-[10px] text-zinc-400">Gap de solda: {weldGap.toFixed(1)} mm</div>
                                </div>
                                <div className="rounded-xl border border-zinc-800 bg-black/50 p-3">
                                    <div className="text-[10px] font-bold uppercase text-zinc-500">Vedação e flange</div>
                                    <div className="mt-1 text-sm font-bold text-white">{selectedGasketMeta.label}</div>
                                    <div className="mt-2 text-[10px] text-zinc-400">{selectedFlangeMeta.label} • {flangeStandardLabel}</div>
                                    <div className="mt-1 text-[10px] text-zinc-500">Junta: {gasketThickness.toFixed(1)} mm</div>
                                </div>
                                <div className="rounded-xl border border-zinc-800 bg-black/50 p-3">
                                    <div className="text-[10px] font-bold uppercase text-zinc-500">Conexões</div>
                                    <div className="mt-1 text-sm font-bold text-white">{selectedTeeStandardMeta.label}</div>
                                    <div className="mt-2 text-[10px] text-zinc-400">{selectedTeeStandardMeta.family}</div>
                                    <div className={`mt-2 text-[10px] ${isSelectedTeeStandardValidated ? 'text-emerald-300' : 'text-amber-300'}`}>
                                        {isSelectedTeeStandardValidated ? 'Desconto validado para cálculo' : `Uso informativo. Corte automático segue ${safeTeeCalculationStandard}.`}
                                    </div>
                                </div>
                                <div className="rounded-xl border border-zinc-800 bg-black/50 p-3">
                                    <div className="text-[10px] font-bold uppercase text-zinc-500">Fluidos</div>
                                    <div className="mt-1 text-sm font-bold text-white">{selectedFluidStandardOption.label}</div>
                                    <div className="mt-2 text-[10px] text-zinc-400">{selectedFluidOption.fluid} • {fluidCategoryLabel}</div>
                                </div>
                                <div className="rounded-xl border border-zinc-800 bg-black/50 p-3">
                                    <div className="text-[10px] font-bold uppercase text-zinc-500">Tubo</div>
                                    <div className="mt-1 text-sm font-bold text-white">{pipeMaterialSummaryLabel}</div>
                                    <div className="mt-2 text-[10px] text-zinc-400">DE {activeScheduleReference.od.toFixed(1)} mm • parede {activeScheduleWall.toFixed(2)} mm • DI {activeInternalDiameter.toFixed(2)} mm</div>
                                </div>
                                <div className="rounded-xl border border-zinc-800 bg-black/50 p-3">
                                    <div className="text-[10px] font-bold uppercase text-zinc-500">Curvas</div>
                                    <div className="mt-1 text-sm font-bold text-white">{elbowProfileSummaryLabel}</div>
                                    <div className="mt-2 text-[10px] text-zinc-400">Raio de centro = {selectedElbowProfileOption.radiusFactor} x D nominal</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                                <div className={`rounded-xl border p-3 ${isSelectedTeeStandardValidated ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-amber-500/20 bg-amber-500/10'}`}>
                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                                        <AlertTriangle size={12} className={isSelectedTeeStandardValidated ? 'text-emerald-300' : 'text-amber-300'} />
                                        Segurança do Tê
                                    </div>
                                    <div className="mt-2 text-xs text-zinc-100">{teeCalculationWarning}</div>
                                </div>
                                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                                        <Check size={12} className="text-emerald-300" />
                                        Segurança do Flange
                                    </div>
                                    <div className="mt-2 text-xs text-zinc-100">{flangeCalculationWarning}</div>
                                </div>
                                <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3">
                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                                        <Info size={12} className="text-sky-300" />
                                        Base de Válvulas
                                    </div>
                                    <div className="mt-2 text-xs text-zinc-100">{valveCalculationWarning}</div>
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-zinc-500">Depois de confirmar, esses parâmetros continuam editáveis na Lista de Material e serão salvos junto com o projeto.</p>
                    </div>
                    </div>

                    <div className="shrink-0 border-t border-zinc-800 px-6 pb-6 pt-4">
                        <button onClick={handleConfirmRequiredSetup} disabled={!isSetupReady} className="w-full rounded-2xl bg-orange-500 px-4 py-4 text-sm font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50">
                            {segments.length > 0 ? "Confirmar e Fechar" : "Iniciar croqui"}
                        </button>
                    </div>
                </div>
            </div>
        )}
        
        {/* --- CANVAS LAYER --- */}
        <div 
          ref={canvasRef}
          className="absolute inset-0 z-0 touch-none cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
            <svg ref={svgRef} className="w-full h-full overflow-visible">
                <defs>
                    <pattern id="hatch-vertical" width="6" height="6" patternUnits="userSpaceOnUse">
                        <path d="M 3,0 L 3,6" stroke="#ef4444" strokeWidth="1" opacity="0.5" />
                    </pattern>
                    <pattern id="hatch-horizontal" width="6" height="6" patternUnits="userSpaceOnUse">
                        <path d="M 0,3 L 6,3" stroke="#f97316" strokeWidth="1" opacity="0.5" />
                    </pattern>
                </defs>

                {/* 1. HATCH LINES (BACKGROUND) */}
                {segments.map((seg, i) => (
                    <g key={`hatch-lines-${seg.id}-${i}`}>
                        {renderHatchLines(seg)}
                    </g>
                ))}

                {/* 2. PIPES (MIDDLE) */}
                {segments.map((seg, i) => {
                    const s = projectIso(seg.start.x, seg.start.y, seg.start.z, scale, pan.x, pan.y);
                    const e = projectIso(seg.end.x, seg.end.y, seg.end.z, scale, pan.x, pan.y);
                    const isSelected = selectedSegmentId === seg.id;
                    const midX = (s.x + e.x) / 2;
                    const midY = (s.y + e.y) / 2;
                    const labelText = getDirectionLabel(seg);
                    const dx = e.x - s.x;
                    const dy = e.y - s.y;
                    const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI;

                    const isDimensionHidden = !showDimensions || hiddenDimensionIds.includes(seg.id);
                    
                    // NEW: Change text color for horizontal offsets to improve readability
                    const isHorizontalOffset = seg.hatchType === 'HORIZONTAL';
                    const labelColor = isHorizontalOffset ? '#f97316' : '#fbbf24'; // Orange for Horizontal

                    // NEW: Shift Label Vertical Position if Horizontal Offset (UP instead of DOWN as requested)
                    // Moving Y-25 shifts it UP relative to screen coordinates
                    const labelYPos = isHorizontalOffset ? midY - 25 : midY;

                    return (
                        <g key={seg.id}>
                            <line 
                                x1={s.x} y1={s.y} x2={e.x} y2={e.y} 
                                stroke="transparent" 
                                strokeWidth={30} 
                                onClick={(e) => handleSegmentClick(e, seg.id)}
                                className="cursor-pointer"
                            />
                            <line 
                                x1={s.x} y1={s.y} x2={e.x} y2={e.y} 
                                stroke={isSelected ? "#fbbf24" : (seg.color || "#cbd5e1")} 
                                strokeWidth={isSelected ? pipeThickness + 4 : pipeThickness} 
                                strokeLinecap="butt"
                                strokeDasharray={seg.type === 'PIPE_FLEX' ? "4 4" : "none"}
                                className="pointer-events-none"
                            />
                            <line 
                                x1={s.x} y1={s.y} x2={e.x} y2={e.y} 
                                stroke="#10b981" 
                                strokeWidth={1.5} 
                                strokeDasharray="10 5"
                                opacity="0.6"
                                className="pointer-events-none"
                            />
                            
                            {renderValveSymbol(seg, midX, midY, angleDeg, isSelected)}

                            {(() => {
                                const length = Math.sqrt(dx * dx + dy * dy);
                                if (length < 15) return null;
                                const nx = -dy / length;
                                const ny = dx / length;
                                // Place at 70% of the pipe length to avoid overlapping with center labels
                                const arrowPosX = s.x + dx * 0.7;
                                const arrowPosY = s.y + dy * 0.7;
                                // Offset perpendicularly based on pipe thickness
                                const offsetDist = (pipeThickness / 2) + 12;
                                const arrowX = arrowPosX + nx * offsetDist;
                                const arrowY = arrowPosY + ny * offsetDist;
                                return (
                                    <g transform={`translate(${arrowX}, ${arrowY}) rotate(${angleDeg})`} className="pointer-events-none">
                                        <line x1="-8" y1="0" x2="8" y2="0" stroke="#10b981" strokeWidth="2" />
                                        <polygon points="8,0 3,-4 3,4" fill="#10b981" />
                                    </g>
                                );
                            })()}

                            {!isDimensionHidden && (
                                <>
                                    <g 
                                      transform={`translate(${midX}, ${midY - 28})`} 
                                      className="cursor-pointer hover:scale-110 transition-transform"
                                      onClick={(e) => { e.stopPropagation(); setShowCalcDetailId(seg.id); }}
                                    >
                                        <circle r="8" fill="#0f172a" stroke="#3b82f6" strokeWidth="1.5" />
                                        <text y="3" textAnchor="middle" fontSize="9" fill="#3b82f6" fontWeight="bold">#{i+1}</text>
                                    </g>

                                    <g onClick={(evt) => handleEditClick(seg.id, parseInt(seg.customLength || "0"), evt)} className="cursor-pointer hover:opacity-80">
                                        <rect x={midX - 26} y={labelYPos - 10} width="52" height="20" fill="#0f172a" rx="4" opacity="0.9" stroke="#475569" strokeWidth="1" />
                                        <text x={midX} y={labelYPos + 4} textAnchor="middle" fontSize="10" fill={labelColor} fontWeight="bold" fontFamily="monospace">
                                            {labelText}
                                        </text>
                                    </g>
                                </>
                            )}
                        </g>
                    );
                })}

                {/* 3. HATCH LABELS & FITTINGS (FOREGROUND) */}
                {segments.map((seg, i) => (
                    <g key={`hatch-labels-${seg.id}-${i}`}>
                        {renderHatchLabels(seg)}
                    </g>
                ))}

                {renderRightAngleIndicators()}

                {uniqueNodes.map((p, idx) => {
                    const scr = projectIso(p.x, p.y, p.z, scale, pan.x, pan.y);
                    const isStart = startPoint && p.x === startPoint.x && p.y === startPoint.y && p.z === startPoint.z;
                    const hasFitting = fittings.some(f => Math.abs(f.position.x - p.x) < 0.1 && Math.abs(f.position.y - p.y) < 0.1 && Math.abs(f.position.z - p.z) < 0.1);
                    
                    return (
                        <g key={idx}>
                             {isFittingTool && hasFitting ? (
                                 <>
                                   <circle cx={scr.x} cy={scr.y} r={12} fill="none" stroke="#22c55e" strokeWidth="2" className="animate-pulse" />
                                   <circle cx={scr.x} cy={scr.y} r={6} fill="#22c55e" stroke="#fff" strokeWidth="2" />
                                 </>
                             ) : isFittingTool ? (
                                 <>
                                   <circle cx={scr.x} cy={scr.y} r={12} fill="#22c55e" opacity="0.3" className="animate-pulse" />
                                   <circle cx={scr.x} cy={scr.y} r={6} fill="#22c55e" stroke="#fff" strokeWidth="2" />
                                 </>
                             ) : (
                                 <circle 
                                    cx={scr.x} cy={scr.y} r={isStart ? 6 : (hasFitting ? 3 : 4)}
                                    fill={isStart ? "#fbbf24" : (hasFitting ? "#10b981" : "#475569")}
                                    stroke="#1e293b" strokeWidth={1}
                                 />
                             )}
                             <circle 
                                cx={scr.x} cy={scr.y} r={30} 
                                fill="transparent"
                                className="cursor-pointer z-50"
                                onPointerDown={(e) => handleNodePointerDown(p, e)}
                                onPointerUp={(e) => handleNodePointerUp(p, e)}
                                onPointerLeave={handleNodePointerLeave}
                                onPointerCancel={handleNodePointerLeave}
                             />
                        </g>
                    );
                })}

                {fittings.map((fit, idx) => renderFittingSymbol(fit, selectedFittingId === fit.id, `fit-${fit.id}-${idx}`))}

                {startPoint && startScreenPos && (
                    <>
                        <line x1={startScreenPos.x} y1={startScreenPos.y} x2={cursorScreenPos.x} y2={cursorScreenPos.y} stroke="#fbbf24" strokeWidth="2" strokeDasharray="5 5" opacity="0.8"/>
                        {(() => {
                          const dx = cursor.x - startPoint.x;
                          const dy = cursor.y - startPoint.y;
                          const dz = cursor.z - startPoint.z;
                          const distGrid = Math.sqrt(dx*dx + dy*dy + dz*dz);
                          const distMm = Math.round(distGrid * GRID_SCALE);
                          
                          const midX = (startScreenPos.x + cursorScreenPos.x) / 2;
                          const midY = (startScreenPos.y + cursorScreenPos.y) / 2;

                          if (!showDimensions) return null;
                          
                          return (
                             <g className="pointer-events-none">
                                <rect x={midX - 24} y={midY - 12} width="48" height="24" rx="4" fill="#0f172a" stroke="#fbbf24" strokeWidth="1" opacity="0.9"/>
                                <text x={midX} y={midY + 5} textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="bold" fontFamily="monospace">
                                   {distMm}
                                </text>
                             </g>
                          );
                        })()}
                    </>
                )}
                <g transform={`translate(${cursorScreenPos.x}, ${cursorScreenPos.y})`}>
                    <line x1="-15" y1="0" x2="15" y2="0" stroke="#ef4444" strokeWidth="2" />
                    <line x1="0" y1="-15" x2="0" y2="15" stroke="#ef4444" strokeWidth="2" />
                    <circle r="3" fill="none" stroke="#ef4444" />
                </g>
            </svg>
        </div>

        {/* --- CALCULATION DETAILS MODAL --- */}
        {showCalcDetailId && (() => {
            const segIndex = segments.findIndex(s => s.id === showCalcDetailId);
            if (segIndex === -1) return null;
            const seg = segments[segIndex];
            const info = calculateCutLength(seg);

            return (
                <div className="absolute inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCalcDetailId(null)}>
                    <div className="bg-zinc-900 border border-zinc-700 p-5 rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <Calculator size={18} className="text-blue-500"/>
                                Detalhes de Corte #{segIndex + 1}
                            </h3>
                            <button onClick={() => setShowCalcDetailId(null)}><X size={20} className="text-zinc-500 hover:text-white"/></button>
                        </div>
                        {/* Content */}
                        <div className="space-y-3">
                            <div className="bg-black/50 p-3 rounded-lg border border-zinc-800">
                                <span className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Passo a Passo</span>
                                <div className="text-zinc-300 text-sm font-mono leading-relaxed">
                                    {info.details}
                                </div>
                            </div>
                            <div className="flex justify-between items-center bg-blue-900/20 p-3 rounded-lg border border-blue-900/50">
                                <span className="text-blue-200 font-bold text-xs uppercase">Comprimento Final</span>
                                <span className="text-xl font-mono font-black text-blue-400">{info.value}mm</span>
                            </div>
                        </div>
                    </div>
                </div>
            )
        })()}

        {/* --- UI HEADER --- */}
        <div className={`absolute top-0 left-0 right-0 p-2 flex justify-start items-start pointer-events-none z-10 ${isDockMode ? 'pt-3' : ''}`}>
            <div 
                className={`flex gap-2 pointer-events-auto items-center w-full max-w-full pb-2 ${isDockMode ? 'rounded-2xl border border-zinc-800 bg-zinc-950/90 px-3 py-2 shadow-2xl backdrop-blur-md' : ''}`}
                onPointerDown={e => e.stopPropagation()}
            >
                {/* ORGANIZE TOGGLE (2-STATE CYCLE) */}
                <button 
                   onClick={() => setOrganizeState((prev) => (prev + 1) % 2)} 
                   className={`p-2 rounded-lg border shadow-lg transition-colors bg-emerald-600 border-white text-white shrink-0 ${isDockMode ? 'ring-1 ring-emerald-300/30' : ''}`}
                   title={organizeState === 0 ? "Organizar: Normal" : "Organizar: Dock Superior"}
                >
                   <Menu size={20}/>
                </button>

                {organizeState !== 3 && (
                    <div className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5">
                        {/* PROJECT NAME (CLICK TO MANAGE) */}
                        <button onClick={handleOpenProjects} className="bg-zinc-900 p-2 rounded-lg border border-zinc-700 text-white shadow-lg flex items-center gap-2 active:bg-zinc-700 shrink-0">
                           <FolderOpen size={20} />
                           <span className="text-sm font-bold hidden sm:inline">{newProjectName || "Projeto Sem Título"}</span>
                        </button>
                        
                        {/* SHARE / EXPORT MENU */}
                        <div className="relative shrink-0">
                            <button 
                                onClick={() => setShowExportMenu(!showExportMenu)} 
                                className={`p-2 rounded-lg border shadow-lg transition-colors ${showExportMenu ? 'bg-green-600 border-white text-white' : 'bg-zinc-900 border-zinc-700 text-green-400 hover:text-white'}`}
                                title="Exportar / Compartilhar"
                            >
                                <Share2 size={20}/>
                            </button>
                            
                            {showExportMenu && (
                                <>
                                    <div className="fixed inset-0 z-[49] bg-black/20 backdrop-blur-[1px]" onClick={() => setShowExportMenu(false)} />
                                    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] w-[min(360px,92vw)] min-h-[220px] max-h-[70vh] overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950/98 p-3 shadow-[0_20px_80px_rgba(0,0,0,0.65)] animate-in fade-in slide-in-from-top-2">
                                        <div className="px-3 py-3 text-xs font-bold text-zinc-500 uppercase tracking-[0.18em] border-b border-zinc-800 mb-2">
                                            Exportar / Salvar
                                        </div>
                                        <button onClick={() => { handleShareImage(); setShowExportMenu(false); }} className="flex min-h-[58px] items-center gap-3 rounded-xl px-4 py-3 hover:bg-zinc-800 text-zinc-200 text-sm font-bold text-left transition-colors">
                                            <ImageIcon size={18} className="text-blue-400 shrink-0"/> Imagem (PNG)
                                        </button>
                                        <button onClick={() => { handleSharePDF(); setShowExportMenu(false); }} className="flex min-h-[58px] items-center gap-3 rounded-xl px-4 py-3 hover:bg-zinc-800 text-zinc-200 text-sm font-bold text-left border-t border-zinc-800 transition-colors">
                                            <FileType size={18} className="text-red-400 shrink-0"/> Documento (PDF)
                                        </button>
                                        <button onClick={() => { handleSmartSaveToDisk(); setShowExportMenu(false); }} className="flex min-h-[58px] items-center gap-3 rounded-xl px-4 py-3 hover:bg-zinc-800 text-zinc-200 text-sm font-bold text-left border-t border-zinc-800 transition-colors">
                                            <HardDrive size={18} className="text-green-400 shrink-0"/> Salvar em Arquivo
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* OPEN FILE BUTTON */}
                        <button onClick={handleImportClick} className="bg-zinc-900 p-2 rounded-lg border border-zinc-700 text-blue-400 shadow-lg active:bg-zinc-700 shrink-0" title="Abrir Arquivo do Disco">
                           <FolderOpen size={20} />
                        </button>

                        {/* CONFIG / SETUP MODAL MANUAL TOGGLE */}
                        <button 
                           onClick={() => setShowSetupModal(!showSetupModal)} 
                           className={`p-2 rounded-lg border shadow-lg transition-colors ${showSetupModal ? 'bg-orange-600 border-white text-white font-bold' : 'bg-zinc-900 border-zinc-700 text-amber-500 hover:text-amber-400'}`}
                           title="Configurar Parâmetros do Croqui"
                        >
                           <Settings2 size={20}/>
                        </button>

                        {/* PLATE SKETCH TOGGLE */}
                        <button 
                           onClick={() => setShowPlateSketch(true)} 
                           className={`p-2 rounded-lg border shadow-lg transition-colors ${showPlateSketch ? 'bg-orange-600 border-white text-white' : 'bg-zinc-900 border-zinc-700 text-orange-400'}`}
                           title="Esboço de Chapas em 3D"
                        >
                           <Square size={20}/>
                        </button>

                        {/* PHOTO FRAME TOGGLE */}
                        <button 
                           onClick={() => setShowPhotoFrame(true)} 
                           className={`p-2 rounded-lg border shadow-lg transition-colors ${showPhotoFrame ? 'bg-pink-600 border-white text-white' : 'bg-zinc-900 border-zinc-700 text-pink-400'}`}
                           title="Porta Retratos (Visualizador de Imagem)"
                        >
                           <ImageIcon size={20}/>
                        </button>

                        {/* SMART TOOL TOGGLE */}
                        <button 
                           ref={smartDockButtonRef}
                           onClick={(e) => {
                               syncDockPanelPosition('smart');
                               toggleSmartTool(e);
                           }} 
                           className={`p-2 rounded-lg border shadow-lg transition-colors ${showSmartTool ? 'bg-purple-600 border-white text-white' : 'bg-zinc-900 border-zinc-700 text-purple-400'}`}
                           title="Caneta Mágica (HUD)"
                        >
                           <Wand2 size={20}/>
                        </button>

                        {/* QUICK CUT LIST TOGGLE */}
                        <button 
                           ref={quickCutsDockButtonRef}
                           onClick={(e) => {
                               syncDockPanelPosition('quickCuts');
                               toggleQuickCuts(e);
                           }} 
                           className={`p-2 rounded-lg border shadow-lg transition-colors ${showQuickCuts ? 'bg-blue-600 border-white text-white' : 'bg-zinc-900 border-zinc-700 text-blue-400'}`}
                           title="Lista Rápida de Cortes (HUD)"
                        >
                           <Scissors size={20}/>
                        </button>

                        {/* SYMBOLOGY TOGGLE */}
                        <button 
                           ref={symbologyDockButtonRef}
                           onClick={(e) => {
                               syncDockPanelPosition('symbology');
                               toggleSymbologyMenu(e);
                           }} 
                           className={`p-2 rounded-lg border shadow-lg transition-colors ${showSymbologyMenu ? 'bg-blue-600 border-white text-white' : 'bg-zinc-900 border-zinc-700 text-blue-400'}`}
                           title="Simbologia"
                        >
                           <LayoutGrid size={20}/>
                        </button>

                        {/* MATERIAL LIST TOGGLE */}
                        <button 
                           ref={materialDockButtonRef}
                           onClick={(e) => {
                               syncDockPanelPosition('material');
                               toggleMaterialList(e);
                           }} 
                           className={`p-2 rounded-lg border shadow-lg transition-colors ${showMaterialList ? 'bg-orange-600 border-white text-white' : 'bg-zinc-900 border-zinc-700 text-orange-400'}`}
                           title="Lista de Materiais"
                        >
                           <List size={20}/>
                        </button>

                        {/* --- VISUALIZATION SETTINGS --- */}
                        <button 
                            onClick={() => setShowViewSettings(!showViewSettings)}
                            className={`p-2 rounded-lg border shadow-lg transition-colors ${showViewSettings ? 'bg-zinc-700 border-white text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400'}`}
                            title="Configurações de Visualização"
                        >
                            <Eye size={20}/>
                        </button>

                        {/* TRIGONOMETRY TOGGLE BUTTON */}
                        <button 
                          ref={trigDockButtonRef}
                          onClick={() => {
                              syncDockPanelPosition('trig');
                              setShowTrigTool(!showTrigTool);
                          }} 
                          className={`p-2 rounded-lg border shadow-lg transition-colors shrink-0 ${showTrigTool ? 'bg-orange-600 border-white text-white' : 'bg-zinc-900 border-zinc-700 text-orange-400'}`}
                          title="Calculadora Trigonométrica"
                        >
                           <Triangle size={20} />
                        </button>

                        {/* COLOR PICKER BUTTON */}
                        <button 
                            onClick={() => setShowColorPicker(!showColorPicker)} 
                            className="p-2 rounded-lg border border-zinc-700 shadow-lg bg-zinc-900 relative shrink-0"
                        >
                            <Palette size={20} style={{ color: activeColor }} />
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-black" style={{ backgroundColor: activeColor }}></div>
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* --- SYMBOLOGY FLOATING TOGGLE MENU --- */}
        {showSymbologyMenu && organizeState !== 3 && (
        <div 
            style={organizeState === 2 ? { top: panelPositions.symbology.y, right: 10 } : { top: panelPositions.symbology.y, left: panelPositions.symbology.x }}
            className={`absolute z-50 flex flex-col ${organizeState === 2 ? 'items-end' : 'items-start'}`}
        >
            {/* The Draggable Title/Header (Only when not in horizontal Dock/Compact mode) */}
            {organizeState !== 1 && (
            <div 
                className={`p-2.5 rounded-t-xl border border-b-0 border-zinc-700 bg-blue-600 border-white text-white w-72 flex items-center justify-between font-bold text-sm touch-none select-none transition-all ${panelPositions.symbology.locked ? 'cursor-default' : 'cursor-move'}`}
                onPointerDown={(e) => { if (!panelPositions.symbology.locked) handleSymbologyDragStart(e); }}
                onPointerMove={handleSymbologyDragMove}
                onPointerUp={handleSymbologyDragEnd}
                onPointerCancel={handleSymbologyDragEnd}
                onContextMenu={(e) => e.preventDefault()}
            >
                <div className="flex items-center gap-2 flex-1 pointer-events-none">
                    <LayoutGrid size={20} />
                    <span className="hidden sm:inline">Simbologia:</span>
                    <span className="text-xs bg-black px-1.5 py-0.5 rounded text-zinc-300 font-mono">
                        {currentToolDef?.label || "Tubo"}
                    </span>
                </div>

                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {/* Lock Toggle Button */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); togglePanelLock('symbology'); }}
                        className={`p-1.5 rounded-lg border transition-all ${panelPositions.symbology.locked ? 'bg-blue-500 text-white border-blue-300' : 'bg-blue-700/50 text-blue-200 border-blue-500 hover:border-white'}`}
                        title={panelPositions.symbology.locked ? "Desbloquear Posição" : "Fixar Posição"}
                    >
                        {panelPositions.symbology.locked ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>

                    {/* Close Button */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowSymbologyMenu(false); }}
                        className="p-1.5 rounded-lg border border-blue-500 hover:border-white bg-blue-700/50 text-white transition-all text-xs"
                    >
                        <X size={12} />
                    </button>
                </div>
            </div>
            )}

            {/* The Drawer Content */}
            <div className={`bg-zinc-900/95 backdrop-blur-md border border-zinc-700 p-4 ${organizeState === 1 ? 'rounded-xl mt-2' : 'rounded-b-xl'} shadow-2xl w-72 max-h-[60vh] flex flex-col animate-in slide-in-from-top-2 overflow-hidden`} onPointerDown={(e) => e.stopPropagation()}>
                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                    {TOOL_CATEGORIES.map((cat) => (
                        <div key={cat.name} className="mb-4 last:mb-0">
                            <h4 className="text-[10px] uppercase font-bold text-zinc-500 mb-2 border-b border-zinc-800 pb-1">{cat.name}</h4>
                            <div className="grid grid-cols-3 gap-2">
                                {cat.tools.map((tool) => (
                                    <button 
                                        key={tool.id}
                                        onClick={() => handleSymbologySelect(tool.id as any)}
                                        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${activeTool === tool.id ? 'bg-blue-600 border-white text-white shadow-md' : 'bg-black border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
                                    >
                                        <tool.icon size={20} className="mb-1"/>
                                        <span className="text-[8px] text-center leading-tight">{tool.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* TOOLTIP AREA AT BOTTOM */}
                {currentToolDef && (
                    <div className="mt-3 pt-3 border-t border-zinc-700 bg-zinc-800/50 p-2 rounded shrink-0">
                        <div className="flex items-center gap-2 mb-1">
                            <Info size={12} className="text-yellow-500"/>
                            <span className="text-[10px] font-bold text-yellow-500 uppercase">Informação Técnica</span>
                        </div>
                        <p className="text-[10px] text-zinc-300 leading-relaxed">
                            {currentToolDef.description}
                        </p>
                        {currentToolDef.id.toString().includes('ELBOW') && (
                            <div className="mt-2 rounded border border-emerald-500/20 bg-black/40 p-2 text-[10px] text-zinc-300">
                                <div className="font-bold text-emerald-300">Perfil ativo: {selectedElbowProfileOption.label} • {elbowConstructionLabel}</div>
                                <div className="mt-1">{selectedElbowProfileOption.summary}</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
        )}

        {/* --- COLOR PICKER MENU --- */}
        {showColorPicker && (
            <div className={`absolute top-14 ${organizeState === 0 ? 'right-14' : 'left-14'} bg-zinc-900 border border-zinc-700 p-3 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2`}>
                <h4 className="text-xs font-bold text-white mb-2 uppercase border-b border-zinc-800 pb-1">Cor do Elemento</h4>
                <div className="grid grid-cols-3 gap-2">
                    {COLOR_PALETTE.map((c) => (
                        <button 
                            key={c.hex} 
                            onClick={() => handleColorChange(c.hex)}
                            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${activeColor === c.hex ? 'border-white scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: c.hex }}
                            title={c.name}
                        />
                    ))}
                </div>
            </div>
        )}

        {/* --- VIEW SETTINGS DROPDOWN (ROOT LEVEL) --- */}
        {showViewSettings && (
            <div className="fixed top-16 right-4 bg-zinc-900 border border-zinc-700 rounded-xl p-3 shadow-2xl z-[70] w-64 animate-in fade-in slide-in-from-top-2" onPointerDown={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-2 border-b border-zinc-800 pb-1">
                    <h4 className="text-xs font-bold text-white uppercase">Visualização</h4>
                    <button onClick={() => setShowViewSettings(false)} className="text-zinc-500 hover:text-white"><X size={16}/></button>
                </div>
                <div className="flex flex-col gap-3">
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] text-zinc-400 font-bold block">Espessura Tubo</label>
                            <span className="text-[10px] text-zinc-300 font-mono font-bold bg-zinc-850 px-1 border border-zinc-805 rounded">{pipeThickness}px</span>
                        </div>
                        <input 
                            type="range" 
                            min="2" 
                            max="40" 
                            step="2"
                            value={pipeThickness} 
                            onChange={(e) => setPipeThickness(Number(e.target.value))}
                            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                        <label className="text-[10px] text-zinc-400 font-bold cursor-pointer" onClick={() => setShowDimensions(!showDimensions)}>Mostrar Cotas</label>
                        <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={showDimensions}
                            onChange={() => setShowDimensions(!showDimensions)}
                        />
                        <div className={`relative w-9 h-5 bg-zinc-700 rounded-full cursor-pointer transition-all after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${showDimensions ? 'bg-blue-600 after:translate-x-full' : ''}`} onClick={() => setShowDimensions(!showDimensions)}></div>
                    </div>
                </div>
            </div>
        )}

        {/* --- FLOATING TRIGONOMETRY TOOL (DRAGGABLE) --- */}
        {showTrigTool && organizeState !== 3 && (
            <div 
               style={organizeState === 2 ? { top: panelPositions.trig.y, right: 10 } : { top: panelPositions.trig.y, left: panelPositions.trig.x }}
               className="absolute bg-zinc-900/95 backdrop-blur-md border border-zinc-700 rounded-xl shadow-2xl z-50 w-72 flex flex-col overflow-hidden"
               onPointerDown={(e) => e.stopPropagation()} 
            >
               {organizeState !== 1 && (
               <div 
                 className="bg-zinc-800 p-3 cursor-move flex justify-between items-center border-b border-zinc-700 select-none touch-none"
                 onPointerDown={handleTrigDragStart}
                 onPointerMove={handleTrigDragMove}
                 onPointerUp={handleTrigDragEnd}
                 onPointerCancel={handleTrigDragEnd}
               >
                  <div className="flex items-center gap-2 text-zinc-300 font-bold text-xs uppercase">
                     <GripHorizontal size={14} /> Trigonometria
                  </div>
                  <button onClick={() => setShowTrigTool(false)} onPointerDown={(e) => e.stopPropagation()}>
                    <X size={16} className="text-zinc-400 hover:text-white"/>
                  </button>
               </div>
               )}

               <div className="p-3">
                   <div className="relative w-full h-32 mb-2 select-none">
                      <svg viewBox="0 0 200 150" className="w-full h-full drop-shadow-lg">
                          <path d="M 40 130 L 160 130 L 160 30 Z" fill="none" stroke="#475569" strokeWidth="2" />
                          <path d="M 60 130 A 20 20 0 0 1 58 122" stroke="#ef4444" fill="none" />
                          <path d="M 160 120 L 150 120 L 150 130" stroke="#475569" fill="none"/>
                      </svg>
                      <div className="absolute top-[25px] right-[15px] w-12">
                          <input type="number" placeholder="A" className={`w-full bg-black/80 border text-center text-xs font-bold p-0.5 rounded focus:outline-none ${trigResultType.includes('sideA') ? 'border-green-500 text-green-400' : 'border-zinc-600 text-white focus:border-orange-500'}`} value={trigState.sideA} onChange={(e) => handleTrigChange('sideA', e.target.value)}/>
                      </div>
                      <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-12">
                          <input type="number" placeholder="B" className={`w-full bg-black/80 border text-center text-xs font-bold p-0.5 rounded focus:outline-none ${trigResultType.includes('sideB') ? 'border-green-500 text-green-400' : 'border-zinc-600 text-white focus:border-orange-500'}`} value={trigState.sideB} onChange={(e) => handleTrigChange('sideB', e.target.value)}/>
                      </div>
                      <div className="absolute top-[40px] left-[40px] w-12 -rotate-45 transform origin-center">
                          <input type="number" placeholder="C" className={`w-full bg-black/80 border text-center text-xs font-bold p-0.5 rounded focus:outline-none ${trigResultType.includes('sideC') ? 'border-green-500 text-green-400' : 'border-zinc-600 text-white focus:border-orange-500'}`} value={trigState.sideC} onChange={(e) => handleTrigChange('sideC', e.target.value)}/>
                      </div>
                      <div className="absolute bottom-[10px] left-[55px] w-10">
                          <input type="number" placeholder="Ang" className={`w-full bg-transparent border-b text-center text-[10px] font-bold p-0 focus:outline-none ${trigResultType.includes('angle') ? 'border-green-500 text-green-400' : 'border-zinc-500 text-orange-500'}`} value={trigState.angle} onChange={(e) => handleTrigChange('angle', e.target.value)}/>
                      </div>
                   </div>
                   <div className="flex gap-2">
                       <button onClick={clearTrig} className="p-2 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"><RotateCcw size={16}/></button>
                       <button onClick={calculateTrig} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 rounded-lg shadow-lg flex items-center justify-center gap-2 text-xs"><Calculator size={16}/> Calcular</button>
                   </div>
               </div>
            </div>
        )}

        {/* --- SMART TOOL FLOATING TOGGLE MENU (MAGIC WAND) --- */}
        {showSmartTool && organizeState !== 3 && (
        <div 
            style={organizeState === 2 ? { top: panelPositions.smart.y, right: 10 } : { top: panelPositions.smart.y, left: panelPositions.smart.x }}
            className={`absolute z-50 flex flex-col ${organizeState === 2 ? 'items-end' : 'items-start'}`}
        >
            {/* The Draggable Header / Title */}
            {organizeState !== 1 && (
            <div 
                className={`p-2.5 rounded-t-xl border border-b-0 border-zinc-700 bg-purple-600 border-white text-white w-64 flex items-center justify-between font-bold text-sm touch-none select-none transition-all ${panelPositions.smart.locked ? 'cursor-default' : 'cursor-move'}`}
                onPointerDown={(e) => { if (!panelPositions.smart.locked) handleSmartToolDragStart(e); }}
                onPointerMove={handleSmartToolDragMove}
                onPointerUp={handleSmartToolDragEnd}
                onPointerCancel={handleSmartToolDragEnd}
                onContextMenu={(e) => e.preventDefault()}
            >
                <div className="flex items-center gap-2 flex-1 pointer-events-none">
                    <Wand2 size={20} />
                    <span>Caneta Mágica</span>
                </div>

                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {/* Lock Toggle Button */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); togglePanelLock('smart'); }}
                        className={`p-1.5 rounded-lg border transition-all ${panelPositions.smart.locked ? 'bg-purple-500 text-white border-purple-300' : 'bg-purple-700/50 text-purple-200 border-purple-500 hover:border-white'}`}
                        title={panelPositions.smart.locked ? "Desbloquear Posição" : "Fixar Posição"}
                    >
                        {panelPositions.smart.locked ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>

                    {/* Close Button */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowSmartTool(false); }}
                        className="p-1.5 rounded-lg border border-purple-500 hover:border-white bg-purple-700/50 text-white transition-all text-xs"
                    >
                        <X size={12} />
                    </button>
                </div>
            </div>
            )}
            
            {/* The Drawer Content */}
            <div className={`bg-zinc-900/95 backdrop-blur-md border border-zinc-700 p-4 ${organizeState === 1 ? 'rounded-xl mt-2' : 'rounded-b-xl'} shadow-2xl w-64 animate-in slide-in-from-top-2 overflow-hidden`} onPointerDown={(e) => e.stopPropagation()}>
                <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                        <label className="text-[10px] text-zinc-400 block mb-1">Comp. (mm)</label>
                        <input type="number" className="w-full bg-black border border-zinc-700 rounded p-1 text-white text-xs" value={smartLength} onChange={e => setSmartLength(Number(e.target.value))} />
                    </div>
                    <div>
                        <label className="text-[10px] text-zinc-400 block mb-1">Ângulo (°)</label>
                        <input type="number" className="w-full bg-black border border-zinc-700 rounded p-1 text-white text-xs" value={smartAngle} onChange={e => setSmartAngle(e.target.value)} />
                    </div>
                </div>
                <div className="space-y-3">
                    <div>
                        <span className="text-[10px] text-purple-400 font-bold uppercase block mb-1">Desvio Vertical</span>
                        <div className="grid grid-cols-4 gap-1">
                            {['N','S','L','O'].map(card => (
                                <button 
                                    key={`up-${card}`} 
                                    onClick={() => applyVerticalOffset('UP', (card === 'L' ? 'E' : card === 'O' ? 'W' : card) as any)} 
                                    className={smartBtnClass}
                                >
                                    <ArrowUp size={10} className="mx-auto mb-1"/> {card}
                                </button>
                            ))}
                            {['N','S','L','O'].map(card => (
                                <button 
                                    key={`down-${card}`} 
                                    onClick={() => applyVerticalOffset('DOWN', (card === 'L' ? 'E' : card === 'O' ? 'W' : card) as any)} 
                                    className={smartBtnClass}
                                >
                                    <ArrowDown size={10} className="mx-auto mb-1"/> {card}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <span className="text-[10px] text-blue-400 font-bold uppercase block mb-1">Desvio Horizontal</span>
                        <div className="grid grid-cols-2 gap-1">
                            <button onClick={() => applyHorizontalOffset('NE')} className={smartBtnClass}><ArrowUpRight size={14} className="mx-auto"/> Nordeste</button>
                            <button onClick={() => applyHorizontalOffset('NW')} className={smartBtnClass}><ArrowUpLeft size={14} className="mx-auto"/> Noroeste</button>
                            <button onClick={() => applyHorizontalOffset('SE')} className={smartBtnClass}><ArrowDownRight size={14} className="mx-auto"/> Sudeste</button>
                            <button onClick={() => applyHorizontalOffset('SW')} className={smartBtnClass}><ArrowDownLeft size={14} className="mx-auto"/> Sudoeste</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        )}

        {/* --- MATERIAL LIST FLOATING TOGGLE MENU (DRAGGABLE) --- */}
        {showMaterialList && organizeState !== 3 && (
        <div 
            style={organizeState === 2 ? { top: panelPositions.material.y, right: 10 } : { top: panelPositions.material.y, left: panelPositions.material.x }}
            className={`absolute z-[65] flex flex-col ${organizeState === 2 ? 'items-end' : 'items-start'}`}
        >
            {/* The Draggable Header / Title */}
            {organizeState !== 1 && (
            <div 
                className={`p-2.5 rounded-t-xl border border-b-0 border-zinc-700 bg-orange-600 border-white text-white w-96 flex items-center justify-between font-bold text-sm touch-none select-none transition-all ${panelPositions.material.locked ? 'cursor-default' : 'cursor-move'}`}
                onPointerDown={handleMaterialListDragStart}
                onPointerMove={handleMaterialListDragMove}
                onPointerUp={handleMaterialListDragEnd}
                onPointerCancel={handleMaterialListDragEnd}
                onContextMenu={(e) => e.preventDefault()}
            >
                <div className="flex items-center gap-2 flex-1 pointer-events-none">
                    <List size={20} />
                    <span>Lista de Material</span>
                </div>

                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {/* Lock Toggle Button */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); togglePanelLock('material'); }}
                        className={`p-1.5 rounded-lg border transition-all ${panelPositions.material.locked ? 'bg-orange-500 text-white border-orange-300' : 'bg-orange-700/50 text-orange-200 border-orange-500 hover:border-white'}`}
                        title={panelPositions.material.locked ? "Desbloquear Posição" : "Fixar Posição"}
                    >
                        {panelPositions.material.locked ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>

                    {/* Close Button */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowMaterialList(false); }}
                        className="p-1.5 rounded-lg border border-orange-500 hover:border-white bg-orange-700/50 text-white transition-all text-xs"
                    >
                        <X size={12} />
                    </button>
                </div>
            </div>
            )}

            {/* The Drawer Content */}
            <div className={`bg-zinc-900 border border-zinc-700 ${organizeState === 1 ? 'rounded-xl mt-2' : 'rounded-b-xl'} shadow-2xl flex flex-col max-h-[60vh] overflow-hidden transition-all duration-300 ${organizeState === 2 ? 'w-fit' : 'w-96'}`} onPointerDown={(e) => e.stopPropagation()}>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {/* GLOBAL SETTINGS FOR LIST */}
                        <div className="mb-4 bg-black/50 p-3 rounded-lg border border-zinc-800 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-zinc-400 font-bold uppercase mb-1 block">Gap de Solda (mm)</label>
                                    <input type="number" className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-white text-sm" value={weldGap} onChange={(e) => setWeldGap(Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className="text-[10px] text-zinc-400 font-bold uppercase mb-1 block">Grau Padrão (Curvas)</label>
                                    <select className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-white text-sm" value={activeElbowDegree} onChange={(e) => setActiveElbowDegree(Number(e.target.value))}>
                                        <option value="90">90°</option>
                                        <option value="45">45°</option>
                                        <option value="60">60°</option>
                                        <option value="30">30°</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex-1">
                                        <label className="text-[10px] text-zinc-400 font-bold uppercase mb-1 block">Família padrão da curva</label>
                                        <select className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-white text-sm" value={defaultElbowProfile} onChange={(e) => setDefaultElbowProfile(e.target.value as ElbowProfileCode)}>
                                            {ELBOW_PROFILE_OPTIONS.map(option => (
                                                <option key={option.code} value={option.code}>
                                                    {option.label} ({option.construction === 'STANDARD_ELBOW' ? 'Cotovelo padrão' : 'Curva fabricada'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className={`max-w-[150px] rounded-lg border px-3 py-2 text-[10px] ${selectedElbowProfileOption.construction === 'STANDARD_ELBOW' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100' : 'border-orange-500/20 bg-orange-500/10 text-orange-100'}`}>
                                        <span className="block font-bold uppercase tracking-wider">{elbowConstructionLabel}</span>
                                        {selectedElbowProfileOption.shortLabel} • {selectedElbowProfileOption.radiusFactor} x D
                                    </div>
                                </div>
                                <div className="rounded-lg border border-zinc-700 bg-black/60 p-3">
                                    <div className="text-xs font-bold text-white">{selectedElbowProfileOption.usage}</div>
                                    <div className="mt-1 text-[10px] text-zinc-400">{selectedElbowProfileOption.summary}</div>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {ELBOW_PROFILE_OPTIONS.map(option => (
                                        <div key={option.code} className={`rounded-lg border px-3 py-2 text-[10px] ${option.code === defaultElbowProfile ? 'border-emerald-500/40 bg-emerald-500/10 text-white' : 'border-zinc-800 bg-zinc-950/70 text-zinc-300'}`}>
                                            <span className="font-bold">{option.label}</span> • {option.construction === 'STANDARD_ELBOW' ? 'Cotovelo padrão' : 'Curva fabricada'} • {option.summary}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-zinc-400 font-bold uppercase mb-1 block">Tipo de Solda Padrão</label>
                                    <select className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-white text-sm" value={defaultWeldType} onChange={(e) => setDefaultWeldType(e.target.value as DefaultWeldType)}>
                                        <option value="WELD_SHOP">Solda de Oficina</option>
                                        <option value="WELD_FIELD">Solda de Campo</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] text-zinc-400 font-bold uppercase mb-1 block">Norma de Conexões (Tê)</label>
                                    <select className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-white text-sm" value={fittingStandard} onChange={(e) => setFittingStandard(e.target.value)}>
                                        {TEE_STANDARD_OPTIONS.map(option => (
                                            <option key={option.code} value={option.code}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                                <div className={`rounded-lg border p-3 ${isSelectedTeeStandardValidated ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-amber-500/20 bg-amber-500/10'}`}>
                                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">Tê e descontos</div>
                                    <div className="mt-2 text-[10px] text-zinc-100">{teeCalculationWarning}</div>
                                </div>
                                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">Flanges e descontos</div>
                                    <div className="mt-2 text-[10px] text-zinc-100">{flangeCalculationWarning}</div>
                                </div>
                                <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 p-3">
                                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">Válvulas</div>
                                    <div className="mt-2 text-[10px] text-zinc-100">{valveCalculationWarning}</div>
                                </div>
                            </div>

                            <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                                <div>
                                    <label className="text-[10px] text-zinc-400 font-bold uppercase mb-1 block">Norma de Identificação de Fluidos</label>
                                    <select className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-white text-sm" value={fluidIdentificationStandard} onChange={(e) => handleFluidIdentificationStandardChange(e.target.value as FluidIdentificationStandardCode)}>
                                        {FLUID_IDENTIFICATION_STANDARD_OPTIONS.map(option => (
                                            <option key={option.code} value={option.code}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] text-zinc-400 font-bold uppercase mb-1 block">Fluido / Cor Global do Croqui</label>
                                    <select className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-white text-sm" value={fluidIdentificationCode} onChange={(e) => handleFluidIdentificationChange(e.target.value as FluidIdentificationCode)}>
                                        {groupedFluidIdentificationOptions.map(group => (
                                            <optgroup key={group.category} label={group.category}>
                                                {group.options.map(option => (
                                                    <option key={option.code} value={option.code}>{getFluidIdentificationOptionLabel(option, fluidIdentificationStandard)}</option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-3 rounded-lg border border-zinc-700 bg-black/60 p-3">
                                    <div className="h-10 w-10 rounded-lg border border-white/20" style={{ backgroundColor: selectedFluidOption.color }} />
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-white">{selectedFluidOption.fluid}</div>
                                        <div className="text-[10px] text-zinc-400">{selectedFluidOption.description}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <label className="text-[10px] text-zinc-400 font-bold uppercase mb-1 block">Material / Norma do tubo</label>
                                        <select className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-white text-sm" value={pipeMaterialStandard} onChange={(e) => handlePipeMaterialStandardChange(e.target.value as PipeMaterialStandardCode)}>
                                            {PIPE_MATERIAL_STANDARD_OPTIONS.map(option => <option key={option.code} value={option.code}>{option.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="max-w-[180px] rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-[10px] text-cyan-100">
                                        <span className="block font-bold uppercase tracking-wider text-cyan-300">Aplicação</span>
                                        {selectedPipeMaterialOption.usage}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] text-zinc-400 font-bold uppercase mb-1 block">Construção</label>
                                        <select className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-white text-sm" value={pipeConstructionType} onChange={(e) => setPipeConstructionType(e.target.value as PipeConstructionType)}>
                                            {selectedPipeMaterialOption.constructionOptions.map(option => (
                                                <option key={option} value={option}>
                                                    {option === 'COM_COSTURA' ? 'Com costura' : option === 'SEM_COSTURA' ? 'Sem costura' : 'Com ou sem costura'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-zinc-400 font-bold uppercase mb-1 block">Schedule</label>
                                        <select className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-white text-sm" value={defaultPipeSchedule} onChange={(e) => setDefaultPipeSchedule(e.target.value as PipeScheduleCode)}>
                                            {PIPE_SCHEDULE_OPTIONS.map(option => (
                                                <option key={option.code} value={option.code}>{option.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-zinc-400 font-bold uppercase mb-1 block">Acabamento</label>
                                        <select className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-white text-sm" value={pipeFinishType} onChange={(e) => setPipeFinishType(e.target.value as PipeFinishType)}>
                                            {selectedPipeMaterialOption.finishOptions.map(option => (
                                                <option key={option} value={option}>
                                                    {option === 'PRETO' ? 'Preto' : option === 'GALVANIZADO' ? 'Galvanizado' : 'Preto ou galvanizado'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="rounded-lg border border-zinc-700 bg-black/60 p-3">
                                    <div className="text-xs font-bold text-white">{pipeMaterialSummaryLabel}</div>
                                    <div className="mt-1 text-[10px] text-zinc-400">{selectedPipeMaterialOption.summary}</div>
                                    <div className="mt-1 text-[10px] text-cyan-300">
                                        {currentSize}" {selectedPipeScheduleOption.label}: parede {activeScheduleWall.toFixed(2)} mm • DI {activeInternalDiameter.toFixed(2)} mm
                                    </div>
                                    <div className="mt-2 text-[10px] text-amber-300">Atenção: {selectedPipeMaterialOption.avoid}</div>
                                </div>
                            </div>

                            {/* --- FLANGE SMART GUIDE --- */}
                            <div className="bg-zinc-800/80 p-3 rounded border border-zinc-700 flex flex-col gap-4">
                                {/* Controls */}
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-[10px] text-blue-400 font-bold uppercase mb-1 block flex items-center gap-1"><CircleDot size={10}/> Tipo Flange (Global)</label>
                                        <select className="w-full bg-zinc-900 border border-zinc-600 rounded px-2 py-1 text-white text-sm" value={defaultFlangeType} onChange={(e) => setDefaultFlangeType(e.target.value as any)}>
                                            <option value="WN">Pescoço (Weld Neck)</option>
                                            <option value="SO">Sobreposto (Slip-On)</option>
                                            <option value="SW">Encaixe (Socket Weld)</option>
                                            <option value="Blind">Cego (Blind)</option>
                                            <option value="Threaded">Roscado (Threaded)</option>
                                            <option value="LapJoint">Solto (Lap Joint)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-zinc-400 font-bold uppercase mb-1 block">Tipo de Junta (Vedação)</label>
                                        <select className="w-full bg-zinc-900 border border-zinc-600 rounded px-2 py-1 text-white text-sm" value={gasketType} onChange={(e) => setGasketType(e.target.value as any)}>
                                            <option value="NonMetallic">Papelão Hidráulico / Borracha (Plana)</option>
                                            <option value="SemiMetallic">Espiralada / Semi-metálica</option>
                                            <option value="Metallic">Metálica / RTJ (Anel)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-zinc-400 font-bold uppercase mb-1 block">Espessura Junta (mm)</label>
                                        <input type="number" className="w-full bg-zinc-900 border border-zinc-600 rounded px-2 py-1 text-white text-sm" value={gasketThickness} onChange={(e) => setGasketThickness(Number(e.target.value))} />
                                    </div>
                                </div>

                                {/* Info Card Visual */}
                                <div className="bg-black p-3 rounded border border-zinc-700 flex gap-3 items-start">
                                    <div className="w-16 h-16 shrink-0 bg-zinc-900 rounded flex items-center justify-center border border-zinc-800">
                                        <svg viewBox="0 0 40 60" width="40" height="60" fill="#fbbf24">
                                            <path d={FLANGE_METADATA[defaultFlangeType].visualPath} />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-white mb-1">{FLANGE_METADATA[defaultFlangeType].label}</div>
                                        <div className="text-[10px] text-zinc-400 leading-tight mb-2">{FLANGE_METADATA[defaultFlangeType].desc}</div>
                                        
                                        <div className="flex gap-1 flex-wrap">
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded text-black font-bold ${FLANGE_METADATA[defaultFlangeType].pressure.includes('Alta') ? 'bg-red-400' : 'bg-green-400'}`}>
                                                    {FLANGE_METADATA[defaultFlangeType].pressure}
                                                </span>
                                                <span className="text-[9px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300 border border-zinc-700">
                                                    ASME B16.5
                                                </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-2 pt-2 border-t border-zinc-700">
                                <label className="text-[10px] text-zinc-400 font-bold uppercase mb-1 block">Alterar Diâmetro Global (Tudo)</label>
                                    <select className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-white text-sm" value={currentSize} onChange={(e) => handleGlobalSizeChange(e.target.value)}>
                                    {AVAILABLE_SIZES.map(s => <option key={s} value={s}>{formatPipeSize(s)}</option>)}
                                </select>
                                <p className="text-[10px] text-yellow-600 mt-1">*Cuidado: Isso altera todos os itens do desenho.</p>
                            </div>
                        </div>

                        <div className="mb-4 grid grid-cols-2 gap-2">
                            <div className="col-span-2 flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
                                <div className="h-10 w-10 rounded-lg border border-white/20" style={{ backgroundColor: selectedFluidOption.color }} />
                                <div className="flex-1">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Fluido da linha</div>
                                    <div className="text-sm font-bold text-white">{selectedFluidOption.fluid}</div>
                                    <div className="text-[10px] text-zinc-400">{fluidIdentificationStandard} • {selectedFluidOption.description}</div>
                                </div>
                            </div>
                            <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Solda padrão</div>
                                <div className="text-sm font-bold text-white">{defaultWeldLabel}</div>
                            </div>
                            <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Junta aplicada</div>
                                <div className="text-sm font-bold text-white">{gasketTypeLabel} • {gasketThickness} mm</div>
                            </div>
                                <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Norma de Tê</div>
                                    <div className="text-sm font-bold text-white">{fittingStandard}</div>
                                </div>
                                <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Norma de fluido</div>
                                    <div className="text-sm font-bold text-white">{fluidIdentificationStandard}</div>
                                </div>
                                <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Curva padrão</div>
                                    <div className="text-sm font-bold text-white">{elbowProfileSummaryLabel}</div>
                                    <div className="text-[10px] text-zinc-400">{selectedElbowProfileOption.usage}</div>
                                </div>
                            <div className="col-span-2 rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Material do tubo</div>
                                <div className="text-sm font-bold text-white">{pipeMaterialSummaryLabel}</div>
                                <div className="text-[10px] text-zinc-400">{selectedPipeMaterialOption.label} • {selectedPipeMaterialOption.usage}</div>
                            </div>
                            <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Flange / Gap</div>
                                <div className="text-sm font-bold text-white">{defaultFlangeType} • {weldGap} mm</div>
                            </div>
                        </div>

                        {/* TABLE */}
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-xs text-zinc-500 border-b border-zinc-800 uppercase">
                                    <th className="py-2 pl-2">Item</th>
                                    <th className="py-2">Descrição</th>
                                    <th className="py-2 text-right pr-2">Qtd / Comp.</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm text-zinc-300">
                                {/* PIPES */}
                                {segments.length > 0 && (
                                    <>
                                        <tr className="bg-zinc-800/30"><td colSpan={3} className="py-1 px-2 text-[10px] font-bold text-blue-400 uppercase">Tubos</td></tr>
                                        {segments.map((seg, idx) => {
                                            const cutInfo = calculateCutLength(seg);
                                            const isExpanded = expandedRowId === seg.id;
                                            return (
                                                <React.Fragment key={seg.id}>
                                                    <tr className="border-b border-zinc-800/50 hover:bg-zinc-800/50 cursor-pointer" onClick={() => setExpandedRowId(isExpanded ? null : seg.id)}>
                                                        <td className="py-2 pl-2 font-mono text-zinc-500">#{idx + 1}</td>
                                                        <td className="py-2">
                                                            <div className="flex items-center gap-2 font-bold text-white">
                                                                <span className="h-2.5 w-2.5 rounded-full border border-white/20" style={{ backgroundColor: seg.color || selectedFluidOption.color }} />
                                                                <span>Tubo {formatPipeSize(seg.size)} {selectedPipeMaterialOption.label} {seg.spec || selectedPipeScheduleOption.label}</span>
                                                            </div>
                                                            <div className="text-[10px] text-zinc-500">{pipeConstructionLabel} • {pipeFinishLabel} • Curva base {selectedElbowProfileOption.shortLabel}</div>
                                                            <div className="text-xs text-zinc-500">{getPipeConnections(seg)}</div>
                                                        </td>
                                                        <td className="py-2 text-right pr-2">
                                                            <div className="font-mono text-green-400 font-bold">{cutInfo.value}mm</div>
                                                        </td>
                                                    </tr>
                                                    {isExpanded && (
                                                        <tr className="bg-black/40">
                                                            <td colSpan={3} className="p-3 text-xs text-zinc-400 font-mono">
                                                                <div className="flex gap-2 items-start">
                                                                    <Info size={14} className="mt-0.5 text-blue-500 shrink-0"/>
                                                                    <div>
                                                                        <span className="block font-bold text-blue-400 mb-1">Cálculo de Corte:</span>
                                                                        {cutInfo.details}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </>
                                )}

                                {/* FITTINGS */}
                                {fittings.length > 0 && (
                                    <>
                                            <tr className="bg-zinc-800/30"><td colSpan={3} className="py-1 px-2 text-[10px] font-bold text-green-400 uppercase mt-2">Conexões</td></tr>
                                            {(() => {
                                                // Aggregate Fittings
                                                const counts: Record<string, { count: number, label: string }> = {};
                                                fittings.forEach(fit => {
                                                    if (fit.type === 'DIMENSION_WIDTH') return;
                                                    const key = `${fit.type}-${fit.size}-${fit.degree || ''}-${fit.elbowProfile || ''}`;
                                                    if (!counts[key]) {
                                                        let label = `${getFittingDisplayLabel(fit)} ${fit.size ? formatPipeSize(fit.size) : ''}`.trim();
                                                        if (fit.type === 'WELD_SHOP') {
                                                            label = 'Solda de Oficina';
                                                        }
                                                        if (fit.type === 'WELD_FIELD') {
                                                            label = 'Solda de Campo';
                                                        }
                                                        if ((fit.type === 'ELBOW_LR' || fit.type === 'ELBOW_SR') && fit.degree) {
                                                            const profile = getElbowProfileOption(fit);
                                                            label += ` (${fit.degree}° • ${profile.construction === 'STANDARD_ELBOW' ? 'Cotovelo padrão' : 'Curva fabricada'})`;
                                                        }
                                                        if (fit.type.includes('FLANGE')) {
                                                            const typeSuffix = fit.type === 'FLANGE_WN' ? 'WN' : (fit.type === 'FLANGE_SO' ? 'SO' : defaultFlangeType);
                                                            const friendlySuffix = typeSuffix === 'LapJoint' ? 'Solto' : (typeSuffix === 'Threaded' ? 'Roscado' : typeSuffix);
                                                            label += ` (${friendlySuffix} 150# • Junta ${gasketTypeLabel} ${gasketThickness}mm)`;
                                                        }
                                                        counts[key] = { count: 0, label };
                                                    }
                                                    counts[key].count++;
                                                });
                                                
                                                return Object.values(counts).map((item, i) => (
                                                    <tr key={i} className="border-b border-zinc-800/50">
                                                        <td className="py-2 pl-2 text-zinc-500">•</td>
                                                        <td className="py-2">{item.label}</td>
                                                        <td className="py-2 text-right pr-2 font-mono font-bold text-white">{item.count} un</td>
                                                    </tr>
                                                ));
                                            })()}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
        </div>
        )}


        {/* --- QUICK CUTS LIST FLOATING TOGGLE MENU (DRAGGABLE) --- */}
        {showQuickCuts && organizeState !== 3 && (
        <div 
            style={organizeState === 2 ? { top: panelPositions.quickCuts.y, right: 10 } : { top: panelPositions.quickCuts.y, left: panelPositions.quickCuts.x }}
            className={`absolute z-[66] flex flex-col ${organizeState === 2 ? 'items-end' : 'items-start'}`}
        >
            {/* The Draggable Toggle Button */}
            {organizeState !== 1 && (
            <div 
                className={`p-2.5 rounded-t-xl border border-b-0 border-zinc-700 bg-cyan-600 border-white text-white w-80 flex items-center justify-between font-bold text-sm touch-none select-none transition-all ${panelPositions.quickCuts.locked ? 'cursor-default' : 'cursor-move'}`}
                onPointerDown={handleQuickCutsDragStart}
                onPointerMove={handleQuickCutsDragMove}
                onPointerUp={handleQuickCutsDragEnd}
                onPointerCancel={handleQuickCutsDragEnd}
                onContextMenu={(e) => e.preventDefault()}
            >
                <div className="flex items-center gap-2 flex-1 pointer-events-none">
                    <Scissors size={20} />
                    <span>Cortes Rápidos</span>
                </div>

                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {/* Lock Toggle Button */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); togglePanelLock('quickCuts'); }}
                        className={`p-1.5 rounded-lg border transition-all ${panelPositions.quickCuts.locked ? 'bg-cyan-500 text-white border-cyan-300' : 'bg-cyan-700/50 text-cyan-200 border-cyan-500 hover:border-white'}`}
                        title={panelPositions.quickCuts.locked ? "Desbloquear Posição" : "Fixar Posição"}
                    >
                        {panelPositions.quickCuts.locked ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>

                    {/* Close Button */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowQuickCuts(false); }}
                        className="p-1.5 rounded-lg border border-cyan-500 hover:border-white bg-cyan-700/50 text-white transition-all text-xs"
                    >
                        <X size={12} />
                    </button>
                </div>
            </div>
            )}
            
            {/* Content box */}
            <div className={`bg-black/90 backdrop-blur-sm border border-zinc-700 ${organizeState === 1 ? 'rounded-xl mt-2' : 'rounded-b-xl'} shadow-2xl w-80 overflow-hidden`} onPointerDown={(e) => e.stopPropagation()}>
                <div className="p-3 border-b border-zinc-805 flex justify-between items-center text-[10px] text-zinc-500">
                    <span>DETALHAMENTO DE CORTES</span>
                    <div className="flex gap-2">
                         <input type="range" min="0.3" max="1.0" step="0.1" value={quickCutsOpacity} onChange={(e)=>setQuickCutsOpacity(parseFloat(e.target.value))} className="w-20" />
                    </div>
                </div>
                <div className="p-2 overflow-x-auto custom-scrollbar flex items-start gap-2">
                    {segments.length === 0 ? (
                        <span className="text-[10px] text-zinc-500 italic p-1">Nenhum tubo desenhado.</span>
                    ) : (
                        segments.map((seg, idx) => {
                            const cutInfo = calculateCutLength(seg);
                            const isExpanded = expandedQuickCutId === seg.id;
                            return (
                                <div key={seg.id} className="flex-shrink-0 w-[220px]">
                                    <button
                                        onClick={() => setExpandedQuickCutId(isExpanded ? null : seg.id)}
                                        className={`w-full bg-black/60 border rounded px-2 py-2 flex items-center gap-2 transition-colors text-left ${isExpanded ? 'border-blue-500 bg-black/90' : 'border-zinc-700 hover:bg-black/80'}`}
                                    >
                                        <span className="text-[10px] font-bold text-blue-500">#{idx + 1}</span>
                                        <div className="w-px h-4 bg-zinc-700"></div>
                                        <span className="text-xs font-mono font-black text-green-400">{cutInfo.value}mm</span>
                                    </button>
                                    {isExpanded && (
                                        <div className="mt-2 rounded-lg border border-zinc-700 bg-zinc-950/95 p-3 text-[10px] text-zinc-300 shadow-inner">
                                            <div className="mb-2 flex items-center gap-2 font-bold uppercase tracking-wider text-blue-400">
                                                <Info size={12} />
                                                Memorial
                                            </div>
                                            <div className="font-mono leading-relaxed break-words">{cutInfo.details}</div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
        )}

        {/* --- UNIFIED CONTROL PAD (X-LAYOUT + SIDE ZOOMS + VERTICAL STACK) --- */}
        {organizeState !== 3 && (
        <div className={`fixed bottom-[74px] right-2 sm:bottom-24 sm:right-4 flex flex-col items-center gap-4 z-40 transition-all duration-300 transform scale-[0.72] sm:scale-100 origin-bottom-right ${showMaterialList ? 'mb-40' : ''}`} onPointerDown={(e) => e.stopPropagation()}>
             
             {/* ROW 1: CONTROLS */}
             <div className="flex items-center gap-2 pointer-events-auto">
                
                {/* 1. Zoom Out & Fit (Left of X) */}
                <div className="flex flex-col gap-2">
                    <button onClick={handleZoomToFit} className="w-12 h-12 bg-zinc-800 rounded-full border border-zinc-600 shadow-xl flex items-center justify-center active:bg-zinc-700 active:scale-95 transition-all text-zinc-400 hover:text-white" title="Ajustar à Tela">
                        <Maximize size={20} />
                    </button>
                    <button onClick={handleZoomOut} className="w-12 h-12 bg-zinc-800 rounded-full border border-zinc-600 shadow-xl flex items-center justify-center active:bg-zinc-700 active:scale-95 transition-all text-zinc-400 hover:text-white" title="Menos Zoom">
                        <ZoomOut size={20} />
                    </button>
                </div>

                {/* 2. X-Pad (Middle) */}
                <div className="w-32 h-32 relative bg-zinc-900/50 rounded-full border border-zinc-800 shadow-2xl backdrop-blur-sm">
                    {/* Visual Guide X */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                        <div className="w-full h-px bg-zinc-500 rotate-45 absolute"></div>
                        <div className="w-full h-px bg-zinc-500 -rotate-45 absolute"></div>
                    </div>
                    
                    {/* West (Top-Left) */}
                    <button onClick={(e) => { e.stopPropagation(); moveCursor('x', -1); }} className="absolute top-2 left-2 w-10 h-10 bg-black border border-zinc-600 rounded-lg flex items-center justify-center active:bg-zinc-800 active:border-green-500 shadow-lg group z-10">
                        <span className="text-xs font-black text-zinc-500 group-hover:text-green-400">O</span>
                    </button>
                    
                    {/* North (Top-Right) */}
                    <button onClick={(e) => { e.stopPropagation(); moveCursor('y', -1); }} className="absolute top-2 right-2 w-10 h-10 bg-black border border-zinc-600 rounded-lg flex items-center justify-center active:bg-zinc-800 active:border-green-500 shadow-lg group z-10">
                        <span className="text-xs font-black text-zinc-500 group-hover:text-green-400">N</span>
                    </button>
                    
                    {/* South (Bottom-Left) */}
                    <button onClick={(e) => { e.stopPropagation(); moveCursor('y', 1); }} className="absolute bottom-2 left-2 w-10 h-10 bg-black border border-zinc-600 rounded-lg flex items-center justify-center active:bg-zinc-800 active:border-green-500 shadow-lg group z-10">
                        <span className="text-xs font-black text-zinc-500 group-hover:text-green-400">S</span>
                    </button>
                    
                    {/* East (Bottom-Right) */}
                    <button onClick={(e) => { e.stopPropagation(); moveCursor('x', 1); }} className="absolute bottom-2 right-2 w-10 h-10 bg-black border border-zinc-600 rounded-lg flex items-center justify-center active:bg-zinc-800 active:border-green-500 shadow-lg group z-10">
                        <span className="text-xs font-black text-zinc-500 group-hover:text-green-400">L</span>
                    </button>
                    
                    {/* Center Decoration */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-black rounded-full border border-zinc-700 flex items-center justify-center z-0">
                        <CompassIcon size={16} className="text-zinc-600"/>
                    </div>
                </div>

                {/* 3. Zoom In (Right of X) */}
                <button onClick={handleZoomIn} className="w-12 h-12 bg-zinc-800 rounded-full border border-zinc-600 shadow-xl flex items-center justify-center active:bg-zinc-700 active:scale-95 transition-all text-zinc-400 hover:text-white">
                    <ZoomIn size={20} />
                </button>

                {/* 4. Vertical Stack (Up / Check / Down) */}
                <div className="flex flex-col gap-1 ml-2 bg-zinc-900 p-1.5 rounded-xl border border-zinc-700 shadow-xl">
                   {/* UP */}
                   <button onClick={(e) => { e.stopPropagation(); moveCursor('z', 1); }} className="w-12 h-10 bg-zinc-800 border border-zinc-600 rounded-lg flex items-center justify-center active:bg-zinc-700 active:border-blue-500 transition-all shadow-md group">
                        <ChevronUp size={24} className="text-zinc-400 group-hover:text-blue-400"/>
                   </button>
                   
                   {/* CONFIRM / CHECK (Middle) */}
                   <button 
                        onClick={handlePointConfirm}
                        className="w-12 h-12 bg-blue-600 rounded-xl shadow-lg flex items-center justify-center text-white active:scale-95 transition-transform border border-blue-400 hover:bg-blue-500 my-1"
                    >
                        {isFittingTool ? <Check size={28} /> : <Plus size={28} />}
                    </button>

                   {/* DOWN */}
                   <button onClick={(e) => { e.stopPropagation(); moveCursor('z', -1); }} className="w-12 h-10 bg-zinc-800 border border-zinc-600 rounded-lg flex items-center justify-center active:bg-zinc-700 active:border-blue-500 transition-all shadow-md group">
                        <ChevronDown size={24} className="text-zinc-400 group-hover:text-blue-400"/>
                   </button>
                </div>
             </div>

             {/* ROW 2: HISTORY (BELOW) */}
             <div className="flex gap-2 pointer-events-auto justify-center w-full">
                <button 
                    onClick={handleUndo} 
                    className="w-12 h-12 bg-zinc-900 text-zinc-400 rounded-xl hover:bg-zinc-800 border border-zinc-700 active:border-white disabled:opacity-30 flex items-center justify-center shadow-lg transition-all" 
                    disabled={history.past.length === 0}
                    title="Desfazer"
                >
                    <Undo2 size={20} />
                </button>
                
                <button 
                    onClick={handleCenterView} 
                    className="w-12 h-12 bg-zinc-900 text-blue-400 rounded-xl hover:bg-zinc-800 border border-zinc-700 active:border-white shadow-lg flex items-center justify-center transition-all" 
                    title="Centralizar"
                >
                    <AlignCenter size={20} />
                </button>

                <button 
                    onClick={() => window.location.reload()} 
                    className="w-12 h-12 bg-zinc-900 text-green-400 rounded-xl hover:bg-zinc-800 border border-zinc-700 active:border-white shadow-lg flex items-center justify-center transition-all" 
                    title="Atualizar App"
                >
                    <RefreshCw size={18} />
                </button>

                <button 
                    onClick={handleRedo} 
                    className="w-12 h-12 bg-zinc-900 text-zinc-400 rounded-xl hover:bg-zinc-800 border border-zinc-700 active:border-white disabled:opacity-30 flex items-center justify-center shadow-lg transition-all" 
                    disabled={history.future.length === 0}
                    title="Refazer"
                >
                    <Redo2 size={20} />
                </button>
             </div>
        </div>
        )}

        {/* --- CONTEXTUAL ACTIONS (DELETE / ROTATE) --- */}
        {(selectedSegmentId || selectedFittingId) && organizeState !== 3 && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 p-2 rounded-xl shadow-2xl flex gap-2 z-50 animate-in slide-in-from-bottom-4">
                 <button onClick={deleteSelection} className="p-2 bg-red-900/50 text-red-400 rounded-lg hover:bg-red-900 border border-red-900"><Trash2 size={20}/></button>
                 
                 {selectedFittingId && (
                     <>
                        <div className="w-px bg-zinc-700 mx-1"></div>
                        <button onClick={() => rotateSelectedFitting(-30)} className="p-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700"><RotateCcw size={20}/></button>
                        <button onClick={() => rotateSelectedFitting(30)} className="p-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700"><RotateCw size={20}/></button>
                        <button onClick={flipSelectedFitting} className="p-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700"><FlipHorizontal size={20}/></button>
                        {selectedFitting && (selectedFitting.type === 'ELBOW_LR' || selectedFitting.type === 'ELBOW_SR') && (
                            <select
                                value={getElbowProfileOption(selectedFitting).code}
                                onChange={(e) => updateSelectedFittingElbowProfile(e.target.value as ElbowProfileCode)}
                                className="bg-black border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white"
                                title="Família de raio da curva selecionada"
                            >
                                {ELBOW_PROFILE_OPTIONS.map(option => (
                                    <option key={option.code} value={option.code}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        )}
                        
                        <div className="w-px bg-zinc-700 mx-1"></div>
                        {/* Quick Direction Set */}
                        <div className="grid grid-cols-3 gap-1">
                            {['N','S','U','D','E','W'].map(d => (
                                <button key={d} onClick={() => setFittingDirection(d as any)} className="w-6 h-6 flex items-center justify-center bg-black border border-zinc-700 text-[10px] text-zinc-400 rounded hover:text-white hover:border-white">
                                    {d}
                                </button>
                            ))}
                        </div>
                     </>
                 )}

                 {selectedSegmentId && (
                     <>
                        <div className="w-px bg-zinc-700 mx-1"></div>
                        <button 
                            onClick={() => toggleDimensionVisibility(selectedSegmentId)} 
                            className={`p-2 rounded-lg border ${hiddenDimensionIds.includes(selectedSegmentId) ? 'bg-zinc-800 text-zinc-500 border-zinc-700' : 'bg-blue-900/30 text-blue-400 border-blue-900'}`}
                            title={hiddenDimensionIds.includes(selectedSegmentId) ? "Mostrar Cota" : "Ocultar Cota"}
                        >
                            {hiddenDimensionIds.includes(selectedSegmentId) ? <EyeOff size={20}/> : <Eye size={20}/>}
                        </button>
                     </>
                 )}
            </div>
        )}

        {/* --- EDIT DIMENSION MODAL --- */}
        {editingSegmentId && (
            <div className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center">
                <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl shadow-2xl w-80 animate-in zoom-in-95">
                    <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2"><Ruler size={20} className="text-safety-yellow"/> Editar Medida</h3>
                    <input 
                        type="number" 
                        autoFocus
                        className="w-full bg-black border border-zinc-600 rounded-lg p-4 text-2xl text-center text-white font-mono mb-4 focus:border-safety-yellow outline-none" 
                        value={editValue} 
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && submitEditLength()}
                    />
                    <div className="flex gap-2">
                        <button onClick={() => setEditingSegmentId(null)} className="flex-1 py-3 bg-zinc-800 rounded-lg text-zinc-300 font-bold">Cancelar</button>
                        <button onClick={submitEditLength} className="flex-1 py-3 bg-safety-yellow text-black rounded-lg font-bold">Confirmar</button>
                    </div>
                </div>
            </div>
        )}

        {/* --- PROJECT MANAGER MODAL --- */}
        {showProjectModal && (
            <div className="absolute inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95">
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                        <h3 className="text-white font-bold flex items-center gap-2"><FolderOpen size={20}/> Projetos Salvos</h3>
                        <button onClick={() => setShowProjectModal(false)}><X size={20} className="text-zinc-500 hover:text-white"/></button>
                    </div>
                    
                    <div className="p-4 bg-zinc-800/50 border-b border-zinc-800">
                        <label className="text-xs text-zinc-400 font-bold uppercase block mb-2">Projeto Atual</label>
                        <div className="flex gap-2">
                            <input 
                                className="flex-1 bg-black border border-zinc-700 rounded-lg p-2 text-white" 
                                placeholder="Nome do projeto..." 
                                value={newProjectName} 
                                onChange={e => setNewProjectName(e.target.value)}
                            />
                            <button onClick={handleSmartSaveToDisk} className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-500" title="Salvar Projeto">
                                <Save size={20} />
                            </button>
                            <button onClick={handleClearCanvas} className="bg-red-600/80 text-white p-2 rounded-lg hover:bg-red-600" title="Limpar Croqui / Novo Projeto">
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {savedProjects.length === 0 && (
                            <div className="text-center py-8 text-zinc-500">Nenhum projeto salvo.</div>
                        )}
                        {savedProjects.map(p => (
                            <div key={p.id} onClick={(e) => handleLoadProject(e, p)} className="bg-black border border-zinc-800 p-3 rounded-xl flex justify-between items-center hover:border-zinc-600 cursor-pointer group">
                                <div>
                                    <div className="font-bold text-zinc-200">{p.name}</div>
                                    <div className="text-xs text-zinc-500 flex items-center gap-1"><Calendar size={10}/> {new Date(p.updatedAt).toLocaleDateString()}</div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); handleDownloadBackup(p); }} className="p-2 bg-zinc-800 text-blue-400 rounded-lg hover:bg-zinc-700"><Download size={16}/></button>
                                    <button onClick={(e) => handleDeleteProject(e, p.id)} className="p-2 bg-zinc-800 text-red-400 rounded-lg hover:bg-zinc-700"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 border-t border-zinc-800 flex justify-between bg-zinc-800/30 rounded-b-2xl">
                         <button onClick={handleSmartOpenFromDisk} className="text-xs text-blue-400 font-bold flex items-center gap-1 hover:text-blue-300">
                             <FileUp size={14}/> Importar Backup (.json)
                         </button>
                         {/* Hidden File Input for fallback */}
                         <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept=".json" 
                            onChange={handleFileUpload}
                         />
                    </div>
                </div>
            </div>
        )}

        {/* --- PLATE SKETCHER OVERLAY --- */}
        {showPlateSketch && (
            <PlateSketcher onClose={() => setShowPlateSketch(false)} />
        )}

        {/* --- PHOTO FRAME OVERLAY --- */}
        {showPhotoFrame && (
            <PhotoFrame 
                onClose={() => setShowPhotoFrame(false)} 
                onGenerate3D={handleGenerate3DFromImage}
            />
        )}

        {/* --- AI LOADING OVERLAY --- */}
        {isGenerating3D && (
            <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mb-4"></div>
                <h3 className="text-xl font-bold text-white mb-2">Analisando Desenho...</h3>
                <p className="text-zinc-400 text-center max-w-xs">A Inteligência Artificial está convertendo seu esboço em um modelo 3D.</p>
            </div>
        )}

    </div>
  );
};

export default IsoSketcher;



