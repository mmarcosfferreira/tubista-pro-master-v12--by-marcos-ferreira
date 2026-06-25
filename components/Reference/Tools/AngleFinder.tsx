import React, { useEffect, useState, useRef } from 'react';
import { Camera, RefreshCw } from 'lucide-react';

const AngleFinder: React.FC = () => {
  const [angle, setAngle] = useState<number>(0);
  const [active, setActive] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setActive(true);
    } catch (err) {
      console.error("Camera error", err);
      alert("Não foi possível acessar a câmera.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setActive(false);
  };

  const handleOrientation = (event: DeviceOrientationEvent) => {
    // Beta represents the front-to-back tilt in degrees, where front is positive
    if (event.beta !== null) {
        setAngle(event.beta);
    }
  };

  const requestOrientation = async () => {
    // iOS 13+ requires permission
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          setHasPermission(true);
          window.addEventListener('deviceorientation', handleOrientation);
          startCamera();
        } else {
          setHasPermission(false);
          alert("Permissão de sensores negada.");
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      // Non-iOS or older devices
      setHasPermission(true);
      window.addEventListener('deviceorientation', handleOrientation);
      startCamera();
    }
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      stopCamera();
    };
  }, []);

  const cleanAngle = Math.round(angle);
  const isLevel = Math.abs(cleanAngle) < 2 || Math.abs(Math.abs(cleanAngle) - 90) < 2 || Math.abs(Math.abs(cleanAngle) - 45) < 2;

  return (
    <div className="flex flex-col h-full bg-slate-950 p-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white mb-2">Inclinômetro Digital</h2>
        <p className="text-slate-400 text-sm">Use a câmera e sensores para verificar ângulos de tubulação.</p>
      </div>

      <div className="relative flex-1 bg-black rounded-xl overflow-hidden border-2 border-slate-700 flex items-center justify-center">
        {active ? (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
        ) : (
          <div className="text-center p-6">
            <Camera className="mx-auto mb-4 text-slate-600" size={48} />
            <button 
              onClick={requestOrientation}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold"
            >
              Ativar Câmera e Sensores
            </button>
          </div>
        )}

        {/* Overlay UI */}
        {active && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            {/* Crosshair */}
            <div className="absolute w-full h-[1px] bg-red-500/50"></div>
            <div className="absolute h-full w-[1px] bg-red-500/50"></div>
            
            {/* Protractor Graphic */}
            <div 
                className={`relative w-64 h-64 border-4 rounded-full flex items-center justify-center transition-colors duration-300 ${isLevel ? 'border-green-500 bg-green-500/10' : 'border-white bg-black/20'}`}
                style={{ transform: `rotate(${-angle}deg)` }}
            >
                 <div className="absolute w-full h-[1px] bg-white/30"></div>
                 <div className="absolute w-1 h-4 bg-white top-0"></div>
                 <div className="absolute w-1 h-4 bg-white bottom-0"></div>
                 <div className="absolute w-4 h-1 bg-white left-0"></div>
                 <div className="absolute w-4 h-1 bg-white right-0"></div>
            </div>

            {/* Readout */}
            <div className="absolute bottom-10 bg-black/80 px-6 py-4 rounded-xl border border-slate-600 backdrop-blur-md">
               <span className={`text-4xl font-mono font-black ${isLevel ? 'text-green-400' : 'text-white'}`}>
                 {cleanAngle}°
               </span>
            </div>
            
             <button 
                onClick={stopCamera} 
                className="absolute top-4 right-4 pointer-events-auto p-2 bg-slate-800 rounded-full"
            >
                <RefreshCw size={20} className="text-white"/>
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-slate-500">
         <div className="bg-slate-900 p-2 rounded">0° = Nível</div>
         <div className="bg-slate-900 p-2 rounded">90° = Prumo</div>
         <div className="bg-slate-900 p-2 rounded">45° = Diagonal</div>
      </div>
    </div>
  );
};

export default AngleFinder;