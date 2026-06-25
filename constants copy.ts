import { CalculationValidationLevel, ElbowConstructionClass, ElbowProfileCode, FluidIdentificationCode, FluidIdentificationStandardCode, PipeConstructionType, PipeFinishType, PipeMaterialStandardCode, PipeScheduleCode, PipeConnectionType, ScheduleItem } from './types';

// Simplified Pipe Schedule (Metric - mm)
export const PIPE_SCHEDULE: Record<string, ScheduleItem> = {
  "0.5": { nps: "1/2", od: 21.3, sch40_wall: 2.77, sch80_wall: 3.73, longRadius90: 38 },
  "0.75": { nps: "3/4", od: 26.7, sch40_wall: 2.87, sch80_wall: 3.91, longRadius90: 38 },
  "1": { nps: "1", od: 33.4, sch40_wall: 3.38, sch80_wall: 4.55, longRadius90: 38 },
  "1.25": { nps: "1 1/4", od: 42.2, sch40_wall: 3.56, sch80_wall: 4.85, longRadius90: 48 },
  "1.5": { nps: "1 1/2", od: 48.3, sch40_wall: 3.68, sch80_wall: 5.08, longRadius90: 57 },
  "2": { nps: "2", od: 60.3, sch40_wall: 3.91, sch80_wall: 5.54, longRadius90: 76 },
  "2.5": { nps: "2 1/2", od: 73.0, sch40_wall: 5.16, sch80_wall: 7.01, longRadius90: 95 },
  "3": { nps: "3", od: 88.9, sch40_wall: 5.49, sch80_wall: 7.62, longRadius90: 114 },
  "4": { nps: "4", od: 114.3, sch40_wall: 6.02, sch80_wall: 8.56, longRadius90: 152 },
  "6": { nps: "6", od: 168.3, sch40_wall: 7.11, sch80_wall: 10.97, longRadius90: 229 },
  "8": { nps: "8", od: 219.1, sch40_wall: 8.18, sch80_wall: 12.70, longRadius90: 305 },
  "10": { nps: "10", od: 273.0, sch40_wall: 9.27, sch80_wall: 15.09, longRadius90: 381 },
  "12": { nps: "12", od: 323.8, sch40_wall: 10.31, sch80_wall: 17.48, longRadius90: 457 },
  "14": { nps: "14", od: 355.6, sch40_wall: 11.13, sch80_wall: 19.05, longRadius90: 533 },
  "16": { nps: "16", od: 406.4, sch40_wall: 12.70, sch80_wall: 21.44, longRadius90: 610 },
  "18": { nps: "18", od: 457.2, sch40_wall: 14.27, sch80_wall: 23.83, longRadius90: 686 },
  "20": { nps: "20", od: 508.0, sch40_wall: 15.09, sch80_wall: 26.19, longRadius90: 762 },
};

export const PIPE_SCHEDULE_OPTIONS: Array<{
  code: PipeScheduleCode;
  label: string;
  wallField: keyof Pick<ScheduleItem, 'sch40_wall' | 'sch80_wall'>;
  description: string;
}> = [
  {
    code: 'STD',
    label: 'STD',
    wallField: 'sch40_wall',
    description: 'Atalho de oficina para parede padrão, tratado no app como referência equivalente ao SCH 40 nesta base.',
  },
  {
    code: 'SCH_40',
    label: 'SCH 40',
    wallField: 'sch40_wall',
    description: 'Parede padrão de uso geral, bastante comum em utilidades e processo leve.',
  },
  {
    code: 'XS',
    label: 'XS',
    wallField: 'sch80_wall',
    description: 'Atalho de oficina para parede extra strong, tratado no app como referência equivalente ao SCH 80 nesta base.',
  },
  {
    code: 'SCH_80',
    label: 'SCH 80',
    wallField: 'sch80_wall',
    description: 'Parede mais espessa para serviço mais robusto, maior pressão ou reserva mecânica.',
  },
];

export const DEFAULT_PIPE_SCHEDULE_CODE: PipeScheduleCode = 'SCH_40';
export const PIPE_SCHEDULE_REFERENCE_NPS = '4';

export const getPipeScheduleOption = (code: PipeScheduleCode) =>
  PIPE_SCHEDULE_OPTIONS.find(option => option.code === code) || PIPE_SCHEDULE_OPTIONS[0];

export const getPipeScheduleWall = (item: ScheduleItem, code: PipeScheduleCode) => {
  const option = getPipeScheduleOption(code);
  return item[option.wallField];
};

export const getPipeScheduleLabel = (code: PipeScheduleCode) => getPipeScheduleOption(code).label;

// Standard Valve Face-to-Face Dimensions (ANSI B16.10 Class 150 Gate/Globe approx)
export const VALVE_FACE_TO_FACE: Record<string, number> = {
  "0.5": 108,
  "0.75": 117,
  "1": 127,
  "1.25": 140,
  "1.5": 165,
  "2": 178,
  "2.5": 190,
  "3": 203,
  "4": 229,
  "6": 267,
  "8": 292,
  "10": 330,
  "12": 356,
  "14": 381,
  "16": 406,
  "18": 432,
  "20": 457
};

// Tee Center-to-Face Dimensions based on provided table
export const TEE_CENTER_TO_FACE: Record<string, Record<string, number>> = {
  'ANSI B16.9': {
    "0.5": 25.40,
    "0.75": 28.58,
    "1": 38.10,
    "1.25": 47.62,
    "1.5": 57.15,
    "2": 63.50,
    "2.5": 76.20,
    "3": 85.72,
    "3.5": 95.25,
    "4": 104.78,
    "5": 123.83,
    "6": 142.90,
    "8": 177.80,
    "10": 215.90,
    "12": 254.00,
    "14": 279.40,
    "16": 304.80,
    "18": 342.90,
    "20": 381.00,
    "22": 419.10,
    "24": 431.80
  },
  'DIN 2615': {
    "0.5": 25,
    "0.75": 29,
    "1": 38,
    "1.25": 48,
    "1.5": 57,
    "2": 64,
    "2.5": 76,
    "3": 86,
    "3.5": 95,
    "4": 105,
    "5": 124,
    "6": 143,
    "8": 178,
    "10": 216,
    "12": 254,
    "14": 279,
    "16": 305,
    "18": 343,
    "20": 381,
    "22": 419,
    "24": 432
  },
  'EN 10253-2': {
    "0.5": 25,
    "0.75": 29,
    "1": 38,
    "1.25": 48,
    "1.5": 57,
    "2": 64,
    "2.5": 76,
    "3": 86,
    "3.5": 95,
    "4": 105,
    "5": 124,
    "6": 143,
    "8": 178,
    "10": 216,
    "12": 254,
    "14": 279,
    "16": 305,
    "18": 343,
    "20": 381,
    "22": 419,
    "24": 432
  },
  'ASME B16.11 (Forged)': {
    "0.5": 28.5,
    "0.75": 33.5,
    "1": 38.0,
    "1.25": 44.5,
    "1.5": 51.0,
    "2": 60.5,
    "2.5": 76.0,
    "3": 86.0,
    "3.5": 95.0,
    "4": 106.5,
    "5": 124.0,
    "6": 143.0,
    "8": 178.0,
    "10": 216.0,
    "12": 254.0,
    "14": 279.0,
    "16": 305.0,
    "18": 343.0,
    "20": 381.0,
    "22": 419.0,
    "24": 432.0
  }
};

export const TEE_STANDARD_OPTIONS = [
  { code: 'ANSI B16.9', label: 'ANSI B16.9' },
  { code: 'DIN 2615', label: 'DIN 2615' },
  { code: 'EN 10253-2', label: 'EN 10253-2' },
  { code: 'ASME B16.11 (Forged)', label: 'ASME B16.11 (Forjado)' },
] as const;

export const TEE_STANDARD_METADATA: Record<string, {
  label: string;
  usage: string;
  why: string;
  family: string;
  note: string;
  calculationValidation: CalculationValidationLevel;
  calculationBase?: string;
  calculationNote: string;
}> = {
  'ANSI B16.9': {
    label: 'ANSI B16.9',
    usage: 'Tês soldados topo-a-topo mais comuns em processo industrial e montagem geral.',
    why: 'É a referência mais usada quando o projeto trabalha com conexões butt-weld padrão de catálogo.',
    family: 'Butt-welding fittings',
    note: 'Boa escolha padrão quando o tubista quer seguir a base mais conhecida de campo e oficina.',
    calculationValidation: 'VALIDATED',
    calculationBase: 'ANSI B16.9',
    calculationNote: 'Desconto automático validado no app pela tabela base ANSI B16.9.'
  },
  'DIN 2615': {
    label: 'DIN 2615',
    usage: 'Tês soldados de referência europeia, muito presentes em equipamentos e documentação DIN.',
    why: 'Ajuda quando a planta, o fabricante ou o conjunto vem de base alemã/europeia.',
    family: 'European welded tees',
    note: 'No app, conversa bem com instalações que também usam leitura DIN em outras peças.',
    calculationValidation: 'REFERENCE_ONLY',
    calculationBase: 'ANSI B16.9',
    calculationNote: 'Hoje entra como referência informativa. O desconto automático continua travado na base segura ANSI B16.9.'
  },
  'EN 10253-2': {
    label: 'EN 10253-2',
    usage: 'Conexões soldadas de base europeia para fittings de aço carbono/ligado em contexto industrial.',
    why: 'Faz sentido quando o projeto vem com leitura EN e o usuário quer manter coerência com fittings europeus.',
    family: 'European butt-welding fittings',
    note: 'Nesta base do app, a leitura dimensional prática está alinhada à família europeia soldada.',
    calculationValidation: 'REFERENCE_ONLY',
    calculationBase: 'ANSI B16.9',
    calculationNote: 'Hoje entra como referência informativa. O desconto automático continua travado na base segura ANSI B16.9.'
  },
  'ASME B16.11 (Forged)': {
    label: 'ASME B16.11 (Forjado)',
    usage: 'Conexões forjadas, muito usadas em pequenos diâmetros, alta pressão e linhas mais robustas.',
    why: 'Faz sentido para montagem mais pesada em bitolas menores, onde forged é comum.',
    family: 'Forged fittings',
    note: 'Use quando o cenário pedir fitting forjado e não o tee soldado topo-a-topo convencional.',
    calculationValidation: 'REFERENCE_ONLY',
    calculationBase: 'ANSI B16.9',
    calculationNote: 'Hoje entra como referência informativa. O desconto automático continua travado na base segura ANSI B16.9 até validação específica.'
  },
};

// ANSI B16.5 Class 150 Flange Dimensions (Length through Hub - Y)
// Includes estimates for SW, Threaded, Lap Joint (Stub End length approx)
export const FLANGE_DIMENSIONS: Record<string, { WN: number, SO: number, Blind: number, SW: number, Threaded: number, LapJoint: number }> = {
  "0.5": { WN: 48, SO: 16, Blind: 11, SW: 16, Threaded: 16, LapJoint: 16 },
  "0.75": { WN: 52, SO: 16, Blind: 13, SW: 16, Threaded: 16, LapJoint: 16 },
  "1": { WN: 56, SO: 17, Blind: 14, SW: 17, Threaded: 17, LapJoint: 17 },
  "1.25": { WN: 57, SO: 21, Blind: 16, SW: 21, Threaded: 21, LapJoint: 21 },
  "1.5": { WN: 62, SO: 22, Blind: 18, SW: 22, Threaded: 22, LapJoint: 22 },
  "2": { WN: 62, SO: 25, Blind: 19, SW: 25, Threaded: 25, LapJoint: 38 },
  "2.5": { WN: 70, SO: 29, Blind: 22, SW: 29, Threaded: 29, LapJoint: 44 },
  "3": { WN: 70, SO: 30, Blind: 24, SW: 30, Threaded: 30, LapJoint: 51 },
  "4": { WN: 76, SO: 33, Blind: 24, SW: 33, Threaded: 33, LapJoint: 64 },
  "6": { WN: 89, SO: 40, Blind: 25, SW: 40, Threaded: 40, LapJoint: 76 },
  "8": { WN: 102, SO: 44, Blind: 29, SW: 44, Threaded: 44, LapJoint: 89 },
  "10": { WN: 102, SO: 49, Blind: 30, SW: 49, Threaded: 49, LapJoint: 102 },
  "12": { WN: 114, SO: 56, Blind: 32, SW: 56, Threaded: 56, LapJoint: 127 },
  "14": { WN: 127, SO: 57, Blind: 35, SW: 57, Threaded: 57, LapJoint: 152 },
  "16": { WN: 127, SO: 64, Blind: 37, SW: 64, Threaded: 64, LapJoint: 152 },
  "18": { WN: 140, SO: 68, Blind: 40, SW: 68, Threaded: 68, LapJoint: 152 },
  "20": { WN: 144, SO: 73, Blind: 43, SW: 73, Threaded: 73, LapJoint: 152 }
};

// Educative Metadata for Flanges
export const FLANGE_METADATA = {
  "WN": {
    label: "Pescoço (Welding Neck)",
    desc: "Possui um pescoço cônico longo soldado no topo (topo-a-topo). A transferência de tensão é suave.",
    usage: "Alta pressão, fluidos críticos, temperaturas extremas, linhas de vapor.",
    pressure: "Alta / Crítica",
    visualPath: "M 10 0 L 10 15 L 30 25 L 30 35 L 10 45 L 10 60 L 0 60 L 0 0 Z",
    calculationValidation: "VALIDATED" as CalculationValidationLevel,
    calculationBase: "ASME B16.5",
    calculationNote: "Desconto automático validado no app pela base de dimensões ASME B16.5."
  },
  "SO": {
    label: "Sobreposto (Slip-On)",
    desc: "O tubo desliza para dentro do flange. Solda-se interna e externamente (dupla solda).",
    usage: "Baixa/Média pressão, facilidade de alinhamento, linhas de utilidades.",
    pressure: "Moderada",
    visualPath: "M 10 0 L 10 60 L 0 60 L 0 0 Z M 15 15 L 15 45 L 30 45 L 30 15 Z",
    calculationValidation: "VALIDATED" as CalculationValidationLevel,
    calculationBase: "ASME B16.5",
    calculationNote: "Desconto automático validado no app pela base de dimensões ASME B16.5."
  },
  "SW": {
    label: "Encaixe (Socket Weld)",
    desc: "Possui um rebaixo (socket) onde o tubo encaixa. Requer um gap de expansão no fundo.",
    usage: "Pequenos diâmetros (até 2\"), alta pressão, evita vazamentos de rosca.",
    pressure: "Alta (Peq. Diâmetro)",
    visualPath: "M 10 0 L 10 60 L 0 60 L 0 0 Z M 12 10 L 12 50 L 25 50 L 25 10 Z",
    calculationValidation: "VALIDATED" as CalculationValidationLevel,
    calculationBase: "ASME B16.5",
    calculationNote: "Desconto automático validado no app pela base de dimensões ASME B16.5."
  },
  "Blind": {
    label: "Cego (Blind)",
    desc: "Disco sólido sem furo central. Usado para fechar extremidades de linhas ou bocais.",
    usage: "Finais de linha, visitas de inspeção, testes hidrostáticos.",
    pressure: "Todas as classes",
    visualPath: "M 5 0 L 35 0 L 35 60 L 5 60 Z",
    calculationValidation: "VALIDATED" as CalculationValidationLevel,
    calculationBase: "ASME B16.5",
    calculationNote: "Desconto automático validado no app pela base de dimensões ASME B16.5."
  },
  "Threaded": {
    label: "Roscado (NPT/BSP)",
    desc: "Montado por rosca, sem solda. Útil onde solda é perigosa (áreas explosivas).",
    usage: "Baixa pressão, galvanizados, instrumentação, áreas classificadas.",
    pressure: "Baixa",
    visualPath: "M 10 0 L 10 60 L 0 60 L 0 0 Z M 12 10 L 15 12 L 12 14",
    calculationValidation: "VALIDATED" as CalculationValidationLevel,
    calculationBase: "ASME B16.5",
    calculationNote: "Desconto automático validado no app pela base de dimensões ASME B16.5."
  },
  "LapJoint": {
    label: "Solto (Lap Joint)",
    desc: "Composto por dois itens: o flange solto e a pestana (Stub End) soldada ao tubo.",
    usage: "Desmontagem frequente, alinhamento de furos difícil, materiais nobres (só a pestana precisa ser nobre).",
    pressure: "Baixa/Média",
    visualPath: "M 5 0 L 20 0 L 20 60 L 5 60 Z M 22 5 L 35 5 L 35 55 L 22 55",
    calculationValidation: "VALIDATED" as CalculationValidationLevel,
    calculationBase: "ASME B16.5",
    calculationNote: "Desconto automático validado no app pela base de dimensões ASME B16.5."
  }
};

export const VALVE_CALCULATION_METADATA = {
  label: 'Válvulas industriais',
  calculationValidation: 'VALIDATED' as CalculationValidationLevel,
  calculationBase: 'ANSI/ASME B16.10',
  calculationNote: 'Os comprimentos automáticos do app seguem a tabela-base de face a face ANSI/ASME B16.10 usada hoje no projeto.',
  usage: 'Bom para manter uma base segura e repetível até revisão específica por família de válvula.'
};

export const GASKET_METADATA: Record<'NonMetallic' | 'SemiMetallic' | 'Metallic', {
  label: string;
  usage: string;
  why: string;
}> = {
  NonMetallic: {
    label: 'Não metálica / plana',
    usage: 'Água, utilidades, baixa a média pressão e montagem geral.',
    why: 'É a opção prática e comum quando a vedação não exige serviço severo.'
  },
  SemiMetallic: {
    label: 'Semimetálica / espiralada',
    usage: 'Processo industrial, vapor, temperatura mais elevada e linhas com flange mais exigente.',
    why: 'Equilibra vedação robusta com boa adaptabilidade de montagem.'
  },
  Metallic: {
    label: 'Metálica / RTJ',
    usage: 'Alta pressão, alta temperatura e serviço crítico.',
    why: 'Faz sentido quando a junta precisa de vedação mais severa e controlada.'
  }
};


export const FLUID_IDENTIFICATION_STANDARD_OPTIONS: Array<{
  code: FluidIdentificationStandardCode;
  label: string;
  usage: string;
}> = [
  { code: 'ABNT NBR 6493', label: 'ABNT NBR 6493', usage: 'Padrão brasileiro mais comum para identificação por cores em tubulação industrial.' },
  { code: 'ASME A13.1', label: 'ASME A13.1', usage: 'Referência muito usada em instalações industriais nos Estados Unidos.' },
  { code: 'BS 1710', label: 'BS 1710', usage: 'Padrão britânico ainda encontrado em plantas e documentação do Reino Unido.' },
  { code: 'ISO 14726', label: 'ISO 14726', usage: 'Padrão internacional comum em contexto naval, offshore e aplicações marítimas.' },
];

type FluidIdentificationOption = {
  code: FluidIdentificationCode;
  label: string;
  fluid: string;
  color: string;
  description: string;
  category?: string;
};

const ABNT_FLUID_IDENTIFICATION_OPTIONS: FluidIdentificationOption[] = [
  { code: 'AGUA_POTAVEL', label: 'Agua potavel', fluid: 'Agua potavel', color: '#16a34a', description: 'Linhas de agua potavel ou de consumo identificadas em verde.', category: 'Agua' },
  { code: 'AGUA_INDUSTRIAL', label: 'Agua industrial', fluid: 'Agua industrial', color: '#16a34a', description: 'Linhas de agua de processo, utilidades e servicos gerais identificadas em verde.', category: 'Agua' },
  { code: 'AGUA_RESFRIAMENTO', label: 'Agua de resfriamento', fluid: 'Agua de resfriamento', color: '#16a34a', description: 'Circuitos de resfriamento, trocadores e utilidades identificados em verde.', category: 'Agua' },
  { code: 'AGUA_QUENTE', label: 'Agua quente', fluid: 'Agua quente', color: '#16a34a', description: 'Linhas de agua aquecida identificadas em verde conforme a familia agua.', category: 'Agua' },
  { code: 'AGUA_GELADA', label: 'Agua gelada', fluid: 'Agua gelada', color: '#16a34a', description: 'Circuitos de agua gelada e HVAC identificados em verde conforme a familia agua.', category: 'Agua' },
  { code: 'VAPOR', label: 'Vapor', fluid: 'Vapor', color: '#d1d5db', description: 'Linhas de vapor identificadas em tom aluminio/cinza claro para destaque operacional.', category: 'Vapor / Condensado' },
  { code: 'CONDENSADO', label: 'Condensado', fluid: 'Condensado', color: '#d1d5db', description: 'Retorno de condensado agrupado com a familia de vapor em tom aluminio.', category: 'Vapor / Condensado' },
  { code: 'AR_COMPRIMIDO', label: 'Ar comprimido', fluid: 'Ar comprimido', color: '#0ea5e9', description: 'Linhas de ar comprimido identificadas em azul.', category: 'Ar / Vácuo' },
  { code: 'AR_INSTRUMENTO', label: 'Ar de instrumento', fluid: 'Ar de instrumento', color: '#0ea5e9', description: 'Ar de instrumento e servicos pneumaticos identificados em azul.', category: 'Ar / Vácuo' },
  { code: 'VACUO', label: 'Vacuo', fluid: 'Vacuo', color: '#7c3aed', description: 'Sistemas de vacuo identificados em violeta.', category: 'Ar / Vácuo' },
  { code: 'GAS_NATURAL', label: 'Gas natural', fluid: 'Gas natural', color: '#facc15', description: 'Linhas de gases nao liquefeitos identificados em amarelo.', category: 'Gases' },
  { code: 'OXIGENIO', label: 'Oxigenio', fluid: 'Oxigenio', color: '#facc15', description: 'Oxigenio e gases comprimidos nao liquefeitos identificados em amarelo.', category: 'Gases' },
  { code: 'NITROGENIO', label: 'Nitrogenio', fluid: 'Nitrogenio', color: '#facc15', description: 'Nitrogenio e gases de inertizacao identificados em amarelo.', category: 'Gases' },
  { code: 'GLP', label: 'GLP', fluid: 'Gas liquefeito de petroleo', color: '#c0c0c0', description: 'Gases liquefeitos ficam agrupados em tom aluminio.', category: 'Gases' },
  { code: 'GNL', label: 'GNL', fluid: 'Gas natural liquefeito', color: '#c0c0c0', description: 'Gases liquefeitos criogenicos agrupados em tom aluminio.', category: 'Gases' },
  { code: 'ACIDOS', label: 'Acidos', fluid: 'Acidos', color: '#f97316', description: 'Linhas de acidos e produtos corrosivos acidos identificadas em laranja.', category: 'Químicos' },
  { code: 'ALCALIS', label: 'Alcalis', fluid: 'Alcalis / bases', color: '#c084fc', description: 'Linhas de alcalis, soda e bases identificadas em lilas.', category: 'Químicos' },
  { code: 'INCENDIO', label: 'Incendio', fluid: 'Combate a incendio', color: '#dc2626', description: 'Redes de incendio e combate a fogo identificadas em vermelho.', category: 'Segurança' },
  { code: 'INFLAMAVEIS', label: 'Inflamaveis', fluid: 'Inflamaveis leves', color: '#111827', description: 'Linhas de fluidos inflamaveis leves identificadas em preto.', category: 'Combustíveis / Inflamáveis' },
  { code: 'OLEO_COMBUSTIVEL', label: 'Oleo combustivel', fluid: 'Oleos pesados / combustivel', color: '#92400e', description: 'Oleos combustiveis pesados e derivados escuros identificados em marrom.', category: 'Combustíveis / Inflamáveis' },
  { code: 'ESGOTO_EFLUENTE', label: 'Esgoto / efluente', fluid: 'Esgoto e efluentes', color: '#6b7280', description: 'Drenagens, efluentes e descarte industrial agrupados em cinza.', category: 'Drenagem / Efluentes' }
];

const remapFluidStandard = (
  base: FluidIdentificationOption[],
  standardLabel: string,
  colorMap: Partial<Record<FluidIdentificationCode, string>>,
  suffix: string,
  categoryMap?: Partial<Record<FluidIdentificationCode, string>>
): FluidIdentificationOption[] => base.map(option => ({
  ...option,
  color: colorMap[option.code] || option.color,
  description: `${standardLabel}: ${suffix} ${option.fluid.toLowerCase()}.`,
  category: categoryMap?.[option.code] || option.category,
}));

export const FLUID_IDENTIFICATION_OPTIONS_BY_STANDARD: Record<FluidIdentificationStandardCode, FluidIdentificationOption[]> = {
  'ABNT NBR 6493': ABNT_FLUID_IDENTIFICATION_OPTIONS,
  'ASME A13.1': remapFluidStandard(
    ABNT_FLUID_IDENTIFICATION_OPTIONS,
    'ASME A13.1',
    {
      AGUA_POTAVEL: '#16a34a',
      AGUA_INDUSTRIAL: '#16a34a',
      AGUA_RESFRIAMENTO: '#16a34a',
      AGUA_QUENTE: '#16a34a',
      AGUA_GELADA: '#16a34a',
      VAPOR: '#d1d5db',
      CONDENSADO: '#d1d5db',
      AR_COMPRIMIDO: '#0ea5e9',
      AR_INSTRUMENTO: '#0ea5e9',
      VACUO: '#6b7280',
      GAS_NATURAL: '#facc15',
      OXIGENIO: '#facc15',
      NITROGENIO: '#6b7280',
      GLP: '#facc15',
      GNL: '#facc15',
      ACIDOS: '#f97316',
      ALCALIS: '#f97316',
      INCENDIO: '#dc2626',
      INFLAMAVEIS: '#facc15',
      OLEO_COMBUSTIVEL: '#92400e',
      ESGOTO_EFLUENTE: '#6b7280',
    },
    'Adaptação prática por família de serviço para',
    {
      AGUA_POTAVEL: 'Water',
      AGUA_INDUSTRIAL: 'Water',
      AGUA_RESFRIAMENTO: 'Water',
      AGUA_QUENTE: 'Water',
      AGUA_GELADA: 'Water',
      VAPOR: 'Steam / Condensate',
      CONDENSADO: 'Steam / Condensate',
      AR_COMPRIMIDO: 'Compressed Air',
      AR_INSTRUMENTO: 'Compressed Air',
      VACUO: 'User Defined / Other',
      GAS_NATURAL: 'Flammable / Oxidizing',
      OXIGENIO: 'Flammable / Oxidizing',
      NITROGENIO: 'User Defined / Other',
      GLP: 'Flammable / Oxidizing',
      GNL: 'Flammable / Oxidizing',
      ACIDOS: 'Toxic / Corrosive',
      ALCALIS: 'Toxic / Corrosive',
      INCENDIO: 'Fire Quenching',
      INFLAMAVEIS: 'Flammable / Oxidizing',
      OLEO_COMBUSTIVEL: 'Combustible',
      ESGOTO_EFLUENTE: 'User Defined / Other',
    }
  ),
  'BS 1710': remapFluidStandard(
    ABNT_FLUID_IDENTIFICATION_OPTIONS,
    'BS 1710',
    {
      AGUA_POTAVEL: '#16a34a',
      AGUA_INDUSTRIAL: '#16a34a',
      AGUA_RESFRIAMENTO: '#16a34a',
      AGUA_QUENTE: '#16a34a',
      AGUA_GELADA: '#16a34a',
      VAPOR: '#d1d5db',
      CONDENSADO: '#d1d5db',
      AR_COMPRIMIDO: '#7dd3fc',
      AR_INSTRUMENTO: '#7dd3fc',
      VACUO: '#6b7280',
      GAS_NATURAL: '#facc15',
      OXIGENIO: '#facc15',
      NITROGENIO: '#facc15',
      GLP: '#facc15',
      GNL: '#facc15',
      ACIDOS: '#a855f7',
      ALCALIS: '#a855f7',
      INCENDIO: '#dc2626',
      INFLAMAVEIS: '#92400e',
      OLEO_COMBUSTIVEL: '#92400e',
      ESGOTO_EFLUENTE: '#6b7280',
    },
    'Leitura prática inspirada na família de identificação usada para',
    {
      AGUA_POTAVEL: 'Water',
      AGUA_INDUSTRIAL: 'Water',
      AGUA_RESFRIAMENTO: 'Water',
      AGUA_QUENTE: 'Water',
      AGUA_GELADA: 'Water',
      VAPOR: 'Steam',
      CONDENSADO: 'Steam',
      AR_COMPRIMIDO: 'Air',
      AR_INSTRUMENTO: 'Air',
      VACUO: 'Other / Service',
      GAS_NATURAL: 'Gas',
      OXIGENIO: 'Gas',
      NITROGENIO: 'Gas',
      GLP: 'Gas',
      GNL: 'Gas',
      ACIDOS: 'Acids / Alkalis',
      ALCALIS: 'Acids / Alkalis',
      INCENDIO: 'Fire Fighting',
      INFLAMAVEIS: 'Oil / Combustible',
      OLEO_COMBUSTIVEL: 'Oil / Combustible',
      ESGOTO_EFLUENTE: 'Other / Service',
    }
  ),
  'ISO 14726': remapFluidStandard(
    ABNT_FLUID_IDENTIFICATION_OPTIONS,
    'ISO 14726',
    {
      AGUA_POTAVEL: '#16a34a',
      AGUA_INDUSTRIAL: '#16a34a',
      AGUA_RESFRIAMENTO: '#16a34a',
      AGUA_QUENTE: '#16a34a',
      AGUA_GELADA: '#16a34a',
      VAPOR: '#d1d5db',
      CONDENSADO: '#d1d5db',
      AR_COMPRIMIDO: '#0ea5e9',
      AR_INSTRUMENTO: '#0ea5e9',
      VACUO: '#6b7280',
      GAS_NATURAL: '#facc15',
      OXIGENIO: '#0ea5e9',
      NITROGENIO: '#0ea5e9',
      GLP: '#92400e',
      GNL: '#92400e',
      ACIDOS: '#f97316',
      ALCALIS: '#f97316',
      INCENDIO: '#dc2626',
      INFLAMAVEIS: '#92400e',
      OLEO_COMBUSTIVEL: '#92400e',
      ESGOTO_EFLUENTE: '#6b7280',
    },
    'Adaptação prática para leitura rápida de',
    {
      AGUA_POTAVEL: 'Water Systems',
      AGUA_INDUSTRIAL: 'Water Systems',
      AGUA_RESFRIAMENTO: 'Water Systems',
      AGUA_QUENTE: 'Water Systems',
      AGUA_GELADA: 'Water Systems',
      VAPOR: 'Steam',
      CONDENSADO: 'Steam',
      AR_COMPRIMIDO: 'Air',
      AR_INSTRUMENTO: 'Air',
      VACUO: 'Other Service',
      GAS_NATURAL: 'Flammable',
      OXIGENIO: 'Gas Service',
      NITROGENIO: 'Gas Service',
      GLP: 'Oil / Fuel',
      GNL: 'Oil / Fuel',
      ACIDOS: 'Hazardous',
      ALCALIS: 'Hazardous',
      INCENDIO: 'Fire Fighting',
      INFLAMAVEIS: 'Oil / Fuel',
      OLEO_COMBUSTIVEL: 'Oil / Fuel',
      ESGOTO_EFLUENTE: 'Waste / Drain',
    }
  ),
};

export const DEFAULT_FLUID_IDENTIFICATION_STANDARD: FluidIdentificationStandardCode = 'ABNT NBR 6493';
export const FLUID_IDENTIFICATION_OPTIONS: FluidIdentificationOption[] = FLUID_IDENTIFICATION_OPTIONS_BY_STANDARD[DEFAULT_FLUID_IDENTIFICATION_STANDARD];
export const getFluidIdentificationOptions = (standard: string): FluidIdentificationOption[] =>
  FLUID_IDENTIFICATION_OPTIONS_BY_STANDARD[(standard as FluidIdentificationStandardCode)] || FLUID_IDENTIFICATION_OPTIONS_BY_STANDARD[DEFAULT_FLUID_IDENTIFICATION_STANDARD];
export const getFluidIdentificationOptionLabel = (option: FluidIdentificationOption, standard: string) =>
  standard === DEFAULT_FLUID_IDENTIFICATION_STANDARD || !option.category
    ? `${option.label} (${option.fluid})`
    : `${option.label} • ${option.category}`;

export const PIPE_MATERIAL_STANDARD_OPTIONS: Array<{
  code: PipeMaterialStandardCode;
  label: string;
  constructionOptions: PipeConstructionType[];
  finishOptions: PipeFinishType[];
  defaultConstruction: PipeConstructionType;
  defaultFinish: PipeFinishType;
  usage: string;
  constructionLabel: string;
  finishLabel: string;
  summary: string;
  avoid: string;
}> = [
  {
    code: 'ASTM_A53',
    label: 'ASTM A53',
    constructionOptions: ['COM_COSTURA', 'SEM_COSTURA', 'AMBOS'],
    finishOptions: ['PRETO', 'GALVANIZADO', 'AMBOS'],
    defaultConstruction: 'AMBOS',
    defaultFinish: 'PRETO',
    usage: 'Condução geral de fluidos, utilidades e linhas industriais usuais.',
    constructionLabel: 'Com ou sem costura',
    finishLabel: 'Preto ou galvanizado',
    summary: 'Boa escolha para uso industrial comum, manutenção e linhas de serviço.',
    avoid: 'Evite como escolha padrão para serviço mais severo de alta temperatura e pressão.'
  },
  {
    code: 'ASTM_A106',
    label: 'ASTM A106',
    constructionOptions: ['SEM_COSTURA'],
    finishOptions: ['PRETO'],
    defaultConstruction: 'SEM_COSTURA',
    defaultFinish: 'PRETO',
    usage: 'Alta temperatura, pressão e serviço de processo mais severo.',
    constructionLabel: 'Sem costura',
    finishLabel: 'Preto',
    summary: 'Indicado para vapor, processo e condições mais críticas.',
    avoid: 'Não faz sentido oferecer galvanizado ou com costura nesta seleção.'
  },
  {
    code: 'ABNT_NBR_5590',
    label: 'ABNT NBR 5590',
    constructionOptions: ['COM_COSTURA', 'SEM_COSTURA', 'AMBOS'],
    finishOptions: ['PRETO', 'GALVANIZADO', 'AMBOS'],
    defaultConstruction: 'AMBOS',
    defaultFinish: 'PRETO',
    usage: 'Padrão brasileiro principal para tubos de aço carbono com ou sem solda.',
    constructionLabel: 'Com ou sem costura',
    finishLabel: 'Preto ou galvanizado',
    summary: 'Boa opção quando o projeto ou compra precisa ficar alinhado ao padrão brasileiro.',
    avoid: 'Se o serviço exigir condição severa, valide se a aplicação não pede uma especificação mais restrita.'
  },
  {
    code: 'ABNT_NBR_5580',
    label: 'ABNT NBR 5580',
    constructionOptions: ['COM_COSTURA'],
    finishOptions: ['PRETO', 'GALVANIZADO', 'AMBOS'],
    defaultConstruction: 'COM_COSTURA',
    defaultFinish: 'GALVANIZADO',
    usage: 'Usos comuns, baixa pressão e fluidos não corrosivos.',
    constructionLabel: 'Com costura',
    finishLabel: 'Preto ou galvanizado',
    summary: 'Escolha prática para instalações comuns e linhas leves.',
    avoid: 'Não trate como solução padrão para processo crítico, alta temperatura ou alta pressão.'
  }
];

export const ELBOW_PROFILE_OPTIONS: Array<{
  code: ElbowProfileCode;
  label: string;
  shortLabel: string;
  radiusFactor: number;
  construction: ElbowConstructionClass;
  usage: string;
  summary: string;
}> = [
  {
    code: 'SR_1D',
    label: 'SR / 1D',
    shortLabel: 'SR 1D',
    radiusFactor: 1,
    construction: 'STANDARD_ELBOW',
    usage: 'Cotovelo padrão curto para locais com pouco espaço.',
    summary: 'Mais fechado. Resolve interferência, mas gera mudança de direção mais brusca.'
  },
  {
    code: 'LR_1_5D',
    label: 'LR / 1,5D',
    shortLabel: 'LR 1,5D',
    radiusFactor: 1.5,
    construction: 'STANDARD_ELBOW',
    usage: 'Cotovelo padrão mais comum em tubulação industrial.',
    summary: 'É a referência usual da ASME B16.9 para raio longo.'
  },
  {
    code: '3D',
    label: '3D',
    shortLabel: '3D',
    radiusFactor: 3,
    construction: 'STANDARD_ELBOW',
    usage: 'Curva mais aberta quando se quer suavizar o desvio.',
    summary: 'Mais suave que a LR, com menor agressividade de fluxo.'
  },
  {
    code: '5D',
    label: '5D',
    shortLabel: '5D',
    radiusFactor: 5,
    construction: 'FABRICATED_BEND',
    usage: 'Curva fabricada de grande raio para serviço mais suave.',
    summary: 'Muito usada quando se quer reduzir perda de carga, desgaste e turbulência.'
  },
  {
    code: '10D',
    label: '10D',
    shortLabel: '10D',
    radiusFactor: 10,
    construction: 'FABRICATED_BEND',
    usage: 'Curva fabricada de grande raio para linhas especiais e serviço severo.',
    summary: 'Excelente para aplicações abrasivas ou quando o projeto exige transição muito suave.'
  }
];
export const AVAILABLE_SIZES = Object.keys(PIPE_SCHEDULE).sort((a, b) => parseFloat(a) - parseFloat(b));

export const ISOMETRIC_ANGLE = 30 * (Math.PI / 180);
export const COS_30 = Math.cos(ISOMETRIC_ANGLE);
export const SIN_30 = Math.sin(ISOMETRIC_ANGLE);

// Helper to project 3D grid point to 2D screen
export const projectIso = (x: number, y: number, z: number, scale: number = 40, originX: number = 0, originY: number = 0) => {
  // Isometric projection formula
  const screenX = (x - y) * COS_30 * scale + originX;
  const screenY = (x + y) * SIN_30 * scale - (z * scale) + originY;
  return { x: screenX, y: screenY };
};

export const ASME_B16_11_DIMENSIONS: Record<string, { centerToFace: number, socketDepth: number, centerToBottom: number, threadEngagement: number }> = {
  "0.5": { centerToFace: 28.5, socketDepth: 9.5, centerToBottom: 19.0, threadEngagement: 13.5 },
  "0.75": { centerToFace: 33.5, socketDepth: 12.5, centerToBottom: 22.5, threadEngagement: 14.0 },
  "1": { centerToFace: 38.0, socketDepth: 12.5, centerToBottom: 27.0, threadEngagement: 17.0 },
  "1.25": { centerToFace: 44.5, socketDepth: 14.5, centerToBottom: 32.0, threadEngagement: 18.0 },
  "1.5": { centerToFace: 51.0, socketDepth: 16.0, centerToBottom: 35.0, threadEngagement: 18.5 },
  "2": { centerToFace: 60.5, socketDepth: 19.0, centerToBottom: 42.5, threadEngagement: 19.0 },
  "2.5": { centerToFace: 76.0, socketDepth: 22.0, centerToBottom: 48.0, threadEngagement: 29.0 }
};

export const PIPE_CONNECTION_TYPE_OPTIONS: Array<{ code: PipeConnectionType, label: string, desc: string }> = [
  { code: 'BUTT_WELD', label: 'Solda de Topo (BW)', desc: 'Conexões soldadas topo-a-topo. Usa Gap de solda.' },
  { code: 'SOCKET_WELD', label: 'Solda de Encaixe (SW)', desc: 'Tubo encaixa na conexão. Usa profundidade de encaixe.' },
  { code: 'THREADED', label: 'Roscada (THD)', desc: 'Tubo rosqueado na conexão. Usa comprimento de engajamento.' }
];

export const DEFAULT_PIPE_CONNECTION_TYPE: PipeConnectionType = 'BUTT_WELD';


