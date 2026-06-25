import React, { useState, useMemo, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { DEFAULT_PIPE_SCHEDULE_CODE, PIPE_SCHEDULE, PIPE_SCHEDULE_OPTIONS, PIPE_SCHEDULE_REFERENCE_NPS, getPipeScheduleLabel, getPipeScheduleWall } from '../../constants';
import { Info, Scissors, CircleDashed, Link as LinkIcon, ArrowRightLeft, ChevronRight, Plus, Minus, Printer, FileDown, Copy } from 'lucide-react';
import { PipeScheduleCode } from '../../types';

type MoldContentBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

const formatAngleForTitle = (value: number) => {
  const normalized = Math.abs(value - Math.round(value)) < 0.01
    ? Math.round(value).toString()
    : value.toFixed(1).replace(/\.0$/, '');
  return `${normalized}°`;
};

const formatAngleForFileName = (value: number) => formatAngleForTitle(value).replace('°', '-graus').replace('.', '-');

const FabricationCalc: React.FC = () => {
  const [type, setType] = useState<'MITER' | 'ELBOW_CUT' | 'ELBOW_ADVANCE' | 'ELBOW_PATTERN' | 'ARC_LAYOUT' | 'CURVE_DEGREE_FROM_ARC' | 'PIPE_SCHEDULE_LOOKUP' | 'THREE_POINT_RADIUS' | 'FLANGE_DRILLING' | 'TUBE_SADDLE_90' | 'ELBOW_BACK_SADDLE_90' | 'CONCENTRIC_REDUCTION' | 'ECCENTRIC_REDUCTION'>('MITER');
  const simulationOptions = [
    { value: 'MITER', label: 'Boca de Lobo' },
    { value: 'ELBOW_CUT', label: 'Corte de Curva' },
    { value: 'ELBOW_ADVANCE', label: 'Desconto de Curva' },
    { value: 'ELBOW_PATTERN', label: 'Molde Cotovelo' },
    { value: 'ARC_LAYOUT', label: 'Grau e Arco' },
    { value: 'CURVE_DEGREE_FROM_ARC', label: 'Achar Grau' },
    { value: 'PIPE_SCHEDULE_LOOKUP', label: 'Escala / Schedule' },
    { value: 'THREE_POINT_RADIUS', label: 'Raio 3 Pontos' },
    { value: 'FLANGE_DRILLING', label: 'Furação Flange' },
    { value: 'TUBE_SADDLE_90', label: 'Unha 90°' },
    { value: 'ELBOW_BACK_SADDLE_90', label: 'Unha Costas Curva' },
    { value: 'CONCENTRIC_REDUCTION', label: 'Redução Concêntrica' },
    { value: 'ECCENTRIC_REDUCTION', label: 'Redução Excêntrica' },
  ] as const;
  
  // Miter State
  const [headerSize, setHeaderSize] = useState("4");
  const [branchSize, setBranchSize] = useState("4");
  const [miterAngle, setMiterAngle] = useState(90);
  const [divisions, setDivisions] = useState(12); // Default 12 for precision

  // Elbow Cut State
  const [elbowSize, setElbowSize] = useState("4");
  const [targetAngle, setTargetAngle] = useState(45);

  // Elbow Advance (Take-off) State
  const [advSize, setAdvSize] = useState("4");
  const [advAngle, setAdvAngle] = useState(45);
  const [radiusType, setRadiusType] = useState<'LR' | 'SR'>('LR'); // Long Radius vs Short Radius

  // Elbow Pattern (Pegadas) State
  const [patternSize, setPatternSize] = useState("2");
  const [patternAngle, setPatternAngle] = useState(40);
  const [patternDivisions, setPatternDivisions] = useState(12);
  const [patternBase, setPatternBase] = useState(30);

  // Arc Layout State
  const [arcBase, setArcBase] = useState(80);
  const [arcHalfOpening, setArcHalfOpening] = useState(30);

  // Curve Degree From Arc State
  const [curveDegreeRadius, setCurveDegreeRadius] = useState(1500);
  const [curveDegreeArcLength, setCurveDegreeArcLength] = useState(1439.9);
  const [curveDegreeBodyWidth, setCurveDegreeBodyWidth] = useState(500);
  const [scheduleLookupSize, setScheduleLookupSize] = useState(PIPE_SCHEDULE_REFERENCE_NPS);
  const [scheduleLookupCode, setScheduleLookupCode] = useState<PipeScheduleCode>(DEFAULT_PIPE_SCHEDULE_CODE);

  // Three Point Radius State
  const [radiusLeftRun, setRadiusLeftRun] = useState(70);
  const [radiusRightRun, setRadiusRightRun] = useState(100);
  const [radiusRise, setRadiusRise] = useState(50);

  // Flange Drilling State
  const [flangeBoltCircle, setFlangeBoltCircle] = useState(120);
  const [flangeHoleCount, setFlangeHoleCount] = useState(5);
  const [flangeHoleDiameter, setFlangeHoleDiameter] = useState(12);
  const [flangeStartAngle, setFlangeStartAngle] = useState(0);
  const [flangeTopReference, setFlangeTopReference] = useState<'HOLE' | 'GAP'>('HOLE');
  const [moldPageOrientation, setMoldPageOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Tube Saddle 90 State
  const [saddleHeaderDiameter, setSaddleHeaderDiameter] = useState(80);
  const [saddleBranchDiameter, setSaddleBranchDiameter] = useState(50);
  const [saddleAxisOffset, setSaddleAxisOffset] = useState(15);
  const [saddleDivisions, setSaddleDivisions] = useState(12);
  const [elbowBackMeanRadius, setElbowBackMeanRadius] = useState(57);
  const [elbowBackCurveDiameter, setElbowBackCurveDiameter] = useState(50);
  const [elbowBackBranchDiameter, setElbowBackBranchDiameter] = useState(48);
  const [elbowBackDivisions, setElbowBackDivisions] = useState(12);

  // Concentric Reduction State
  const [reducerLargeDiameter, setReducerLargeDiameter] = useState(60);
  const [reducerSmallDiameter, setReducerSmallDiameter] = useState(40);
  const [reducerLength, setReducerLength] = useState(50);
  const [reducerDivisions, setReducerDivisions] = useState(12);
  const [eccentricLargeDiameter, setEccentricLargeDiameter] = useState(90);
  const [eccentricSmallDiameter, setEccentricSmallDiameter] = useState(60);
  const [eccentricLength, setEccentricLength] = useState(120);
  const [eccentricDivisions, setEccentricDivisions] = useState(12);

  // Miter Calculation logic
  const miterPoints = useMemo(() => {
    const headerOD = PIPE_SCHEDULE[headerSize]?.od || 114.3;
    const branchOD = PIPE_SCHEDULE[branchSize]?.od || 114.3;
    const branchRad = branchOD / 2;
    const headerRad = headerOD / 2;
    const radAngle = (miterAngle * Math.PI) / 180;
    
    const points = [];
    const step = 360 / divisions;

    for (let i = 0; i <= 360; i += step) {
      const theta = (i * Math.PI) / 180;
      const term1 = Math.sqrt(Math.pow(headerRad, 2) - Math.pow(branchRad * Math.sin(theta), 2));
      const cutHeight = (headerRad - term1) / Math.sin(radAngle);
      points.push({ deg: i, height: Math.max(0, cutHeight) });
    }
    return points;
  }, [headerSize, branchSize, miterAngle, divisions]);

  // Elbow Cut Calculation logic
  const elbowResults = useMemo(() => {
    const sch = PIPE_SCHEDULE[elbowSize];
    if (!sch) return { back: 0, center: 0, inside: 0, radius: 0, od: 0 };
    
    const radius = sch.longRadius90; 
    const od = sch.od;
    const radAngle = (targetAngle * Math.PI) / 180;

    return {
      back: (radius + od / 2) * radAngle,
      center: radius * radAngle,
      inside: (radius - od / 2) * radAngle,
      radius,
      od
    };
  }, [elbowSize, targetAngle]);

  // Elbow Advance Calculation logic
  const advanceResults = useMemo(() => {
      const nps = parseFloat(advSize);
      // Constants defined by user: LR = 38.1, SR = 25.4 (Standard multipliers per inch)
      const constantBase = radiusType === 'LR' ? 38.1 : 25.4;
      
      // Radius of the elbow curvature (Centerline Radius)
      // R = NPS * Constant
      const radius = nps * constantBase;
      
      // Tangent Factor = tan(Angle / 2)
      const halfAngleRad = (advAngle / 2) * (Math.PI / 180);
      const tanFactor = Math.tan(halfAngleRad);

      // Take Off (Advance/Desconto) = Radius * tan(angle/2)
      const takeOff = radius * tanFactor;

      return {
          radius,
          takeOff,
          tanFactor,
          constantBase
      };
  }, [advSize, advAngle, radiusType]);

  const elbowPatternResults = useMemo(() => {
      const sch = PIPE_SCHEDULE[patternSize];
      if (!sch) {
          return {
              od: 0,
              radius: 0,
              halfAngle: 0,
              tangentFactor: 0,
              stepWidth: 0,
              development: 0,
              points: [] as Array<{ index: number; label: number; thetaDeg: number; ordinate: number; x: number }>,
              centerOrdinate: 0,
              edgeOrdinate: 0,
          };
      }

      const od = sch.od;
      const radius = od / 2;
      const halfAngle = patternAngle / 2;
      const tangentFactor = Math.tan((halfAngle * Math.PI) / 180);
      const stepWidth = (Math.PI * od) / patternDivisions;
      const development = stepWidth * patternDivisions;
      const midIndex = patternDivisions / 2;

      const points = Array.from({ length: patternDivisions + 1 }, (_, index) => {
          const theta = Math.PI - ((2 * Math.PI * index) / patternDivisions);
          const thetaDeg = Math.round((theta * 180) / Math.PI);
          const ordinate = patternBase + (radius + Math.cos(theta) * radius) * tangentFactor;
          const label = index <= midIndex ? index + 1 : patternDivisions - index + 1;
          return {
              index,
              label,
              thetaDeg,
              ordinate,
              x: index * stepWidth,
          };
      });

      return {
          od,
          radius,
          halfAngle,
          tangentFactor,
          stepWidth,
          development,
          points,
          centerOrdinate: points[Math.floor(points.length / 2)]?.ordinate || 0,
          edgeOrdinate: points[0]?.ordinate || 0,
      };
  }, [patternAngle, patternBase, patternDivisions, patternSize]);

  const miterMoldResults = useMemo(() => {
    const branchOD = PIPE_SCHEDULE[branchSize]?.od || 114.3;
    const safeDivisions = Math.max(4, divisions);
    const stepWidth = (Math.PI * branchOD) / safeDivisions;
    const basePoints = miterPoints.slice(0, -1).map((point, index) => ({
      ...point,
      index,
      x: index * stepWidth,
      height: Number.isFinite(point.height) ? Math.max(0, point.height) : 0,
    }));
    const printablePoints = [
      ...basePoints,
      {
        ...basePoints[0],
        index: basePoints.length,
        deg: 360,
        x: safeDivisions * stepWidth,
      },
    ];
    const maxHeight = printablePoints.reduce((acc, point) => Math.max(acc, point.height), 0);
    const development = stepWidth * safeDivisions;

    return {
      branchOD,
      stepWidth,
      printablePoints,
      maxHeight,
      development,
    };
  }, [branchSize, divisions, miterPoints]);

  const miterMarkingPoints = useMemo(() => (
    miterMoldResults.printablePoints.slice(0, -1).map((point, index) => ({
      ...point,
      mark: index + 1,
      isMirrored: point.deg > 180,
    }))
  ), [miterMoldResults.printablePoints]);

  const miterMarkingHalfPoints = useMemo(() => (
    miterMarkingPoints.filter((point) => point.deg <= 180)
  ), [miterMarkingPoints]);

  const arcLayoutResults = useMemo(() => {
    const safeBase = Math.max(1, arcBase);
    const safeHalfOpening = Math.max(0.1, arcHalfOpening);
    const angleHalfDeg = Math.atan(safeHalfOpening / safeBase) * (180 / Math.PI);
    const centralAngleDeg = angleHalfDeg * 2;
    const centralAngleRad = centralAngleDeg * (Math.PI / 180);
    const hypotenuse = safeBase / Math.sin(centralAngleRad);
    const verticalLeg = safeBase / Math.tan(centralAngleRad);
    const arcDevelopment = hypotenuse * centralAngleRad;

    return {
      base: safeBase,
      halfOpening: safeHalfOpening,
      angleHalfDeg,
      centralAngleDeg,
      centralAngleRad,
      hypotenuse,
      verticalLeg,
      arcDevelopment,
    };
  }, [arcBase, arcHalfOpening]);

  const curveDegreeResults = useMemo(() => {
    const safeRadius = Math.max(1, curveDegreeRadius);
    const safeArcLength = Math.max(0.1, curveDegreeArcLength);
    const safeBodyWidth = Math.max(10, curveDegreeBodyWidth);
    const oneDegreeLength = safeRadius * Math.PI / 180;
    const degree = safeArcLength / oneDegreeLength;
    const degreeByFactor = (180 / Math.PI) * (safeArcLength / safeRadius);
    const arc90 = safeRadius * Math.PI / 2;
    const innerRadius = Math.max(10, safeRadius - safeBodyWidth);

    return {
      radius: safeRadius,
      arcLength: safeArcLength,
      bodyWidth: safeBodyWidth,
      innerRadius,
      oneDegreeLength,
      degree,
      degreeByFactor,
      arc90,
    };
  }, [curveDegreeArcLength, curveDegreeBodyWidth, curveDegreeRadius]);

  const pipeScheduleLookupResults = useMemo(() => {
    const selectedItem = PIPE_SCHEDULE[scheduleLookupSize] || PIPE_SCHEDULE[PIPE_SCHEDULE_REFERENCE_NPS];
    const wall = getPipeScheduleWall(selectedItem, scheduleLookupCode);
    const internalDiameter = Math.max(0, selectedItem.od - (wall * 2));
    const sectionArea = Math.PI * ((selectedItem.od / 2) ** 2 - (internalDiameter / 2) ** 2);
    const weightFactor = sectionArea * 0.00000785;
    return {
      nps: selectedItem.nps,
      od: selectedItem.od,
      wall,
      internalDiameter,
      sectionArea,
      weightFactor,
      scheduleLabel: getPipeScheduleLabel(scheduleLookupCode),
      scheduleDescription: PIPE_SCHEDULE_OPTIONS.find(option => option.code === scheduleLookupCode)?.description || '',
    };
  }, [scheduleLookupCode, scheduleLookupSize]);

  const threePointRadiusResults = useMemo(() => {
    const leftRun = Math.max(1, radiusLeftRun);
    const rightRun = Math.max(1, radiusRightRun);
    const rise = Math.max(0.1, radiusRise);
    const auxiliarySide = Math.sqrt((rise ** 2) + (rightRun ** 2));
    const supportAngleDeg = Math.atan(rise / leftRun) * (180 / Math.PI);
    const supportAngleRad = supportAngleDeg * (Math.PI / 180);
    const radius = auxiliarySide / 2 / Math.sin(supportAngleRad);
    const totalChord = leftRun + rightRun;
    const centralAngleDeg = 2 * Math.asin(totalChord / (2 * radius)) * (180 / Math.PI);

    const pointA = { x: 0, y: 0 };
    const pointB = { x: leftRun, y: rise };
    const pointC = { x: leftRun + rightRun, y: 0 };
    const d = 2 * (
      pointA.x * (pointB.y - pointC.y) +
      pointB.x * (pointC.y - pointA.y) +
      pointC.x * (pointA.y - pointB.y)
    );

    const ux = (
      ((pointA.x ** 2 + pointA.y ** 2) * (pointB.y - pointC.y)) +
      ((pointB.x ** 2 + pointB.y ** 2) * (pointC.y - pointA.y)) +
      ((pointC.x ** 2 + pointC.y ** 2) * (pointA.y - pointB.y))
    ) / d;

    const uy = (
      ((pointA.x ** 2 + pointA.y ** 2) * (pointC.x - pointB.x)) +
      ((pointB.x ** 2 + pointB.y ** 2) * (pointA.x - pointC.x)) +
      ((pointC.x ** 2 + pointC.y ** 2) * (pointB.x - pointA.x))
    ) / d;

    return {
      leftRun,
      rightRun,
      rise,
      auxiliarySide,
      supportAngleDeg,
      supportAngleRad,
      radius,
      totalChord,
      centralAngleDeg,
      center: { x: ux, y: uy },
      pointA,
      pointB,
      pointC,
    };
  }, [radiusLeftRun, radiusRightRun, radiusRise]);

  const flangeDrillingResults = useMemo(() => {
    const boltCircle = Math.max(1, flangeBoltCircle);
    const holeCount = Math.max(3, Math.round(flangeHoleCount));
    const holeDiameter = Math.max(1, flangeHoleDiameter);
    const radius = boltCircle / 2;
    const angleStepDeg = 360 / holeCount;
    const halfStepDeg = 180 / holeCount;
    const chord = boltCircle * Math.sin((Math.PI / holeCount));
    const circumference = Math.PI * boltCircle;
    const arcBetweenHoles = circumference / holeCount;
    const referenceOffset = flangeTopReference === 'GAP' ? angleStepDeg / 2 : 0;
    const startAngleDeg = -90 + flangeStartAngle + referenceOffset;
    const points = Array.from({ length: holeCount }, (_, index) => {
      const angleDeg = startAngleDeg + (index * angleStepDeg);
      const angleRad = angleDeg * (Math.PI / 180);
      return {
        index,
        angleDeg,
        x: Math.cos(angleRad) * radius,
        y: Math.sin(angleRad) * radius,
      };
    });

    return {
      boltCircle,
      holeCount,
      holeDiameter,
      radius,
      angleStepDeg,
      halfStepDeg,
      chord,
      circumference,
      arcBetweenHoles,
      startAngleDeg,
      referenceOffset,
      points,
    };
  }, [flangeBoltCircle, flangeHoleCount, flangeHoleDiameter, flangeStartAngle, flangeTopReference]);

  const saddle90Results = useMemo(() => {
    const headerDiameter = Math.max(10, saddleHeaderDiameter);
    const branchDiameter = Math.max(10, saddleBranchDiameter);
    const axisOffset = saddleAxisOffset;
    const divisions = Math.max(6, saddleDivisions);
    const headerRadius = headerDiameter / 2;
    const branchRadius = branchDiameter / 2;
    const stepWidth = (Math.PI * branchDiameter) / divisions;
    const development = stepWidth * divisions;
    const points = Array.from({ length: divisions + 1 }, (_, index) => {
      const theta = Math.PI - ((2 * Math.PI * index) / divisions);
      const thetaDeg = Math.round((theta * 180) / Math.PI);
      const projected = axisOffset + (Math.cos(theta) * branchRadius);
      const rootTerm = Math.max(0, (headerRadius ** 2) - (projected ** 2));
      const ordinate = headerDiameter - Math.sqrt(rootTerm);
      const mirroredIndex = index <= (divisions / 2) ? index + 1 : divisions - index + 1;

      return {
        index,
        label: mirroredIndex,
        thetaDeg,
        projected,
        ordinate,
        x: index * stepWidth,
      };
    });

    return {
      headerDiameter,
      branchDiameter,
      axisOffset,
      divisions,
      headerRadius,
      branchRadius,
      stepWidth,
      development,
      maxOrdinate: points.reduce((acc, point) => Math.max(acc, point.ordinate), 0),
      points,
      centerOrdinate: points[Math.floor(points.length / 2)]?.ordinate || 0,
    };
  }, [saddleAxisOffset, saddleBranchDiameter, saddleDivisions, saddleHeaderDiameter]);

  const elbowBackSaddleResults = useMemo(() => {
    const meanRadius = Math.max(10, elbowBackMeanRadius);
    const curveDiameter = Math.max(10, elbowBackCurveDiameter);
    const branchDiameter = Math.max(10, elbowBackBranchDiameter);
    const divisions = Math.max(6, elbowBackDivisions);
    const curveRadius = curveDiameter / 2;
    const branchRadius = branchDiameter / 2;
    const outerRadius = meanRadius + curveRadius;
    const stepWidth = (Math.PI * branchDiameter) / divisions;
    const development = stepWidth * divisions;

    const points = Array.from({ length: divisions + 1 }, (_, index) => {
      const theta = Math.PI - ((2 * Math.PI * index) / divisions);
      const localX = Math.cos(theta) * branchRadius;
      const localY = Math.sin(theta) * branchRadius;
      const projectedCurve = Math.sqrt(Math.max(0, (curveRadius ** 2) - (localY ** 2)));
      const ordinate =
        outerRadius -
        Math.sqrt(
          Math.max(
            0,
            ((meanRadius + projectedCurve) ** 2) - ((meanRadius + localX) ** 2)
          )
        );
      const label = index <= (divisions / 2) ? index + 1 : divisions - index + 1;

      return {
        index,
        label,
        thetaDeg: ((theta * 180) / Math.PI + 360) % 360,
        ordinate,
        x: index * stepWidth,
      };
    });

    return {
      meanRadius,
      curveDiameter,
      branchDiameter,
      curveRadius,
      branchRadius,
      outerRadius,
      divisions,
      stepWidth,
      development,
      points,
      maxOrdinate: points.reduce((acc, point) => Math.max(acc, point.ordinate), 0),
      minOrdinate: points.reduce((acc, point) => Math.min(acc, point.ordinate), Number.POSITIVE_INFINITY),
      centerOrdinate: points[Math.floor(points.length / 2)]?.ordinate || 0,
    };
  }, [elbowBackBranchDiameter, elbowBackCurveDiameter, elbowBackDivisions, elbowBackMeanRadius]);

  const concentricReductionResults = useMemo(() => {
    const largeDiameter = Math.max(reducerLargeDiameter, reducerSmallDiameter, 10);
    const smallDiameter = Math.max(10, Math.min(reducerLargeDiameter, reducerSmallDiameter));
    const reductionLength = Math.max(5, reducerLength);
    const divisions = Math.max(6, reducerDivisions);
    const largeRadius = largeDiameter / 2;
    const smallRadius = smallDiameter / 2;
    const radialDifference = largeRadius - smallRadius;
    const slantHeight = Math.sqrt((reductionLength ** 2) + (radialDifference ** 2));
    const largeStep = (Math.PI * largeDiameter) / divisions;
    const smallStep = (Math.PI * smallDiameter) / divisions;
    const insetPerSide = (largeStep - smallStep) / 2;
    const panels = Array.from({ length: divisions }, (_, index) => ({
      index,
      x: index * largeStep,
    }));

    return {
      largeDiameter,
      smallDiameter,
      reductionLength,
      divisions,
      largeRadius,
      smallRadius,
      radialDifference,
      slantHeight,
      largeStep,
      smallStep,
      insetPerSide,
      development: largeStep * divisions,
      panels,
    };
  }, [reducerDivisions, reducerLargeDiameter, reducerLength, reducerSmallDiameter]);

  const eccentricReductionResults = useMemo(() => {
    const largeDiameter = Math.max(eccentricLargeDiameter, eccentricSmallDiameter, 10);
    const smallDiameter = Math.max(10, Math.min(eccentricLargeDiameter, eccentricSmallDiameter));
    const reductionLength = Math.max(5, eccentricLength);
    const divisions = Math.max(6, eccentricDivisions);
    const largeRadius = largeDiameter / 2;
    const smallRadius = smallDiameter / 2;
    const radialDifference = largeRadius - smallRadius;
    const circumference = Math.PI * largeDiameter;
    const stepWidth = circumference / divisions;
    const topStep = (Math.PI * smallDiameter) / divisions;
    const centerOffset = radialDifference;

    const points = Array.from({ length: divisions + 1 }, (_, index) => {
      const theta = (index / divisions) * Math.PI * 2;
      const radialGap = Math.sqrt(
        ((centerOffset - (radialDifference * Math.cos(theta))) ** 2) +
        ((radialDifference * Math.sin(theta)) ** 2)
      );
      const trueLength = Math.sqrt((reductionLength ** 2) + (radialGap ** 2));
      return {
        index,
        thetaDeg: (theta * 180) / Math.PI,
        x: index * stepWidth,
        trueLength,
        radialGap,
        label: index === divisions ? divisions : index + 1,
      };
    });

    const minTrueLength = Math.min(...points.map((point) => point.trueLength));
    const maxTrueLength = Math.max(...points.map((point) => point.trueLength));
    const contourAmplitude = Math.max(0, maxTrueLength - minTrueLength);
    const panels = Array.from({ length: divisions }, (_, index) => ({
      index,
      x0: index * stepWidth,
      x1: (index + 1) * stepWidth,
      leftHeight: points[index].trueLength,
      rightHeight: points[index + 1].trueLength,
    }));

    return {
      largeDiameter,
      smallDiameter,
      reductionLength,
      divisions,
      largeRadius,
      smallRadius,
      radialDifference,
      stepWidth,
      topStep,
      development: stepWidth * divisions,
      centerOffset,
      points,
      panels,
      minTrueLength,
      maxTrueLength,
      contourAmplitude,
    };
  }, [eccentricDivisions, eccentricLargeDiameter, eccentricLength, eccentricSmallDiameter]);

  // --- Visual Scaling for Diagram ---
  // Scale factor adjusted to 0.28 to fit 20" pipes nicely
  const VISUAL_SCALE = 0.28; 
  const headerODVal = PIPE_SCHEDULE[headerSize]?.od || 0;
  const branchODVal = PIPE_SCHEDULE[branchSize]?.od || 0;
  
  const headerVisualOD = headerODVal * VISUAL_SCALE;
  const branchVisualOD = branchODVal * VISUAL_SCALE;
  const centerY = 120;
  const centerX = 200;

  const handleAngleChange = (delta: number) => {
    setMiterAngle(prev => {
        const next = prev + delta;
        if (next < 1) return 1;
        if (next > 179) return 179;
        return next;
    });
  };

  const patternSvgWidth = Math.max(680, elbowPatternResults.development + 80);
  const patternChartLeft = 40;
  const patternBaseY = 190;
  const patternCurveColor = '#ffffff';
  const patternStepColor = '#60a5fa';
  const patternOrdinateColor = '#fb923c';
  const patternDevelopmentColor = '#4ade80';
  const centerPatternPoint = elbowPatternResults.points[Math.floor(elbowPatternResults.points.length / 2)];
  const arcScale = Math.min(
    2,
    240 / Math.max(arcLayoutResults.base, 1),
    180 / Math.max(arcLayoutResults.hypotenuse, 1),
  );
  const arcOrigin = { x: 76, y: 212 };
  const arcApex = {
    x: arcOrigin.x + (arcLayoutResults.base * arcScale),
    y: arcOrigin.y - (arcLayoutResults.verticalLeg * arcScale),
  };
  const arcTopPoint = {
    x: arcOrigin.x,
    y: arcOrigin.y - (arcLayoutResults.hypotenuse * arcScale),
  };
  const arcHorizontalY = arcApex.y;
  const arcInnerRadius = Math.max((arcLayoutResults.hypotenuse * arcScale) - 14, 12);
  const arcAngleMarkerRadius = 28;
  const arcAngleStart = -90;
  const arcAngleEnd = -90 + arcLayoutResults.centralAngleDeg;
  const arcAngleMarkerStart = {
    x: arcOrigin.x + (Math.cos(arcAngleStart * Math.PI / 180) * arcAngleMarkerRadius),
    y: arcOrigin.y + (Math.sin(arcAngleStart * Math.PI / 180) * arcAngleMarkerRadius),
  };
  const arcAngleMarkerEnd = {
    x: arcOrigin.x + (Math.cos(arcAngleEnd * Math.PI / 180) * arcAngleMarkerRadius),
    y: arcOrigin.y + (Math.sin(arcAngleEnd * Math.PI / 180) * arcAngleMarkerRadius),
  };
  const arcInnerStart = {
    x: arcOrigin.x,
    y: arcOrigin.y - arcInnerRadius,
  };
  const arcInnerEnd = {
    x: arcOrigin.x + (Math.sin(arcLayoutResults.centralAngleRad) * arcInnerRadius),
    y: arcOrigin.y - (Math.cos(arcLayoutResults.centralAngleRad) * arcInnerRadius),
  };
  const arcBaseColor = '#60a5fa';
  const arcHalfOpeningColor = '#f59e0b';
  const arcAngleColor = '#fb923c';
  const arcHypotenuseColor = '#ffffff';
  const arcDevelopmentColor = '#4ade80';
  const arcVerticalColor = '#f472b6';
  const radiusLeftColor = '#60a5fa';
  const radiusRightColor = '#34d399';
  const radiusRiseColor = '#fb923c';
  const radiusMainColor = '#ffffff';
  const radiusAuxColor = '#f472b6';
  const flangeCircleColor = '#ffffff';
  const flangeHoleColor = '#60a5fa';
  const flangeChordColor = '#fb923c';
  const flangeDiameterColor = '#f472b6';
  const flangeAngleColor = '#4ade80';
  const flangeArcColor = '#fbbf24';

  const buildMoldDocument = useCallback((title: string, widthMm: number, heightMm: number, innerSvg: string, orientation: 'portrait' | 'landscape', contentBounds?: MoldContentBounds, metaLines: string[] = []) => {
    const safeWidth = Math.max(40, widthMm);
    const safeHeight = Math.max(40, heightMm);
    const pageWidth = orientation === 'portrait' ? 210 : 297;
    const pageHeight = orientation === 'portrait' ? 297 : 210;
    const margin = 8;
    const rulerHeight = 15;
    const noteHeight = 14 + (metaLines.length * 4);
    const overlap = 6;
    const contentWidth = pageWidth - (margin * 2);
    const contentHeight = pageHeight - (margin * 2) - rulerHeight - noteHeight;
    const pageAdvanceX = Math.max(20, contentWidth - overlap);
    const pageAdvanceY = Math.max(20, contentHeight - overlap);
    const boundedMinX = Math.max(0, Math.min(contentBounds?.minX ?? 0, safeWidth - 1));
    const boundedMinY = Math.max(0, Math.min(contentBounds?.minY ?? 0, safeHeight - 1));
    const boundedMaxX = Math.max(boundedMinX + 1, Math.min(contentBounds?.maxX ?? safeWidth, safeWidth));
    const boundedMaxY = Math.max(boundedMinY + 1, Math.min(contentBounds?.maxY ?? safeHeight, safeHeight));
    const boundedWidth = boundedMaxX - boundedMinX;
    const boundedHeight = boundedMaxY - boundedMinY;
    const columns = boundedWidth <= contentWidth ? 1 : (1 + Math.ceil((boundedWidth - contentWidth) / pageAdvanceX));
    const rows = boundedHeight <= contentHeight ? 1 : (1 + Math.ceil((boundedHeight - contentHeight) / pageAdvanceY));

    const addAlignmentMarks = (x: number, y: number, color: string) => `
      <line x1="${x - 4}" y1="${y - 4}" x2="${x + 4}" y2="${y + 4}" stroke="${color}" stroke-width="0.45" />
      <line x1="${x - 4}" y1="${y + 4}" x2="${x + 4}" y2="${y - 4}" stroke="${color}" stroke-width="0.45" />
    `;

    const pageDefs: Array<{ row: number; col: number; offsetX: number; offsetY: number; sliceWidth: number; sliceHeight: number }> = [];
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        const offsetX = boundedMinX + (col * pageAdvanceX);
        const offsetY = boundedMinY + (row * pageAdvanceY);
        const remainingWidth = boundedMaxX - offsetX;
        const remainingHeight = boundedMaxY - offsetY;
        const sliceWidth = Math.min(contentWidth, remainingWidth);
        const sliceHeight = Math.min(contentHeight, remainingHeight);

        if (sliceWidth > 0.1 && sliceHeight > 0.1) {
          pageDefs.push({ row, col, offsetX, offsetY, sliceWidth, sliceHeight });
        }
      }
    }

    const pageSvgs = pageDefs.map((pageDef, flatIndex) => {
      const { row, col, offsetX, offsetY, sliceWidth, sliceHeight } = pageDef;
      const frameX = margin + (columns === 1 ? Math.max(0, (contentWidth - sliceWidth) / 2) : 0);
      const frameY = margin + noteHeight;
      const rulerStartX = margin;
      const rulerY = Math.min(pageHeight - margin - 8, frameY + sliceHeight + 12);
      const showLeftOverlap = col > 0;
      const showRightOverlap = col < (columns - 1);
      const showTopOverlap = row > 0;
      const showBottomOverlap = row < (rows - 1);
      const leftJoinX = frameX + overlap;
      const rightJoinX = frameX + sliceWidth - overlap;
      const topJoinY = frameY + overlap;
      const bottomJoinY = frameY + sliceHeight - overlap;

      return `
        <svg xmlns="http://www.w3.org/2000/svg" width="${pageWidth}mm" height="${pageHeight}mm" viewBox="0 0 ${pageWidth} ${pageHeight}">
          <rect x="0" y="0" width="${pageWidth}" height="${pageHeight}" fill="#ffffff" />
          <rect x="${frameX}" y="${frameY}" width="${sliceWidth}" height="${sliceHeight}" fill="none" stroke="#d4d4d8" stroke-width="0.4" />
          <text x="${margin}" y="${margin - 1}" font-size="3.8" font-weight="700" fill="#000">${title}</text>
          <text x="${margin}" y="${margin + 3}" font-size="2.8" fill="#333">Folha ${flatIndex + 1}/${pageDefs.length} | Linha ${row + 1}/${rows} | Coluna ${col + 1}/${columns} | A4 ${orientation === 'portrait' ? 'retrato' : 'paisagem'} | 100%</text>
          <text x="${margin}" y="${margin + 7}" font-size="2.8" fill="#333">Faixa X: ${offsetX.toFixed(1)} a ${(offsetX + sliceWidth).toFixed(1)} mm | Y: ${offsetY.toFixed(1)} a ${(offsetY + sliceHeight).toFixed(1)} mm.</text>
          ${metaLines.map((line, index) => (
            `<text x="${margin}" y="${margin + 11 + (index * 4)}" font-size="2.8" fill="#444">${line}</text>`
          )).join('')}
          <svg x="${frameX}" y="${frameY}" width="${sliceWidth}" height="${sliceHeight}" viewBox="${offsetX} ${offsetY} ${sliceWidth} ${sliceHeight}" preserveAspectRatio="none">
            ${innerSvg}
          </svg>

          ${showLeftOverlap ? `
            <rect x="${frameX}" y="${frameY}" width="${overlap}" height="${sliceHeight}" fill="#fde68a" fill-opacity="0.16" stroke="none" />
            <line x1="${leftJoinX}" y1="${frameY}" x2="${leftJoinX}" y2="${frameY + sliceHeight}" stroke="#f59e0b" stroke-width="0.45" stroke-dasharray="2 2" />
            <text x="${frameX}" y="${frameY - 2}" font-size="2.8" fill="#a16207">Sobrepor ${overlap} mm com coluna ${col}</text>
          ` : ''}
          ${showRightOverlap ? `
            <rect x="${frameX + sliceWidth - overlap}" y="${frameY}" width="${overlap}" height="${sliceHeight}" fill="#bfdbfe" fill-opacity="0.18" stroke="none" />
            <line x1="${rightJoinX}" y1="${frameY}" x2="${rightJoinX}" y2="${frameY + sliceHeight}" stroke="#2563eb" stroke-width="0.45" stroke-dasharray="2 2" />
            <text x="${frameX + sliceWidth - 2}" y="${frameY - 2}" text-anchor="end" font-size="2.8" fill="#1d4ed8">Unir com coluna ${col + 2}</text>
          ` : ''}
          ${showTopOverlap ? `
            <rect x="${frameX}" y="${frameY}" width="${sliceWidth}" height="${overlap}" fill="#ede9fe" fill-opacity="0.16" stroke="none" />
            <line x1="${frameX}" y1="${topJoinY}" x2="${frameX + sliceWidth}" y2="${topJoinY}" stroke="#7c3aed" stroke-width="0.45" stroke-dasharray="2 2" />
            <text x="${frameX + sliceWidth - 2}" y="${frameY + 3}" text-anchor="end" font-size="2.8" fill="#6d28d9">Sobrepor ${overlap} mm com linha ${row}</text>
          ` : ''}
          ${showBottomOverlap ? `
            <rect x="${frameX}" y="${frameY + sliceHeight - overlap}" width="${sliceWidth}" height="${overlap}" fill="#dcfce7" fill-opacity="0.18" stroke="none" />
            <line x1="${frameX}" y1="${bottomJoinY}" x2="${frameX + sliceWidth}" y2="${bottomJoinY}" stroke="#16a34a" stroke-width="0.45" stroke-dasharray="2 2" />
            <text x="${frameX + sliceWidth - 2}" y="${frameY + sliceHeight - 2}" text-anchor="end" font-size="2.8" fill="#15803d">Unir com linha ${row + 2}</text>
          ` : ''}

          ${showLeftOverlap ? `
            ${addAlignmentMarks(leftJoinX, frameY + 16, '#f59e0b')}
            ${addAlignmentMarks(leftJoinX, frameY + sliceHeight - 16, '#f59e0b')}
          ` : ''}
          ${showRightOverlap ? `
            ${addAlignmentMarks(rightJoinX, frameY + 16, '#2563eb')}
            ${addAlignmentMarks(rightJoinX, frameY + sliceHeight - 16, '#2563eb')}
          ` : ''}
          ${showTopOverlap ? `
            ${addAlignmentMarks(frameX + 16, topJoinY, '#7c3aed')}
            ${addAlignmentMarks(frameX + sliceWidth - 16, topJoinY, '#7c3aed')}
          ` : ''}
          ${showBottomOverlap ? `
            ${addAlignmentMarks(frameX + 16, bottomJoinY, '#16a34a')}
            ${addAlignmentMarks(frameX + sliceWidth - 16, bottomJoinY, '#16a34a')}
          ` : ''}

          <line x1="${rulerStartX}" y1="${rulerY}" x2="${rulerStartX + 100}" y2="${rulerY}" stroke="#000" stroke-width="0.5" />
          ${Array.from({ length: 11 }, (_, tick) => {
            const x = rulerStartX + (tick * 10);
            const tickHeight = tick === 0 || tick === 10 ? 5 : 3;
            return `<line x1="${x}" y1="${rulerY - tickHeight}" x2="${x}" y2="${rulerY + tickHeight}" stroke="#000" stroke-width="0.35" />`;
          }).join('')}
          <text x="${rulerStartX + 50}" y="${rulerY - 7}" text-anchor="middle" font-size="3.2" font-weight="700" fill="#000">Regua de conferencia 100 mm</text>
          <text x="${rulerStartX}" y="${rulerY + 10}" font-size="2.8" fill="#333">0</text>
          <text x="${rulerStartX + 100}" y="${rulerY + 10}" text-anchor="end" font-size="2.8" fill="#333">100 mm</text>
        </svg>
      `;
    });

    return {
      pageWidth,
      pageHeight,
      rows,
      columns,
      pageSvgs,
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <meta charset="utf-8" />
            <title>${title}</title>
            <style>
              @page { size: A4 ${orientation}; margin: 0; }
              body {
                margin: 0;
                padding: 0;
                background: #d4d4d8;
                font-family: Arial, sans-serif;
              }
              .page {
                width: ${pageWidth}mm;
                height: ${pageHeight}mm;
                margin: 0 auto 4mm auto;
                box-shadow: 0 0 0 1px rgba(0,0,0,.08);
                background: #fff;
                display: block;
                overflow: hidden;
                break-after: page;
                page-break-after: always;
              }
              .page:last-child {
                break-after: auto;
                page-break-after: auto;
              }
              @media print {
                body { background: #fff; }
                .page { margin: 0; box-shadow: none; }
              }
            </style>
          </head>
          <body>${pageSvgs.map((svg) => `<div class="page">${svg}</div>`).join('')}</body>
        </html>
      `,
    };
  }, []);

  const printMoldDocument = useCallback((title: string, widthMm: number, heightMm: number, innerSvg: string, orientation: 'portrait' | 'landscape', contentBounds?: MoldContentBounds, metaLines: string[] = []) => {
    const doc = buildMoldDocument(title, widthMm, heightMm, innerSvg, orientation, contentBounds, metaLines);
    const printFrame = document.createElement('iframe');
    printFrame.setAttribute('aria-hidden', 'true');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.style.opacity = '0';
    document.body.appendChild(printFrame);

    const cleanup = () => {
      window.setTimeout(() => {
        printFrame.remove();
      }, 1000);
    };

    const frameWindow = printFrame.contentWindow;
    if (!frameWindow) {
      printFrame.remove();
      window.alert('Nao foi possivel preparar a impressao no navegador.');
      return;
    }

    frameWindow.document.open();
    frameWindow.document.write(doc.html);
    frameWindow.document.close();

    printFrame.onload = () => {
      try {
        frameWindow.focus();
        frameWindow.print();
      } catch (error) {
        console.error(error);
        window.alert('Nao foi possivel abrir a janela de impressao. Verifique as permissoes do navegador.');
      } finally {
        cleanup();
      }
    };
  }, [buildMoldDocument]);

  const exportMoldPdf = useCallback(async (title: string, widthMm: number, heightMm: number, innerSvg: string, fileName: string, orientation: 'portrait' | 'landscape', contentBounds?: MoldContentBounds, metaLines: string[] = []) => {
    const docMarkup = buildMoldDocument(title, widthMm, heightMm, innerSvg, orientation, contentBounds, metaLines);
    const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

    for (let index = 0; index < docMarkup.pageSvgs.length; index += 1) {
      const svgMarkup = docMarkup.pageSvgs[index];
      const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      try {
        const imageData = await new Promise<string>((resolve, reject) => {
          const image = new Image();
          image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(docMarkup.pageWidth * 6);
            canvas.height = Math.round(docMarkup.pageHeight * 6);
            const context = canvas.getContext('2d');
            if (!context) {
              reject(new Error('Nao foi possivel criar canvas para exportacao PDF.'));
              return;
            }
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/png', 1));
          };
          image.onerror = () => reject(new Error('Falha ao converter o molde para imagem PDF.'));
          image.src = url;
        });

        if (index > 0) {
          pdf.addPage('a4', orientation);
        }
        pdf.addImage(imageData, 'PNG', 0, 0, docMarkup.pageWidth, docMarkup.pageHeight, undefined, 'FAST');
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    pdf.save(fileName);
  }, [buildMoldDocument]);

  const printSimpleHtmlDocument = useCallback((title: string, bodyHtml: string) => {
    const printFrame = document.createElement('iframe');
    printFrame.setAttribute('aria-hidden', 'true');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.style.opacity = '0';
    document.body.appendChild(printFrame);

    const cleanup = () => {
      window.setTimeout(() => {
        printFrame.remove();
      }, 1000);
    };

    const frameWindow = printFrame.contentWindow;
    if (!frameWindow) {
      printFrame.remove();
      window.alert('Nao foi possivel preparar a impressao no navegador.');
      return;
    }

    frameWindow.document.open();
    frameWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            body { font-family: Arial, sans-serif; color: #111827; }
            h1 { font-size: 18px; margin: 0 0 8px; }
            p { font-size: 12px; margin: 0 0 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 12px; text-align: left; }
            th { background: #e2e8f0; }
            .note { margin-top: 12px; font-size: 11px; color: #475569; }
          </style>
        </head>
        <body>${bodyHtml}</body>
      </html>
    `);
    frameWindow.document.close();

    printFrame.onload = () => {
      try {
        frameWindow.focus();
        frameWindow.print();
      } catch (error) {
        console.error(error);
        window.alert('Nao foi possivel abrir a impressao da tabela.');
      } finally {
        cleanup();
      }
    };
  }, []);

  const handleCopyMiterMarkingTable = useCallback(async () => {
    const rows = miterMarkingHalfPoints
      .map((point) => `${point.mark}\t${point.deg}°\t${point.x.toFixed(2)} mm\t${point.height.toFixed(1)} mm`)
      .join('\n');
    const text = [
      'Tabela pratica para marcar no tubo - Boca de Lobo',
      `DE Ramal: ${miterMoldResults.branchOD.toFixed(1)} mm`,
      `Perimetro: ${miterMoldResults.development.toFixed(1)} mm`,
      `Cada divisao: ${miterMoldResults.stepWidth.toFixed(2)} mm`,
      '',
      'Ponto\tAngulo\tPosicao no perimetro\tAltura do corte',
      rows,
      '',
      'Do ponto central em diante, o restante e espelhado.',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      window.alert('Tabela pratica copiada para a area de transferencia.');
    } catch (error) {
      console.error(error);
      window.alert('Nao foi possivel copiar a tabela.');
    }
  }, [miterMarkingHalfPoints, miterMoldResults.branchOD, miterMoldResults.development, miterMoldResults.stepWidth]);

  const handlePrintMiterMarkingTable = useCallback(() => {
    const rowsHtml = miterMarkingHalfPoints.map((point) => `
      <tr>
        <td>${point.mark}</td>
        <td>${point.deg}°</td>
        <td>${point.x.toFixed(2)} mm</td>
        <td>${point.height.toFixed(1)} mm</td>
      </tr>
    `).join('');

    printSimpleHtmlDocument(
      'Tabela pratica - Boca de Lobo',
      `
        <h1>Tabela pratica para marcar no tubo</h1>
        <p><strong>Boca de Lobo</strong> | DE Ramal ${miterMoldResults.branchOD.toFixed(1)} mm | Perimetro ${miterMoldResults.development.toFixed(1)} mm | Cada divisao ${miterMoldResults.stepWidth.toFixed(2)} mm</p>
        <p>Encoste a trena na boca do tubo, marque as posicoes no perimetro e suba a altura do corte de cada ponto.</p>
        <table>
          <thead>
            <tr>
              <th>Ponto</th>
              <th>Angulo</th>
              <th>Posicao no perimetro</th>
              <th>Altura do corte</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <p class="note">Do ponto central em diante, o restante do risco pode ser espelhado no tubo.</p>
      `
    );
  }, [miterMarkingHalfPoints, miterMoldResults.branchOD, miterMoldResults.development, miterMoldResults.stepWidth, printSimpleHtmlDocument]);

  const handlePrintMiterMold = useCallback(() => {
    const margin = 12;
    const moldTitle = `Molde Boca de Lobo ${formatAngleForTitle(miterAngle)}`;
    const widthMm = miterMoldResults.development + (margin * 2);
    const heightMm = Math.max(84, miterMoldResults.maxHeight + 52);
    const baselineY = heightMm - 22;
    const pathData = miterMoldResults.printablePoints
      .map((point) => `${margin + point.x} ${baselineY - point.height}`)
      .join(' L ');
    const verticals = miterMoldResults.printablePoints.map((point) => `
      <line x1="${margin + point.x}" y1="${baselineY}" x2="${margin + point.x}" y2="${baselineY - point.height}" stroke="#b0b0b0" stroke-width="0.3" stroke-dasharray="1.4 1.2" />
      <text x="${margin + point.x}" y="${baselineY + 8}" font-size="2.6" text-anchor="start" fill="#666" transform="rotate(90 ${margin + point.x} ${baselineY + 8})">${point.deg}°</text>
    `).join('');
    const contentBounds = {
      minX: Math.max(0, margin - 2),
      minY: Math.max(0, baselineY - miterMoldResults.maxHeight - 4),
      maxX: Math.min(widthMm, margin + miterMoldResults.development + 2),
      maxY: Math.min(heightMm, baselineY + 10),
    };

    printMoldDocument(
      moldTitle,
      widthMm,
      heightMm,
      `
        <rect x="0.6" y="0.6" width="${widthMm - 1.2}" height="${heightMm - 1.2}" fill="none" stroke="#999" stroke-width="0.4" />
        <text x="${margin}" y="6" font-size="4" font-weight="700" fill="#000">${moldTitle}</text>
        <text x="${margin}" y="11" font-size="3.2" fill="#444">DE ramal ${miterMoldResults.branchOD.toFixed(1)} mm | passo ${miterMoldResults.stepWidth.toFixed(2)} mm | desenvolvimento ${miterMoldResults.development.toFixed(1)} mm</text>
        <line x1="${margin}" y1="${baselineY}" x2="${margin + miterMoldResults.development}" y2="${baselineY}" stroke="#000" stroke-width="0.35" />
        ${verticals}
        <path d="M ${pathData}" fill="none" stroke="#000" stroke-width="0.45" />
      `,
      moldPageOrientation,
      contentBounds,
      [
        `Coletor ${headerSize}" | Ramal ${branchSize}" | Ângulo ${formatAngleForTitle(miterAngle)}`,
        `Divisões ${divisions} | Passo ${miterMoldResults.stepWidth.toFixed(2)} mm | Desenvolvimento ${miterMoldResults.development.toFixed(1)} mm`
      ]
    );
  }, [miterAngle, miterMoldResults, moldPageOrientation, printMoldDocument]);

  const handleExportMiterMoldPdf = useCallback(async () => {
    const margin = 12;
    const moldTitle = `Molde Boca de Lobo ${formatAngleForTitle(miterAngle)}`;
    const widthMm = miterMoldResults.development + (margin * 2);
    const heightMm = Math.max(84, miterMoldResults.maxHeight + 52);
    const baselineY = heightMm - 22;
    const pathData = miterMoldResults.printablePoints
      .map((point) => `${margin + point.x} ${baselineY - point.height}`)
      .join(' L ');
    const verticals = miterMoldResults.printablePoints.map((point) => `
      <line x1="${margin + point.x}" y1="${baselineY}" x2="${margin + point.x}" y2="${baselineY - point.height}" stroke="#b0b0b0" stroke-width="0.3" stroke-dasharray="1.4 1.2" />
      <text x="${margin + point.x}" y="${baselineY + 8}" font-size="2.6" text-anchor="start" fill="#666" transform="rotate(90 ${margin + point.x} ${baselineY + 8})">${point.deg}°</text>
    `).join('');
    const contentBounds = {
      minX: Math.max(0, margin - 2),
      minY: Math.max(0, baselineY - miterMoldResults.maxHeight - 4),
      maxX: Math.min(widthMm, margin + miterMoldResults.development + 2),
      maxY: Math.min(heightMm, baselineY + 10),
    };

    await exportMoldPdf(
      moldTitle,
      widthMm,
      heightMm,
      `
        <rect x="0.6" y="0.6" width="${widthMm - 1.2}" height="${heightMm - 1.2}" fill="none" stroke="#999" stroke-width="0.4" />
        <text x="${margin}" y="6" font-size="4" font-weight="700" fill="#000">${moldTitle}</text>
        <text x="${margin}" y="11" font-size="3.2" fill="#444">DE ramal ${miterMoldResults.branchOD.toFixed(1)} mm | passo ${miterMoldResults.stepWidth.toFixed(2)} mm | desenvolvimento ${miterMoldResults.development.toFixed(1)} mm</text>
        <line x1="${margin}" y1="${baselineY}" x2="${margin + miterMoldResults.development}" y2="${baselineY}" stroke="#000" stroke-width="0.35" />
        ${verticals}
        <path d="M ${pathData}" fill="none" stroke="#000" stroke-width="0.45" />
      `,
      `molde-boca-de-lobo-${formatAngleForFileName(miterAngle)}.pdf`,
      moldPageOrientation,
      contentBounds,
      [
        `Coletor ${headerSize}" | Ramal ${branchSize}" | Ângulo ${formatAngleForTitle(miterAngle)}`,
        `Divisões ${divisions} | Passo ${miterMoldResults.stepWidth.toFixed(2)} mm | Desenvolvimento ${miterMoldResults.development.toFixed(1)} mm`
      ]
    );
  }, [exportMoldPdf, miterAngle, miterMoldResults, moldPageOrientation]);

  const handlePrintElbowPattern = useCallback(() => {
    const margin = 12;
    const moldTitle = `Molde Cotovelo por Pegadas ${formatAngleForTitle(patternAngle)}`;
    const widthMm = elbowPatternResults.development + (margin * 2);
    const heightMm = Math.max(80, elbowPatternResults.centerOrdinate + 40);
    const baselineY = heightMm - 14;
    const pathData = elbowPatternResults.points
      .map((point) => `${margin + point.x} ${baselineY - point.ordinate}`)
      .join(' L ');
    const verticals = elbowPatternResults.points.map((point) => `
      <line x1="${margin + point.x}" y1="${baselineY}" x2="${margin + point.x}" y2="${baselineY - point.ordinate}" stroke="#b0b0b0" stroke-width="0.3" stroke-dasharray="1.4 1.2" />
      <text x="${margin + point.x}" y="${baselineY + 4}" font-size="3" text-anchor="middle" fill="#666">${point.label}</text>
    `).join('');
    const contentBounds = {
      minX: Math.max(0, margin - 2),
      minY: Math.max(0, baselineY - elbowPatternResults.centerOrdinate - 4),
      maxX: Math.min(widthMm, margin + elbowPatternResults.development + 2),
      maxY: Math.min(heightMm, baselineY + 8),
    };

    printMoldDocument(
      moldTitle,
      widthMm,
      heightMm,
      `
        <rect x="0.6" y="0.6" width="${widthMm - 1.2}" height="${heightMm - 1.2}" fill="none" stroke="#999" stroke-width="0.4" />
        <text x="${margin}" y="6" font-size="4" font-weight="700" fill="#000">${moldTitle}</text>
        <text x="${margin}" y="11" font-size="3.2" fill="#444">DE ${elbowPatternResults.od.toFixed(1)} mm | passo ${elbowPatternResults.stepWidth.toFixed(2)} mm | desenvolvimento ${elbowPatternResults.development.toFixed(1)} mm</text>
        <line x1="${margin}" y1="${baselineY}" x2="${margin + elbowPatternResults.development}" y2="${baselineY}" stroke="#000" stroke-width="0.35" />
        ${verticals}
        <path d="M ${pathData}" fill="none" stroke="#000" stroke-width="0.45" />
      `,
      moldPageOrientation,
      contentBounds,
      [
        `Tubo ${patternSize}" | Ângulo ${formatAngleForTitle(patternAngle)} | Pegadas ${patternDivisions}`,
        `Base ${patternBase.toFixed(1)} mm | Passo ${elbowPatternResults.stepWidth.toFixed(2)} mm | Desenvolvimento ${elbowPatternResults.development.toFixed(1)} mm`
      ]
    );
  }, [elbowPatternResults, moldPageOrientation, patternAngle, printMoldDocument]);

  const handleExportElbowPatternPdf = useCallback(async () => {
    const margin = 12;
    const moldTitle = `Molde Cotovelo por Pegadas ${formatAngleForTitle(patternAngle)}`;
    const widthMm = elbowPatternResults.development + (margin * 2);
    const heightMm = Math.max(80, elbowPatternResults.centerOrdinate + 40);
    const baselineY = heightMm - 14;
    const pathData = elbowPatternResults.points
      .map((point) => `${margin + point.x} ${baselineY - point.ordinate}`)
      .join(' L ');
    const verticals = elbowPatternResults.points.map((point) => `
      <line x1="${margin + point.x}" y1="${baselineY}" x2="${margin + point.x}" y2="${baselineY - point.ordinate}" stroke="#b0b0b0" stroke-width="0.3" stroke-dasharray="1.4 1.2" />
      <text x="${margin + point.x}" y="${baselineY + 4}" font-size="3" text-anchor="middle" fill="#666">${point.label}</text>
    `).join('');
    const contentBounds = {
      minX: Math.max(0, margin - 2),
      minY: Math.max(0, baselineY - elbowPatternResults.centerOrdinate - 4),
      maxX: Math.min(widthMm, margin + elbowPatternResults.development + 2),
      maxY: Math.min(heightMm, baselineY + 8),
    };

    await exportMoldPdf(
      moldTitle,
      widthMm,
      heightMm,
      `
        <rect x="0.6" y="0.6" width="${widthMm - 1.2}" height="${heightMm - 1.2}" fill="none" stroke="#999" stroke-width="0.4" />
        <text x="${margin}" y="6" font-size="4" font-weight="700" fill="#000">${moldTitle}</text>
        <text x="${margin}" y="11" font-size="3.2" fill="#444">DE ${elbowPatternResults.od.toFixed(1)} mm | passo ${elbowPatternResults.stepWidth.toFixed(2)} mm | desenvolvimento ${elbowPatternResults.development.toFixed(1)} mm</text>
        <line x1="${margin}" y1="${baselineY}" x2="${margin + elbowPatternResults.development}" y2="${baselineY}" stroke="#000" stroke-width="0.35" />
        ${verticals}
        <path d="M ${pathData}" fill="none" stroke="#000" stroke-width="0.45" />
      `,
      `molde-cotovelo-pegadas-${formatAngleForFileName(patternAngle)}.pdf`,
      moldPageOrientation,
      contentBounds,
      [
        `Tubo ${patternSize}" | Ângulo ${formatAngleForTitle(patternAngle)} | Pegadas ${patternDivisions}`,
        `Base ${patternBase.toFixed(1)} mm | Passo ${elbowPatternResults.stepWidth.toFixed(2)} mm | Desenvolvimento ${elbowPatternResults.development.toFixed(1)} mm`
      ]
    );
  }, [elbowPatternResults, exportMoldPdf, moldPageOrientation, patternAngle]);

  const handlePrintSaddle90Mold = useCallback(() => {
    const margin = 12;
    const moldTitle = 'Molde Unha no Tubo 90°';
    const widthMm = saddle90Results.development + (margin * 2);
    const heightMm = Math.max(80, saddle90Results.maxOrdinate + 40);
    const baselineY = heightMm - 14;
    const pathData = saddle90Results.points
      .map((point) => `${margin + point.x} ${baselineY - point.ordinate}`)
      .join(' L ');
    const verticals = saddle90Results.points.map((point) => `
      <line x1="${margin + point.x}" y1="${baselineY}" x2="${margin + point.x}" y2="${baselineY - point.ordinate}" stroke="#b0b0b0" stroke-width="0.3" stroke-dasharray="1.4 1.2" />
      <text x="${margin + point.x}" y="${baselineY + 4}" font-size="3" text-anchor="middle" fill="#666">${point.label}</text>
    `).join('');
    const contentBounds = {
      minX: Math.max(0, margin - 2),
      minY: Math.max(0, baselineY - saddle90Results.maxOrdinate - 4),
      maxX: Math.min(widthMm, margin + saddle90Results.development + 2),
      maxY: Math.min(heightMm, baselineY + 8),
    };

    printMoldDocument(
      moldTitle,
      widthMm,
      heightMm,
      `
        <rect x="0.6" y="0.6" width="${widthMm - 1.2}" height="${heightMm - 1.2}" fill="none" stroke="#999" stroke-width="0.4" />
        <text x="${margin}" y="6" font-size="4" font-weight="700" fill="#000">${moldTitle}</text>
        <text x="${margin}" y="11" font-size="3.2" fill="#444">Tubo base ${saddle90Results.headerDiameter.toFixed(1)} mm | tubo unha ${saddle90Results.branchDiameter.toFixed(1)} mm | passo ${saddle90Results.stepWidth.toFixed(2)} mm</text>
        <line x1="${margin}" y1="${baselineY}" x2="${margin + saddle90Results.development}" y2="${baselineY}" stroke="#000" stroke-width="0.35" />
        ${verticals}
        <path d="M ${pathData}" fill="none" stroke="#000" stroke-width="0.45" />
      `,
      moldPageOrientation,
      contentBounds,
      [
        `Base ${saddle90Results.headerDiameter.toFixed(1)} mm | Unha ${saddle90Results.branchDiameter.toFixed(1)} mm`,
        `Diferença entre eixos ${saddle90Results.axisOffset.toFixed(1)} mm | Divisões ${saddle90Results.divisions}`
      ]
    );
  }, [moldPageOrientation, printMoldDocument, saddle90Results]);

  const handleExportSaddle90Pdf = useCallback(async () => {
    const margin = 12;
    const moldTitle = 'Molde Unha no Tubo 90°';
    const widthMm = saddle90Results.development + (margin * 2);
    const heightMm = Math.max(80, saddle90Results.maxOrdinate + 40);
    const baselineY = heightMm - 14;
    const pathData = saddle90Results.points
      .map((point) => `${margin + point.x} ${baselineY - point.ordinate}`)
      .join(' L ');
    const verticals = saddle90Results.points.map((point) => `
      <line x1="${margin + point.x}" y1="${baselineY}" x2="${margin + point.x}" y2="${baselineY - point.ordinate}" stroke="#b0b0b0" stroke-width="0.3" stroke-dasharray="1.4 1.2" />
      <text x="${margin + point.x}" y="${baselineY + 4}" font-size="3" text-anchor="middle" fill="#666">${point.label}</text>
    `).join('');
    const contentBounds = {
      minX: Math.max(0, margin - 2),
      minY: Math.max(0, baselineY - saddle90Results.maxOrdinate - 4),
      maxX: Math.min(widthMm, margin + saddle90Results.development + 2),
      maxY: Math.min(heightMm, baselineY + 8),
    };

    await exportMoldPdf(
      moldTitle,
      widthMm,
      heightMm,
      `
        <rect x="0.6" y="0.6" width="${widthMm - 1.2}" height="${heightMm - 1.2}" fill="none" stroke="#999" stroke-width="0.4" />
        <text x="${margin}" y="6" font-size="4" font-weight="700" fill="#000">${moldTitle}</text>
        <text x="${margin}" y="11" font-size="3.2" fill="#444">Tubo base ${saddle90Results.headerDiameter.toFixed(1)} mm | tubo unha ${saddle90Results.branchDiameter.toFixed(1)} mm | passo ${saddle90Results.stepWidth.toFixed(2)} mm</text>
        <line x1="${margin}" y1="${baselineY}" x2="${margin + saddle90Results.development}" y2="${baselineY}" stroke="#000" stroke-width="0.35" />
        ${verticals}
        <path d="M ${pathData}" fill="none" stroke="#000" stroke-width="0.45" />
      `,
      'unha-no-tubo-90.pdf',
      moldPageOrientation,
      contentBounds,
      [
        `Base ${saddle90Results.headerDiameter.toFixed(1)} mm | Unha ${saddle90Results.branchDiameter.toFixed(1)} mm`,
        `Diferença entre eixos ${saddle90Results.axisOffset.toFixed(1)} mm | Divisões ${saddle90Results.divisions}`
      ]
    );
  }, [exportMoldPdf, moldPageOrientation, saddle90Results]);

  const handlePrintElbowBackSaddle = useCallback(() => {
    const margin = 12;
    const moldTitle = 'Molde Unha nas Costas da Curva 90°';
    const widthMm = elbowBackSaddleResults.development + (margin * 2);
    const heightMm = Math.max(90, elbowBackSaddleResults.maxOrdinate + 40);
    const baselineY = heightMm - 14;
    const pathData = elbowBackSaddleResults.points
      .map((point) => `${margin + point.x} ${baselineY - point.ordinate}`)
      .join(' L ');
    const verticals = elbowBackSaddleResults.points.map((point) => `
      <line x1="${margin + point.x}" y1="${baselineY}" x2="${margin + point.x}" y2="${baselineY - point.ordinate}" stroke="#b0b0b0" stroke-width="0.3" stroke-dasharray="1.4 1.2" />
      <text x="${margin + point.x}" y="${baselineY + 4}" font-size="3" text-anchor="middle" fill="#666">${point.index === elbowBackSaddleResults.divisions ? 1 : point.label}</text>
    `).join('');
    const contentBounds = {
      minX: Math.max(0, margin - 2),
      minY: Math.max(0, baselineY - elbowBackSaddleResults.maxOrdinate - 4),
      maxX: Math.min(widthMm, margin + elbowBackSaddleResults.development + 2),
      maxY: Math.min(heightMm, baselineY + 8),
    };

    printMoldDocument(
      moldTitle,
      widthMm,
      heightMm,
      `
        <rect x="0.6" y="0.6" width="${widthMm - 1.2}" height="${heightMm - 1.2}" fill="none" stroke="#999" stroke-width="0.4" />
        <text x="${margin}" y="6" font-size="4" font-weight="700" fill="#000">${moldTitle}</text>
        <text x="${margin}" y="11" font-size="3.2" fill="#444">Raio medio ${elbowBackSaddleResults.meanRadius.toFixed(1)} mm | curva ${elbowBackSaddleResults.curveDiameter.toFixed(1)} mm | unha ${elbowBackSaddleResults.branchDiameter.toFixed(1)} mm</text>
        <line x1="${margin}" y1="${baselineY}" x2="${margin + elbowBackSaddleResults.development}" y2="${baselineY}" stroke="#000" stroke-width="0.35" />
        ${verticals}
        <path d="M ${pathData}" fill="none" stroke="#000" stroke-width="0.45" />
      `,
      moldPageOrientation,
      contentBounds,
      [
        `Raio médio ${elbowBackSaddleResults.meanRadius.toFixed(1)} mm | Curva ${elbowBackSaddleResults.curveDiameter.toFixed(1)} mm`,
        `Unha ${elbowBackSaddleResults.branchDiameter.toFixed(1)} mm | Divisões ${elbowBackSaddleResults.divisions}`
      ]
    );
  }, [elbowBackSaddleResults, moldPageOrientation, printMoldDocument]);

  const handleExportElbowBackSaddlePdf = useCallback(async () => {
    const margin = 12;
    const moldTitle = 'Molde Unha nas Costas da Curva 90°';
    const widthMm = elbowBackSaddleResults.development + (margin * 2);
    const heightMm = Math.max(90, elbowBackSaddleResults.maxOrdinate + 40);
    const baselineY = heightMm - 14;
    const pathData = elbowBackSaddleResults.points
      .map((point) => `${margin + point.x} ${baselineY - point.ordinate}`)
      .join(' L ');
    const verticals = elbowBackSaddleResults.points.map((point) => `
      <line x1="${margin + point.x}" y1="${baselineY}" x2="${margin + point.x}" y2="${baselineY - point.ordinate}" stroke="#b0b0b0" stroke-width="0.3" stroke-dasharray="1.4 1.2" />
      <text x="${margin + point.x}" y="${baselineY + 4}" font-size="3" text-anchor="middle" fill="#666">${point.index === elbowBackSaddleResults.divisions ? 1 : point.label}</text>
    `).join('');
    const contentBounds = {
      minX: Math.max(0, margin - 2),
      minY: Math.max(0, baselineY - elbowBackSaddleResults.maxOrdinate - 4),
      maxX: Math.min(widthMm, margin + elbowBackSaddleResults.development + 2),
      maxY: Math.min(heightMm, baselineY + 8),
    };

    await exportMoldPdf(
      moldTitle,
      widthMm,
      heightMm,
      `
        <rect x="0.6" y="0.6" width="${widthMm - 1.2}" height="${heightMm - 1.2}" fill="none" stroke="#999" stroke-width="0.4" />
        <text x="${margin}" y="6" font-size="4" font-weight="700" fill="#000">${moldTitle}</text>
        <text x="${margin}" y="11" font-size="3.2" fill="#444">Raio medio ${elbowBackSaddleResults.meanRadius.toFixed(1)} mm | curva ${elbowBackSaddleResults.curveDiameter.toFixed(1)} mm | unha ${elbowBackSaddleResults.branchDiameter.toFixed(1)} mm</text>
        <line x1="${margin}" y1="${baselineY}" x2="${margin + elbowBackSaddleResults.development}" y2="${baselineY}" stroke="#000" stroke-width="0.35" />
        ${verticals}
        <path d="M ${pathData}" fill="none" stroke="#000" stroke-width="0.45" />
      `,
      'unha-costas-curva-90.pdf',
      moldPageOrientation,
      contentBounds,
      [
        `Raio médio ${elbowBackSaddleResults.meanRadius.toFixed(1)} mm | Curva ${elbowBackSaddleResults.curveDiameter.toFixed(1)} mm`,
        `Unha ${elbowBackSaddleResults.branchDiameter.toFixed(1)} mm | Divisões ${elbowBackSaddleResults.divisions}`
      ]
    );
  }, [elbowBackSaddleResults, exportMoldPdf, moldPageOrientation]);

  const handlePrintFlangeDrillingMold = useCallback(() => {
    const moldTitle = `Gabarito Furação de Flange (${flangeDrillingResults.holeCount} furos)`;
    const baseMargin = 14;
    const radius = flangeDrillingResults.boltCircle / 2;
    const holeRadius = flangeDrillingResults.holeDiameter / 2;
    const outerRadius = radius + holeRadius + 4;
    const topDimensionBand = 20;
    const canvasWidth = (outerRadius * 2) + (baseMargin * 2);
    const canvasHeight = (outerRadius * 2) + (baseMargin * 2) + topDimensionBand;
    const center = canvasWidth / 2;
    const centerY = baseMargin + topDimensionBand + outerRadius;
    const pcdLineY = centerY - outerRadius - 6;
    const contentBounds = {
      minX: Math.max(0, center - outerRadius - 10),
      minY: Math.max(0, pcdLineY - 10),
      maxX: Math.min(canvasWidth, center + outerRadius + 10),
      maxY: Math.min(canvasHeight, centerY + outerRadius + 10),
    };
    const holesSvg = flangeDrillingResults.points.map((point, index) => `
      <circle cx="${center + point.x}" cy="${centerY + point.y}" r="${holeRadius}" fill="none" stroke="#000" stroke-width="0.35" />
      <line x1="${center + point.x - holeRadius - 3}" y1="${centerY + point.y}" x2="${center + point.x + holeRadius + 3}" y2="${centerY + point.y}" stroke="#666" stroke-width="0.2" />
      <line x1="${center + point.x}" y1="${centerY + point.y - holeRadius - 3}" x2="${center + point.x}" y2="${centerY + point.y + holeRadius + 3}" stroke="#666" stroke-width="0.2" />
      <text x="${center + point.x + holeRadius + 3}" y="${centerY + point.y - holeRadius - 2}" font-size="3" fill="#333">${index + 1}</text>
    `).join('');

    printMoldDocument(
      moldTitle,
      canvasWidth,
      canvasHeight,
      `
        <circle cx="${center}" cy="${centerY}" r="${radius}" fill="none" stroke="#000" stroke-width="0.4" />
        <line x1="${center - radius - 10}" y1="${centerY}" x2="${center + radius + 10}" y2="${centerY}" stroke="#777" stroke-width="0.25" stroke-dasharray="1.5 1.5" />
        <line x1="${center}" y1="${centerY - radius - 10}" x2="${center}" y2="${centerY + radius + 10}" stroke="#777" stroke-width="0.25" stroke-dasharray="1.5 1.5" />
        <line x1="${center - radius}" y1="${pcdLineY}" x2="${center + radius}" y2="${pcdLineY}" stroke="#000" stroke-width="0.28" />
        <line x1="${center - radius}" y1="${pcdLineY - 4}" x2="${center - radius}" y2="${centerY - radius + 4}" stroke="#000" stroke-width="0.28" />
        <line x1="${center + radius}" y1="${pcdLineY - 4}" x2="${center + radius}" y2="${centerY - radius + 4}" stroke="#000" stroke-width="0.28" />
        <text x="${center}" y="${pcdLineY - 2}" text-anchor="middle" font-size="3.2" fill="#222">Ø ${flangeDrillingResults.boltCircle.toFixed(1)} mm</text>
        ${holesSvg}
      `,
      moldPageOrientation,
      contentBounds,
      [
        `PCD Ø ${flangeDrillingResults.boltCircle.toFixed(1)} mm | ${flangeDrillingResults.holeCount} furos | Furo Ø ${flangeDrillingResults.holeDiameter.toFixed(1)} mm`,
        `Topo ${flangeTopReference === 'HOLE' ? 'furo alinhado' : 'vão alinhado'} | Rotação inicial ${flangeStartAngle.toFixed(1)}°`
      ]
    );
  }, [flangeDrillingResults, flangeStartAngle, flangeTopReference, moldPageOrientation, printMoldDocument]);

  const handleExportFlangeDrillingMoldPdf = useCallback(async () => {
    const moldTitle = `Gabarito Furação de Flange (${flangeDrillingResults.holeCount} furos)`;
    const baseMargin = 14;
    const radius = flangeDrillingResults.boltCircle / 2;
    const holeRadius = flangeDrillingResults.holeDiameter / 2;
    const outerRadius = radius + holeRadius + 4;
    const topDimensionBand = 20;
    const canvasWidth = (outerRadius * 2) + (baseMargin * 2);
    const canvasHeight = (outerRadius * 2) + (baseMargin * 2) + topDimensionBand;
    const center = canvasWidth / 2;
    const centerY = baseMargin + topDimensionBand + outerRadius;
    const pcdLineY = centerY - outerRadius - 6;
    const contentBounds = {
      minX: Math.max(0, center - outerRadius - 10),
      minY: Math.max(0, pcdLineY - 10),
      maxX: Math.min(canvasWidth, center + outerRadius + 10),
      maxY: Math.min(canvasHeight, centerY + outerRadius + 10),
    };
    const holesSvg = flangeDrillingResults.points.map((point, index) => `
      <circle cx="${center + point.x}" cy="${centerY + point.y}" r="${holeRadius}" fill="none" stroke="#000" stroke-width="0.35" />
      <line x1="${center + point.x - holeRadius - 3}" y1="${centerY + point.y}" x2="${center + point.x + holeRadius + 3}" y2="${centerY + point.y}" stroke="#666" stroke-width="0.2" />
      <line x1="${center + point.x}" y1="${centerY + point.y - holeRadius - 3}" x2="${center + point.x}" y2="${centerY + point.y + holeRadius + 3}" stroke="#666" stroke-width="0.2" />
      <text x="${center + point.x + holeRadius + 3}" y="${centerY + point.y - holeRadius - 2}" font-size="3" fill="#333">${index + 1}</text>
    `).join('');

    await exportMoldPdf(
      moldTitle,
      canvasWidth,
      canvasHeight,
      `
        <circle cx="${center}" cy="${centerY}" r="${radius}" fill="none" stroke="#000" stroke-width="0.4" />
        <line x1="${center - radius - 10}" y1="${centerY}" x2="${center + radius + 10}" y2="${centerY}" stroke="#777" stroke-width="0.25" stroke-dasharray="1.5 1.5" />
        <line x1="${center}" y1="${centerY - radius - 10}" x2="${center}" y2="${centerY + radius + 10}" stroke="#777" stroke-width="0.25" stroke-dasharray="1.5 1.5" />
        <line x1="${center - radius}" y1="${pcdLineY}" x2="${center + radius}" y2="${pcdLineY}" stroke="#000" stroke-width="0.28" />
        <line x1="${center - radius}" y1="${pcdLineY - 4}" x2="${center - radius}" y2="${centerY - radius + 4}" stroke="#000" stroke-width="0.28" />
        <line x1="${center + radius}" y1="${pcdLineY - 4}" x2="${center + radius}" y2="${centerY - radius + 4}" stroke="#000" stroke-width="0.28" />
        <text x="${center}" y="${pcdLineY - 2}" text-anchor="middle" font-size="3.2" fill="#222">Ø ${flangeDrillingResults.boltCircle.toFixed(1)} mm</text>
        ${holesSvg}
      `,
      `gabarito-furacao-flange-${flangeDrillingResults.holeCount}-furos.pdf`,
      moldPageOrientation,
      contentBounds,
      [
        `PCD Ø ${flangeDrillingResults.boltCircle.toFixed(1)} mm | ${flangeDrillingResults.holeCount} furos | Furo Ø ${flangeDrillingResults.holeDiameter.toFixed(1)} mm`,
        `Topo ${flangeTopReference === 'HOLE' ? 'furo alinhado' : 'vão alinhado'} | Rotação inicial ${flangeStartAngle.toFixed(1)}°`
      ]
    );
  }, [exportMoldPdf, flangeDrillingResults, flangeStartAngle, flangeTopReference, moldPageOrientation]);

  const handlePrintConcentricReduction = useCallback(() => {
    const margin = 12;
    const moldTitle = `Molde Redução Concêntrica ${concentricReductionResults.largeDiameter.toFixed(0)} x ${concentricReductionResults.smallDiameter.toFixed(0)} mm`;
    const widthMm = concentricReductionResults.development + (margin * 2);
    const heightMm = Math.max(90, concentricReductionResults.slantHeight + 40);
    const baselineY = heightMm - 14;
    const topY = baselineY - concentricReductionResults.slantHeight;
    const panelSvg = concentricReductionResults.panels.map((panel) => {
      const x0 = margin + panel.x;
      const x1 = x0 + concentricReductionResults.largeStep;
      const xt0 = x0 + concentricReductionResults.insetPerSide;
      const xt1 = x1 - concentricReductionResults.insetPerSide;
      return `
        <polygon points="${x0},${baselineY} ${x1},${baselineY} ${xt1},${topY} ${xt0},${topY}" fill="none" stroke="#000" stroke-width="0.35" />
        <line x1="${(x0 + x1) / 2}" y1="${baselineY}" x2="${(xt0 + xt1) / 2}" y2="${topY}" stroke="#b0b0b0" stroke-width="0.25" stroke-dasharray="1.4 1.2" />
      `;
    }).join('');
    const contentBounds = {
      minX: Math.max(0, margin - 2),
      minY: Math.max(0, topY - 4),
      maxX: Math.min(widthMm, margin + concentricReductionResults.development + 2),
      maxY: Math.min(heightMm, baselineY + 4),
    };

    printMoldDocument(
      moldTitle,
      widthMm,
      heightMm,
      `
        <rect x="0.6" y="0.6" width="${widthMm - 1.2}" height="${heightMm - 1.2}" fill="none" stroke="#999" stroke-width="0.4" />
        <text x="${margin}" y="6" font-size="4" font-weight="700" fill="#000">${moldTitle}</text>
        <text x="${margin}" y="11" font-size="3.2" fill="#444">Maior ${concentricReductionResults.largeDiameter.toFixed(1)} mm | menor ${concentricReductionResults.smallDiameter.toFixed(1)} mm | altura inclinada ${concentricReductionResults.slantHeight.toFixed(1)} mm</text>
        ${panelSvg}
      `,
      moldPageOrientation,
      contentBounds,
      [
        `Maior ${concentricReductionResults.largeDiameter.toFixed(1)} mm | Menor ${concentricReductionResults.smallDiameter.toFixed(1)} mm`,
        `Comprimento ${concentricReductionResults.reductionLength.toFixed(1)} mm | Divisões ${concentricReductionResults.divisions}`
      ]
    );
  }, [concentricReductionResults, moldPageOrientation, printMoldDocument]);

  const handleExportConcentricReductionPdf = useCallback(async () => {
    const margin = 12;
    const moldTitle = `Molde Redução Concêntrica ${concentricReductionResults.largeDiameter.toFixed(0)} x ${concentricReductionResults.smallDiameter.toFixed(0)} mm`;
    const widthMm = concentricReductionResults.development + (margin * 2);
    const heightMm = Math.max(90, concentricReductionResults.slantHeight + 40);
    const baselineY = heightMm - 14;
    const topY = baselineY - concentricReductionResults.slantHeight;
    const panelSvg = concentricReductionResults.panels.map((panel) => {
      const x0 = margin + panel.x;
      const x1 = x0 + concentricReductionResults.largeStep;
      const xt0 = x0 + concentricReductionResults.insetPerSide;
      const xt1 = x1 - concentricReductionResults.insetPerSide;
      return `
        <polygon points="${x0},${baselineY} ${x1},${baselineY} ${xt1},${topY} ${xt0},${topY}" fill="none" stroke="#000" stroke-width="0.35" />
        <line x1="${(x0 + x1) / 2}" y1="${baselineY}" x2="${(xt0 + xt1) / 2}" y2="${topY}" stroke="#b0b0b0" stroke-width="0.25" stroke-dasharray="1.4 1.2" />
      `;
    }).join('');
    const contentBounds = {
      minX: Math.max(0, margin - 2),
      minY: Math.max(0, topY - 4),
      maxX: Math.min(widthMm, margin + concentricReductionResults.development + 2),
      maxY: Math.min(heightMm, baselineY + 4),
    };

    await exportMoldPdf(
      moldTitle,
      widthMm,
      heightMm,
      `
        <rect x="0.6" y="0.6" width="${widthMm - 1.2}" height="${heightMm - 1.2}" fill="none" stroke="#999" stroke-width="0.4" />
        <text x="${margin}" y="6" font-size="4" font-weight="700" fill="#000">${moldTitle}</text>
        <text x="${margin}" y="11" font-size="3.2" fill="#444">Maior ${concentricReductionResults.largeDiameter.toFixed(1)} mm | menor ${concentricReductionResults.smallDiameter.toFixed(1)} mm | altura inclinada ${concentricReductionResults.slantHeight.toFixed(1)} mm</text>
        ${panelSvg}
      `,
      `molde-reducao-concentrica-${concentricReductionResults.largeDiameter.toFixed(0)}x${concentricReductionResults.smallDiameter.toFixed(0)}.pdf`,
      moldPageOrientation,
      contentBounds,
      [
        `Maior ${concentricReductionResults.largeDiameter.toFixed(1)} mm | Menor ${concentricReductionResults.smallDiameter.toFixed(1)} mm`,
        `Comprimento ${concentricReductionResults.reductionLength.toFixed(1)} mm | Divisões ${concentricReductionResults.divisions}`
      ]
    );
  }, [concentricReductionResults, exportMoldPdf, moldPageOrientation]);

  const handlePrintEccentricReduction = useCallback(() => {
    const margin = 12;
    const moldTitle = `Molde Redução Excêntrica ${eccentricReductionResults.largeDiameter.toFixed(0)} x ${eccentricReductionResults.smallDiameter.toFixed(0)} mm`;
    const widthMm = eccentricReductionResults.development + (margin * 2);
    const heightMm = Math.max(110, eccentricReductionResults.maxTrueLength + 42);
    const baselineY = heightMm - 16;
    const pathData = eccentricReductionResults.points
      .map((point) => `${margin + point.x} ${baselineY - point.trueLength}`)
      .join(' L ');
    const verticals = eccentricReductionResults.points.map((point) => `
      <line x1="${margin + point.x}" y1="${baselineY}" x2="${margin + point.x}" y2="${baselineY - point.trueLength}" stroke="#b0b0b0" stroke-width="0.28" stroke-dasharray="1.4 1.2" />
      <text x="${margin + point.x}" y="${baselineY + 4}" font-size="3" text-anchor="middle" fill="#666">${point.index === eccentricReductionResults.divisions ? 1 : point.label}</text>
    `).join('');
    const contentBounds = {
      minX: Math.max(0, margin - 2),
      minY: Math.max(0, baselineY - eccentricReductionResults.maxTrueLength - 4),
      maxX: Math.min(widthMm, margin + eccentricReductionResults.development + 2),
      maxY: Math.min(heightMm, baselineY + 8),
    };

    printMoldDocument(
      moldTitle,
      widthMm,
      heightMm,
      `
        <rect x="0.6" y="0.6" width="${widthMm - 1.2}" height="${heightMm - 1.2}" fill="none" stroke="#999" stroke-width="0.4" />
        <text x="${margin}" y="6" font-size="4" font-weight="700" fill="#000">${moldTitle}</text>
        <text x="${margin}" y="11" font-size="3.2" fill="#444">Maior ${eccentricReductionResults.largeDiameter.toFixed(1)} mm | menor ${eccentricReductionResults.smallDiameter.toFixed(1)} mm | comprimento ${eccentricReductionResults.reductionLength.toFixed(1)} mm</text>
        <line x1="${margin}" y1="${baselineY}" x2="${margin + eccentricReductionResults.development}" y2="${baselineY}" stroke="#000" stroke-width="0.35" />
        ${verticals}
        <path d="M ${pathData}" fill="none" stroke="#000" stroke-width="0.45" />
      `,
      moldPageOrientation,
      contentBounds,
      [
        `Maior ${eccentricReductionResults.largeDiameter.toFixed(1)} mm | Menor ${eccentricReductionResults.smallDiameter.toFixed(1)} mm`,
        `Comprimento ${eccentricReductionResults.reductionLength.toFixed(1)} mm | Divisões ${eccentricReductionResults.divisions}`
      ]
    );
  }, [eccentricReductionResults, moldPageOrientation, printMoldDocument]);

  const handleExportEccentricReductionPdf = useCallback(async () => {
    const margin = 12;
    const moldTitle = `Molde Redução Excêntrica ${eccentricReductionResults.largeDiameter.toFixed(0)} x ${eccentricReductionResults.smallDiameter.toFixed(0)} mm`;
    const widthMm = eccentricReductionResults.development + (margin * 2);
    const heightMm = Math.max(110, eccentricReductionResults.maxTrueLength + 42);
    const baselineY = heightMm - 16;
    const pathData = eccentricReductionResults.points
      .map((point) => `${margin + point.x} ${baselineY - point.trueLength}`)
      .join(' L ');
    const verticals = eccentricReductionResults.points.map((point) => `
      <line x1="${margin + point.x}" y1="${baselineY}" x2="${margin + point.x}" y2="${baselineY - point.trueLength}" stroke="#b0b0b0" stroke-width="0.28" stroke-dasharray="1.4 1.2" />
      <text x="${margin + point.x}" y="${baselineY + 4}" font-size="3" text-anchor="middle" fill="#666">${point.index === eccentricReductionResults.divisions ? 1 : point.label}</text>
    `).join('');
    const contentBounds = {
      minX: Math.max(0, margin - 2),
      minY: Math.max(0, baselineY - eccentricReductionResults.maxTrueLength - 4),
      maxX: Math.min(widthMm, margin + eccentricReductionResults.development + 2),
      maxY: Math.min(heightMm, baselineY + 8),
    };

    await exportMoldPdf(
      moldTitle,
      widthMm,
      heightMm,
      `
        <rect x="0.6" y="0.6" width="${widthMm - 1.2}" height="${heightMm - 1.2}" fill="none" stroke="#999" stroke-width="0.4" />
        <text x="${margin}" y="6" font-size="4" font-weight="700" fill="#000">${moldTitle}</text>
        <text x="${margin}" y="11" font-size="3.2" fill="#444">Maior ${eccentricReductionResults.largeDiameter.toFixed(1)} mm | menor ${eccentricReductionResults.smallDiameter.toFixed(1)} mm | comprimento ${eccentricReductionResults.reductionLength.toFixed(1)} mm</text>
        <line x1="${margin}" y1="${baselineY}" x2="${margin + eccentricReductionResults.development}" y2="${baselineY}" stroke="#000" stroke-width="0.35" />
        ${verticals}
        <path d="M ${pathData}" fill="none" stroke="#000" stroke-width="0.45" />
      `,
      `molde-reducao-excentrica-${eccentricReductionResults.largeDiameter.toFixed(0)}x${eccentricReductionResults.smallDiameter.toFixed(0)}.pdf`,
      moldPageOrientation,
      contentBounds,
      [
        `Maior ${eccentricReductionResults.largeDiameter.toFixed(1)} mm | Menor ${eccentricReductionResults.smallDiameter.toFixed(1)} mm`,
        `Comprimento ${eccentricReductionResults.reductionLength.toFixed(1)} mm | Divisões ${eccentricReductionResults.divisions}`
      ]
    );
  }, [eccentricReductionResults, exportMoldPdf, moldPageOrientation]);

  const screenCalibrationPanel = (
    <div className="bg-slate-950/50 rounded-xl border border-slate-800 p-4 mt-4">
      <h4 className="text-safety-yellow font-bold text-sm mb-3 flex items-center gap-2">
        <Info size={16} /> Calibrador de Tela (sem impressora)
      </h4>
      <div className="space-y-3 text-xs text-slate-300">
        <p>Use este bloco para ajustar o zoom da tela ou do PDF até bater com uma medida física real. Isso não prova impressão final, mas ajuda a validar proporção antes do teste em papel.</p>
        <div className="overflow-x-auto">
          <div className="min-w-max space-y-4">
            <div>
              <p className="text-slate-400 mb-2">Régua de 100 mm</p>
              <div className="relative border-t border-slate-500" style={{ width: '100mm', height: '14mm' }}>
                {Array.from({ length: 11 }, (_, index) => (
                  <div
                    key={`cal-ruler-${index}`}
                    className="absolute top-0 border-l border-slate-300"
                    style={{
                      left: `${index * 10}mm`,
                      height: index === 0 || index === 10 ? '10mm' : '6mm',
                    }}
                  />
                ))}
                <span className="absolute -bottom-5 left-0 text-[10px] text-slate-500">0</span>
                <span className="absolute -bottom-5 right-0 text-[10px] text-slate-500">100 mm</span>
              </div>
            </div>
            <div>
              <p className="text-slate-400 mb-2">Largura de cartão padrão</p>
              <div
                className="rounded-lg border border-blue-400 bg-blue-500/10 flex items-center justify-center text-[10px] font-bold text-blue-300"
                style={{ width: '85.6mm', height: '14mm' }}
              >
                85,6 mm
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
            <p className="font-bold text-slate-200">Como usar na tela</p>
            <p className="text-slate-400 mt-1">Ajuste o zoom do navegador ou do PDF até a régua de 100 mm bater com sua régua física, ou até a barra azul bater com a largura de um cartão.</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
            <p className="font-bold text-slate-200">Importante</p>
            <p className="text-slate-400 mt-1">Escala real definitiva só existe no papel. Na impressão final, confirme sempre pela régua de 100 mm impressa.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const printableSimulationTypes = new Set([
    'MITER',
    'ELBOW_PATTERN',
    'FLANGE_DRILLING',
    'TUBE_SADDLE_90',
    'ELBOW_BACK_SADDLE_90',
    'CONCENTRIC_REDUCTION',
    'ECCENTRIC_REDUCTION',
  ]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-24">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 p-4 shadow-xl">
        <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wide mb-2">
          Ferramenta de Simulação
        </label>
        <select
          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white font-bold outline-none text-sm sm:text-base"
          value={type}
          onChange={e => setType(e.target.value as typeof type)}
        >
          {simulationOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-slate-500 mt-2">
          Selecione o nome da ferramenta e o simulador aparece logo abaixo.
        </p>
      </div>

      {printableSimulationTypes.has(type) && screenCalibrationPanel}

      {type === 'MITER' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           
           {/* --- SECTION 1: VISUAL CONTROLS (CLASSIC VIEW) --- */}
           
           {/* Added extra padding-bottom (pb-16) to ensure spacing */}
           <div className="relative bg-slate-900 rounded-2xl p-6 pb-16 border border-slate-700 shadow-2xl overflow-visible group/main">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                <Info size={18} className="text-blueprint-blue" />
                Medidas & Controles
                </h3>
                {/* LABELS DE CONVERSÃO NO TOPO */}
                <div className="text-[10px] font-mono text-slate-400 bg-slate-800 px-3 py-1 rounded-lg border border-slate-600">
                    <div>Coletor {headerSize}": <span className="text-white font-bold">{headerODVal}mm</span></div>
                    <div>Ramal {branchSize}": <span className="text-white font-bold">{branchODVal}mm</span></div>
                </div>
            </div>

            <div className="relative aspect-[16/10] w-full flex items-center justify-center bg-slate-950/30 rounded-xl border border-slate-800/50">
              <svg viewBox="0 0 400 240" className="w-full h-full drop-shadow-2xl">
                {/* Header Pipe (Horizontal) - Width dynamic based on D1 */}
                <rect 
                    x="50" 
                    y={centerY - (headerVisualOD / 2)} 
                    width="300" 
                    height={headerVisualOD} 
                    rx="4" 
                    fill="#1e293b" 
                    stroke="#334155" 
                    strokeWidth="2" 
                    className="transition-all duration-500 ease-out"
                />
                <line x1="50" y1={centerY} x2="350" y2={centerY} stroke="#334155" strokeDasharray="4 4" />
                
                {/* Branch Pipe (Rotated) - Width dynamic based on D2 */}
                <g transform={`rotate(${90 - miterAngle}, ${centerX}, ${centerY})`}>
                  <rect 
                    x={centerX - (branchVisualOD / 2)} 
                    y="20" 
                    width={branchVisualOD} 
                    height="100" 
                    fill="#2563eb" 
                    fillOpacity="0.8" 
                    stroke="#60a5fa" 
                    strokeWidth="2"
                    className="transition-all duration-500 ease-out"
                  />
                  <line x1={centerX} y1="20" x2={centerX} y2={centerY} stroke="#93c5fd" strokeDasharray="4 4" />
                </g>
                
                {/* Cut Line (Dynamic Arc) */}
                <path 
                    d={`M ${centerX + (branchVisualOD/2)} ${centerY} A ${branchVisualOD/2} ${branchVisualOD/2} 0 0 0 ${centerX + (branchVisualOD/2) * Math.cos(miterAngle * Math.PI / 180)} ${centerY - (branchVisualOD/2) * Math.sin(miterAngle * Math.PI / 180)}`} 
                    fill="none" 
                    stroke="#fbbf24" 
                    strokeWidth="2" 
                    strokeDasharray="2 2"
                    className="transition-all duration-500 ease-out"
                />
              </svg>

              {/* OVERLAY CONTROLS - REORGANIZED TO 4 CORNERS TO AVOID OVERLAP */}
              
              {/* 1. TOP LEFT: Branch Size (Ramal - D2) */}
              <div className="absolute top-4 left-4 group z-20">
                <div className="bg-blueprint-blue border border-blue-400 rounded-lg p-2 shadow-xl hover:bg-blue-600 transition-colors">
                  <label className="block text-[10px] text-blue-100 font-bold uppercase mb-1">D2 - Ramal</label>
                  <select className="bg-transparent text-white font-bold outline-none text-sm cursor-pointer" value={branchSize} onChange={e => setBranchSize(e.target.value)}>
                    {Object.keys(PIPE_SCHEDULE).map(s => <option key={s} value={s}>{s}"</option>)}
                  </select>
                </div>
              </div>

              {/* 2. BOTTOM LEFT: Header Size (Coletor - D1) */}
              {/* Moved from Right to Left to clear space for Angle control */}
              <div className="absolute bottom-4 left-4 group z-20">
                <div className="bg-slate-800 border border-slate-600 rounded-lg p-2 shadow-xl hover:border-blue-500 transition-colors">
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">D1 - Coletor</label>
                  <select className="bg-transparent text-white font-bold outline-none text-sm cursor-pointer" value={headerSize} onChange={e => setHeaderSize(e.target.value)}>
                    {Object.keys(PIPE_SCHEDULE).map(s => <option key={s} value={s}>{s}"</option>)}
                  </select>
                </div>
              </div>

              {/* 3. TOP RIGHT: Angle Control (UP/DOWN) */}
              <div className="absolute top-4 right-4 flex flex-col items-center z-20">
                 <div className="bg-slate-800/90 backdrop-blur border-2 border-safety-yellow rounded-xl shadow-2xl flex flex-col items-center overflow-hidden">
                    <button onClick={() => handleAngleChange(1)} className="w-full p-2 bg-slate-700/50 hover:bg-slate-600 active:bg-safety-yellow active:text-black transition-colors flex justify-center text-white"><Plus size={16}/></button>
                    <div className="px-3 py-1 flex items-center justify-center gap-1 bg-transparent">
                        <input 
                            type="number" 
                            className="bg-transparent w-10 text-center text-white font-black outline-none text-lg appearance-none" 
                            value={miterAngle} 
                            onChange={e => setMiterAngle(Number(e.target.value))} 
                        />
                        <span className="text-safety-yellow font-bold text-xs">°</span>
                    </div>
                    <button onClick={() => handleAngleChange(-1)} className="w-full p-2 bg-slate-700/50 hover:bg-slate-600 active:bg-safety-yellow active:text-black transition-colors flex justify-center text-white"><Minus size={16}/></button>
                 </div>
                 <span className="text-[10px] font-bold text-safety-yellow mt-1 bg-black/50 px-2 rounded">Ângulo</span>
              </div>

              {/* 4. BOTTOM RIGHT: Divisions (Precision) */}
              <div className="absolute bottom-4 right-4 z-20">
                <div className="bg-slate-800 border border-slate-600 rounded-lg p-2 shadow-xl flex flex-col items-center hover:border-green-500 transition-colors">
                   <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Precisão (Linhas)</label>
                   <select className="bg-transparent text-white font-bold outline-none text-xs cursor-pointer text-center w-full" value={divisions} onChange={e => setDivisions(Number(e.target.value))}>
                      <option value={8}>8 Linhas</option>
                      <option value={12}>12 Linhas</option>
                      <option value={16}>16 Linhas</option>
                      <option value={24}>24 Linhas</option>
                   </select>
                </div>
              </div>

            </div>
            
            {/* Visual Link Indicator */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 w-full flex justify-center pointer-events-none">
               <div className="bg-slate-700/90 text-slate-300 text-[10px] px-3 py-1 rounded-full border border-slate-600 flex items-center gap-1 shadow-lg backdrop-blur">
                  <LinkIcon size={10} />
                  <span>Controla Simuladores Abaixo</span>
               </div>
            </div>
          </div>

           {/* --- SECTION 2: DETAILED SIMULATION (NOW HERE!) --- */}

           <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col mt-4 border-t-4 border-t-blueprint-blue">
              <div className="bg-slate-800/50 p-3 border-b border-slate-700 flex justify-between items-center">
                 <h3 className="text-white font-bold flex items-center gap-2 text-sm">
                   <CircleDashed size={16} className="text-safety-yellow" /> 
                   Traçagem: <span className="text-blueprint-blue">{headerSize}"</span> x <span className="text-white">{branchSize}"</span> ({miterAngle}°)
                 </h3>
                 <span className="text-[10px] text-green-400 uppercase font-bold tracking-wider flex items-center gap-1">
                    <LinkIcon size={10} /> Sincronizado
                 </span>
              </div>
              
              <div className="p-6 relative flex flex-col items-center gap-8">
                 
                 {/* 1. TOP VIEW (CLOCK) */}
                 <div className="relative w-48 h-48 sm:w-64 sm:h-64 shrink-0">
                    <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-lg">
                       {/* Pipe Circle */}
                       <circle cx="100" cy="100" r="80" fill="#1e293b" stroke="#334155" strokeWidth="2" />
                       <circle cx="100" cy="100" r="76" fill="none" stroke="#0f172a" strokeWidth="1" />
                       
                       {/* Angle Indicator Center - RESTORED */}
                       <text x="100" y="100" textAnchor="middle" alignmentBaseline="middle" fill="#fbbf24" fontSize="24" fontWeight="black" stroke="#000" strokeWidth="1" opacity="0.8">{miterAngle}°</text>
                       
                       {/* Radial Lines */}
                       {miterPoints.slice(0, -1).map((p, i) => {
                          const rad = (p.deg - 90) * Math.PI / 180;
                          const x1 = 100 + 80 * Math.cos(rad);
                          const y1 = 100 + 80 * Math.sin(rad);
                          // Labels position
                          const lx = 100 + 100 * Math.cos(rad);
                          const ly = 100 + 100 * Math.sin(rad);
                          
                          return (
                             <g key={i}>
                                <line x1="100" y1="100" x2={x1} y2={y1} stroke="#475569" strokeWidth="1" strokeDasharray="2,2" />
                                <circle cx={x1} cy={y1} r="3" fill="#3b82f6" />
                                <text x={lx} y={ly} fontSize="10" fill="#94a3b8" textAnchor="middle" alignmentBaseline="middle" fontWeight="bold">{p.deg}°</text>
                             </g>
                          )
                       })}
                       
                       <circle cx="100" cy="100" r="4" fill="#fbbf24" />
                       <text x="100" y="125" fontSize="8" fill="#64748b" textAnchor="middle">VISTA DE TOPO</text>
                    </svg>
                 </div>

                 {/* Connector Lines */}
                 <div className="w-full h-8 flex items-center justify-center relative -my-4 z-10">
                     <div className="bg-slate-700/50 text-[10px] px-3 py-1 rounded-full text-slate-300 border border-slate-600 flex items-center gap-2">
                        <ChevronRight size={12} className="rotate-90" />
                        Transferir medidas para o tubo
                     </div>
                 </div>

                 {/* 2. SIDE VIEW (UNROLLED / DEVELOPED) */}
                 <div className="w-full overflow-x-auto custom-scrollbar pb-2">
                    <div className="min-w-[600px] h-64 bg-slate-950 rounded-lg border border-slate-800 relative shadow-inner p-4">
                        <svg className="w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${divisions * 50} 150`}>
                           {/* Baseline */}
                           <line x1="0" y1="130" x2={divisions * 50} y2="130" stroke="#475569" strokeWidth="2" />
                           {/* Grid and Points */}
                           {miterPoints.map((p, i) => {
                               const x = i * 50;
                               // Scaling height for visibility
                               const y = 130 - (p.height * 1); 
                               
                               // Ensure y is a valid number
                               const safeY = isNaN(y) ? 130 : y;
                               
                               return (
                                   <g key={i}>
                                       <line x1={x} y1="130" x2={x} y2={safeY} stroke="#334155" strokeDasharray="4,4" strokeWidth="1"/>
                                       <circle cx={x} cy={safeY} r="4" fill="#fbbf24" />
                                       <text x={x} y="145" textAnchor="middle" fill="#94a3b8" fontSize="10">{p.deg}°</text>
                                       <text x={x} y={safeY - 10} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">{isNaN(p.height) ? '0.0' : p.height.toFixed(1)}</text>
                                   </g>
                               );
                           })}
                           {/* Curve connecting points */}
                           <path 
                               d={`M ${miterPoints.map((p, i) => `${i * 50} ${isNaN(130 - p.height) ? 130 : 130 - p.height}`).join(' L ')}`} 
                               fill="none" stroke="#3b82f6" strokeWidth="2" 
                           />
                        </svg>
                    </div>
                 </div>

                 {/* 3. FORMULAS & STEP-BY-STEP */}
                 <div className="w-full bg-slate-950/50 rounded-xl border border-slate-800 p-4 mt-4">
                    <h4 className="text-safety-yellow font-bold text-sm mb-3 flex items-center gap-2">
                        <Info size={16} /> Memória de Cálculo (Passo a Passo)
                    </h4>
                    
                    {/* EXPLANATORY DIAGRAM FOR H, R1, R2 */}
                    <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 mb-4 flex flex-col md:flex-row items-center gap-6">
                        <div className="w-48 h-48 shrink-0 relative">
                            <svg viewBox="0 0 200 200" className="w-full h-full">
                                {/* Eixo do Coletor */}
                                <line x1="20" y1="150" x2="180" y2="150" stroke="#475569" strokeWidth="1" strokeDasharray="10 4 2 4" />
                                <text x="180" y="145" fill="#475569" fontSize="8" textAnchor="end">Eixo Coletor</text>

                                {/* Eixo do Ramal */}
                                <line x1="100" y1="10" x2="100" y2="190" stroke="#475569" strokeWidth="1" strokeDasharray="10 4 2 4" />
                                <text x="105" y="15" fill="#475569" fontSize="8">Eixo Ramal</text>

                                {/* Coletor (R1) */}
                                <circle cx="100" cy="150" r="40" fill="none" stroke="#334155" strokeWidth="2" />
                                <line x1="100" y1="150" x2="140" y2="150" stroke="#fbbf24" strokeWidth="2" strokeDasharray="2 2" />
                                <text x="120" y="145" fill="#fbbf24" fontSize="10" fontWeight="bold">R1</text>
                                
                                {/* Ramal (R2) */}
                                <path d="M 80 20 L 80 115 A 40 40 0 0 0 120 115 L 120 20 Z" fill="none" stroke="#3b82f6" strokeWidth="2" />
                                <line x1="80" y1="20" x2="100" y2="20" stroke="#fbbf24" strokeWidth="2" strokeDasharray="2 2" />
                                <text x="90" y="15" fill="#fbbf24" fontSize="10" fontWeight="bold">R2</text>
                                
                                {/* H (Ordenada) */}
                                <line x1="60" y1="110" x2="140" y2="110" stroke="#ef4444" strokeWidth="1" strokeDasharray="2 2" />
                                <line x1="70" y1="110" x2="70" y2="115" stroke="#ef4444" strokeWidth="2" />
                                <text x="55" y="116" fill="#ef4444" fontSize="10" fontWeight="bold">H</text>

                                {/* Eixo a Eixo (Center to Center) */}
                                <line x1="40" y1="20" x2="40" y2="150" stroke="#22c55e" strokeWidth="2" />
                                <polygon points="40,150 37,145 43,145" fill="#22c55e" />
                                <polygon points="40,20 37,25 43,25" fill="#22c55e" />
                                <text x="35" y="85" fill="#22c55e" fontSize="10" fontWeight="bold" transform="rotate(-90 35 85)">EIXO A EIXO</text>
                                
                                {/* H (Ordenada) - clarifying it's from the center */}
                                <line x1="100" y1="110" x2="100" y2="150" stroke="#ef4444" strokeWidth="1.5" />
                                <polygon points="100,110 97,115 103,115" fill="#ef4444" />
                                <polygon points="100,150 97,145 103,145" fill="#ef4444" />
                                <text x="105" y="130" fill="#ef4444" fontSize="10" fontWeight="bold">H</text>
                                
                                {/* Labels */}
                                <text x="100" y="195" fill="#94a3b8" fontSize="10" textAnchor="middle">Corte Transversal</text>
                            </svg>
                        </div>
                        <div className="text-xs text-slate-300 space-y-2 flex-1">
                            <p><strong className="text-safety-yellow">R1:</strong> Raio externo do tubo Coletor (tubo principal).</p>
                            <p><strong className="text-safety-yellow">R2:</strong> Raio externo do tubo Ramal (tubo que será cortado).</p>
                            <p><strong className="text-red-500">H:</strong> Altura da ordenada (medida do eixo do coletor até o ponto de corte).</p>
                            <p><strong className="text-green-400">Eixo a Eixo:</strong> Distância do centro do coletor ao topo do ramal.</p>
                            <p><strong className="text-white">θ (Theta):</strong> O ângulo da divisão ao redor do tubo (ex: 0°, 30°, 60°).</p>
                            <p><strong className="text-white">α (Alfa):</strong> O ângulo de inclinação do ramal em relação ao coletor.</p>
                        </div>
                    </div>

                    <div className="text-xs text-slate-300 space-y-3 font-mono">
                        <p><span className="text-blue-400">R1 (Raio Coletor)</span> = {headerODVal} / 2 = {(headerODVal / 2).toFixed(2)} mm</p>
                        <p><span className="text-blue-400">R2 (Raio Ramal)</span> = {branchODVal} / 2 = {(branchODVal / 2).toFixed(2)} mm</p>
                        <p><span className="text-blue-400">Ângulo (α)</span> = {miterAngle}°</p>
                        
                        <div className="bg-slate-900 p-3 rounded border border-slate-700 mt-2">
                            <p className="text-slate-400 mb-2">Fórmula Principal para cada ordenada (H) no ângulo θ:</p>
                            <p className="text-white">H = (R1 - √(R1² - (R2 × sin(θ))²)) / sin(α)</p>
                        </div>

                        <div className="bg-slate-900 p-3 rounded border border-slate-700 mt-2">
                            <p className="text-slate-400 mb-2">Método Alternativo Simplificado (se α = 90°):</p>
                            <p className="text-white">H = R1 - √(R1² - (R2 × sin(θ))²)</p>
                            <p className="text-slate-500 mt-1 text-[10px]">Nota: Como sin(90°) = 1, a divisão é ignorada.</p>
                        </div>

                        <div className="mt-3">
                            <p className="text-slate-400 mb-2">Exemplo prático para a linha de θ = {miterPoints[1]?.deg || 30}°:</p>
                            <ul className="list-disc list-inside space-y-2 ml-2 text-slate-300">
                                <li><strong>Passo 1:</strong> Calcular o seno do ângulo da linha.<br/><span className="text-zinc-500 ml-4">sin({miterPoints[1]?.deg || 30}°) = {Math.sin((miterPoints[1]?.deg || 30) * Math.PI / 180).toFixed(4)}</span></li>
                                
                                <li><strong>Passo 2:</strong> Multiplicar pelo Raio do Ramal (R2).<br/><span className="text-zinc-500 ml-4">{(branchODVal / 2).toFixed(2)} × {Math.sin((miterPoints[1]?.deg || 30) * Math.PI / 180).toFixed(4)} = {((branchODVal / 2) * Math.sin((miterPoints[1]?.deg || 30) * Math.PI / 180)).toFixed(2)} mm</span></li>
                                
                                <li><strong>Passo 3:</strong> Elevar ao quadrado e subtrair do quadrado do Raio do Coletor (R1²).<br/><span className="text-zinc-500 ml-4">{(headerODVal / 2).toFixed(2)}² - {((branchODVal / 2) * Math.sin((miterPoints[1]?.deg || 30) * Math.PI / 180)).toFixed(2)}² = {(Math.pow(headerODVal / 2, 2) - Math.pow((branchODVal / 2) * Math.sin((miterPoints[1]?.deg || 30) * Math.PI / 180), 2)).toFixed(2)}</span></li>
                                
                                <li><strong>Passo 4:</strong> Tirar a raiz quadrada do resultado.<br/><span className="text-zinc-500 ml-4">√{(Math.pow(headerODVal / 2, 2) - Math.pow((branchODVal / 2) * Math.sin((miterPoints[1]?.deg || 30) * Math.PI / 180), 2)).toFixed(2)} = {Math.sqrt(Math.pow(headerODVal / 2, 2) - Math.pow((branchODVal / 2) * Math.sin((miterPoints[1]?.deg || 30) * Math.PI / 180), 2)).toFixed(2)} mm</span></li>
                                
                                <li><strong>Passo 5:</strong> Subtrair isso do Raio do Coletor (R1).<br/><span className="text-zinc-500 ml-4">{(headerODVal / 2).toFixed(2)} - {Math.sqrt(Math.pow(headerODVal / 2, 2) - Math.pow((branchODVal / 2) * Math.sin((miterPoints[1]?.deg || 30) * Math.PI / 180), 2)).toFixed(2)} = {((headerODVal / 2) - Math.sqrt(Math.pow(headerODVal / 2, 2) - Math.pow((branchODVal / 2) * Math.sin((miterPoints[1]?.deg || 30) * Math.PI / 180), 2))).toFixed(2)} mm</span></li>
                                
                                <li><strong>Passo 6:</strong> Dividir pelo seno do ângulo de inclinação (α).<br/><span className="text-zinc-500 ml-4">{((headerODVal / 2) - Math.sqrt(Math.pow(headerODVal / 2, 2) - Math.pow((branchODVal / 2) * Math.sin((miterPoints[1]?.deg || 30) * Math.PI / 180), 2))).toFixed(2)} / sin({miterAngle}°) = <span className="text-safety-yellow font-bold">{miterPoints[1]?.height.toFixed(2)} mm</span></span></li>
                            </ul>
                            <p className="mt-4 text-safety-yellow font-bold">Resultado (H): {miterPoints[1]?.height.toFixed(2)} mm</p>
                        </div>
                    </div>
                </div>
             </div>
           </div>

           <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Printer size={18} className="text-safety-yellow" />
                  Molde Boca de Lobo
                </h3>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <div className="flex bg-slate-800 border border-slate-600 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setMoldPageOrientation('portrait')}
                      className={`px-3 py-2 text-xs font-bold rounded ${moldPageOrientation === 'portrait' ? 'bg-blueprint-blue text-white' : 'text-slate-400'}`}
                    >
                      A4 Retrato
                    </button>
                    <button
                      type="button"
                      onClick={() => setMoldPageOrientation('landscape')}
                      className={`px-3 py-2 text-xs font-bold rounded ${moldPageOrientation === 'landscape' ? 'bg-blueprint-blue text-white' : 'text-slate-400'}`}
                    >
                      A4 Paisagem
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handlePrintMiterMold}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-safety-yellow px-4 py-2 text-sm font-bold text-slate-950 hover:bg-yellow-300 transition-colors"
                  >
                    <Printer size={16} />
                    Imprimir Molde em mm
                  </button>
                  <button
                    type="button"
                    onClick={() => { void handleExportMiterMoldPdf(); }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:border-slate-400 transition-colors"
                  >
                    <FileDown size={16} />
                    Exportar PDF
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <span className="block text-[10px] uppercase text-slate-500">DE Ramal</span>
                  <span className="text-xl font-black text-white">{miterMoldResults.branchOD.toFixed(1)} mm</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <span className="block text-[10px] uppercase text-slate-500">Passo</span>
                  <span className="text-xl font-black text-blue-400">{miterMoldResults.stepWidth.toFixed(2)} mm</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <span className="block text-[10px] uppercase text-slate-500">Altura Máxima</span>
                  <span className="text-xl font-black text-orange-400">{miterMoldResults.maxHeight.toFixed(1)} mm</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <span className="block text-[10px] uppercase text-slate-500">Desenvolvimento</span>
                  <span className="text-xl font-black text-green-400">{miterMoldResults.development.toFixed(1)} mm</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <span className="block text-[10px] uppercase text-slate-500">Cada Divisão Igual</span>
                  <span className="text-xl font-black text-cyan-300">{miterMoldResults.stepWidth.toFixed(2)} mm</span>
                </div>
              </div>

              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 overflow-x-auto">
                <div className="min-w-[720px]">
                  <div className="flex flex-wrap gap-3 mb-3 text-[11px] font-bold">
                    <span className="inline-flex items-center gap-2 text-blue-400"><span className="w-3 h-3 rounded-full bg-blue-400" /> Passo real do molde</span>
                    <span className="inline-flex items-center gap-2 text-orange-400"><span className="w-3 h-3 rounded-full bg-orange-400" /> Altura do corte</span>
                    <span className="inline-flex items-center gap-2 text-green-400"><span className="w-3 h-3 rounded-full bg-green-400" /> Desenvolvimento</span>
                    <span className="inline-flex items-center gap-2 text-cyan-300"><span className="w-3 h-3 rounded-full bg-cyan-300" /> Cada marcação igual no perímetro</span>
                  </div>
                  <svg viewBox={`0 0 ${Math.max(720, miterMoldResults.development + 80)} 260`} className="w-full h-[300px]">
                    <line x1="40" y1="190" x2={40 + miterMoldResults.development} y2="190" stroke="#4ade80" strokeWidth="2.4" />
                    {miterMarkingPoints.map((point) => {
                      const x = 40 + point.x;
                      const y = 190 - point.height;
                      const pointLabelY = point.mark % 2 === 0 ? 222 : 234;
                      return (
                        <g key={point.index}>
                          <line x1={x} y1="190" x2={x} y2={y} stroke="#fb923c" strokeWidth="1.4" />
                          <text x={x} y={214} textAnchor="start" fill="#94a3b8" fontSize="8.5" fontWeight="bold" transform={`rotate(90 ${x} 214)`}>{point.deg}°</text>
                          <text x={x} y={pointLabelY} textAnchor="middle" fill="#67e8f9" fontSize="9" fontWeight="bold">P{point.mark}</text>
                          <text x={x} y={y - 8} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">{point.height.toFixed(1)}</text>
                        </g>
                      );
                    })}
                    <path
                      d={`M ${miterMoldResults.printablePoints.map((point) => `${40 + point.x} ${190 - point.height}`).join(' L ')}`}
                      fill="none"
                      stroke="#60a5fa"
                      strokeWidth="2.5"
                    />
                    <text x="40" y="42" fill="#fbbf24" fontSize="16" fontWeight="bold">Molde real para impressao</text>
                    <text x="40" y="60" fill="#94a3b8" fontSize="11">Imprimir em 100% para usar como gabarito e cortar com tesoura</text>
                    <text x={40 + (miterMoldResults.stepWidth / 2)} y="24" textAnchor="middle" fill="#60a5fa" fontSize="10" fontWeight="bold">
                      Passo {miterMoldResults.stepWidth.toFixed(2)} mm
                    </text>
                    <line x1="40" y1="32" x2={40 + miterMoldResults.stepWidth} y2="32" stroke="#60a5fa" strokeWidth="2" />
                    <line x1="40" y1="27" x2="40" y2="37" stroke="#60a5fa" strokeWidth="2" />
                    <line x1={40 + miterMoldResults.stepWidth} y1="27" x2={40 + miterMoldResults.stepWidth} y2="37" stroke="#60a5fa" strokeWidth="2" />
                    <text x={40 + (miterMoldResults.development / 2)} y="222" textAnchor="middle" fill="#4ade80" fontSize="10" fontWeight="bold">
                      Desenvolvimento {miterMoldResults.development.toFixed(1)} mm
                    </text>
                    <text x={40 + miterMoldResults.development - 4} y="248" textAnchor="end" fill="#94a3b8" fontSize="10" fontWeight="bold">
                      Do ponto central em diante, o restante e espelhado
                    </text>
                  </svg>
                  <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm">
                      <p className="text-slate-300">
                        <strong className="text-green-400">Perímetro / desenvolvimento do tubo:</strong>{' '}
                        Ø {miterMoldResults.branchOD.toFixed(1)} × pi ={' '}
                        <span className="font-bold text-green-400">{miterMoldResults.development.toFixed(1)} mm</span>
                      </p>
                      <p className="mt-2 text-slate-300">
                        <strong className="text-cyan-300">Cada divisão igual no tubo:</strong>{' '}
                        {miterMoldResults.development.toFixed(1)} ÷ {divisions} ={' '}
                        <span className="font-bold text-cyan-300">{miterMoldResults.stepWidth.toFixed(2)} mm</span>
                      </p>
                      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-safety-yellow">Como marcar no tubo</p>
                        <ol className="mt-2 space-y-2 text-slate-300">
                          <li>1. Encoste a trena na boca do tubo e marque o zero.</li>
                          <li>2. Vá puxando a trena e faça marcas a cada <span className="font-bold text-cyan-300">{miterMoldResults.stepWidth.toFixed(2)} mm</span>.</li>
                          <li>3. Em cada marca, suba a <span className="font-bold text-orange-300">altura do corte</span> indicada na tabela ao lado.</li>
                          <li>4. Una os pontos com curva suave para riscar o corte.</li>
                        </ol>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-safety-yellow">Tabela prática para marcar no tubo</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={handleCopyMiterMarkingTable}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:border-slate-400 transition-colors"
                          >
                            <Copy size={14} />
                            Copiar tabela
                          </button>
                          <button
                            type="button"
                            onClick={handlePrintMiterMarkingTable}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:border-slate-400 transition-colors"
                          >
                            <Printer size={14} />
                            Imprimir tabela
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_180px] lg:items-start">
                        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-[11px] text-slate-300">
                          <p><strong className="text-cyan-300">Posição no perímetro:</strong> onde você marca a trena andando pela boca do tubo.</p>
                          <p className="mt-2"><strong className="text-orange-300">Altura do corte:</strong> quanto você sobe a partir dessa marca para achar o ponto do risco.</p>
                        </div>
                        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2">
                          <svg viewBox="0 0 180 100" className="w-full h-24">
                            <line x1="18" y1="76" x2="156" y2="76" stroke="#4ade80" strokeWidth="2" />
                            <line x1="64" y1="76" x2="64" y2="34" stroke="#fb923c" strokeWidth="2" />
                            <line x1="18" y1="88" x2="64" y2="88" stroke="#67e8f9" strokeWidth="2" />
                            <line x1="18" y1="84" x2="18" y2="92" stroke="#67e8f9" strokeWidth="2" />
                            <line x1="64" y1="84" x2="64" y2="92" stroke="#67e8f9" strokeWidth="2" />
                            <circle cx="64" cy="34" r="3" fill="#ffffff" />
                            <text x="41" y="98" textAnchor="middle" fill="#67e8f9" fontSize="10" fontWeight="bold">Posição</text>
                            <text x="72" y="56" fill="#fb923c" fontSize="10" fontWeight="bold">Altura</text>
                            <text x="92" y="20" fill="#94a3b8" fontSize="10">Ponto do corte</text>
                          </svg>
                        </div>
                      </div>
                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full text-xs text-left">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-400">
                              <th className="px-2 py-2">Ponto</th>
                              <th className="px-2 py-2">Ângulo</th>
                              <th className="px-2 py-2">Posição no perímetro</th>
                              <th className="px-2 py-2">Altura do corte</th>
                            </tr>
                          </thead>
                          <tbody>
                            {miterMarkingHalfPoints.map((point) => (
                              <tr key={point.index} className="border-b border-slate-900 text-slate-200">
                                <td className="px-2 py-2 font-bold text-cyan-300">P{point.mark}</td>
                                <td className="px-2 py-2 text-slate-300">{point.deg}°</td>
                                <td className="px-2 py-2 text-cyan-300 font-bold">{point.x.toFixed(2)} mm</td>
                                <td className="px-2 py-2 text-orange-300 font-bold">{point.height.toFixed(1)} mm</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="mt-3 text-[11px] text-slate-400">
                        A tabela mostra só meia volta do tubo para ficar mais prático. Do ponto central em diante, use o restante como espelhado.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </div>
      )}

      {type === 'ELBOW_CUT' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-xl">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Scissors size={20} className="text-safety-yellow"/> Corte de Curva (Graus)</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                 <div>
                    <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Diâmetro (NPS)</label>
                    <select className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white" value={elbowSize} onChange={e => setElbowSize(e.target.value)}>
                        {Object.keys(PIPE_SCHEDULE).map(s => <option key={s} value={s}>{s}"</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Ângulo Desejado</label>
                    <div className="flex items-center gap-2 bg-slate-800 border border-slate-600 rounded px-3">
                        <input type="number" className="bg-transparent w-full py-3 text-white font-bold outline-none" value={targetAngle} onChange={e => setTargetAngle(Number(e.target.value))}/>
                        <span className="text-safety-yellow">°</span>
                    </div>
                 </div>
              </div>

              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 flex flex-col items-center">
                 {/* Visual Representation */}
                 <div className="w-full max-w-sm aspect-video relative mb-6">
                     <svg viewBox="0 0 320 240" className="w-full h-full">
                         {(() => {
                           const originX = 66;
                           const originY = 178;
                           const outerRadius = 112;
                           const centerRadius = 88;
                           const innerRadius = 64;
                           const clampedAngle = Math.max(1, Math.min(90, targetAngle));
                           const guideAngle = -clampedAngle;
                           const polarX = (radius: number, angleDeg: number) => originX + Math.cos((angleDeg * Math.PI) / 180) * radius;
                           const polarY = (radius: number, angleDeg: number) => originY + Math.sin((angleDeg * Math.PI) / 180) * radius;
                           const outerStart = { x: polarX(outerRadius, -90), y: polarY(outerRadius, -90) };
                           const outerEnd = { x: polarX(outerRadius, 0), y: polarY(outerRadius, 0) };
                           const centerStart = { x: polarX(centerRadius, -90), y: polarY(centerRadius, -90) };
                           const centerEnd = { x: polarX(centerRadius, 0), y: polarY(centerRadius, 0) };
                           const innerStart = { x: polarX(innerRadius, -90), y: polarY(innerRadius, -90) };
                           const innerEnd = { x: polarX(innerRadius, 0), y: polarY(innerRadius, 0) };
                           const angleMarkerRadius = 28;
                           const angleEndMarker = { x: polarX(angleMarkerRadius, guideAngle), y: polarY(angleMarkerRadius, guideAngle) };
                           const outerGuide = { x: polarX(outerRadius, guideAngle), y: polarY(outerRadius, guideAngle) };
                           const centerGuide = { x: polarX(centerRadius, guideAngle), y: polarY(centerRadius, guideAngle) };
                           const innerGuide = { x: polarX(innerRadius, guideAngle), y: polarY(innerRadius, guideAngle) };
                           const outerRise = originY - outerGuide.y;
                           const centerRise = originY - centerGuide.y;
                           const innerRise = originY - innerGuide.y;
                           return (
                             <g>
                               <rect x="12" y="12" width="296" height="216" rx="12" fill="none" stroke="#1e293b" strokeWidth="1.2" />
                               <line x1={originX} y1={originY} x2={originX} y2="28" stroke="#334155" strokeWidth="1.4" strokeDasharray="5 4" />
                               <line x1={originX} y1={originY} x2="282" y2={originY} stroke="#334155" strokeWidth="1.4" strokeDasharray="5 4" />
                               <line x1={originX} y1={originY} x2={outerGuide.x} y2={outerGuide.y} stroke="#64748b" strokeWidth="1.4" strokeDasharray="5 4" />

                               <path d={`M ${outerStart.x} ${outerStart.y} A ${outerRadius} ${outerRadius} 0 0 1 ${outerEnd.x} ${outerEnd.y}`} fill="none" stroke="#f8fafc" strokeWidth="3" />
                               <path d={`M ${centerStart.x} ${centerStart.y} A ${centerRadius} ${centerRadius} 0 0 1 ${centerEnd.x} ${centerEnd.y}`} fill="none" stroke="#60a5fa" strokeWidth="3" />
                               <path d={`M ${innerStart.x} ${innerStart.y} A ${innerRadius} ${innerRadius} 0 0 1 ${innerEnd.x} ${innerEnd.y}`} fill="none" stroke="#f8fafc" strokeWidth="3" />

                               <line x1={outerStart.x} y1={outerStart.y} x2={innerStart.x} y2={innerStart.y} stroke="#cbd5e1" strokeWidth="1.4" />
                               <line x1={outerEnd.x} y1={outerEnd.y} x2={innerEnd.x} y2={innerEnd.y} stroke="#cbd5e1" strokeWidth="1.4" />
                               <line x1={outerGuide.x} y1={outerGuide.y} x2={innerGuide.x} y2={innerGuide.y} stroke="#fda4af" strokeWidth="1.8" />

                               <path d={`M ${originX} ${originY - angleMarkerRadius} A ${angleMarkerRadius} ${angleMarkerRadius} 0 0 1 ${angleEndMarker.x} ${angleEndMarker.y}`} fill="none" stroke="#4ade80" strokeWidth="2.2" />
                               <text x={originX + 36} y={originY - 26} fill="#4ade80" fontSize="12" fontWeight="bold">{clampedAngle}°</text>

                                <line x1={originX - 18} y1={originY} x2={originX - 18} y2={outerGuide.y} stroke="#f97316" strokeWidth="2.2" />
                                <line x1={originX - 24} y1={originY} x2={originX - 12} y2={originY} stroke="#f97316" strokeWidth="2.2" />
                                <line x1={originX - 24} y1={outerGuide.y} x2={originX - 12} y2={outerGuide.y} stroke="#f97316" strokeWidth="2.2" />
                                <text x={originX - 28} y={outerGuide.y + 8} fill="#fdba74" fontSize="9" fontWeight="bold" textAnchor="end">{outerRise.toFixed(1)}</text>

                                <line x1={originX - 34} y1={originY} x2={originX - 34} y2={centerGuide.y} stroke="#38bdf8" strokeWidth="2.2" />
                                <line x1={originX - 40} y1={originY} x2={originX - 28} y2={originY} stroke="#38bdf8" strokeWidth="2.2" />
                                <line x1={originX - 40} y1={centerGuide.y} x2={originX - 28} y2={centerGuide.y} stroke="#38bdf8" strokeWidth="2.2" />
                                <text x={originX - 44} y={centerGuide.y + 4} fill="#7dd3fc" fontSize="9" fontWeight="bold" textAnchor="end">{centerRise.toFixed(1)}</text>

                                <line x1={originX - 50} y1={originY} x2={originX - 50} y2={innerGuide.y} stroke="#22c55e" strokeWidth="2.2" />
                                <line x1={originX - 56} y1={originY} x2={originX - 44} y2={originY} stroke="#22c55e" strokeWidth="2.2" />
                                <line x1={originX - 56} y1={innerGuide.y} x2={originX - 44} y2={innerGuide.y} stroke="#22c55e" strokeWidth="2.2" />
                                <text x={originX - 60} y={innerGuide.y + 2} fill="#86efac" fontSize="9" fontWeight="bold" textAnchor="end">{innerRise.toFixed(1)}</text>

                                <line x1="214" y1="42" x2="276" y2="42" stroke="#f97316" strokeWidth="2.6" />
                                <line x1="214" y1="70" x2="260" y2="70" stroke="#38bdf8" strokeWidth="2.6" />
                                <line x1="214" y1="98" x2="246" y2="98" stroke="#22c55e" strokeWidth="2.6" />
                                <line x1="214" y1="126" x2="246" y2="126" stroke="#fda4af" strokeWidth="2" />
                                <text x="282" y="46" fill="#fdba74" fontSize="10" fontWeight="bold">Costas</text>
                                <text x="266" y="74" fill="#7dd3fc" fontSize="10" fontWeight="bold">Centro</text>
                                <text x="252" y="102" fill="#86efac" fontSize="10" fontWeight="bold">Barriga</text>
                                <text x="252" y="130" fill="#fda4af" fontSize="10" fontWeight="bold">Linha de corte</text>
                              </g>
                            );
                          })()}
                      </svg>
                  </div>

                  <div className="grid grid-cols-3 gap-4 w-full text-center">
                      <div className="bg-slate-800 p-3 rounded-lg border border-orange-500/30">
                          <span className="block text-[10px] text-orange-300 uppercase">Costas (Externo)</span>
                          <span className="text-xl font-black text-orange-300">{elbowResults.back.toFixed(1)}</span>
                          <span className="text-[10px] text-slate-500 block">mm</span>
                      </div>
                      <div className="bg-slate-800 p-3 rounded-lg border border-blue-500/30">
                          <span className="block text-[10px] text-blue-300 uppercase">Centro</span>
                          <span className="text-xl font-black text-blue-400">{elbowResults.center.toFixed(1)}</span>
                          <span className="text-[10px] text-slate-500 block">mm</span>
                      </div>
                      <div className="bg-slate-800 p-3 rounded-lg border border-green-500/30">
                          <span className="block text-[10px] text-green-300 uppercase">Barriga (Interno)</span>
                          <span className="text-xl font-black text-green-300">{elbowResults.inside.toFixed(1)}</span>
                          <span className="text-[10px] text-slate-500 block">mm</span>
                      </div>
                  </div>

                  <div className="w-full bg-slate-950/60 rounded-xl border border-slate-800 p-4 space-y-3">
                      <h4 className="text-slate-100 font-bold text-sm">Guia rápido de raio da curva</h4>
                      <p className="text-xs text-slate-300">
                        O mais usado na indústria é o <span className="text-blue-300 font-bold">raio padrão LR = 1,5D</span>.
                        Isso significa que o raio da curva é <span className="text-blue-300 font-bold">1,5 vez o diâmetro nominal do tubo</span>.
                        Quando alguém falar “essa curva é 1,5D”, está falando desse padrão.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="bg-slate-900 rounded-lg border border-slate-700 p-3">
                          <span className="block text-orange-300 font-bold mb-1">1D = SR (Short Radius)</span>
                          <span className="text-slate-300">Curva curta, mais fechada. Boa quando o espaço é apertado.</span>
                        </div>
                        <div className="bg-slate-900 rounded-lg border border-slate-700 p-3">
                          <span className="block text-blue-300 font-bold mb-1">1,5D = LR (Long Radius)</span>
                          <span className="text-slate-300">Raio padrão mais comum. É o caso que esse simulador usa por padrão.</span>
                        </div>
                        <div className="bg-slate-900 rounded-lg border border-slate-700 p-3">
                          <span className="block text-cyan-300 font-bold mb-1">3D</span>
                          <span className="text-slate-300">Curva mais aberta que a LR, com transição mais suave.</span>
                        </div>
                        <div className="bg-slate-900 rounded-lg border border-slate-700 p-3">
                          <span className="block text-green-300 font-bold mb-1">5D / 10D</span>
                          <span className="text-slate-300">Curvas fabricadas de grande raio, usadas quando se quer menos agressividade no desvio.</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Exemplo prático: se o tubista pegar uma curva 90° padrão de catálogo, na maioria dos casos ela será <span className="text-blue-300 font-bold">LR 1,5D</span>.
                      </p>
                  </div>
               </div>

              {/* MEMORIAL DE CÁLCULO - ELBOW CUT */}
              <div className="w-full bg-slate-950/50 rounded-xl border border-slate-800 p-4 mt-4">
                 <h4 className="text-safety-yellow font-bold text-sm mb-3 flex items-center gap-2">
                     <Info size={16} /> Memória de Cálculo (Passo a Passo)
                 </h4>
                 <div className="text-xs text-slate-300 space-y-3 font-mono">
                     <p><strong className="text-blue-400">Raio da Curva (R):</strong> 1.5 × Diâmetro Nominal = {(PIPE_SCHEDULE[elbowSize]?.od * 1.5).toFixed(2)} mm</p>
                     <p><strong className="text-blue-400">Diâmetro Externo (DE):</strong> {PIPE_SCHEDULE[elbowSize]?.od.toFixed(2)} mm</p>
                     <p><strong className="text-blue-400">Ângulo do Corte (θ):</strong> {targetAngle}°</p>
                     
                     <div className="bg-slate-900 p-3 rounded border border-slate-700 mt-2">
                         <p className="text-slate-400 mb-2">Fórmula do Comprimento do Arco:</p>
                         <p className="text-white">Arco = 2 × π × Raio × (θ / 360)</p>
                     </div>

                     <div className="mt-3">
                         <ul className="list-disc list-inside space-y-3 ml-2 text-slate-300">
                             <li><strong>Arco Central:</strong> Usa o Raio da Curva (R).<br/><span className="text-zinc-500 ml-4">2 × π × {(PIPE_SCHEDULE[elbowSize]?.od * 1.5).toFixed(2)} × ({targetAngle} / 360) = <span className="text-blue-400 font-bold">{elbowResults.center.toFixed(1)} mm</span></span></li>
                             
                             <li><strong>Costas (Externo):</strong> Usa o Raio da Curva + Metade do Diâmetro Externo.<br/><span className="text-zinc-500 ml-4">2 × π × ({(PIPE_SCHEDULE[elbowSize]?.od * 1.5).toFixed(2)} + {(PIPE_SCHEDULE[elbowSize]?.od / 2).toFixed(2)}) × ({targetAngle} / 360) = <span className="text-white font-bold">{elbowResults.back.toFixed(1)} mm</span></span></li>
                             
                             <li><strong>Barriga (Interno):</strong> Usa o Raio da Curva - Metade do Diâmetro Externo.<br/><span className="text-zinc-500 ml-4">2 × π × ({(PIPE_SCHEDULE[elbowSize]?.od * 1.5).toFixed(2)} - {(PIPE_SCHEDULE[elbowSize]?.od / 2).toFixed(2)}) × ({targetAngle} / 360) = <span className="text-white font-bold">{elbowResults.inside.toFixed(1)} mm</span></span></li>
                         </ul>
                     </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {type === 'ELBOW_ADVANCE' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-xl">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2"><ArrowRightLeft size={20} className="text-safety-yellow"/> Avanço / Desconto (Take-off)</h3>
                
                <div className="space-y-4 mb-6">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Diâmetro</label>
                            <select className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white" value={advSize} onChange={e => setAdvSize(e.target.value)}>
                                {Object.keys(PIPE_SCHEDULE).map(s => <option key={s} value={s}>{s}"</option>)}
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Tipo Raio</label>
                            <div className="flex bg-slate-800 rounded border border-slate-600 p-1">
                                <button onClick={() => setRadiusType('LR')} className={`flex-1 py-2 rounded text-xs font-bold ${radiusType === 'LR' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Longo</button>
                                <button onClick={() => setRadiusType('SR')} className={`flex-1 py-2 rounded text-xs font-bold ${radiusType === 'SR' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Curto</button>
                            </div>
                        </div>
                    </div>
                    <div>
                         <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Ângulo da Curva</label>
                         <div className="flex items-center gap-2">
                             <input type="range" min="1" max="90" className="flex-1 accent-safety-yellow" value={advAngle} onChange={e => setAdvAngle(Number(e.target.value))} />
                             <div className="bg-slate-800 border border-slate-600 rounded px-3 py-2 w-20 text-center font-bold text-white">
                                 {advAngle}°
                             </div>
                         </div>
                    </div>
                </div>

                <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 flex flex-col items-center">
                     <div className="text-center mb-6">
                         <span className="block text-xs text-slate-500 uppercase tracking-widest mb-1">Desconto (Take-off)</span>
                         <span className="text-5xl font-black text-safety-yellow">{advanceResults.takeOff.toFixed(1)}</span>
                         <span className="text-lg text-slate-400 ml-1">mm</span>
                     </div>
                </div>

                {/* MEMORIAL DE CÁLCULO - ELBOW ADVANCE */}
                <div className="w-full bg-slate-950/50 rounded-xl border border-slate-800 p-4 mt-4">
                    <h4 className="text-safety-yellow font-bold text-sm mb-3 flex items-center gap-2">
                        <Info size={16} /> Memória de Cálculo (Passo a Passo)
                    </h4>
                    <div className="text-xs text-slate-300 space-y-3 font-mono">
                        <p><strong className="text-blue-400">Diâmetro Nominal:</strong> {advSize}"</p>
                        <p><strong className="text-blue-400">Tipo de Raio:</strong> {radiusType === 'LR' ? 'Longo (1.5D)' : 'Curto (1.0D)'}</p>
                        <p><strong className="text-blue-400">Raio da Curva (R):</strong> {(radiusType === 'LR' ? PIPE_SCHEDULE[advSize]?.od * 1.5 : PIPE_SCHEDULE[advSize]?.od).toFixed(2)} mm</p>
                        <p><strong className="text-blue-400">Ângulo da Curva (θ):</strong> {advAngle}°</p>
                        
                        <div className="bg-slate-900 p-3 rounded border border-slate-700 mt-2">
                            <p className="text-slate-400 mb-2">Fórmula do Avanço (Take-off):</p>
                            <p className="text-white">Avanço = Raio × tan(θ / 2)</p>
                        </div>

                        <div className="mt-3">
                            <ul className="list-disc list-inside space-y-3 ml-2 text-slate-300">
                                <li><strong>Passo 1:</strong> Dividir o ângulo por 2.<br/><span className="text-zinc-500 ml-4">{advAngle} / 2 = {(advAngle / 2).toFixed(1)}°</span></li>
                                
                                <li><strong>Passo 2:</strong> Calcular a tangente do resultado.<br/><span className="text-zinc-500 ml-4">tan({(advAngle / 2).toFixed(1)}°) = {Math.tan((advAngle / 2) * Math.PI / 180).toFixed(4)}</span></li>
                                
                                <li><strong>Passo 3:</strong> Multiplicar pelo Raio da Curva.<br/><span className="text-zinc-500 ml-4">{(radiusType === 'LR' ? PIPE_SCHEDULE[advSize]?.od * 1.5 : PIPE_SCHEDULE[advSize]?.od).toFixed(2)} × {Math.tan((advAngle / 2) * Math.PI / 180).toFixed(4)} = <span className="text-safety-yellow font-bold">{advanceResults.takeOff.toFixed(1)} mm</span></span></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {type === 'ELBOW_PATTERN' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Scissors size={20} className="text-safety-yellow" />
                Molde de Cotovelo por Pegadas
              </h3>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <div className="flex bg-slate-800 border border-slate-600 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setMoldPageOrientation('portrait')}
                    className={`px-3 py-2 text-xs font-bold rounded ${moldPageOrientation === 'portrait' ? 'bg-blueprint-blue text-white' : 'text-slate-400'}`}
                  >
                    A4 Retrato
                  </button>
                  <button
                    type="button"
                    onClick={() => setMoldPageOrientation('landscape')}
                    className={`px-3 py-2 text-xs font-bold rounded ${moldPageOrientation === 'landscape' ? 'bg-blueprint-blue text-white' : 'text-slate-400'}`}
                  >
                    A4 Paisagem
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handlePrintElbowPattern}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-safety-yellow px-4 py-2 text-sm font-bold text-slate-950 hover:bg-yellow-300 transition-colors"
                >
                  <Printer size={16} />
                  Imprimir Molde em mm
                </button>
                <button
                  type="button"
                  onClick={() => { void handleExportElbowPatternPdf(); }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:border-slate-400 transition-colors"
                >
                  <FileDown size={16} />
                  Exportar PDF
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Diâmetro do Tubo</label>
                <select className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white" value={patternSize} onChange={e => setPatternSize(e.target.value)}>
                  {Object.keys(PIPE_SCHEDULE).map(s => <option key={s} value={s}>{s}"</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Ângulo do Cotovelo</label>
                <div className="flex items-center gap-2 bg-slate-800 border border-slate-600 rounded px-3">
                  <input type="number" className="bg-transparent w-full py-3 text-white font-bold outline-none" value={patternAngle} onChange={e => setPatternAngle(Number(e.target.value))} />
                  <span className="text-safety-yellow">°</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Pegadas</label>
                <select className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white" value={patternDivisions} onChange={e => setPatternDivisions(Number(e.target.value))}>
                  <option value={6}>6 Pegadas</option>
                  <option value={8}>8 Pegadas</option>
                  <option value={12}>12 Pegadas</option>
                  <option value={16}>16 Pegadas</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Base Reta (mm)</label>
                <input type="number" className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white font-bold outline-none" value={patternBase} onChange={e => setPatternBase(Number(e.target.value))} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">DE do tubo</span>
                <span className="text-xl font-black text-white">{elbowPatternResults.od.toFixed(1)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Passo</span>
                <span className="text-xl font-black text-blue-400">{elbowPatternResults.stepWidth.toFixed(1)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Ordenada centro</span>
                <span className="text-xl font-black text-orange-400">{elbowPatternResults.centerOrdinate.toFixed(1)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Desenvolvimento</span>
                <span className="text-xl font-black text-green-400">{elbowPatternResults.development.toFixed(1)} mm</span>
              </div>
            </div>

            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="flex flex-wrap gap-3 mb-3 text-[11px] font-bold">
                  <span className="inline-flex items-center gap-2 text-white"><span className="w-3 h-3 rounded-full bg-white border border-slate-500" /> DE do tubo</span>
                  <span className="inline-flex items-center gap-2 text-blue-400"><span className="w-3 h-3 rounded-full bg-blue-400" /> Passo</span>
                  <span className="inline-flex items-center gap-2 text-orange-400"><span className="w-3 h-3 rounded-full bg-orange-400" /> Ordenada centro</span>
                  <span className="inline-flex items-center gap-2 text-green-400"><span className="w-3 h-3 rounded-full bg-green-400" /> Desenvolvimento</span>
                </div>
                <svg viewBox={`0 0 ${patternSvgWidth} 240`} className="w-full h-[260px]">
                  <line
                    x1={patternChartLeft}
                    y1={patternBaseY}
                    x2={patternChartLeft + elbowPatternResults.development}
                    y2={patternBaseY}
                    stroke={patternDevelopmentColor}
                    strokeWidth="2.5"
                  />
                  <line
                    x1={patternChartLeft - 18}
                    y1={patternBaseY}
                    x2={patternChartLeft - 18}
                    y2={patternBaseY - elbowPatternResults.od}
                    stroke={patternCurveColor}
                    strokeWidth="2"
                  />
                  <line
                    x1={patternChartLeft - 24}
                    y1={patternBaseY}
                    x2={patternChartLeft - 12}
                    y2={patternBaseY}
                    stroke={patternCurveColor}
                    strokeWidth="2"
                  />
                  <line
                    x1={patternChartLeft - 24}
                    y1={patternBaseY - elbowPatternResults.od}
                    x2={patternChartLeft - 12}
                    y2={patternBaseY - elbowPatternResults.od}
                    stroke={patternCurveColor}
                    strokeWidth="2"
                  />
                  <text
                    x={patternChartLeft - 26}
                    y={patternBaseY - (elbowPatternResults.od / 2)}
                    textAnchor="middle"
                    fill={patternCurveColor}
                    fontSize="10"
                    fontWeight="bold"
                    transform={`rotate(-90 ${patternChartLeft - 26} ${patternBaseY - (elbowPatternResults.od / 2)})`}
                  >
                    DE {elbowPatternResults.od.toFixed(1)} mm
                  </text>
                  {elbowPatternResults.points.length > 1 && (
                    <>
                      <line
                        x1={patternChartLeft}
                        y1="34"
                        x2={patternChartLeft + elbowPatternResults.stepWidth}
                        y2="34"
                        stroke={patternStepColor}
                        strokeWidth="2"
                      />
                      <line x1={patternChartLeft} y1="28" x2={patternChartLeft} y2="40" stroke={patternStepColor} strokeWidth="2" />
                      <line
                        x1={patternChartLeft + elbowPatternResults.stepWidth}
                        y1="28"
                        x2={patternChartLeft + elbowPatternResults.stepWidth}
                        y2="40"
                        stroke={patternStepColor}
                        strokeWidth="2"
                      />
                      <text
                        x={patternChartLeft + (elbowPatternResults.stepWidth / 2)}
                        y="26"
                        textAnchor="middle"
                        fill={patternStepColor}
                        fontSize="10"
                        fontWeight="bold"
                      >
                        Passo {elbowPatternResults.stepWidth.toFixed(1)} mm
                      </text>
                    </>
                  )}
                  {elbowPatternResults.points.map((point, index) => {
                    const x = patternChartLeft + point.x;
                    const y = patternBaseY - point.ordinate;
                    const isCenter = point.index === centerPatternPoint?.index;
                    return (
                      <g key={index}>
                        <line
                          x1={x}
                          y1={patternBaseY}
                          x2={x}
                          y2={y}
                          stroke={isCenter ? patternOrdinateColor : '#334155'}
                          strokeWidth={isCenter ? '2.5' : '1'}
                        />
                        <text x={x} y="208" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold">{point.label}</text>
                        <text
                          x={x}
                          y={y - 8}
                          textAnchor="middle"
                          fill={isCenter ? patternOrdinateColor : '#ffffff'}
                          fontSize="9"
                          fontWeight="bold"
                        >
                          {point.ordinate.toFixed(1)}
                        </text>
                      </g>
                    );
                  })}
                  <path
                    d={`M ${elbowPatternResults.points.map(point => `${patternChartLeft + point.x} ${patternBaseY - point.ordinate}`).join(' L ')}`}
                    fill="none"
                    stroke={patternCurveColor}
                    strokeWidth="2.5"
                  />
                  {centerPatternPoint && (
                    <>
                      <line
                        x1={patternChartLeft + centerPatternPoint.x + 18}
                        y1={patternBaseY}
                        x2={patternChartLeft + centerPatternPoint.x + 18}
                        y2={patternBaseY - centerPatternPoint.ordinate}
                        stroke={patternOrdinateColor}
                        strokeWidth="2"
                        strokeDasharray="4 3"
                      />
                      <text
                        x={patternChartLeft + centerPatternPoint.x + 24}
                        y={patternBaseY - (centerPatternPoint.ordinate / 2)}
                        fill={patternOrdinateColor}
                        fontSize="10"
                        fontWeight="bold"
                      >
                        Ordenada {centerPatternPoint.ordinate.toFixed(1)} mm
                      </text>
                    </>
                  )}
                  <line
                    x1={patternChartLeft}
                    y1="222"
                    x2={patternChartLeft + elbowPatternResults.development}
                    y2="222"
                    stroke={patternDevelopmentColor}
                    strokeWidth="2"
                  />
                  <line x1={patternChartLeft} y1="216" x2={patternChartLeft} y2="228" stroke={patternDevelopmentColor} strokeWidth="2" />
                  <line
                    x1={patternChartLeft + elbowPatternResults.development}
                    y1="216"
                    x2={patternChartLeft + elbowPatternResults.development}
                    y2="228"
                    stroke={patternDevelopmentColor}
                    strokeWidth="2"
                  />
                  <text
                    x={patternChartLeft + (elbowPatternResults.development / 2)}
                    y="236"
                    textAnchor="middle"
                    fill={patternDevelopmentColor}
                    fontSize="10"
                    fontWeight="bold"
                  >
                    Desenvolvimento {elbowPatternResults.development.toFixed(1)} mm
                  </text>
                  <text x="40" y="54" fill="#fbbf24" fontSize="16" fontWeight="bold">Molde desenvolvido do cotovelo</text>
                  <text x="40" y="72" fill="#94a3b8" fontSize="11">Pegadas simétricas calculadas automaticamente</text>
                </svg>
              </div>
            </div>

            <div className="bg-slate-950/50 rounded-xl border border-slate-800 p-4 mt-4">
              <h4 className="text-safety-yellow font-bold text-sm mb-3 flex items-center gap-2">
                <Info size={16} /> Fórmula usada nas ordenadas
              </h4>
              <div className="text-xs text-slate-300 space-y-3 font-mono">
                <p><strong className="text-blue-400">Raio do tubo:</strong> {elbowPatternResults.radius.toFixed(2)} mm</p>
                <p><strong className="text-blue-400">Meio ângulo:</strong> {elbowPatternResults.halfAngle.toFixed(1)}°</p>
                <p><strong className="text-blue-400">Tangente:</strong> tan({elbowPatternResults.halfAngle.toFixed(1)}°) = {elbowPatternResults.tangentFactor.toFixed(4)}</p>
                <div className="bg-slate-900 p-3 rounded border border-slate-700 mt-2">
                  <p className="text-slate-400 mb-2">Ordenada de cada pegada:</p>
                  <p className="text-white">Y = Base reta + (R + cos(θ) × R) × tan(Ângulo / 2)</p>
                </div>
                <p><strong className="text-blue-400">Exemplo da pegada central:</strong> {patternBase} + ({elbowPatternResults.radius.toFixed(1)} + cos(0°) × {elbowPatternResults.radius.toFixed(1)}) × tan({elbowPatternResults.halfAngle.toFixed(1)}°) = <span className="text-orange-400 font-bold">{elbowPatternResults.centerOrdinate.toFixed(1)} mm</span></p>
                <p><strong className="text-blue-400">Largura entre pegadas:</strong> Ø × π ÷ pegadas = {elbowPatternResults.od.toFixed(1)} × 3.1416 ÷ {patternDivisions} = <span className="text-blue-400 font-bold">{elbowPatternResults.stepWidth.toFixed(1)} mm</span></p>
              </div>
            </div>

            <div className="bg-slate-950/50 rounded-xl border border-slate-800 p-4 mt-4 overflow-x-auto">
              <h4 className="text-safety-yellow font-bold text-sm mb-3 flex items-center gap-2">
                <CircleDashed size={16} /> Tabela das Pegadas
              </h4>
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase">
                    <th className="py-2">Pegada</th>
                    <th className="py-2">Ângulo θ</th>
                    <th className="py-2">Ordenada</th>
                    <th className="py-2">Posição no desenvolvimento</th>
                  </tr>
                </thead>
                <tbody>
                  {elbowPatternResults.points.map(point => (
                    <tr key={point.index} className="border-b border-slate-900/80">
                      <td className="py-2 font-bold text-white">{point.label}</td>
                      <td className="py-2 text-slate-300">{point.thetaDeg}°</td>
                      <td className="py-2 text-safety-yellow font-bold">{point.ordinate.toFixed(1)} mm</td>
                      <td className="py-2 text-slate-400">{point.x.toFixed(1)} mm</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {type === 'ARC_LAYOUT' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <LinkIcon size={20} className="text-safety-yellow" />
              Grau, Hipotenusa e Arco
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Hipotenusa / Raio</span>
                <span className="text-xl font-black text-white">{arcLayoutResults.hypotenuse.toFixed(1)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Base Horizontal</span>
                <span className="text-xl font-black text-blue-400">{arcLayoutResults.base.toFixed(1)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Meia Abertura</span>
                <span className="text-xl font-black text-amber-400">{arcLayoutResults.halfOpening.toFixed(1)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Ângulo Central</span>
                <span className="text-xl font-black text-orange-400">{arcLayoutResults.centralAngleDeg.toFixed(2)}°</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Cateto Vertical</span>
                <span className="text-xl font-black text-pink-400">{arcLayoutResults.verticalLeg.toFixed(1)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Arco Desenvolvido</span>
                <span className="text-xl font-black text-green-400">{arcLayoutResults.arcDevelopment.toFixed(1)} mm</span>
              </div>
            </div>

            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 overflow-x-auto">
              <div className="min-w-[720px] lg:min-w-0 lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-4 items-start">
                <svg viewBox="0 0 420 286" className="w-full h-[340px]">
                  <text x="24" y="24" fill="#fbbf24" fontSize="16" fontWeight="bold">Simulador de grau, hipotenusa e arco</text>
                  <text x="24" y="42" fill="#94a3b8" fontSize="11">Desenho técnico proporcional ao cálculo, próximo ao modelo de oficina</text>
                  <rect x="12" y="54" width="396" height="220" rx="10" fill="none" stroke="#1e293b" strokeWidth="1.5" />

                  <g transform="translate(0 34)">
                    <rect
                      x={arcOrigin.x}
                      y={arcTopPoint.y}
                      width={arcApex.x - arcOrigin.x}
                      height={arcHorizontalY - arcTopPoint.y}
                      fill="#d4d4d4"
                      fillOpacity="0.18"
                      stroke="none"
                    />

                    <line x1={arcOrigin.x} y1={arcTopPoint.y} x2={arcOrigin.x} y2={arcOrigin.y} stroke="#e2e8f0" strokeWidth="2" />
                    <line x1={arcOrigin.x} y1={arcHorizontalY} x2={arcApex.x} y2={arcHorizontalY} stroke={arcBaseColor} strokeWidth="2.5" />
                    <line x1={arcOrigin.x} y1={arcOrigin.y} x2={arcApex.x} y2={arcApex.y} stroke={arcHypotenuseColor} strokeWidth="2.5" />
                    <line
                      x1={arcOrigin.x}
                      y1={arcTopPoint.y}
                      x2={arcApex.x}
                      y2={arcApex.y}
                      stroke="#cbd5e1"
                      strokeWidth="1.5"
                      strokeDasharray="6 5"
                    />
                    <path
                      d={`M ${arcTopPoint.x} ${arcTopPoint.y} A ${arcLayoutResults.hypotenuse * arcScale} ${arcLayoutResults.hypotenuse * arcScale} 0 0 1 ${arcApex.x} ${arcApex.y}`}
                      fill="none"
                      stroke={arcDevelopmentColor}
                      strokeWidth="3"
                    />
                    <path
                      d={`M ${arcInnerStart.x} ${arcInnerStart.y} A ${arcInnerRadius} ${arcInnerRadius} 0 0 1 ${arcInnerEnd.x} ${arcInnerEnd.y}`}
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="1.2"
                      strokeDasharray="5 4"
                    />

                    <path
                      d={`M ${arcAngleMarkerStart.x} ${arcAngleMarkerStart.y} A ${arcAngleMarkerRadius} ${arcAngleMarkerRadius} 0 0 1 ${arcAngleMarkerEnd.x} ${arcAngleMarkerEnd.y}`}
                      fill="none"
                      stroke={arcAngleColor}
                      strokeWidth="2.5"
                    />

                    <rect
                      x={arcOrigin.x + 10}
                      y={arcHorizontalY - 6}
                      width={Math.max(24, (arcApex.x - arcOrigin.x) - 20)}
                      height="12"
                      rx="6"
                      fill={arcBaseColor}
                      fillOpacity="0.12"
                    />
                    <rect
                      x={arcOrigin.x - 10}
                      y={arcTopPoint.y + 8}
                      width="12"
                      height={Math.max(24, (arcHorizontalY - arcTopPoint.y) - 16)}
                      rx="6"
                      fill={arcHalfOpeningColor}
                      fillOpacity="0.12"
                    />

                    <line
                      x1={arcOrigin.x - 16}
                      y1={arcTopPoint.y}
                      x2={arcOrigin.x - 16}
                      y2={arcHorizontalY}
                      stroke={arcHalfOpeningColor}
                      strokeWidth="2"
                    />
                    <line x1={arcOrigin.x - 22} y1={arcTopPoint.y + 6} x2={arcOrigin.x - 10} y2={arcTopPoint.y - 6} stroke={arcHalfOpeningColor} strokeWidth="2" />
                    <line x1={arcOrigin.x - 22} y1={arcHorizontalY + 6} x2={arcOrigin.x - 10} y2={arcHorizontalY - 6} stroke={arcHalfOpeningColor} strokeWidth="2" />

                    <line
                      x1={arcOrigin.x - 34}
                      y1={arcOrigin.y}
                      x2={arcOrigin.x - 34}
                      y2={arcHorizontalY}
                      stroke={arcVerticalColor}
                      strokeWidth="2"
                    />
                    <line x1={arcOrigin.x - 40} y1={arcOrigin.y + 6} x2={arcOrigin.x - 28} y2={arcOrigin.y - 6} stroke={arcVerticalColor} strokeWidth="2" />
                    <line x1={arcOrigin.x - 40} y1={arcHorizontalY + 6} x2={arcOrigin.x - 28} y2={arcHorizontalY - 6} stroke={arcVerticalColor} strokeWidth="2" />

                    <line
                      x1={arcOrigin.x}
                      y1={arcHorizontalY - 14}
                      x2={arcApex.x}
                      y2={arcHorizontalY - 14}
                      stroke={arcBaseColor}
                      strokeWidth="2"
                    />
                    <line x1={arcOrigin.x - 6} y1={arcHorizontalY - 8} x2={arcOrigin.x + 6} y2={arcHorizontalY - 20} stroke={arcBaseColor} strokeWidth="2" />
                    <line x1={arcApex.x - 6} y1={arcHorizontalY - 20} x2={arcApex.x + 6} y2={arcHorizontalY - 8} stroke={arcBaseColor} strokeWidth="2" />

                    <text x={arcOrigin.x + 16} y={arcOrigin.y - 48} fill={arcAngleColor} fontSize="11" fontWeight="bold">
                      {arcLayoutResults.centralAngleDeg.toFixed(2)}°
                    </text>
                    <text x={(arcOrigin.x + arcApex.x) / 2} y={arcHorizontalY - 26} textAnchor="middle" fill={arcBaseColor} fontSize="11" fontWeight="bold">
                      {arcLayoutResults.base.toFixed(1)} mm
                    </text>
                    <text x={arcOrigin.x - 30} y={(arcTopPoint.y + arcHorizontalY) / 2} textAnchor="middle" fill={arcHalfOpeningColor} fontSize="11" fontWeight="bold">
                      {arcLayoutResults.halfOpening.toFixed(1)} mm
                    </text>
                    <text
                      x={arcOrigin.x - 50}
                      y={(arcOrigin.y + arcHorizontalY) / 2}
                      textAnchor="middle"
                      fill={arcVerticalColor}
                      fontSize="11"
                      fontWeight="bold"
                      transform={`rotate(-90 ${arcOrigin.x - 50} ${(arcOrigin.y + arcHorizontalY) / 2})`}
                    >
                      {arcLayoutResults.verticalLeg.toFixed(1)}
                    </text>
                    <text
                      x={(arcOrigin.x + arcApex.x) / 2 + 18}
                      y={(arcOrigin.y + arcApex.y) / 2 + 12}
                      fill={arcHypotenuseColor}
                      fontSize="11"
                      fontWeight="bold"
                      transform={`rotate(${(-Math.atan2(arcOrigin.y - arcApex.y, arcApex.x - arcOrigin.x) * 180) / Math.PI} ${(arcOrigin.x + arcApex.x) / 2 + 18} ${(arcOrigin.y + arcApex.y) / 2 + 12})`}
                    >
                      R {arcLayoutResults.hypotenuse.toFixed(1)}
                    </text>
                    <text x={arcOrigin.x + 78} y={arcTopPoint.y + 18} fill={arcDevelopmentColor} fontSize="11" fontWeight="bold">
                      Arco {arcLayoutResults.arcDevelopment.toFixed(1)}
                    </text>
                  </g>
                </svg>

                <div className="mt-4 lg:mt-0 bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
                  <h4 className="text-slate-200 font-bold text-sm">Glossário Visual</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <span className="w-3 h-3 rounded-full bg-white border border-slate-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-white font-bold">Hipotenusa / Raio</p>
                        <p className="text-slate-400">Linha inclinada principal do desenho.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-blue-400 font-bold">Base Horizontal</p>
                        <p className="text-slate-400">Trecho reto horizontal usado como referência.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-amber-400 font-bold">Meia Abertura</p>
                        <p className="text-slate-400">Subida vertical da parte superior até a base.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-3 h-3 rounded-full bg-orange-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-orange-400 font-bold">Ângulo Central</p>
                        <p className="text-slate-400">Valor angular mostrado perto da origem.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-3 h-3 rounded-full bg-pink-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-pink-400 font-bold">Cateto Vertical</p>
                        <p className="text-slate-400">Altura vertical total da construção.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-3 h-3 rounded-full bg-green-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-green-400 font-bold">Arco</p>
                        <p className="text-slate-400">Curva superior correspondente ao desenvolvimento.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-[560px]">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <label className="block text-[10px] text-blue-300 font-bold uppercase mb-2">Base Horizontal (mm)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-white font-bold outline-none text-lg"
                    value={arcBase}
                    onChange={e => setArcBase(Number(e.target.value))}
                  />
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <label className="block text-[10px] text-amber-300 font-bold uppercase mb-2">Meia Abertura (mm)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-white font-bold outline-none text-lg"
                    value={arcHalfOpening}
                    onChange={e => setArcHalfOpening(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-950/50 rounded-xl border border-slate-800 p-4 mt-4">
              <h4 className="text-safety-yellow font-bold text-sm mb-3 flex items-center gap-2">
                <Info size={16} /> Fórmulas usadas
              </h4>
              <div className="text-xs text-slate-300 space-y-3 font-mono">
                <div className="bg-slate-900 p-3 rounded border border-slate-700">
                  <p className="text-slate-400 mb-2">Ângulo central:</p>
                  <p className="text-orange-400">tan^-1(Meia abertura ÷ Base) × 2</p>
                </div>
                <div className="bg-slate-900 p-3 rounded border border-slate-700">
                  <p className="text-slate-400 mb-2">Hipotenusa / raio:</p>
                  <p className="text-white">Base ÷ sen(Ângulo central)</p>
                </div>
                <div className="bg-slate-900 p-3 rounded border border-slate-700">
                  <p className="text-slate-400 mb-2">Cateto vertical:</p>
                  <p className="text-pink-400">Base ÷ tan(Ângulo central)</p>
                </div>
                <div className="bg-slate-900 p-3 rounded border border-slate-700">
                  <p className="text-slate-400 mb-2">Desenvolvimento do arco:</p>
                  <p className="text-green-400">Raio × pi ÷ 180 × Ângulo central</p>
                </div>
                <p><strong className="text-amber-400">Ângulo central:</strong> tan^-1({arcLayoutResults.halfOpening.toFixed(1)} ÷ {arcLayoutResults.base.toFixed(1)}) × 2 = <span className="text-orange-400 font-bold">{arcLayoutResults.centralAngleDeg.toFixed(2)}°</span></p>
                <p><strong className="text-white">Hipotenusa / raio:</strong> {arcLayoutResults.base.toFixed(1)} ÷ sen {arcLayoutResults.centralAngleDeg.toFixed(2)}° = <span className="text-white font-bold">{arcLayoutResults.hypotenuse.toFixed(1)} mm</span></p>
                <p><strong className="text-pink-400">Cateto vertical:</strong> {arcLayoutResults.base.toFixed(1)} ÷ tan {arcLayoutResults.centralAngleDeg.toFixed(2)}° = <span className="text-pink-400 font-bold">{arcLayoutResults.verticalLeg.toFixed(1)} mm</span></p>
                <p><strong className="text-green-400">Arco:</strong> {arcLayoutResults.hypotenuse.toFixed(1)} × pi ÷ 180 × {arcLayoutResults.centralAngleDeg.toFixed(2)} = <span className="text-green-400 font-bold">{arcLayoutResults.arcDevelopment.toFixed(1)} mm</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {type === 'CURVE_DEGREE_FROM_ARC' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <LinkIcon size={20} className="text-safety-yellow" />
              Achar Grau da Curva
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Grau da Curva</span>
                <span className="text-2xl font-black text-orange-400">{curveDegreeResults.degree.toFixed(2)}°</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">1 Grau mede</span>
                <span className="text-xl font-black text-blue-400">{curveDegreeResults.oneDegreeLength.toFixed(3)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Curva 90° nesse raio</span>
                <span className="text-xl font-black text-green-400">{curveDegreeResults.arc90.toFixed(1)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Fator 180 ÷ π</span>
                <span className="text-xl font-black text-pink-400">{(180 / Math.PI).toFixed(3)}</span>
              </div>
            </div>

            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 overflow-x-auto">
              <div className="min-w-[720px] lg:min-w-0 lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-4 items-start">
                <svg viewBox="0 0 420 300" className="w-full h-[340px]">
                  <text x="24" y="24" fill="#fbbf24" fontSize="16" fontWeight="bold">Simulador para achar o grau da curva</text>
                  <text x="24" y="42" fill="#94a3b8" fontSize="11">Informando raio e desenvolvimento do arco, o sistema acha o ângulo da curva</text>
                  <rect x="12" y="54" width="396" height="232" rx="10" fill="none" stroke="#1e293b" strokeWidth="1.5" />
                  {(() => {
                    const actualDegree = Math.max(0.1, curveDegreeResults.degree);
                    const displayDegree = Math.max(1, Math.min(320, actualDegree));
                    const visualReduced = actualDegree > 320;
                    const startAngle = -90;
                    const endAngle = startAngle + displayDegree;
                    const largeArcFlag = displayDegree > 180 ? 1 : 0;
                    const origin = displayDegree > 180 ? { x: 170, y: 222 } : { x: 104, y: 222 };
                    const outerRadius = displayDegree > 180 ? 94 : 122;
                    const innerRadius = Math.max(34, outerRadius * (curveDegreeResults.innerRadius / curveDegreeResults.radius));
                    const midAngle = startAngle + (displayDegree / 2);
                    const polarX = (radius: number, angleDeg: number) => origin.x + Math.cos((angleDeg * Math.PI) / 180) * radius;
                    const polarY = (radius: number, angleDeg: number) => origin.y + Math.sin((angleDeg * Math.PI) / 180) * radius;
                    const outerStart = { x: polarX(outerRadius, startAngle), y: polarY(outerRadius, startAngle) };
                    const outerEnd = { x: polarX(outerRadius, endAngle), y: polarY(outerRadius, endAngle) };
                    const innerStart = { x: polarX(innerRadius, startAngle), y: polarY(innerRadius, startAngle) };
                    const innerEnd = { x: polarX(innerRadius, endAngle), y: polarY(innerRadius, endAngle) };
                    const rightRef = { x: polarX(outerRadius, 0), y: polarY(outerRadius, 0) };
                    const textAngleX = polarX(46, midAngle);
                    const textAngleY = polarY(46, midAngle);
                    const arcTextX = polarX(outerRadius + 24, midAngle);
                    const arcTextY = polarY(outerRadius + 24, midAngle);
                    const bodyTextX = origin.x - 38;
                    const bodyTextY = origin.y - ((outerRadius - innerRadius) / 2);

                    return (
                      <g>
                        <path
                          d={`M ${origin.x} ${origin.y} L ${outerStart.x} ${outerStart.y} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y} Z`}
                          fill="#d4d4d4"
                          fillOpacity="0.78"
                          stroke="#111827"
                          strokeWidth="1.5"
                        />
                        <line x1={origin.x} y1={origin.y} x2={outerStart.x} y2={outerStart.y} stroke="#475569" strokeWidth="2" />
                        <line x1={origin.x} y1={origin.y} x2={outerEnd.x} y2={outerEnd.y} stroke="#475569" strokeWidth="2" />
                        <line x1={origin.x} y1={origin.y} x2={rightRef.x} y2={rightRef.y} stroke="#64748b" strokeWidth="1.6" />

                        <path
                          d={`M ${polarX(outerRadius + 16, startAngle)} ${polarY(outerRadius + 16, startAngle)} A ${outerRadius + 16} ${outerRadius + 16} 0 ${largeArcFlag} 1 ${polarX(outerRadius + 16, endAngle)} ${polarY(outerRadius + 16, endAngle)}`}
                          fill="none"
                          stroke="#22c55e"
                          strokeWidth="2.6"
                        />
                        <text x={arcTextX} y={arcTextY} fill="#4ade80" fontSize="12" fontWeight="bold">
                          Arco {curveDegreeResults.arcLength.toFixed(1)}
                        </text>

                        <line x1={origin.x - 10} y1={origin.y + 26} x2={rightRef.x} y2={origin.y + 26} stroke="#60a5fa" strokeWidth="2" />
                        <line x1={origin.x} y1={origin.y + 20} x2={origin.x} y2={origin.y + 32} stroke="#60a5fa" strokeWidth="2" />
                        <line x1={rightRef.x} y1={origin.y + 20} x2={rightRef.x} y2={origin.y + 32} stroke="#60a5fa" strokeWidth="2" />
                        <text x={(origin.x + rightRef.x) / 2} y={origin.y + 20} textAnchor="middle" fill="#60a5fa" fontSize="12" fontWeight="bold">
                          Raio {curveDegreeResults.radius.toFixed(1)}
                        </text>

                        <line x1={origin.x - 30} y1={outerStart.y} x2={origin.x - 30} y2={innerStart.y} stroke="#f59e0b" strokeWidth="2" />
                        <line x1={origin.x - 36} y1={outerStart.y} x2={origin.x - 24} y2={outerStart.y} stroke="#f59e0b" strokeWidth="2" />
                        <line x1={origin.x - 36} y1={innerStart.y} x2={origin.x - 24} y2={innerStart.y} stroke="#f59e0b" strokeWidth="2" />
                        <text x={bodyTextX} y={bodyTextY} fill="#fbbf24" fontSize="12" fontWeight="bold" textAnchor="middle">
                          {curveDegreeResults.bodyWidth.toFixed(1)}
                        </text>

                        <path
                          d={`M ${polarX(28, 0)} ${polarY(28, 0)} A 28 28 0 ${displayDegree > 180 ? 1 : 0} 0 ${polarX(28, endAngle)} ${polarY(28, endAngle)}`}
                          fill="none"
                          stroke="#fb7185"
                          strokeWidth="2.2"
                        />
                        <text x={textAngleX} y={textAngleY} fill="#fb7185" fontSize="13" fontWeight="bold">
                          {curveDegreeResults.degree.toFixed(2)}°
                        </text>
                        {visualReduced && (
                          <text x="286" y="266" fill="#fca5a5" fontSize="10" textAnchor="end">
                            Visual ajustado para no máximo 320°
                          </text>
                        )}
                      </g>
                    );
                  })()}
                </svg>

                <div className="mt-4 lg:mt-0 bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
                  <h4 className="text-slate-200 font-bold text-sm">Glossário Visual</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-blue-400 font-bold">Raio da Curva</p>
                        <p className="text-slate-400">Medida do centro da curva até a linha do arco.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-3 h-3 rounded-full bg-green-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-green-400 font-bold">Arco Desenvolvido</p>
                        <p className="text-slate-400">Comprimento medido acompanhando a curva.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-3 h-3 rounded-full bg-orange-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-orange-400 font-bold">Largura do Corpo</p>
                        <p className="text-slate-400">Espessura visual da peça no desenho.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-3 h-3 rounded-full bg-pink-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-pink-400 font-bold">Grau da Curva</p>
                        <p className="text-slate-400">Ângulo encontrado a partir do arco e do raio.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <label className="block text-[10px] text-blue-300 font-bold uppercase mb-2">Raio da Curva (mm)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-white font-bold outline-none text-lg"
                    value={curveDegreeRadius}
                    onChange={e => setCurveDegreeRadius(Number(e.target.value))}
                  />
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <label className="block text-[10px] text-green-300 font-bold uppercase mb-2">Arco Desenvolvido (mm)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-white font-bold outline-none text-lg"
                    value={curveDegreeArcLength}
                    onChange={e => setCurveDegreeArcLength(Number(e.target.value))}
                  />
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <label className="block text-[10px] text-slate-300 font-bold uppercase mb-2">Largura do Corpo (mm)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-white font-bold outline-none text-lg"
                    value={curveDegreeBodyWidth}
                    onChange={e => setCurveDegreeBodyWidth(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-950/50 rounded-xl border border-slate-800 p-4 mt-4">
              <h4 className="text-safety-yellow font-bold text-sm mb-3 flex items-center gap-2">
                <Info size={16} /> Memória de Cálculo (Passo a Passo)
              </h4>
              <div className="text-xs text-slate-300 space-y-3 font-mono">
                <p><strong className="text-blue-400">Raio da curva:</strong> {curveDegreeResults.radius.toFixed(1)} mm</p>
                <p><strong className="text-blue-400">Arco desenvolvido:</strong> {curveDegreeResults.arcLength.toFixed(1)} mm</p>

                <div className="bg-slate-900 p-3 rounded border border-slate-700 mt-2">
                  <p className="text-slate-400 mb-2">Fórmula principal:</p>
                  <p className="text-white">Grau = Arco ÷ (Raio × π ÷ 180)</p>
                </div>

                <p>
                  <strong className="text-blue-400">1 grau nesse raio:</strong>{' '}
                  {curveDegreeResults.radius.toFixed(1)} × 3.1416 ÷ 180 ={' '}
                  <span className="text-blue-400 font-bold">{curveDegreeResults.oneDegreeLength.toFixed(3)} mm</span>
                </p>

                <p>
                  <strong className="text-blue-400">Aplicando a fórmula:</strong>{' '}
                  {curveDegreeResults.arcLength.toFixed(1)} ÷ ({curveDegreeResults.radius.toFixed(1)} × 3.1416 ÷ 180) ={' '}
                  <span className="text-orange-400 font-bold">{curveDegreeResults.degree.toFixed(2)}°</span>
                </p>

                <div className="bg-slate-900 p-3 rounded border border-slate-700 mt-2">
                  <p className="text-slate-400 mb-2">Método alternativo de oficina:</p>
                  <p className="text-white">Grau = (180 ÷ π) × Arco ÷ Raio</p>
                </div>

                <p>
                  <strong className="text-blue-400">Usando 57,296:</strong>{' '}
                  57,296 × {curveDegreeResults.arcLength.toFixed(1)} ÷ {curveDegreeResults.radius.toFixed(1)} ={' '}
                  <span className="text-pink-400 font-bold">{curveDegreeResults.degreeByFactor.toFixed(2)}°</span>
                </p>

                <p className="text-slate-400">
                  Dica prática: se o tubista já mediu o desenvolvimento do arco na peça e sabe o raio da curva,
                  este simulador devolve o grau direto sem precisar montar a conta na mão.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {type === 'THREE_POINT_RADIUS' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <CircleDashed size={20} className="text-safety-yellow" />
              Raio Dado 3 Pontos Distintos
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Deslocamento Esquerdo (mm)</label>
                <input
                  type="number"
                  className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white font-bold outline-none"
                  value={radiusLeftRun}
                  onChange={e => setRadiusLeftRun(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Deslocamento Direito (mm)</label>
                <input
                  type="number"
                  className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white font-bold outline-none"
                  value={radiusRightRun}
                  onChange={e => setRadiusRightRun(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Flecha / Altura (mm)</label>
                <input
                  type="number"
                  className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white font-bold outline-none"
                  value={radiusRise}
                  onChange={e => setRadiusRise(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Deslocamento Esquerdo</span>
                <span className="text-xl font-black" style={{ color: radiusLeftColor }}>{threePointRadiusResults.leftRun.toFixed(1)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Deslocamento Direito</span>
                <span className="text-xl font-black" style={{ color: radiusRightColor }}>{threePointRadiusResults.rightRun.toFixed(1)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Flecha</span>
                <span className="text-xl font-black" style={{ color: radiusRiseColor }}>{threePointRadiusResults.rise.toFixed(1)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Lado Auxiliar</span>
                <span className="text-xl font-black" style={{ color: radiusAuxColor }}>{threePointRadiusResults.auxiliarySide.toFixed(1)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Ângulo de Apoio</span>
                <span className="text-xl font-black text-orange-400">{threePointRadiusResults.supportAngleDeg.toFixed(2)}°</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Raio Encontrado</span>
                <span className="text-xl font-black" style={{ color: radiusMainColor }}>R {threePointRadiusResults.radius.toFixed(1)} mm</span>
              </div>
            </div>

            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="flex flex-wrap gap-3 mb-3 text-[11px] font-bold">
                  <span className="inline-flex items-center gap-2" style={{ color: radiusLeftColor }}><span className="w-3 h-3 rounded-full" style={{ backgroundColor: radiusLeftColor }} /> Deslocamento esquerdo</span>
                  <span className="inline-flex items-center gap-2" style={{ color: radiusRightColor }}><span className="w-3 h-3 rounded-full" style={{ backgroundColor: radiusRightColor }} /> Deslocamento direito</span>
                  <span className="inline-flex items-center gap-2" style={{ color: radiusRiseColor }}><span className="w-3 h-3 rounded-full" style={{ backgroundColor: radiusRiseColor }} /> Flecha</span>
                  <span className="inline-flex items-center gap-2" style={{ color: radiusAuxColor }}><span className="w-3 h-3 rounded-full" style={{ backgroundColor: radiusAuxColor }} /> Lado auxiliar</span>
                  <span className="inline-flex items-center gap-2 text-white"><span className="w-3 h-3 rounded-full bg-white border border-slate-500" /> Raio</span>
                </div>
                <svg viewBox="0 0 420 270" className="w-full h-[320px]">
                  <text x="24" y="24" fill="#fbbf24" fontSize="16" fontWeight="bold">Raio e arco entre 3 pontos</text>
                  <text x="24" y="42" fill="#94a3b8" fontSize="11">Modelo visual baseado no traçado com dois apoios e uma flecha</text>
                  <rect x="14" y="52" width="392" height="204" rx="10" fill="none" stroke="#1e293b" strokeWidth="1.5" />
                  {(() => {
                    const marginX = 56;
                    const baseY = 198;
                    const usableWidth = 286;
                    const usableHeight = 132;
                    const scaleX = usableWidth / Math.max(threePointRadiusResults.pointC.x, 1);
                    const scaleY = usableHeight / Math.max(threePointRadiusResults.rise, 1);
                    const scale = Math.min(scaleX, scaleY);
                    const toSvgX = (value: number) => marginX + (value * scale);
                    const toSvgY = (value: number) => baseY - (value * scale);
                    const startX = toSvgX(threePointRadiusResults.pointA.x);
                    const startY = toSvgY(threePointRadiusResults.pointA.y);
                    const midX = toSvgX(threePointRadiusResults.pointB.x);
                    const midY = toSvgY(threePointRadiusResults.pointB.y);
                    const endX = toSvgX(threePointRadiusResults.pointC.x);
                    const endY = toSvgY(threePointRadiusResults.pointC.y);
                    const centerX = toSvgX(threePointRadiusResults.center.x);
                    const centerY = toSvgY(threePointRadiusResults.center.y);
                    const scaledRadius = threePointRadiusResults.radius * scale;
                    const branchSign = Math.abs(
                      (threePointRadiusResults.center.y + Math.sqrt(Math.max(0, (threePointRadiusResults.radius ** 2) - ((threePointRadiusResults.pointB.x - threePointRadiusResults.center.x) ** 2)))) - threePointRadiusResults.pointB.y
                    ) < Math.abs(
                      (threePointRadiusResults.center.y - Math.sqrt(Math.max(0, (threePointRadiusResults.radius ** 2) - ((threePointRadiusResults.pointB.x - threePointRadiusResults.center.x) ** 2)))) - threePointRadiusResults.pointB.y
                    ) ? 1 : -1;
                    const samples = Array.from({ length: 28 }, (_, index) => {
                      const x = (threePointRadiusResults.pointC.x / 27) * index;
                      const dx = x - threePointRadiusResults.center.x;
                      const y = threePointRadiusResults.center.y + (branchSign * Math.sqrt(Math.max(0, (threePointRadiusResults.radius ** 2) - (dx ** 2))));
                      return `${toSvgX(x)} ${toSvgY(y)}`;
                    }).join(' L ');

                    return (
                      <g>
                        <path d={`M ${samples}`} fill="none" stroke="#e2e8f0" strokeWidth="2" />
                        <line x1={startX} y1={startY} x2={endX} y2={endY} stroke="#64748b" strokeWidth="1.5" />
                        <line x1={midX} y1={midY} x2={midX} y2={baseY} stroke={radiusRiseColor} strokeWidth="2" />
                        <line x1={startX} y1={baseY + 14} x2={midX} y2={baseY + 14} stroke={radiusLeftColor} strokeWidth="2" />
                        <line x1={midX} y1={baseY + 14} x2={endX} y2={baseY + 14} stroke={radiusRightColor} strokeWidth="2" />
                        <line x1={midX} y1={baseY + 8} x2={midX} y2={baseY + 20} stroke={radiusLeftColor} strokeWidth="2" />
                        <line x1={startX} y1={baseY + 8} x2={startX} y2={baseY + 20} stroke={radiusLeftColor} strokeWidth="2" />
                        <line x1={midX} y1={baseY + 8} x2={midX} y2={baseY + 20} stroke={radiusRightColor} strokeWidth="2" />
                        <line x1={endX} y1={baseY + 8} x2={endX} y2={baseY + 20} stroke={radiusRightColor} strokeWidth="2" />
                        <line x1={midX + 18} y1={midY + 4} x2={centerX} y2={centerY} stroke={radiusMainColor} strokeWidth="2" />
                        <line x1={midX} y1={midY} x2={endX} y2={endY} stroke={radiusAuxColor} strokeWidth="1.8" />

                        <circle cx={startX} cy={startY} r="4" fill="#0f172a" stroke="#e2e8f0" strokeWidth="1.5" />
                        <circle cx={midX} cy={midY} r="4" fill="#0f172a" stroke="#e2e8f0" strokeWidth="1.5" />
                        <circle cx={endX} cy={endY} r="4" fill="#0f172a" stroke="#e2e8f0" strokeWidth="1.5" />

                        <text x={startX - 8} y={startY - 14} fill="#e2e8f0" fontSize="11" fontWeight="bold">Ponto 1</text>
                        <text x={midX + 6} y={midY - 10} fill="#e2e8f0" fontSize="11" fontWeight="bold">Ponto 2</text>
                        <text x={endX + 8} y={endY - 14} fill="#e2e8f0" fontSize="11" fontWeight="bold">Ponto 3</text>

                        <text x={(startX + midX) / 2} y={baseY + 10} textAnchor="middle" fill={radiusLeftColor} fontSize="11" fontWeight="bold">
                          {threePointRadiusResults.leftRun.toFixed(1)}
                        </text>
                        <text x={(midX + endX) / 2} y={baseY + 10} textAnchor="middle" fill={radiusRightColor} fontSize="11" fontWeight="bold">
                          {threePointRadiusResults.rightRun.toFixed(1)}
                        </text>
                        <text x={midX + 10} y={(midY + baseY) / 2} fill={radiusRiseColor} fontSize="11" fontWeight="bold">
                          {threePointRadiusResults.rise.toFixed(1)}
                        </text>
                        <text x={(midX + endX) / 2 + 18} y={(midY + endY) / 2} fill={radiusAuxColor} fontSize="11" fontWeight="bold" transform={`rotate(${(-Math.atan2(midY - endY, endX - midX) * 180) / Math.PI} ${(midX + endX) / 2 + 18} ${(midY + endY) / 2})`}>
                          {threePointRadiusResults.auxiliarySide.toFixed(1)}
                        </text>
                        <text x={(midX + centerX) / 2 + 14} y={(midY + centerY) / 2} fill={radiusMainColor} fontSize="11" fontWeight="bold" transform={`rotate(${(-Math.atan2(midY - centerY, centerX - midX) * 180) / Math.PI} ${(midX + centerX) / 2 + 14} ${(midY + centerY) / 2})`}>
                          R {threePointRadiusResults.radius.toFixed(1)}
                        </text>
                        <text x={midX + 18} y={baseY + 34} fill={radiusRiseColor} fontSize="10" fontWeight="bold">
                          Flecha
                        </text>
                        <text x={(startX + midX) / 2} y={baseY + 30} textAnchor="middle" fill={radiusLeftColor} fontSize="10" fontWeight="bold">
                          Esquerda
                        </text>
                        <text x={(midX + endX) / 2} y={baseY + 30} textAnchor="middle" fill={radiusRightColor} fontSize="10" fontWeight="bold">
                          Direita
                        </text>
                      </g>
                    );
                  })()}
                </svg>
              </div>
            </div>

            <div className="bg-slate-950/50 rounded-xl border border-slate-800 p-4 mt-4">
              <h4 className="text-safety-yellow font-bold text-sm mb-3 flex items-center gap-2">
                <Info size={16} /> Memória de cálculo
              </h4>
              <div className="text-xs text-slate-300 space-y-3 font-mono">
                <div className="bg-slate-900 p-3 rounded border border-slate-700">
                  <p className="text-slate-400 mb-2">Fórmula prática do raio:</p>
                  <p className="text-white">R = Lado auxiliar ÷ 2 ÷ sen(arctan(Flecha ÷ Deslocamento esquerdo))</p>
                </div>
                <p><strong style={{ color: radiusAuxColor }}>Lado auxiliar:</strong> √({threePointRadiusResults.rise.toFixed(1)}² + {threePointRadiusResults.rightRun.toFixed(1)}²) = <span style={{ color: radiusAuxColor }} className="font-bold">{threePointRadiusResults.auxiliarySide.toFixed(1)} mm</span></p>
                <p><strong className="text-orange-400">Ângulo de apoio:</strong> tan^-1({threePointRadiusResults.rise.toFixed(1)} ÷ {threePointRadiusResults.leftRun.toFixed(1)}) = <span className="text-orange-400 font-bold">{threePointRadiusResults.supportAngleDeg.toFixed(2)}°</span></p>
                <p><strong className="text-white">Raio:</strong> {threePointRadiusResults.auxiliarySide.toFixed(1)} ÷ 2 ÷ sen {threePointRadiusResults.supportAngleDeg.toFixed(2)}° = <span className="text-white font-bold">{threePointRadiusResults.radius.toFixed(1)} mm</span></p>
                <p><strong className="text-green-400">Corda total:</strong> {threePointRadiusResults.leftRun.toFixed(1)} + {threePointRadiusResults.rightRun.toFixed(1)} = <span className="text-green-400 font-bold">{threePointRadiusResults.totalChord.toFixed(1)} mm</span></p>
                <p><strong className="text-blue-300">Ângulo central resultante:</strong> {threePointRadiusResults.centralAngleDeg.toFixed(2)}°</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {type === 'PIPE_SCHEDULE_LOOKUP' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <CircleDashed size={20} className="text-safety-yellow" />
              Escala / Schedule do Tubo
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Diâmetro Nominal (NPS)</label>
                <select
                  className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white font-bold outline-none"
                  value={scheduleLookupSize}
                  onChange={e => setScheduleLookupSize(e.target.value)}
                >
                  {Object.keys(PIPE_SCHEDULE).map(size => (
                    <option key={size} value={size}>{size}"</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Schedule / Escala do tubo</label>
                <select
                  className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white font-bold outline-none"
                  value={scheduleLookupCode}
                  onChange={e => setScheduleLookupCode(e.target.value as PipeScheduleCode)}
                >
                  {PIPE_SCHEDULE_OPTIONS.map(option => (
                    <option key={option.code} value={option.code}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">NPS Selecionado</span>
                <span className="text-xl font-black text-white">{pipeScheduleLookupResults.nps}"</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Diâmetro Externo</span>
                <span className="text-xl font-black text-sky-400">Ø {pipeScheduleLookupResults.od.toFixed(1)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Espessura da Parede</span>
                <span className="text-xl font-black text-emerald-400">{pipeScheduleLookupResults.wall.toFixed(2)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Diâmetro Interno</span>
                <span className="text-xl font-black text-amber-300">Ø {pipeScheduleLookupResults.internalDiameter.toFixed(2)} mm</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] gap-4">
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4">
                <h4 className="text-slate-200 font-bold text-sm mb-4">Leitura rápida para o tubista</h4>
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4 mb-4">
                  <div className="text-sm font-bold text-cyan-200">
                    Tubo {pipeScheduleLookupResults.nps}" {pipeScheduleLookupResults.scheduleLabel}
                  </div>
                  <div className="mt-1 text-xs text-cyan-100">
                    {pipeScheduleLookupResults.scheduleDescription}
                  </div>
                </div>
                <div className="space-y-3 text-sm text-slate-300">
                  <p>
                    <strong className="text-white">Resposta direta:</strong> no tubo <strong>{pipeScheduleLookupResults.nps}"</strong>,
                    a escala <strong>{pipeScheduleLookupResults.scheduleLabel}</strong> corresponde a uma parede de{' '}
                    <strong className="text-emerald-400">{pipeScheduleLookupResults.wall.toFixed(2)} mm</strong>.
                  </p>
                  <p className="text-slate-400">
                    Importante: <strong className="text-slate-200">SCH 40 não é um valor fixo em milímetros</strong>.
                    A espessura muda conforme o diâmetro nominal do tubo.
                  </p>
                  <p className="text-slate-400">
                    Neste app, <strong className="text-slate-200">STD</strong> aparece como atalho de oficina para a
                    referência padrão desta base e <strong className="text-slate-200">XS</strong> como atalho para a
                    referência reforçada.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                    <div className="text-[10px] uppercase text-slate-500 font-bold">Área metálica da seção</div>
                    <div className="mt-1 text-lg font-black text-white">{pipeScheduleLookupResults.sectionArea.toFixed(1)} mm²</div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                    <div className="text-[10px] uppercase text-slate-500 font-bold">Peso aproximado por metro</div>
                    <div className="mt-1 text-lg font-black text-orange-400">{pipeScheduleLookupResults.weightFactor.toFixed(2)} kg/m</div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4">
                <h4 className="text-safety-yellow font-bold text-sm mb-3 flex items-center gap-2">
                  <Info size={16} /> Como ler o schedule
                </h4>
                <div className="space-y-3 text-xs text-slate-300">
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                    <div className="text-[10px] uppercase text-slate-500 font-bold">Fórmula do diâmetro interno</div>
                    <div className="mt-1 font-mono text-slate-100">DI = DE - 2 x espessura</div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                    <div className="text-[10px] uppercase text-slate-500 font-bold">Exemplo deste simulador</div>
                    <div className="mt-1 font-mono text-slate-100">
                      {pipeScheduleLookupResults.od.toFixed(1)} - 2 x {pipeScheduleLookupResults.wall.toFixed(2)} = {pipeScheduleLookupResults.internalDiameter.toFixed(2)} mm
                    </div>
                  </div>
                  <p className="text-slate-400">
                    Use este bloco para decidir a parede padrão do projeto e depois levar isso para o croqui e a lista de material.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {type === 'FLANGE_DRILLING' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <CircleDashed size={20} className="text-safety-yellow" />
              Furação de Flange
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Diâmetro da Furação (PCD)</label>
                <input
                  type="number"
                  className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white font-bold outline-none"
                  value={flangeBoltCircle}
                  onChange={e => setFlangeBoltCircle(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Quantidade de Furos</label>
                <input
                  type="number"
                  min="3"
                  className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white font-bold outline-none"
                  value={flangeHoleCount}
                  onChange={e => setFlangeHoleCount(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Diâmetro do Furo</label>
                <input
                  type="number"
                  className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white font-bold outline-none"
                  value={flangeHoleDiameter}
                  onChange={e => setFlangeHoleDiameter(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Rotação Inicial (°)</label>
                <input
                  type="number"
                  className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white font-bold outline-none"
                  value={flangeStartAngle}
                  onChange={e => setFlangeStartAngle(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Referência de Topo</label>
                <select
                  className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white font-bold outline-none"
                  value={flangeTopReference}
                  onChange={e => setFlangeTopReference(e.target.value as 'HOLE' | 'GAP')}
                >
                  <option value="HOLE">Furo no topo</option>
                  <option value="GAP">Vão no topo</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-8 gap-3 mb-6">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">PCD</span>
                <span className="text-xl font-black" style={{ color: flangeDiameterColor }}>Ø {flangeDrillingResults.boltCircle.toFixed(1)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Quantidade</span>
                <span className="text-xl font-black" style={{ color: flangeHoleColor }}>{flangeDrillingResults.holeCount} furos</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Corda Entre Furos</span>
                <span className="text-xl font-black" style={{ color: flangeChordColor }}>{flangeDrillingResults.chord.toFixed(1)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Arco Entre Furos</span>
                <span className="text-xl font-black" style={{ color: flangeArcColor }}>{flangeDrillingResults.arcBetweenHoles.toFixed(1)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Ângulo Entre Furos</span>
                <span className="text-xl font-black" style={{ color: flangeAngleColor }}>{flangeDrillingResults.angleStepDeg.toFixed(1)}°</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Perímetro Total</span>
                <span className="text-xl font-black" style={{ color: flangeCircleColor }}>{flangeDrillingResults.circumference.toFixed(1)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Rotação Inicial</span>
                <span className="text-xl font-black text-slate-200">{flangeStartAngle.toFixed(1)}°</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Topo</span>
                <span className="text-xl font-black text-slate-200">{flangeTopReference === 'HOLE' ? 'Furo' : 'Vão'}</span>
              </div>
            </div>

            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 overflow-x-auto">
              <div className="min-w-[720px] lg:min-w-0 lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-4 items-start">
                <svg viewBox="0 0 420 324" className="w-full h-[380px]">
                  <text x="24" y="24" fill="#fbbf24" fontSize="16" fontWeight="bold">Furação de flange</text>
                  <text x="24" y="42" fill="#94a3b8" fontSize="11">Distribuição dinâmica dos furos sobre o círculo de furação</text>
                  <rect x="14" y="52" width="392" height="256" rx="10" fill="none" stroke="#1e293b" strokeWidth="1.5" />
                  {(() => {
                    const centerX = 176;
                    const centerY = 184;
                    const drawRadius = 102;
                    const holeRadius = Math.max(4, Math.min(10, (flangeDrillingResults.holeDiameter / 2) * 0.7));
                    const drawPoints = flangeDrillingResults.points.map(point => ({
                      ...point,
                      x: centerX + ((point.x / flangeDrillingResults.radius) * drawRadius),
                      y: centerY + ((point.y / flangeDrillingResults.radius) * drawRadius),
                    }));
                    const topPoint = drawPoints[0];
                    const nextPoint = drawPoints[1];
                    const leftLowerIndex = Math.floor(flangeDrillingResults.holeCount / 2) - 1 >= 0 ? Math.floor(flangeDrillingResults.holeCount / 2) - 1 : 0;
                    const rightLowerIndex = leftLowerIndex + 1 < drawPoints.length ? leftLowerIndex + 1 : 0;
                    const leftLowerPoint = drawPoints[leftLowerIndex];
                    const rightLowerPoint = drawPoints[rightLowerIndex];
                    const arcHighlightRadius = drawRadius + 18;
                    const arcLabelX = 320;
                    const arcLabelY = 150;
                    const infoBoxX = 286;
                    const infoBoxY = 86;
                    return (
                      <g>
                        <circle cx={centerX} cy={centerY} r={drawRadius} fill="none" stroke={flangeCircleColor} strokeWidth="1.5" />
                        {drawPoints.map((point, index) => {
                          const nextChordPoint = drawPoints[(index + 1) % drawPoints.length];
                          return (
                            <g key={index}>
                              <line x1={centerX} y1={centerY} x2={point.x} y2={point.y} stroke="#475569" strokeWidth="0.8" strokeDasharray="4 4" />
                              <circle cx={point.x} cy={point.y} r={holeRadius} fill="#0f172a" stroke={flangeHoleColor} strokeWidth="2" />
                              <line x1={point.x - 12} y1={point.y} x2={point.x + 12} y2={point.y} stroke="#cbd5e1" strokeWidth="1" />
                              <line x1={point.x} y1={point.y - 12} x2={point.x} y2={point.y + 12} stroke="#cbd5e1" strokeWidth="1" />
                              <line x1={point.x} y1={point.y} x2={nextChordPoint.x} y2={nextChordPoint.y} stroke="#64748b" strokeWidth="1.2" />
                            </g>
                          );
                        })}

                        <path
                          d={`M ${topPoint.x} ${topPoint.y - 18} A ${arcHighlightRadius} ${arcHighlightRadius} 0 0 1 ${nextPoint.x + ((nextPoint.x - centerX) / drawRadius) * 18} ${nextPoint.y + ((nextPoint.y - centerY) / drawRadius) * 18}`}
                          fill="none"
                          stroke={flangeArcColor}
                          strokeWidth="2.5"
                        />
                        <text x={arcLabelX} y={arcLabelY} textAnchor="middle" fill={flangeArcColor} fontSize="11" fontWeight="bold">
                          Arco {flangeDrillingResults.arcBetweenHoles.toFixed(1)} mm
                        </text>

                        <line x1={centerX - drawRadius} y1={centerY - drawRadius - 18} x2={centerX + drawRadius} y2={centerY - drawRadius - 18} stroke={flangeDiameterColor} strokeWidth="2" />
                        <line x1={centerX - drawRadius} y1={centerY - drawRadius - 24} x2={centerX - drawRadius} y2={centerY - drawRadius + 4} stroke={flangeDiameterColor} strokeWidth="2" />
                        <line x1={centerX + drawRadius} y1={centerY - drawRadius - 24} x2={centerX + drawRadius} y2={centerY - drawRadius + 4} stroke={flangeDiameterColor} strokeWidth="2" />
                        <text x={centerX} y={centerY - drawRadius - 24} textAnchor="middle" fill={flangeDiameterColor} fontSize="12" fontWeight="bold">
                          Ø{flangeDrillingResults.boltCircle.toFixed(1)}
                        </text>

                        <line x1={leftLowerPoint.x} y1={leftLowerPoint.y + 30} x2={rightLowerPoint.x} y2={rightLowerPoint.y + 30} stroke={flangeChordColor} strokeWidth="2" />
                        <line x1={leftLowerPoint.x} y1={leftLowerPoint.y + 24} x2={leftLowerPoint.x} y2={leftLowerPoint.y + 36} stroke={flangeChordColor} strokeWidth="2" />
                        <line x1={rightLowerPoint.x} y1={rightLowerPoint.y + 24} x2={rightLowerPoint.x} y2={rightLowerPoint.y + 36} stroke={flangeChordColor} strokeWidth="2" />
                        <text x={(leftLowerPoint.x + rightLowerPoint.x) / 2} y={leftLowerPoint.y + 26} textAnchor="middle" fill={flangeChordColor} fontSize="12" fontWeight="bold">
                          {flangeDrillingResults.chord.toFixed(1)}
                        </text>

                        <path
                          d={`M ${centerX + (Math.cos((flangeDrillingResults.startAngleDeg * Math.PI) / 180) * 30)} ${centerY + (Math.sin((flangeDrillingResults.startAngleDeg * Math.PI) / 180) * 30)} A 30 30 0 0 1 ${centerX + (Math.cos((((flangeDrillingResults.startAngleDeg + flangeDrillingResults.angleStepDeg) * Math.PI) / 180)) * 30)} ${centerY + (Math.sin((((flangeDrillingResults.startAngleDeg + flangeDrillingResults.angleStepDeg) * Math.PI) / 180)) * 30)}`}
                          fill="none"
                          stroke={flangeAngleColor}
                          strokeWidth="2"
                        />
                        <text x={centerX + 52} y={centerY + 10} fill={flangeAngleColor} fontSize="11" fontWeight="bold">
                          {flangeDrillingResults.angleStepDeg.toFixed(1)}°
                        </text>
                        <rect x={infoBoxX} y={infoBoxY} width="104" height="58" rx="10" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                        <text x={infoBoxX + 10} y={infoBoxY + 17} fill={flangeHoleColor} fontSize="10" fontWeight="bold">
                          Furo Ø {flangeDrillingResults.holeDiameter.toFixed(1)} mm
                        </text>
                        <text x={infoBoxX + 10} y={infoBoxY + 34} fill="#cbd5e1" fontSize="9.5" fontWeight="bold">
                          Topo: {flangeTopReference === 'HOLE' ? 'furo' : 'vão'}
                        </text>
                        <text x={infoBoxX + 10} y={infoBoxY + 49} fill="#cbd5e1" fontSize="9.5" fontWeight="bold">
                          Rotação: {flangeStartAngle.toFixed(1)}°
                        </text>
                      </g>
                    );
                  })()}
                </svg>

                <div className="mt-4 lg:mt-0 bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
                  <h4 className="text-slate-200 font-bold text-sm">Glossário Visual</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <span className="w-3 h-3 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: flangeDiameterColor }} />
                      <div>
                        <p className="font-bold" style={{ color: flangeDiameterColor }}>PCD / Diâmetro da Furação</p>
                        <p className="text-slate-400">Diâmetro do círculo onde os furos ficam distribuídos.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-3 h-3 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: flangeHoleColor }} />
                      <div>
                        <p className="font-bold" style={{ color: flangeHoleColor }}>Furos</p>
                        <p className="text-slate-400">Quantidade distribuída igualmente ao redor do flange.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-3 h-3 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: flangeChordColor }} />
                      <div>
                        <p className="font-bold" style={{ color: flangeChordColor }}>Corda Entre Furos</p>
                        <p className="text-slate-400">Distância reta entre dois furos vizinhos.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-3 h-3 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: flangeArcColor }} />
                      <div>
                        <p className="font-bold" style={{ color: flangeArcColor }}>Arco Entre Furos</p>
                        <p className="text-slate-400">Desenvolvimento curvo entre dois furos consecutivos.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-3 h-3 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: flangeAngleColor }} />
                      <div>
                        <p className="font-bold" style={{ color: flangeAngleColor }}>Ângulo Entre Furos</p>
                        <p className="text-slate-400">Divisão angular da circunferência em partes iguais.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-3 h-3 rounded-full mt-0.5 shrink-0 bg-slate-200" />
                      <div>
                        <p className="font-bold text-slate-200">Referência de Topo</p>
                        <p className="text-slate-400">Define se o topo fica com um furo ou com o vão central entre dois furos.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/50 rounded-xl border border-slate-800 p-4 mt-4">
              <h4 className="text-safety-yellow font-bold text-sm mb-3 flex items-center gap-2">
                <Info size={16} /> Memória de cálculo
              </h4>
              <div className="text-xs text-slate-300 space-y-3 font-mono">
                <div className="bg-slate-900 p-3 rounded border border-slate-700">
                  <p className="text-slate-400 mb-2">Fórmula da corda entre furos:</p>
                  <p className="text-white">Corda = PCD × sen(180 ÷ número de furos)</p>
                </div>
                <div className="bg-slate-900 p-3 rounded border border-slate-700">
                  <p className="text-slate-400 mb-2">Fórmula do arco entre furos:</p>
                  <p className="text-white">Arco = (pi × PCD) ÷ número de furos</p>
                </div>
                <p><strong style={{ color: flangeDiameterColor }}>PCD:</strong> {flangeDrillingResults.boltCircle.toFixed(1)} mm</p>
                <p><strong style={{ color: flangeAngleColor }}>Ângulo entre furos:</strong> 360 ÷ {flangeDrillingResults.holeCount} = <span style={{ color: flangeAngleColor }} className="font-bold">{flangeDrillingResults.angleStepDeg.toFixed(1)}°</span></p>
                <p><strong style={{ color: flangeChordColor }}>Corda:</strong> {flangeDrillingResults.boltCircle.toFixed(1)} × sen(180 ÷ {flangeDrillingResults.holeCount}) = <span style={{ color: flangeChordColor }} className="font-bold">{flangeDrillingResults.chord.toFixed(1)} mm</span></p>
                <p><strong style={{ color: flangeArcColor }}>Arco entre furos:</strong> (pi × {flangeDrillingResults.boltCircle.toFixed(1)}) ÷ {flangeDrillingResults.holeCount} = <span style={{ color: flangeArcColor }} className="font-bold">{flangeDrillingResults.arcBetweenHoles.toFixed(1)} mm</span></p>
                <p><strong style={{ color: flangeCircleColor }}>Perímetro total:</strong> pi × {flangeDrillingResults.boltCircle.toFixed(1)} = <span style={{ color: flangeCircleColor }} className="font-bold">{flangeDrillingResults.circumference.toFixed(1)} mm</span></p>
                <p><strong style={{ color: flangeHoleColor }}>Furo individual:</strong> Ø {flangeDrillingResults.holeDiameter.toFixed(1)} mm</p>
                <p><strong className="text-slate-200">Configuração de topo:</strong> {flangeTopReference === 'HOLE' ? 'furo alinhado no topo' : 'vao alinhado no topo'} com rotação adicional de <span className="text-slate-200 font-bold">{flangeStartAngle.toFixed(1)}°</span></p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Printer size={18} className="text-safety-yellow" />
                Gabarito da Furação do Flange
              </h3>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <div className="flex bg-slate-800 border border-slate-600 rounded-lg p-1">
                  <button type="button" onClick={() => setMoldPageOrientation('portrait')} className={`px-3 py-2 text-xs font-bold rounded ${moldPageOrientation === 'portrait' ? 'bg-blueprint-blue text-white' : 'text-slate-400'}`}>A4 Retrato</button>
                  <button type="button" onClick={() => setMoldPageOrientation('landscape')} className={`px-3 py-2 text-xs font-bold rounded ${moldPageOrientation === 'landscape' ? 'bg-blueprint-blue text-white' : 'text-slate-400'}`}>A4 Paisagem</button>
                </div>
                <button type="button" onClick={handlePrintFlangeDrillingMold} className="inline-flex items-center justify-center gap-2 rounded-lg bg-safety-yellow px-4 py-2 text-sm font-bold text-slate-950 hover:bg-yellow-300 transition-colors">
                  <Printer size={16} />
                  Imprimir Molde em mm
                </button>
                <button type="button" onClick={() => { void handleExportFlangeDrillingMoldPdf(); }} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:border-slate-400 transition-colors">
                  <FileDown size={16} />
                  Gerar PDF do Gabarito
                </button>
              </div>
            </div>

            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 overflow-x-auto">
              <div className="min-w-[720px] grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
                <svg viewBox="0 0 520 320" className="w-full h-[340px]">
                  {(() => {
                    const centerX = 214;
                    const centerY = 182;
                    const drawRadius = 126;
                    const holeRadius = Math.max(5, Math.min(11, (flangeDrillingResults.holeDiameter / 2) * 0.78));
                    const drawPoints = flangeDrillingResults.points.map((point) => ({
                      ...point,
                      x: centerX + ((point.x / flangeDrillingResults.radius) * drawRadius),
                      y: centerY + ((point.y / flangeDrillingResults.radius) * drawRadius),
                    }));
                    return (
                      <g>
                        <text x="28" y="28" fill="#fbbf24" fontSize="16" fontWeight="bold">Gabarito físico da furação</text>
                        <text x="28" y="46" fill="#94a3b8" fontSize="11">Use para marcar centro, PCD e posição dos furos na flange</text>
                        <rect x="18" y="56" width="484" height="238" rx="12" fill="none" stroke="#1e293b" strokeWidth="1.4" />
                        <circle cx={centerX} cy={centerY} r={drawRadius} fill="none" stroke="#ffffff" strokeWidth="1.5" />
                        <line x1={centerX - drawRadius - 26} y1={centerY} x2={centerX + drawRadius + 26} y2={centerY} stroke="#64748b" strokeWidth="1.1" strokeDasharray="5 4" />
                        <line x1={centerX} y1={centerY - drawRadius - 26} x2={centerX} y2={centerY + drawRadius + 26} stroke="#64748b" strokeWidth="1.1" strokeDasharray="5 4" />
                        {drawPoints.map((point, index) => (
                          <g key={index}>
                            <circle cx={point.x} cy={point.y} r={holeRadius} fill="none" stroke={flangeHoleColor} strokeWidth="2" />
                            <line x1={point.x - holeRadius - 6} y1={point.y} x2={point.x + holeRadius + 6} y2={point.y} stroke="#cbd5e1" strokeWidth="1" />
                            <line x1={point.x} y1={point.y - holeRadius - 6} x2={point.x} y2={point.y + holeRadius + 6} stroke="#cbd5e1" strokeWidth="1" />
                            <text x={point.x + holeRadius + 6} y={point.y - holeRadius - 6} fill="#e2e8f0" fontSize="10" fontWeight="bold">{index + 1}</text>
                          </g>
                        ))}
                        <line x1={centerX - drawRadius} y1={centerY - drawRadius - 20} x2={centerX + drawRadius} y2={centerY - drawRadius - 20} stroke={flangeDiameterColor} strokeWidth="2" />
                        <line x1={centerX - drawRadius} y1={centerY - drawRadius - 26} x2={centerX - drawRadius} y2={centerY - drawRadius + 6} stroke={flangeDiameterColor} strokeWidth="2" />
                        <line x1={centerX + drawRadius} y1={centerY - drawRadius - 26} x2={centerX + drawRadius} y2={centerY - drawRadius + 6} stroke={flangeDiameterColor} strokeWidth="2" />
                        <text x={centerX} y={centerY - drawRadius - 26} textAnchor="middle" fill={flangeDiameterColor} fontSize="12" fontWeight="bold">Ø {flangeDrillingResults.boltCircle.toFixed(1)} mm</text>

                        <text x="352" y="104" fill={flangeChordColor} fontSize="12" fontWeight="bold">Corda {flangeDrillingResults.chord.toFixed(1)} mm</text>
                        <text x="352" y="128" fill={flangeArcColor} fontSize="12" fontWeight="bold">Arco {flangeDrillingResults.arcBetweenHoles.toFixed(1)} mm</text>
                        <text x="352" y="152" fill={flangeAngleColor} fontSize="12" fontWeight="bold">Ângulo {flangeDrillingResults.angleStepDeg.toFixed(1)}°</text>
                        <text x="352" y="176" fill={flangeCircleColor} fontSize="12" fontWeight="bold">Perímetro {flangeDrillingResults.circumference.toFixed(1)} mm</text>
                        <text x="352" y="200" fill={flangeHoleColor} fontSize="12" fontWeight="bold">Furo Ø {flangeDrillingResults.holeDiameter.toFixed(1)} mm</text>
                        <text x="352" y="224" fill="#e2e8f0" fontSize="12" fontWeight="bold">Topo {flangeTopReference === 'HOLE' ? 'furo' : 'vao'}</text>
                        <text x="352" y="248" fill="#e2e8f0" fontSize="12" fontWeight="bold">Rotação {flangeStartAngle.toFixed(1)}°</text>
                      </g>
                    );
                  })()}
                </svg>

                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-xs space-y-3">
                  <h4 className="text-slate-200 font-bold text-sm">Uso do Gabarito</h4>
                  <p className="text-slate-400">Imprima em 100%, confira a régua de 100 mm no papel e depois marque o centro da flange usando as linhas cruzadas do molde.</p>
                  <p className="text-slate-500">No visualizador PDF, 100% é só zoom de tela. Escala real só é validada na folha impressa, medindo a régua de 100 mm.</p>
                  <p className="text-slate-400">Os furos numerados ajudam a transferir a sequência de marcação e conferência em campo ou oficina.</p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="w-3 h-3 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: flangeDiameterColor }} />
                      <div>
                        <p className="font-bold" style={{ color: flangeDiameterColor }}>PCD no gabarito</p>
                        <p className="text-slate-400">Linha principal para centralizar a furação.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-3 h-3 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: flangeHoleColor }} />
                      <div>
                        <p className="font-bold" style={{ color: flangeHoleColor }}>Furos</p>
                        <p className="text-slate-400">Diâmetro real usado como referência do punção/marcação.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {type === 'TUBE_SADDLE_90' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Scissors size={20} className="text-safety-yellow" />
              Unha no Tubo 90°
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Tubo Base (mm)</label>
                <input type="number" className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white font-bold outline-none" value={saddleHeaderDiameter} onChange={e => setSaddleHeaderDiameter(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Tubo Unha (mm)</label>
                <input type="number" className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white font-bold outline-none" value={saddleBranchDiameter} onChange={e => setSaddleBranchDiameter(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Diferença Entre Eixos (mm)</label>
                <input type="number" className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white font-bold outline-none" value={saddleAxisOffset} onChange={e => setSaddleAxisOffset(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Divisões</label>
                <select className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white" value={saddleDivisions} onChange={e => setSaddleDivisions(Number(e.target.value))}>
                  <option value={8}>8 Divisões</option>
                  <option value={12}>12 Divisões</option>
                  <option value={16}>16 Divisões</option>
                  <option value={24}>24 Divisões</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Raio Tubo Base</span>
                <span className="text-xl font-black text-white">{saddle90Results.headerRadius.toFixed(1)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Passo</span>
                <span className="text-xl font-black text-blue-400">{saddle90Results.stepWidth.toFixed(2)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Ordenada Centro</span>
                <span className="text-xl font-black text-orange-400">{saddle90Results.centerOrdinate.toFixed(1)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Desenvolvimento</span>
                <span className="text-xl font-black text-green-400">{saddle90Results.development.toFixed(1)} mm</span>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-4">
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4">
                <h4 className="text-slate-200 font-bold text-sm mb-3">Geometria de Referência</h4>
                <svg viewBox="0 0 300 300" className="w-full h-[320px]">
                  {(() => {
                    const centerX = 140;
                    const centerY = 188;
                    const baseRadius = 86;
                    const branchRadius = (saddle90Results.branchRadius / saddle90Results.headerRadius) * 50;
                    const branchCenterX = centerX + ((saddle90Results.axisOffset / saddle90Results.headerRadius) * baseRadius);
                    const branchCenterY = centerY - baseRadius - 24;
                    return (
                      <g>
                        <rect x="10" y="10" width="280" height="280" rx="12" fill="none" stroke="#1e293b" strokeWidth="1.2" />
                        <circle cx={centerX} cy={centerY} r={baseRadius} fill="none" stroke="#ffffff" strokeWidth="1.5" />
                        <line x1={centerX - baseRadius - 14} y1={centerY} x2={centerX + baseRadius + 14} y2={centerY} stroke="#64748b" strokeWidth="1.2" strokeDasharray="5 4" />
                        <line x1={centerX} y1={centerY - baseRadius - 18} x2={centerX} y2={centerY + baseRadius + 18} stroke="#64748b" strokeWidth="1.2" strokeDasharray="5 4" />
                        <path d={`M ${branchCenterX - branchRadius} ${branchCenterY + branchRadius} L ${branchCenterX - branchRadius} ${branchCenterY - branchRadius} A ${branchRadius} ${branchRadius} 0 0 1 ${branchCenterX + branchRadius} ${branchCenterY - branchRadius} L ${branchCenterX + branchRadius} ${branchCenterY + branchRadius}`} fill="none" stroke="#e2e8f0" strokeWidth="1.5" />
                        <line x1={branchCenterX} y1={branchCenterY - branchRadius - 16} x2={branchCenterX} y2={centerY} stroke="#94a3b8" strokeWidth="1" />
                        <line x1={centerX} y1={centerY - 40} x2={branchCenterX} y2={centerY - 40} stroke="#fb923c" strokeWidth="2" />
                        <line x1={centerX} y1={centerY - 46} x2={centerX} y2={centerY - 34} stroke="#fb923c" strokeWidth="2" />
                        <line x1={branchCenterX} y1={centerY - 46} x2={branchCenterX} y2={centerY - 34} stroke="#fb923c" strokeWidth="2" />
                        <line x1={branchCenterX + branchRadius + 10} y1={branchCenterY - branchRadius} x2={branchCenterX + branchRadius + 10} y2={centerY} stroke="#60a5fa" strokeWidth="2" />
                        <text x={(centerX + branchCenterX) / 2} y={centerY - 48} textAnchor="middle" fill="#fb923c" fontSize="12" fontWeight="bold">
                          {saddle90Results.axisOffset.toFixed(1)}
                        </text>
                        <text x={branchCenterX + branchRadius + 18} y={(branchCenterY - branchRadius + centerY) / 2} fill="#60a5fa" fontSize="11" fontWeight="bold" transform={`rotate(-90 ${branchCenterX + branchRadius + 18} ${(branchCenterY - branchRadius + centerY) / 2})`}>
                          {saddle90Results.headerDiameter.toFixed(1)}
                        </text>
                        <text x={36} y={272} fill="#94a3b8" fontSize="10">Sempre usar o diametro medio para o desenvolvimento.</text>
                        <text x={212} y={78} fill="#e2e8f0" fontSize="10" fontWeight="bold">R{(saddle90Results.headerRadius).toFixed(0)}</text>
                      </g>
                    );
                  })()}
                </svg>
              </div>

              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 overflow-x-auto">
                <div className="min-w-[720px]">
                  <div className="flex flex-wrap gap-3 mb-3 text-[11px] font-bold">
                    <span className="inline-flex items-center gap-2 text-blue-400"><span className="w-3 h-3 rounded-full bg-blue-400" /> Passo</span>
                    <span className="inline-flex items-center gap-2 text-orange-400"><span className="w-3 h-3 rounded-full bg-orange-400" /> Ordenadas</span>
                    <span className="inline-flex items-center gap-2 text-green-400"><span className="w-3 h-3 rounded-full bg-green-400" /> Desenvolvimento</span>
                  </div>
                  <svg viewBox={`0 0 ${Math.max(720, saddle90Results.development + 80)} 250`} className="w-full h-[300px]">
                    <line x1="40" y1="190" x2={40 + saddle90Results.development} y2="190" stroke="#4ade80" strokeWidth="2.4" />
                    {saddle90Results.points.map((point) => {
                      const x = 40 + point.x;
                      const y = 190 - point.ordinate;
                      return (
                        <g key={point.index}>
                          <line x1={x} y1="190" x2={x} y2={y} stroke="#fb923c" strokeWidth="1.2" />
                          <text x={x} y="208" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold">{point.label}</text>
                          <text x={x} y={y - 8} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">{point.ordinate.toFixed(1)}</text>
                        </g>
                      );
                    })}
                    <path d={`M ${saddle90Results.points.map((point) => `${40 + point.x} ${190 - point.ordinate}`).join(' L ')}`} fill="none" stroke="#60a5fa" strokeWidth="2.5" />
                    <line x1="40" y1="30" x2={40 + saddle90Results.stepWidth} y2="30" stroke="#60a5fa" strokeWidth="2" />
                    <line x1="40" y1="24" x2="40" y2="36" stroke="#60a5fa" strokeWidth="2" />
                    <line x1={40 + saddle90Results.stepWidth} y1="24" x2={40 + saddle90Results.stepWidth} y2="36" stroke="#60a5fa" strokeWidth="2" />
                    <text x={40 + (saddle90Results.stepWidth / 2)} y="22" textAnchor="middle" fill="#60a5fa" fontSize="10" fontWeight="bold">Passo {saddle90Results.stepWidth.toFixed(2)} mm</text>
                    <text x="40" y="52" fill="#fbbf24" fontSize="16" fontWeight="bold">Desenvolvimento da unha</text>
                    <text x="40" y="70" fill="#94a3b8" fontSize="11">Padrao pronto para virar gabarito impresso em milimetros</text>
                    <text x={40 + (saddle90Results.development / 2)} y="226" textAnchor="middle" fill="#4ade80" fontSize="10" fontWeight="bold">
                      Desenvolvimento {saddle90Results.development.toFixed(1)} mm
                    </text>
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/50 rounded-xl border border-slate-800 p-4 mt-4">
              <h4 className="text-safety-yellow font-bold text-sm mb-3 flex items-center gap-2">
                <Info size={16} /> Memória de cálculo
              </h4>
              <div className="text-xs text-slate-300 space-y-3 font-mono">
                <div className="bg-slate-900 p-3 rounded border border-slate-700">
                  <p className="text-slate-400 mb-2">Fórmula da ordenada em 90°:</p>
                  <p className="text-white">H = D base - √(R base² - (diferença entre eixos + cos(θ) × R unha)²)</p>
                </div>
                <p><strong className="text-white">Exemplo centro:</strong> {saddle90Results.headerDiameter.toFixed(1)} - √({saddle90Results.headerRadius.toFixed(1)}² - ({saddle90Results.axisOffset.toFixed(1)} + cos 0° × {saddle90Results.branchRadius.toFixed(1)})²) = <span className="text-orange-400 font-bold">{saddle90Results.centerOrdinate.toFixed(1)} mm</span></p>
                <p><strong className="text-blue-400">Passo:</strong> {saddle90Results.branchDiameter.toFixed(1)} × pi ÷ {saddle90Results.divisions} = <span className="text-blue-400 font-bold">{saddle90Results.stepWidth.toFixed(2)} mm</span></p>
                <p><strong className="text-green-400">Desenvolvimento:</strong> {saddle90Results.stepWidth.toFixed(2)} × {saddle90Results.divisions} = <span className="text-green-400 font-bold">{saddle90Results.development.toFixed(1)} mm</span></p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Printer size={18} className="text-safety-yellow" />
                Molde Unha no Tubo 90°
              </h3>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <div className="flex bg-slate-800 border border-slate-600 rounded-lg p-1">
                  <button type="button" onClick={() => setMoldPageOrientation('portrait')} className={`px-3 py-2 text-xs font-bold rounded ${moldPageOrientation === 'portrait' ? 'bg-blueprint-blue text-white' : 'text-slate-400'}`}>A4 Retrato</button>
                  <button type="button" onClick={() => setMoldPageOrientation('landscape')} className={`px-3 py-2 text-xs font-bold rounded ${moldPageOrientation === 'landscape' ? 'bg-blueprint-blue text-white' : 'text-slate-400'}`}>A4 Paisagem</button>
                </div>
                <button type="button" onClick={handlePrintSaddle90Mold} className="inline-flex items-center justify-center gap-2 rounded-lg bg-safety-yellow px-4 py-2 text-sm font-bold text-slate-950 hover:bg-yellow-300 transition-colors">
                  <Printer size={16} />
                  Imprimir Molde em mm
                </button>
                <button type="button" onClick={() => { void handleExportSaddle90Pdf(); }} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:border-slate-400 transition-colors">
                  <FileDown size={16} />
                  Exportar PDF
                </button>
              </div>
            </div>

            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 overflow-x-auto">
              <div className="min-w-[720px]">
                <svg viewBox={`0 0 ${Math.max(720, saddle90Results.development + 80)} 250`} className="w-full h-[300px]">
                  <line x1="40" y1="190" x2={40 + saddle90Results.development} y2="190" stroke="#4ade80" strokeWidth="2.4" />
                  {saddle90Results.points.map((point) => {
                    const x = 40 + point.x;
                    const y = 190 - point.ordinate;
                    return (
                      <g key={point.index}>
                        <line x1={x} y1="190" x2={x} y2={y} stroke="#fb923c" strokeWidth="1.2" />
                        <text x={x} y="208" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold">{point.label}</text>
                        <text x={x} y={y - 8} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">{point.ordinate.toFixed(1)}</text>
                      </g>
                    );
                  })}
                  <path d={`M ${saddle90Results.points.map((point) => `${40 + point.x} ${190 - point.ordinate}`).join(' L ')}`} fill="none" stroke="#60a5fa" strokeWidth="2.5" />
                  <text x="40" y="46" fill="#fbbf24" fontSize="16" fontWeight="bold">Molde pronto para impressao</text>
                  <text x="40" y="64" fill="#94a3b8" fontSize="11">Imprimir em 100% e usar como gabarito de corte no tubo</text>
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {type === 'ELBOW_BACK_SADDLE_90' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <CircleDashed size={20} className="text-safety-yellow" />
              Unha nas Costas da Curva 90°
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Raio Médio (mm)</label>
                <input type="number" className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white font-bold outline-none" value={elbowBackMeanRadius} onChange={e => setElbowBackMeanRadius(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">DE da Curva (mm)</label>
                <input type="number" className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white font-bold outline-none" value={elbowBackCurveDiameter} onChange={e => setElbowBackCurveDiameter(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">DE da Unha (mm)</label>
                <input type="number" className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white font-bold outline-none" value={elbowBackBranchDiameter} onChange={e => setElbowBackBranchDiameter(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Divisões</label>
                <select className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white" value={elbowBackDivisions} onChange={e => setElbowBackDivisions(Number(e.target.value))}>
                  <option value={6}>6 Divisões</option>
                  <option value={8}>8 Divisões</option>
                  <option value={12}>12 Divisões</option>
                  <option value={16}>16 Divisões</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Raio Médio</span>
                <span className="text-xl font-black text-white">R {elbowBackSaddleResults.meanRadius.toFixed(1)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Passo</span>
                <span className="text-xl font-black text-blue-400">{elbowBackSaddleResults.stepWidth.toFixed(1)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Ordenada Centro</span>
                <span className="text-xl font-black text-orange-400">{elbowBackSaddleResults.centerOrdinate.toFixed(1)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Desenvolvimento</span>
                <span className="text-xl font-black text-green-400">{elbowBackSaddleResults.development.toFixed(1)} mm</span>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-4">
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4">
                <h4 className="text-slate-200 font-bold text-sm mb-3">Prancha Técnica</h4>
                <svg viewBox="0 0 340 380" className="w-full h-[380px]">
                  {(() => {
                    const baseX = 74;
                    const baseY = 294;
                    const drawScale = Math.min(2.15, 152 / Math.max(elbowBackSaddleResults.outerRadius, 1));
                    const meanR = elbowBackSaddleResults.meanRadius * drawScale;
                    const tubeR = elbowBackSaddleResults.curveRadius * drawScale;
                    const branchR = elbowBackSaddleResults.branchRadius * drawScale;
                    const outerR = meanR + tubeR;
                    const innerR = Math.max(6, meanR - tubeR);
                    const branchCenter = { x: baseX + outerR - tubeR, y: baseY - outerR + tubeR };
                    const angleMarks = [0, 30, 60, 90, 120, 150, 180];

                    return (
                      <g>
                        <rect x="10" y="10" width="320" height="360" rx="12" fill="none" stroke="#1e293b" strokeWidth="1.2" />
                        <text x="170" y="28" textAnchor="middle" fill="#94a3b8" fontSize="11">Curva 90° com unha aplicada nas costas</text>

                        <path d={`M ${baseX} ${baseY - tubeR} A ${outerR} ${outerR} 0 0 1 ${baseX + outerR} ${baseY - outerR} A ${tubeR} ${tubeR} 0 0 1 ${baseX + meanR} ${baseY - meanR - tubeR} A ${innerR} ${innerR} 0 0 0 ${baseX} ${baseY + tubeR}`} fill="none" stroke="#ffffff" strokeWidth="1.6" />
                        <path d={`M ${baseX} ${baseY} A ${meanR} ${meanR} 0 0 1 ${baseX + meanR} ${baseY - meanR}`} fill="none" stroke="#64748b" strokeWidth="1.1" strokeDasharray="5 4" />
                        <path d={`M ${branchCenter.x - branchR} ${branchCenter.y + branchR} L ${branchCenter.x - branchR} ${branchCenter.y - branchR} A ${branchR} ${branchR} 0 0 1 ${branchCenter.x + branchR} ${branchCenter.y - branchR} L ${branchCenter.x + branchR} ${branchCenter.y + branchR}`} fill="none" stroke="#e2e8f0" strokeWidth="1.5" />

                        {elbowBackSaddleResults.points.slice(0, -1).map((point, index) => {
                          const angle = (point.thetaDeg * Math.PI) / 180;
                          const x = branchCenter.x + Math.cos(angle) * branchR;
                          return <line key={index} x1={x} y1={branchCenter.y - branchR} x2={x} y2={branchCenter.y + branchR} stroke="#94a3b8" strokeWidth="0.85" />;
                        })}

                        {angleMarks.map((deg) => {
                          const rad = ((deg - 90) * Math.PI) / 180;
                          const x = branchCenter.x + Math.cos(rad) * (branchR + 16);
                          const y = branchCenter.y + Math.sin(rad) * (branchR + 16);
                          return <text key={deg} x={x} y={y} fill="#fb923c" fontSize="10" fontWeight="bold" textAnchor="middle">{deg}°</text>;
                        })}

                        <line x1={baseX} y1={baseY + 18} x2={baseX + meanR} y2={baseY + 18} stroke="#fb923c" strokeWidth="2" />
                        <line x1={baseX} y1={baseY + 12} x2={baseX} y2={baseY + 24} stroke="#fb923c" strokeWidth="2" />
                        <line x1={baseX + meanR} y1={baseY + 12} x2={baseX + meanR} y2={baseY + 24} stroke="#fb923c" strokeWidth="2" />
                        <text x={baseX + (meanR / 2)} y={baseY + 14} textAnchor="middle" fill="#fb923c" fontSize="12" fontWeight="bold">{elbowBackSaddleResults.meanRadius.toFixed(1)}</text>

                        <line x1={baseX + meanR} y1={baseY + 18} x2={baseX + outerR} y2={baseY + 18} stroke="#60a5fa" strokeWidth="2" />
                        <line x1={baseX + outerR} y1={baseY + 12} x2={baseX + outerR} y2={baseY + 24} stroke="#60a5fa" strokeWidth="2" />
                        <text x={baseX + meanR + ((outerR - meanR) / 2)} y={baseY + 14} textAnchor="middle" fill="#60a5fa" fontSize="12" fontWeight="bold">{elbowBackSaddleResults.curveRadius.toFixed(1)}</text>

                        <line x1={branchCenter.x + branchR + 18} y1={branchCenter.y - branchR} x2={branchCenter.x + branchR + 18} y2={branchCenter.y + branchR} stroke="#4ade80" strokeWidth="2" />
                        <line x1={branchCenter.x + branchR + 12} y1={branchCenter.y - branchR} x2={branchCenter.x + branchR + 24} y2={branchCenter.y - branchR} stroke="#4ade80" strokeWidth="2" />
                        <line x1={branchCenter.x + branchR + 12} y1={branchCenter.y + branchR} x2={branchCenter.x + branchR + 24} y2={branchCenter.y + branchR} stroke="#4ade80" strokeWidth="2" />
                        <text x={branchCenter.x + branchR + 30} y={branchCenter.y} fill="#4ade80" fontSize="11" fontWeight="bold" transform={`rotate(-90 ${branchCenter.x + branchR + 30} ${branchCenter.y})`}>
                          Ø {elbowBackSaddleResults.branchDiameter.toFixed(1)}
                        </text>

                        <text x={204} y={70} fill="#ffffff" fontSize="11" fontWeight="bold">Raio médio</text>
                        <text x={baseX + outerR + 18} y={baseY - outerR + 20} fill="#ffffff" fontSize="11" fontWeight="bold">R {elbowBackSaddleResults.outerRadius.toFixed(1)}</text>
                        <text x={branchCenter.x - branchR - 12} y={branchCenter.y - branchR - 18} fill="#fb923c" fontSize="10" fontWeight="bold">0°</text>
                        <text x={branchCenter.x + branchR + 8} y={branchCenter.y - branchR - 18} fill="#fb923c" fontSize="10" fontWeight="bold">180°</text>
                        <text x="32" y="330" fill="#e2e8f0" fontSize="10" fontWeight="bold">Raio médio {elbowBackSaddleResults.meanRadius.toFixed(1)} mm</text>
                        <text x="32" y="346" fill="#94a3b8" fontSize="10">Nota: usar o diâmetro médio da unha para o desenvolvimento.</text>
                      </g>
                    );
                  })()}
                </svg>
              </div>

              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className="flex flex-wrap gap-3 mb-3 text-[11px] font-bold">
                    <span className="inline-flex items-center gap-2 text-blue-400"><span className="w-3 h-3 rounded-full bg-blue-400" /> Passo</span>
                    <span className="inline-flex items-center gap-2 text-orange-400"><span className="w-3 h-3 rounded-full bg-orange-400" /> Ordenadas</span>
                    <span className="inline-flex items-center gap-2 text-green-400"><span className="w-3 h-3 rounded-full bg-green-400" /> Desenvolvimento</span>
                    <span className="inline-flex items-center gap-2 text-white"><span className="w-3 h-3 rounded-full bg-white" /> Contorno</span>
                  </div>
                  <svg viewBox={`0 0 ${Math.max(760, elbowBackSaddleResults.development + 120)} 290`} className="w-full h-[320px]">
                    <text x="40" y="42" fill="#fbbf24" fontSize="16" fontWeight="bold">Planificação</text>
                    <text x="40" y="60" fill="#94a3b8" fontSize="11">Molde técnico para unha nas costas da curva 90°</text>
                    <line x1="40" y1="228" x2={40 + elbowBackSaddleResults.development} y2="228" stroke="#4ade80" strokeWidth="2.2" />
                    {elbowBackSaddleResults.points.map((point) => {
                      const x = 40 + point.x;
                      const y = 228 - point.ordinate;
                      return (
                        <g key={point.index}>
                          <line x1={x} y1="228" x2={x} y2={y} stroke="#fb923c" strokeWidth="1.1" />
                          <text x={x} y="246" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold">{point.index === elbowBackSaddleResults.divisions ? 1 : point.label}</text>
                        </g>
                      );
                    })}
                    <path d={`M ${elbowBackSaddleResults.points.map((point) => `${40 + point.x} ${228 - point.ordinate}`).join(' L ')}`} fill="none" stroke="#ffffff" strokeWidth="2.2" />

                    {[0, 30, 60, 90, 120, 150, 180].map((deg, index) => {
                      const x = 40 + ((elbowBackSaddleResults.development / 6) * index);
                      return <text key={deg} x={x} y="100" textAnchor="middle" fill="#fb923c" fontSize="10" fontWeight="bold">{deg}°</text>;
                    })}

                    <line x1="40" y1="90" x2={40 + elbowBackSaddleResults.stepWidth} y2="90" stroke="#60a5fa" strokeWidth="2" />
                    <line x1="40" y1="84" x2="40" y2="96" stroke="#60a5fa" strokeWidth="2" />
                    <line x1={40 + elbowBackSaddleResults.stepWidth} y1="84" x2={40 + elbowBackSaddleResults.stepWidth} y2="96" stroke="#60a5fa" strokeWidth="2" />
                    <text x={40 + (elbowBackSaddleResults.stepWidth / 2)} y="82" textAnchor="middle" fill="#60a5fa" fontSize="10" fontWeight="bold">
                      {elbowBackSaddleResults.stepWidth.toFixed(1)}
                    </text>

                    <line x1={40 + (elbowBackSaddleResults.development / 2)} y1="228" x2={40 + (elbowBackSaddleResults.development / 2)} y2={228 - elbowBackSaddleResults.centerOrdinate} stroke="#f472b6" strokeWidth="1.6" />
                    <text x={48 + (elbowBackSaddleResults.development / 2)} y={228 - (elbowBackSaddleResults.centerOrdinate / 2)} fill="#f472b6" fontSize="10" fontWeight="bold">
                      {elbowBackSaddleResults.centerOrdinate.toFixed(1)}
                    </text>
                    <text x="40" y="116" fill="#94a3b8" fontSize="10">Planificação</text>
                    <text x={40 + elbowBackSaddleResults.development - 4} y="116" textAnchor="end" fill="#94a3b8" fontSize="10">0° a 180°</text>

                    <text x={40 + (elbowBackSaddleResults.development / 2)} y="274" textAnchor="middle" fill="#4ade80" fontSize="11" fontWeight="bold">
                      Ø {elbowBackSaddleResults.branchDiameter.toFixed(1)} x pi ÷ {elbowBackSaddleResults.divisions} = {elbowBackSaddleResults.stepWidth.toFixed(1)}
                    </text>
                  </svg>

                  <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 h-3 w-3 shrink-0 rounded-full bg-blue-400" />
                      <div>
                        <p className="font-bold text-blue-400">Passo</p>
                        <p className="text-slate-400">Distância entre pegadas no desenvolvimento da unha.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 h-3 w-3 shrink-0 rounded-full bg-orange-400" />
                      <div>
                        <p className="font-bold text-orange-400">Ordenadas</p>
                        <p className="text-slate-400">Alturas que o tubista transfere para montar o gabarito.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 h-3 w-3 shrink-0 rounded-full bg-green-400" />
                      <div>
                        <p className="font-bold text-green-400">Desenvolvimento</p>
                        <p className="text-slate-400">Comprimento total da planificação em milímetros.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 h-3 w-3 shrink-0 rounded-full border border-slate-500 bg-white" />
                      <div>
                        <p className="font-bold text-white">Contorno do molde</p>
                        <p className="text-slate-400">Linha final para recortar e usar sobre a curva.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/50 rounded-xl border border-slate-800 p-4 mt-4">
              <h4 className="text-safety-yellow font-bold text-sm mb-3 flex items-center gap-2">
                <Info size={16} /> Memória de cálculo
              </h4>
              <div className="text-xs text-slate-300 space-y-3 font-mono">
                <div className="bg-slate-900 p-3 rounded border border-slate-700">
                  <p className="text-slate-400 mb-2">Modelo geométrico usado:</p>
                  <p className="text-white">Ordenada = R externo - √((R médio + √(r curva² - (sen θ × r unha)²))² - (R médio + cos θ × r unha)²)</p>
                </div>
                <p><strong className="text-blue-400">Passo:</strong> {elbowBackSaddleResults.branchDiameter.toFixed(1)} × pi ÷ {elbowBackSaddleResults.divisions} = <span className="text-blue-400 font-bold">{elbowBackSaddleResults.stepWidth.toFixed(1)} mm</span></p>
                <p><strong className="text-orange-400">Ordenada central:</strong> <span className="text-orange-400 font-bold">{elbowBackSaddleResults.centerOrdinate.toFixed(1)} mm</span></p>
                <p><strong className="text-white">Raio externo da curva:</strong> {elbowBackSaddleResults.meanRadius.toFixed(1)} + {elbowBackSaddleResults.curveRadius.toFixed(1)} = <span className="text-white font-bold">{elbowBackSaddleResults.outerRadius.toFixed(1)} mm</span></p>
                <p><strong className="text-green-400">Desenvolvimento total:</strong> {elbowBackSaddleResults.stepWidth.toFixed(1)} × {elbowBackSaddleResults.divisions} = <span className="text-green-400 font-bold">{elbowBackSaddleResults.development.toFixed(1)} mm</span></p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Printer size={18} className="text-safety-yellow" />
                Gabarito da Unha nas Costas da Curva
              </h3>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <div className="flex bg-slate-800 border border-slate-600 rounded-lg p-1">
                  <button type="button" onClick={() => setMoldPageOrientation('portrait')} className={`px-3 py-2 text-xs font-bold rounded ${moldPageOrientation === 'portrait' ? 'bg-blueprint-blue text-white' : 'text-slate-400'}`}>A4 Retrato</button>
                  <button type="button" onClick={() => setMoldPageOrientation('landscape')} className={`px-3 py-2 text-xs font-bold rounded ${moldPageOrientation === 'landscape' ? 'bg-blueprint-blue text-white' : 'text-slate-400'}`}>A4 Paisagem</button>
                </div>
                <button type="button" onClick={handlePrintElbowBackSaddle} className="inline-flex items-center justify-center gap-2 rounded-lg bg-safety-yellow px-4 py-2 text-sm font-bold text-slate-950 hover:bg-yellow-300 transition-colors">
                  <Printer size={16} />
                  Imprimir Molde em mm
                </button>
                <button type="button" onClick={() => { void handleExportElbowBackSaddlePdf(); }} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:border-slate-400 transition-colors">
                  <FileDown size={16} />
                  Exportar PDF
                </button>
              </div>
            </div>

            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 overflow-x-auto">
              <div className="min-w-[720px]">
                <svg viewBox={`0 0 ${Math.max(720, elbowBackSaddleResults.development + 80)} 250`} className="w-full h-[300px]">
                  <text x="40" y="42" fill="#fbbf24" fontSize="16" fontWeight="bold">Molde pronto para impressão</text>
                  <text x="40" y="60" fill="#94a3b8" fontSize="11">Imprimir em 100% e usar como gabarito sobre a curva</text>
                  <line x1="40" y1="210" x2={40 + elbowBackSaddleResults.development} y2="210" stroke="#4ade80" strokeWidth="2.4" />
                  {elbowBackSaddleResults.points.map((point) => {
                    const x = 40 + point.x;
                    const y = 210 - point.ordinate;
                    return (
                      <g key={point.index}>
                        <line x1={x} y1="210" x2={x} y2={y} stroke="#fb923c" strokeWidth="1.2" />
                        <text x={x} y="228" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold">{point.index === elbowBackSaddleResults.divisions ? 1 : point.label}</text>
                        <text x={x} y={y - 8} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">{point.ordinate.toFixed(1)}</text>
                      </g>
                    );
                  })}
                  <path d={`M ${elbowBackSaddleResults.points.map((point) => `${40 + point.x} ${210 - point.ordinate}`).join(' L ')}`} fill="none" stroke="#60a5fa" strokeWidth="2.5" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {type === 'CONCENTRIC_REDUCTION' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <CircleDashed size={20} className="text-safety-yellow" />
              Molde Redução Concêntrica no Tubo
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Diâmetro Maior (mm)</label>
                <input type="number" className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white font-bold outline-none" value={reducerLargeDiameter} onChange={e => setReducerLargeDiameter(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Diâmetro Menor (mm)</label>
                <input type="number" className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white font-bold outline-none" value={reducerSmallDiameter} onChange={e => setReducerSmallDiameter(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Comprimento da Redução (mm)</label>
                <input type="number" className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white font-bold outline-none" value={reducerLength} onChange={e => setReducerLength(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Divisões</label>
                <select className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white" value={reducerDivisions} onChange={e => setReducerDivisions(Number(e.target.value))}>
                  <option value={6}>6 Divisões</option>
                  <option value={8}>8 Divisões</option>
                  <option value={12}>12 Divisões</option>
                  <option value={16}>16 Divisões</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Altura Inclinada</span>
                <span className="text-xl font-black text-white">{concentricReductionResults.slantHeight.toFixed(1)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Passo Maior</span>
                <span className="text-xl font-black text-blue-400">{concentricReductionResults.largeStep.toFixed(1)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Passo Menor</span>
                <span className="text-xl font-black text-orange-400">{concentricReductionResults.smallStep.toFixed(1)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Desenvolvimento</span>
                <span className="text-xl font-black text-green-400">{concentricReductionResults.development.toFixed(1)} mm</span>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-4">
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4">
                <h4 className="text-slate-200 font-bold text-sm mb-3">Vista da Redução</h4>
                <svg viewBox="0 0 300 360" className="w-full h-[360px]">
                  {(() => {
                    const topWidth = 80;
                    const bottomWidth = 120;
                    const height = 112;
                    const originX = 150;
                    const topY = 44;
                    const bottomY = topY + height;
                    const leftTop = originX - (topWidth / 2);
                    const rightTop = originX + (topWidth / 2);
                    const leftBottom = originX - (bottomWidth / 2);
                    const rightBottom = originX + (bottomWidth / 2);
                    const ringCenterY = 258;
                    const outerR = 58;
                    const innerR = 34;
                    return (
                      <g>
                        <rect x="10" y="10" width="280" height="340" rx="12" fill="none" stroke="#1e293b" strokeWidth="1.2" />
                        <text x="150" y="28" textAnchor="middle" fill="#94a3b8" fontSize="11">Vista lateral</text>
                        <polygon points={`${leftTop},${topY} ${rightTop},${topY} ${rightBottom},${bottomY} ${leftBottom},${bottomY}`} fill="none" stroke="#ffffff" strokeWidth="1.6" />
                        <line x1={originX} y1={topY - 18} x2={originX} y2={bottomY + 24} stroke="#64748b" strokeWidth="1.1" strokeDasharray="5 4" />
                        {Array.from({ length: 3 }, (_, division) => {
                          const t = (division + 1) / 4;
                          return (
                            <line
                              key={division}
                              x1={leftTop + ((leftBottom - leftTop) * t)}
                              y1={topY}
                              x2={leftBottom + ((rightBottom - leftBottom) * t)}
                              y2={bottomY}
                              stroke="#94a3b8"
                              strokeWidth="0.8"
                            />
                          );
                        })}
                        <line x1={leftTop} y1={topY - 16} x2={rightTop} y2={topY - 16} stroke="#fb923c" strokeWidth="2" />
                        <line x1={leftTop} y1={topY - 22} x2={leftTop} y2={topY - 10} stroke="#fb923c" strokeWidth="2" />
                        <line x1={rightTop} y1={topY - 22} x2={rightTop} y2={topY - 10} stroke="#fb923c" strokeWidth="2" />
                        <line x1={leftBottom} y1={bottomY + 16} x2={originX} y2={bottomY + 16} stroke="#60a5fa" strokeWidth="2" />
                        <line x1={originX} y1={bottomY + 16} x2={rightBottom} y2={bottomY + 16} stroke="#60a5fa" strokeWidth="2" />
                        <line x1={leftBottom} y1={bottomY + 10} x2={leftBottom} y2={bottomY + 22} stroke="#60a5fa" strokeWidth="2" />
                        <line x1={originX} y1={bottomY + 10} x2={originX} y2={bottomY + 22} stroke="#60a5fa" strokeWidth="2" />
                        <line x1={rightBottom} y1={bottomY + 10} x2={rightBottom} y2={bottomY + 22} stroke="#60a5fa" strokeWidth="2" />
                        <line x1={leftBottom - 18} y1={topY} x2={leftBottom - 18} y2={bottomY} stroke="#4ade80" strokeWidth="2" />
                        <line x1={leftBottom - 24} y1={topY} x2={leftBottom - 12} y2={topY} stroke="#4ade80" strokeWidth="2" />
                        <line x1={leftBottom - 24} y1={bottomY} x2={leftBottom - 12} y2={bottomY} stroke="#4ade80" strokeWidth="2" />
                        <text x={originX} y={topY - 22} textAnchor="middle" fill="#fb923c" fontSize="12" fontWeight="bold">{concentricReductionResults.smallDiameter.toFixed(1)}</text>
                        <text x={(leftBottom + originX) / 2} y={bottomY + 14} textAnchor="middle" fill="#60a5fa" fontSize="11" fontWeight="bold">{(concentricReductionResults.largeDiameter / 2).toFixed(1)}</text>
                        <text x={(originX + rightBottom) / 2} y={bottomY + 14} textAnchor="middle" fill="#60a5fa" fontSize="11" fontWeight="bold">{(concentricReductionResults.largeDiameter / 2).toFixed(1)}</text>
                        <text x={leftBottom - 28} y={(topY + bottomY) / 2} textAnchor="middle" fill="#4ade80" fontSize="12" fontWeight="bold" transform={`rotate(-90 ${leftBottom - 28} ${(topY + bottomY) / 2})`}>
                          {concentricReductionResults.reductionLength.toFixed(1)}
                        </text>
                        <text x={184} y={196} fill="#e2e8f0" fontSize="12" fontWeight="bold">L {concentricReductionResults.slantHeight.toFixed(1)}</text>

                        <text x="150" y="220" textAnchor="middle" fill="#94a3b8" fontSize="11">Vista em planta</text>
                        <circle cx={originX} cy={ringCenterY} r={outerR} fill="none" stroke="#ffffff" strokeWidth="1.4" />
                        <circle cx={originX} cy={ringCenterY} r={innerR} fill="none" stroke="#ffffff" strokeWidth="1.4" />
                        <line x1={originX - outerR - 10} y1={ringCenterY} x2={originX + outerR + 10} y2={ringCenterY} stroke="#64748b" strokeWidth="1" strokeDasharray="5 4" />
                        <line x1={originX} y1={ringCenterY - outerR - 10} x2={originX} y2={ringCenterY + outerR + 10} stroke="#64748b" strokeWidth="1" strokeDasharray="5 4" />
                        {Array.from({ length: concentricReductionResults.divisions }, (_, division) => {
                          const angle = (division * 2 * Math.PI) / concentricReductionResults.divisions;
                          const x1 = originX + (Math.cos(angle) * innerR);
                          const y1 = ringCenterY + (Math.sin(angle) * innerR);
                          const x2 = originX + (Math.cos(angle) * outerR);
                          const y2 = ringCenterY + (Math.sin(angle) * outerR);
                          return <line key={division} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#cbd5e1" strokeWidth="1" />;
                        })}
                      </g>
                    );
                  })()}
                </svg>
              </div>

              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 overflow-x-auto">
                <div className="min-w-[720px]">
                  <div className="flex flex-wrap gap-3 mb-3 text-[11px] font-bold">
                    <span className="inline-flex items-center gap-2 text-blue-400"><span className="w-3 h-3 rounded-full bg-blue-400" /> Passo maior</span>
                    <span className="inline-flex items-center gap-2 text-orange-400"><span className="w-3 h-3 rounded-full bg-orange-400" /> Passo menor</span>
                    <span className="inline-flex items-center gap-2 text-green-400"><span className="w-3 h-3 rounded-full bg-green-400" /> Altura inclinada</span>
                  </div>
                  <svg viewBox={`0 0 ${Math.max(720, (concentricReductionResults.development / 2) + 120)} 260`} className="w-full h-[300px]">
                    <text x="40" y="46" fill="#fbbf24" fontSize="16" fontWeight="bold">Metade da planificação</text>
                    <text x="40" y="64" fill="#94a3b8" fontSize="11">Visual de montagem semelhante ao gabarito de oficina</text>
                    {concentricReductionResults.panels.slice(0, Math.ceil(concentricReductionResults.divisions / 2)).map((panel, displayIndex) => {
                      const x0 = 40 + (displayIndex * concentricReductionResults.largeStep);
                      const x1 = x0 + concentricReductionResults.largeStep;
                      const xt0 = x0 + concentricReductionResults.insetPerSide;
                      const xt1 = x1 - concentricReductionResults.insetPerSide;
                      const topY = 90;
                      const bottomY = topY + concentricReductionResults.slantHeight;
                      return (
                        <g key={panel.index}>
                          <polygon points={`${x0},${bottomY} ${x1},${bottomY} ${xt1},${topY} ${xt0},${topY}`} fill="none" stroke="#ffffff" strokeWidth="1.4" />
                          <line x1={(x0 + x1) / 2} y1={bottomY} x2={(xt0 + xt1) / 2} y2={topY} stroke="#64748b" strokeWidth="1" strokeDasharray="4 3" />
                        </g>
                      );
                    })}
                    <line x1="40" y1={90 + concentricReductionResults.slantHeight + 22} x2={40 + concentricReductionResults.largeStep} y2={90 + concentricReductionResults.slantHeight + 22} stroke="#60a5fa" strokeWidth="2" />
                    <line x1="40" y1={90 + concentricReductionResults.slantHeight + 16} x2="40" y2={90 + concentricReductionResults.slantHeight + 28} stroke="#60a5fa" strokeWidth="2" />
                    <line x1={40 + concentricReductionResults.largeStep} y1={90 + concentricReductionResults.slantHeight + 16} x2={40 + concentricReductionResults.largeStep} y2={90 + concentricReductionResults.slantHeight + 28} stroke="#60a5fa" strokeWidth="2" />
                    <text x={40 + (concentricReductionResults.largeStep / 2)} y={90 + concentricReductionResults.slantHeight + 18} textAnchor="middle" fill="#60a5fa" fontSize="10" fontWeight="bold">
                      {concentricReductionResults.largeStep.toFixed(1)}
                    </text>
                    <line x1={40 + concentricReductionResults.insetPerSide} y1="74" x2={40 + concentricReductionResults.insetPerSide + concentricReductionResults.smallStep} y2="74" stroke="#fb923c" strokeWidth="2" />
                    <line x1={40 + concentricReductionResults.insetPerSide} y1="68" x2={40 + concentricReductionResults.insetPerSide} y2="80" stroke="#fb923c" strokeWidth="2" />
                    <line x1={40 + concentricReductionResults.insetPerSide + concentricReductionResults.smallStep} y1="68" x2={40 + concentricReductionResults.insetPerSide + concentricReductionResults.smallStep} y2="80" stroke="#fb923c" strokeWidth="2" />
                    <text x={40 + concentricReductionResults.insetPerSide + (concentricReductionResults.smallStep / 2)} y="66" textAnchor="middle" fill="#fb923c" fontSize="10" fontWeight="bold">
                      {concentricReductionResults.smallStep.toFixed(1)}
                    </text>
                    <text x={40 + ((Math.ceil(concentricReductionResults.divisions / 2) * concentricReductionResults.largeStep) / 2)} y={90 + concentricReductionResults.slantHeight + 42} textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold">
                      Metade do desenvolvimento {((concentricReductionResults.development / 2)).toFixed(1)} mm
                    </text>
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/50 rounded-xl border border-slate-800 p-4 mt-4">
              <h4 className="text-safety-yellow font-bold text-sm mb-3 flex items-center gap-2">
                <Info size={16} /> Memória de cálculo
              </h4>
              <div className="text-xs text-slate-300 space-y-3 font-mono">
                <div className="bg-slate-900 p-3 rounded border border-slate-700">
                  <p className="text-slate-400 mb-2">Altura inclinada:</p>
                  <p className="text-white">L = √(comprimento da redução² + (R maior - R menor)²)</p>
                </div>
                <p><strong className="text-white">Como achar {concentricReductionResults.slantHeight.toFixed(1)}:</strong> √(({concentricReductionResults.reductionLength.toFixed(1)}² + ({concentricReductionResults.largeRadius.toFixed(1)} - {concentricReductionResults.smallRadius.toFixed(1)})²)) = <span className="text-white font-bold">{concentricReductionResults.slantHeight.toFixed(1)} mm</span></p>
                <p><strong className="text-blue-400">Passo maior:</strong> {concentricReductionResults.largeDiameter.toFixed(1)} × pi ÷ {concentricReductionResults.divisions} = <span className="text-blue-400 font-bold">{concentricReductionResults.largeStep.toFixed(1)} mm</span></p>
                <p><strong className="text-orange-400">Passo menor:</strong> {concentricReductionResults.smallDiameter.toFixed(1)} × pi ÷ {concentricReductionResults.divisions} = <span className="text-orange-400 font-bold">{concentricReductionResults.smallStep.toFixed(1)} mm</span></p>
                <p><strong className="text-green-400">Desenvolvimento total:</strong> {concentricReductionResults.largeStep.toFixed(1)} × {concentricReductionResults.divisions} = <span className="text-green-400 font-bold">{concentricReductionResults.development.toFixed(1)} mm</span></p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Printer size={18} className="text-safety-yellow" />
                Gabarito da Redução Concêntrica
              </h3>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <div className="flex bg-slate-800 border border-slate-600 rounded-lg p-1">
                  <button type="button" onClick={() => setMoldPageOrientation('portrait')} className={`px-3 py-2 text-xs font-bold rounded ${moldPageOrientation === 'portrait' ? 'bg-blueprint-blue text-white' : 'text-slate-400'}`}>A4 Retrato</button>
                  <button type="button" onClick={() => setMoldPageOrientation('landscape')} className={`px-3 py-2 text-xs font-bold rounded ${moldPageOrientation === 'landscape' ? 'bg-blueprint-blue text-white' : 'text-slate-400'}`}>A4 Paisagem</button>
                </div>
                <button type="button" onClick={handlePrintConcentricReduction} className="inline-flex items-center justify-center gap-2 rounded-lg bg-safety-yellow px-4 py-2 text-sm font-bold text-slate-950 hover:bg-yellow-300 transition-colors">
                  <Printer size={16} />
                  Imprimir Molde em mm
                </button>
                <button type="button" onClick={() => { void handleExportConcentricReductionPdf(); }} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:border-slate-400 transition-colors">
                  <FileDown size={16} />
                  Exportar PDF
                </button>
              </div>
            </div>

            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 overflow-x-auto">
              <div className="min-w-[720px]">
                <svg viewBox={`0 0 ${Math.max(720, concentricReductionResults.development + 80)} 240`} className="w-full h-[280px]">
                  <text x="40" y="42" fill="#fbbf24" fontSize="16" fontWeight="bold">Molde pronto para impressão</text>
                  <text x="40" y="60" fill="#94a3b8" fontSize="11">Imprimir em 100% para usar como gabarito de montagem</text>
                  {concentricReductionResults.panels.map((panel) => {
                    const x0 = 40 + panel.x;
                    const x1 = x0 + concentricReductionResults.largeStep;
                    const xt0 = x0 + concentricReductionResults.insetPerSide;
                    const xt1 = x1 - concentricReductionResults.insetPerSide;
                    const topY = 86;
                    const bottomY = topY + concentricReductionResults.slantHeight;
                    return (
                      <g key={panel.index}>
                        <polygon points={`${x0},${bottomY} ${x1},${bottomY} ${xt1},${topY} ${xt0},${topY}`} fill="none" stroke="#ffffff" strokeWidth="1.4" />
                        <line x1={(x0 + x1) / 2} y1={bottomY} x2={(xt0 + xt1) / 2} y2={topY} stroke="#64748b" strokeWidth="1" strokeDasharray="4 3" />
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {type === 'ECCENTRIC_REDUCTION' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <CircleDashed size={20} className="text-safety-yellow" />
              Molde Redução Excêntrica no Tubo
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Diâmetro Maior (mm)</label>
                <input type="number" className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white font-bold outline-none" value={eccentricLargeDiameter} onChange={e => setEccentricLargeDiameter(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Diâmetro Menor (mm)</label>
                <input type="number" className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white font-bold outline-none" value={eccentricSmallDiameter} onChange={e => setEccentricSmallDiameter(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Comprimento da Redução (mm)</label>
                <input type="number" className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white font-bold outline-none" value={eccentricLength} onChange={e => setEccentricLength(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Divisões</label>
                <select className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white" value={eccentricDivisions} onChange={e => setEccentricDivisions(Number(e.target.value))}>
                  <option value={6}>6 Divisões</option>
                  <option value={8}>8 Divisões</option>
                  <option value={12}>12 Divisões</option>
                  <option value={16}>16 Divisões</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Lado Reto</span>
                <span className="text-xl font-black text-white">{eccentricReductionResults.minTrueLength.toFixed(1)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Lado Aberto</span>
                <span className="text-xl font-black text-orange-400">{eccentricReductionResults.maxTrueLength.toFixed(1)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Passo</span>
                <span className="text-xl font-black text-blue-400">{eccentricReductionResults.stepWidth.toFixed(1)} mm</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="block text-[10px] uppercase text-slate-500">Desenvolvimento</span>
                <span className="text-xl font-black text-green-400">{eccentricReductionResults.development.toFixed(1)} mm</span>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-4">
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4">
                <h4 className="text-slate-200 font-bold text-sm mb-3">Vista da Redução Excêntrica</h4>
                <svg viewBox="0 0 320 360" className="w-full h-[360px]">
                  {(() => {
                    const topWidth = 78;
                    const bottomWidth = 138;
                    const bodyHeight = 124;
                    const bottomY = 164;
                    const topY = bottomY - bodyHeight;
                    const leftBottom = 64;
                    const rightBottom = leftBottom + bottomWidth;
                    const leftTop = leftBottom;
                    const rightTop = leftTop + topWidth;
                    const centerX = (leftBottom + rightBottom) / 2;
                    const ringCenterX = 160;
                    const ringCenterY = 266;
                    const outerRx = 74;
                    const outerRy = 46;
                    const innerRx = 50;
                    const innerRy = 28;
                    return (
                      <g>
                        <rect x="10" y="10" width="300" height="340" rx="12" fill="none" stroke="#1e293b" strokeWidth="1.2" />
                        <text x="160" y="28" textAnchor="middle" fill="#94a3b8" fontSize="11">Vista lateral com geratriz reta</text>
                        <polygon points={`${leftTop},${topY} ${rightTop},${topY} ${rightBottom},${bottomY} ${leftBottom},${bottomY}`} fill="none" stroke="#ffffff" strokeWidth="1.6" />
                        <line x1={leftTop} y1={topY - 20} x2={rightTop} y2={topY - 20} stroke="#fb923c" strokeWidth="2" />
                        <line x1={leftTop} y1={topY - 26} x2={leftTop} y2={topY - 14} stroke="#fb923c" strokeWidth="2" />
                        <line x1={rightTop} y1={topY - 26} x2={rightTop} y2={topY - 14} stroke="#fb923c" strokeWidth="2" />
                        <line x1={leftBottom} y1={bottomY + 18} x2={rightBottom} y2={bottomY + 18} stroke="#60a5fa" strokeWidth="2" />
                        <line x1={leftBottom} y1={bottomY + 12} x2={leftBottom} y2={bottomY + 24} stroke="#60a5fa" strokeWidth="2" />
                        <line x1={rightBottom} y1={bottomY + 12} x2={rightBottom} y2={bottomY + 24} stroke="#60a5fa" strokeWidth="2" />
                        <line x1={leftBottom - 18} y1={topY} x2={leftBottom - 18} y2={bottomY} stroke="#4ade80" strokeWidth="2" />
                        <line x1={leftBottom - 24} y1={topY} x2={leftBottom - 12} y2={topY} stroke="#4ade80" strokeWidth="2" />
                        <line x1={leftBottom - 24} y1={bottomY} x2={leftBottom - 12} y2={bottomY} stroke="#4ade80" strokeWidth="2" />
                        <line x1={leftBottom} y1={bottomY} x2={leftTop} y2={topY} stroke="#ffffff" strokeWidth="2.2" />
                        <line x1={rightBottom} y1={bottomY} x2={rightTop} y2={topY} stroke="#94a3b8" strokeWidth="1.4" />
                        <text x={(leftTop + rightTop) / 2} y={topY - 24} textAnchor="middle" fill="#fb923c" fontSize="12" fontWeight="bold">{eccentricReductionResults.smallDiameter.toFixed(1)}</text>
                        <text x={centerX} y={bottomY + 16} textAnchor="middle" fill="#60a5fa" fontSize="12" fontWeight="bold">{eccentricReductionResults.largeDiameter.toFixed(1)}</text>
                        <text x={leftBottom - 30} y={(topY + bottomY) / 2} textAnchor="middle" fill="#4ade80" fontSize="12" fontWeight="bold" transform={`rotate(-90 ${leftBottom - 30} ${(topY + bottomY) / 2})`}>
                          {eccentricReductionResults.reductionLength.toFixed(1)}
                        </text>
                        <text x={236} y={112} fill="#ffffff" fontSize="12" fontWeight="bold">Reta {eccentricReductionResults.minTrueLength.toFixed(1)}</text>
                        <text x={230} y={136} fill="#fb923c" fontSize="12" fontWeight="bold">Aberta {eccentricReductionResults.maxTrueLength.toFixed(1)}</text>

                        <text x="160" y="214" textAnchor="middle" fill="#94a3b8" fontSize="11">Vista em planta deslocada</text>
                        <ellipse cx={ringCenterX} cy={ringCenterY} rx={outerRx} ry={outerRy} fill="none" stroke="#ffffff" strokeWidth="1.4" />
                        <ellipse cx={ringCenterX - 24} cy={ringCenterY} rx={innerRx} ry={innerRy} fill="none" stroke="#fb923c" strokeWidth="1.4" />
                        <line x1={ringCenterX - outerRx - 8} y1={ringCenterY} x2={ringCenterX + outerRx + 8} y2={ringCenterY} stroke="#64748b" strokeWidth="1" strokeDasharray="5 4" />
                        <line x1={ringCenterX} y1={ringCenterY - outerRy - 12} x2={ringCenterX} y2={ringCenterY + outerRy + 12} stroke="#64748b" strokeWidth="1" strokeDasharray="5 4" />
                        <line x1={ringCenterX - 24} y1={ringCenterY - innerRy - 6} x2={ringCenterX - 24} y2={ringCenterY + innerRy + 6} stroke="#fb923c" strokeWidth="1" strokeDasharray="4 3" />
                        <line x1={ringCenterX - 24} y1={ringCenterY + outerRy + 18} x2={ringCenterX} y2={ringCenterY + outerRy + 18} stroke="#38bdf8" strokeWidth="2" />
                        <line x1={ringCenterX - 24} y1={ringCenterY + outerRy + 12} x2={ringCenterX - 24} y2={ringCenterY + outerRy + 24} stroke="#38bdf8" strokeWidth="2" />
                        <line x1={ringCenterX} y1={ringCenterY + outerRy + 12} x2={ringCenterX} y2={ringCenterY + outerRy + 24} stroke="#38bdf8" strokeWidth="2" />
                        <text x={ringCenterX - 12} y={ringCenterY + outerRy + 14} textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold">{eccentricReductionResults.centerOffset.toFixed(1)}</text>
                      </g>
                    );
                  })()}
                </svg>
              </div>

              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 overflow-x-auto">
                <div className="min-w-[720px]">
                  <div className="flex flex-wrap gap-3 mb-3 text-[11px] font-bold">
                    <span className="inline-flex items-center gap-2 text-blue-400"><span className="w-3 h-3 rounded-full bg-blue-400" /> Passo</span>
                    <span className="inline-flex items-center gap-2 text-orange-400"><span className="w-3 h-3 rounded-full bg-orange-400" /> Lado aberto</span>
                    <span className="inline-flex items-center gap-2 text-white"><span className="w-3 h-3 rounded-full bg-white" /> Lado reto</span>
                    <span className="inline-flex items-center gap-2 text-green-400"><span className="w-3 h-3 rounded-full bg-green-400" /> Desenvolvimento</span>
                  </div>
                  <svg viewBox={`0 0 ${Math.max(720, eccentricReductionResults.development + 100)} 280`} className="w-full h-[300px]">
                    <text x="40" y="42" fill="#fbbf24" fontSize="16" fontWeight="bold">Planificação da redução excêntrica</text>
                    <text x="40" y="60" fill="#94a3b8" fontSize="11">Curva superior acompanha a abertura; base reta segue o diâmetro maior</text>
                    <line x1="40" y1="228" x2={40 + eccentricReductionResults.development} y2="228" stroke="#4ade80" strokeWidth="2.2" />
                    {eccentricReductionResults.points.map((point) => {
                      const x = 40 + point.x;
                      const y = 228 - point.trueLength;
                      return (
                        <g key={point.index}>
                          <line x1={x} y1="228" x2={x} y2={y} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 3" />
                          <text x={x} y="246" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold">{point.index === eccentricReductionResults.divisions ? 1 : point.label}</text>
                        </g>
                      );
                    })}
                    <path d={`M ${eccentricReductionResults.points.map((point) => `${40 + point.x} ${228 - point.trueLength}`).join(' L ')}`} fill="none" stroke="#fb923c" strokeWidth="2.4" />
                    <text x={40 + (eccentricReductionResults.development / 2)} y="262" textAnchor="middle" fill="#4ade80" fontSize="11" fontWeight="bold">
                      Desenvolvimento {eccentricReductionResults.development.toFixed(1)} mm
                    </text>
                    <line x1="40" y1="94" x2={40 + eccentricReductionResults.stepWidth} y2="94" stroke="#60a5fa" strokeWidth="2" />
                    <line x1="40" y1="88" x2="40" y2="100" stroke="#60a5fa" strokeWidth="2" />
                    <line x1={40 + eccentricReductionResults.stepWidth} y1="88" x2={40 + eccentricReductionResults.stepWidth} y2="100" stroke="#60a5fa" strokeWidth="2" />
                    <text x={40 + (eccentricReductionResults.stepWidth / 2)} y="86" textAnchor="middle" fill="#60a5fa" fontSize="10" fontWeight="bold">
                      {eccentricReductionResults.stepWidth.toFixed(1)}
                    </text>
                    <text x="48" y={228 - eccentricReductionResults.minTrueLength - 8} fill="#ffffff" fontSize="10" fontWeight="bold">
                      Reta {eccentricReductionResults.minTrueLength.toFixed(1)}
                    </text>
                    <text x={40 + (eccentricReductionResults.development / 2)} y={228 - eccentricReductionResults.maxTrueLength - 8} textAnchor="middle" fill="#fb923c" fontSize="10" fontWeight="bold">
                      Aberta {eccentricReductionResults.maxTrueLength.toFixed(1)}
                    </text>
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/50 rounded-xl border border-slate-800 p-4 mt-4">
              <h4 className="text-safety-yellow font-bold text-sm mb-3 flex items-center gap-2">
                <Info size={16} /> Memória de cálculo
              </h4>
              <div className="text-xs text-slate-300 space-y-3 font-mono">
                <div className="bg-slate-900 p-3 rounded border border-slate-700">
                  <p className="text-slate-400 mb-2">Conceito usado no traçado:</p>
                  <p className="text-white">Cada divisão recebe um comprimento verdadeiro: Lt = √(comprimento² + afastamento radial²)</p>
                </div>
                <p><strong className="text-blue-400">Passo base:</strong> {eccentricReductionResults.largeDiameter.toFixed(1)} × pi ÷ {eccentricReductionResults.divisions} = <span className="text-blue-400 font-bold">{eccentricReductionResults.stepWidth.toFixed(1)} mm</span></p>
                <p><strong className="text-cyan-300">Deslocamento entre centros:</strong> R maior - R menor = <span className="text-cyan-300 font-bold">{eccentricReductionResults.centerOffset.toFixed(1)} mm</span></p>
                <p><strong className="text-white">Lado reto:</strong> quando a geratriz fica na mesma lateral, o molde mantém <span className="text-white font-bold">{eccentricReductionResults.minTrueLength.toFixed(1)} mm</span></p>
                <p><strong className="text-orange-400">Lado aberto:</strong> na face oposta, o comprimento verdadeiro sobe para <span className="text-orange-400 font-bold">{eccentricReductionResults.maxTrueLength.toFixed(1)} mm</span></p>
                <p><strong className="text-green-400">Desenvolvimento total:</strong> {eccentricReductionResults.stepWidth.toFixed(1)} × {eccentricReductionResults.divisions} = <span className="text-green-400 font-bold">{eccentricReductionResults.development.toFixed(1)} mm</span></p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Printer size={18} className="text-safety-yellow" />
                Gabarito da Redução Excêntrica
              </h3>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <div className="flex bg-slate-800 border border-slate-600 rounded-lg p-1">
                  <button type="button" onClick={() => setMoldPageOrientation('portrait')} className={`px-3 py-2 text-xs font-bold rounded ${moldPageOrientation === 'portrait' ? 'bg-blueprint-blue text-white' : 'text-slate-400'}`}>A4 Retrato</button>
                  <button type="button" onClick={() => setMoldPageOrientation('landscape')} className={`px-3 py-2 text-xs font-bold rounded ${moldPageOrientation === 'landscape' ? 'bg-blueprint-blue text-white' : 'text-slate-400'}`}>A4 Paisagem</button>
                </div>
                <button type="button" onClick={handlePrintEccentricReduction} className="inline-flex items-center justify-center gap-2 rounded-lg bg-safety-yellow px-4 py-2 text-sm font-bold text-slate-950 hover:bg-yellow-300 transition-colors">
                  <Printer size={16} />
                  Imprimir Molde em mm
                </button>
                <button type="button" onClick={() => { void handleExportEccentricReductionPdf(); }} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:border-slate-400 transition-colors">
                  <FileDown size={16} />
                  Exportar PDF
                </button>
              </div>
            </div>

            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 overflow-x-auto">
              <div className="min-w-[720px]">
                <svg viewBox={`0 0 ${Math.max(720, eccentricReductionResults.development + 80)} 260`} className="w-full h-[300px]">
                  <text x="40" y="42" fill="#fbbf24" fontSize="16" fontWeight="bold">Molde pronto para impressão</text>
                  <text x="40" y="60" fill="#94a3b8" fontSize="11">Imprimir em 100% e recortar o gabarito para transferir no tubo</text>
                  <line x1="40" y1="222" x2={40 + eccentricReductionResults.development} y2="222" stroke="#4ade80" strokeWidth="2.2" />
                  {eccentricReductionResults.points.map((point) => {
                    const x = 40 + point.x;
                    const y = 222 - point.trueLength;
                    return (
                      <g key={point.index}>
                        <line x1={x} y1="222" x2={x} y2={y} stroke="#fb923c" strokeWidth="1.1" />
                        <text x={x} y="240" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold">{point.index === eccentricReductionResults.divisions ? 1 : point.label}</text>
                        <text x={x} y={y - 8} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">{point.trueLength.toFixed(1)}</text>
                      </g>
                    );
                  })}
                  <path d={`M ${eccentricReductionResults.points.map((point) => `${40 + point.x} ${222 - point.trueLength}`).join(' L ')}`} fill="none" stroke="#60a5fa" strokeWidth="2.5" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FabricationCalc;
