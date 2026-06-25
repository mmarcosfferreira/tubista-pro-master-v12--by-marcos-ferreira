export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export type ComponentCategory = 
  | 'PIPE' 
  | 'PIPE_FLEX'
  | 'VALVE_GATE' 
  | 'VALVE_GLOBE' 
  | 'VALVE_BALL' 
  | 'VALVE_CHECK' 
  | 'VALVE_CONTROL'
  | 'REDUCER_CON' 
  | 'REDUCER_ECC' 
  | 'FLANGE_WN' 
  | 'FLANGE_SO' 
  | 'FLANGE_BLIND' 
  | 'FLANGE_FLAT'
  | 'ELBOW_LR' 
  | 'ELBOW_SR'
  | 'ELBOW_CUSTOM'
  | 'TEE'
  | 'CAP'
  | 'WELD_SHOP'
  | 'WELD_FIELD'
  | 'FLOW_ARROW'
  | 'DIMENSION_WIDTH';

export type HatchType = 'NONE' | 'VERTICAL' | 'HORIZONTAL' | 'DIAGONAL';

export interface PipeSegment {
  id: string;
  start: Point3D;
  end: Point3D;
  size: number; // NPS (Inlet)
  size2?: number; // NPS (Outlet - for reducers)
  type: ComponentCategory;
  spec?: string;
  customLength?: string; // User edited dimension
  hatchType?: HatchType; // Property to determine triangle draw
  angleLabel?: string; // The text to show (e.g. "45°")
  spoolId?: string; // Tag ID for Spooling
  degree?: number; // Angle for elbows (e.g. 90, 45, 11.25)
  color?: string; // Custom highlight color
}

export interface IsoFitting {
  id: string;
  position: Point3D;
  type: ComponentCategory;
  rotation: number; // Visual rotation in degrees
  flip?: boolean; // Mirror the component (scale Y -1)
  degree?: number; // For elbows (90, 45)
  size?: string;
  color?: string; // Custom highlight color
  elbowProfile?: ElbowProfileCode;
}

export interface HatchPoly {
  id: string;
  points: Point3D[];
  type: HatchType;
  density: number; // 1 to 10
  angleLabel?: string; // Optional label for slope angles (e.g., "45°")
}

export interface IsoPlate {
  id: string;
  position: Point3D;
  width: number; // mm
  length: number; // mm
  thickness: number; // mm
  material: 'CarbonSteel' | 'StainlessSteel' | 'Aluminum';
  color?: string;
}

export type GasketType = 'NonMetallic' | 'Metallic' | 'SemiMetallic';
export type FlangeType = 'WN' | 'SO' | 'SW' | 'Blind' | 'Threaded' | 'LapJoint';
export type DefaultWeldType = 'WELD_SHOP' | 'WELD_FIELD';
export type FluidIdentificationCode = 'AGUA_POTAVEL' | 'AGUA_INDUSTRIAL' | 'AGUA_RESFRIAMENTO' | 'AGUA_QUENTE' | 'AGUA_GELADA' | 'VAPOR' | 'CONDENSADO' | 'AR_COMPRIMIDO' | 'AR_INSTRUMENTO' | 'VACUO' | 'GAS_NATURAL' | 'OXIGENIO' | 'NITROGENIO' | 'GLP' | 'GNL' | 'ACIDOS' | 'ALCALIS' | 'INCENDIO' | 'INFLAMAVEIS' | 'OLEO_COMBUSTIVEL' | 'ESGOTO_EFLUENTE';
export type FluidIdentificationStandardCode = 'ABNT NBR 6493' | 'ASME A13.1' | 'BS 1710' | 'ISO 14726';
export type PipeMaterialStandardCode = 'ASTM_A53' | 'ASTM_A106' | 'ABNT_NBR_5590' | 'ABNT_NBR_5580';
export type PipeConstructionType = 'COM_COSTURA' | 'SEM_COSTURA' | 'AMBOS';
export type PipeFinishType = 'PRETO' | 'GALVANIZADO' | 'AMBOS';
export type PipeScheduleCode = 'SCH_40' | 'SCH_80' | 'STD' | 'XS';
export type ElbowConstructionClass = 'STANDARD_ELBOW' | 'FABRICATED_BEND';
export type ElbowProfileCode = 'SR_1D' | 'LR_1_5D' | '3D' | '5D' | '10D';
export type CalculationValidationLevel = 'VALIDATED' | 'REFERENCE_ONLY';
export type PipeConnectionType = 'BUTT_WELD' | 'SOCKET_WELD' | 'THREADED';

export interface ProjectSettings {
  weldGap: number;
  fittingStandard: string;
  defaultFlangeType: FlangeType;
  gasketType: GasketType;
  gasketThickness: number;
  defaultWeldType: DefaultWeldType;
  fluidIdentificationStandard: string;
  fluidIdentificationCode: FluidIdentificationCode;
  fluidColor: string;
  pipeMaterialStandard: PipeMaterialStandardCode;
  pipeConstructionType: PipeConstructionType;
  pipeFinishType: PipeFinishType;
  defaultPipeSchedule: PipeScheduleCode;
  defaultElbowProfile: ElbowProfileCode;
  connectionType: PipeConnectionType;
}

export interface ProjectData {
  id: string;
  name: string;
  updatedAt: number;
  segments: PipeSegment[];
  fittings?: IsoFitting[]; // New array for node-based components
  hatches?: HatchPoly[];
  plates?: IsoPlate[]; // New array for 3D plates
  settings?: ProjectSettings;
}

export interface ScheduleItem {
  nps: string;
  od: number; // mm
  sch40_wall: number;
  sch80_wall: number;
  longRadius90: number; // Center to face
}

export interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
  isSameEntry(other: FileSystemHandle): Promise<boolean>;
}

export interface FileSystemFileHandle extends FileSystemHandle {
  kind: 'file';
  getFile(): Promise<File>;
  createWritable(options?: any): Promise<FileSystemWritableFileStream>;
}

export interface FileSystemWritableFileStream extends WritableStream {
  write(data: any): Promise<void>;
  seek(position: number): Promise<void>;
  truncate(size: number): Promise<void>;
  close(): Promise<void>;
}

