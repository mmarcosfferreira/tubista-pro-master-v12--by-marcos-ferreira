import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Image as ImageIcon, Maximize, ZoomIn, ZoomOut, RotateCw, Trash2, ArrowLeft, Scan, Camera, Wand2 } from 'lucide-react';
import { get, set, del } from 'idb-keyval';

interface PhotoFrameProps {
    onClose: () => void;
    onGenerate3D?: (imageSrc: string) => void;
}

interface SavedImage {
    id: string;
    src: string; // Base64 or Object URL
    name: string;
}

const STORAGE_KEY = 'photo-frame-images';
const STORAGE_INDEX_KEY = 'photo-frame-index'; // índice com IDs para carregamento rápido

const PhotoFrame: React.FC<PhotoFrameProps> = ({ onClose, onGenerate3D }) => {
    const [images, setImages] = useState<SavedImage[]>([]);
    const [selectedImage, setSelectedImage] = useState<SavedImage | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Viewer State
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [imageToDelete, setImageToDelete] = useState<string | null>(null);
    
    // Scanner State
    const [isScannerActive, setIsScannerActive] = useState(false);
    const [scanMode, setScanMode] = useState<'color' | 'scan'>('color');
    const [scannerError, setScannerError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    // Multi-touch state
    const activePointers = useRef<Map<number, { x: number, y: number }>>(new Map());
    const initialPinchDist = useRef<number | null>(null);
    const initialPinchScale = useRef<number>(1);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const captureInputRef = useRef<HTMLInputElement>(null); // fallback: câmera nativa sem HTTPS

    // Carrega imagens do IndexedDB (chaves individuais, tolerante a falhas)
    useEffect(() => {
        const loadImages = async () => {
            try {
                // Tenta carregar o índice primeiro
                const index = await get<string[]>(STORAGE_INDEX_KEY);
                if (index && index.length > 0) {
                    const loaded: SavedImage[] = [];
                    for (const id of index) {
                        try {
                            const img = await get<SavedImage>(`${STORAGE_KEY}:${id}`);
                            if (img && img.src && img.src.startsWith('data:')) {
                                loaded.push(img);
                            } else {
                                console.warn('Imagem ignorada (dados inválidos):', id);
                            }
                        } catch {
                            console.warn('Falha ao carregar imagem individual:', id);
                        }
                    }
                    setImages(loaded);
                } else {
                    // Fallback: tenta carregar formato antigo (array único)
                    const legacy = await get<SavedImage[]>(STORAGE_KEY);
                    if (legacy && Array.isArray(legacy) && legacy.length > 0) {
                        const valid = legacy.filter(img => img && img.src && img.src.startsWith('data:'));
                        setImages(valid);
                        // Migra para o novo formato
                        await migrateToIndividualKeys(valid);
                    }
                }
            } catch (error) {
                console.error('Falha ao carregar imagens:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadImages();
    }, []);

    // Migra do formato antigo (array único) para chaves individuais
    const migrateToIndividualKeys = async (imgs: SavedImage[]) => {
        try {
            const ids: string[] = [];
            for (const img of imgs) {
                try {
                    await set(`${STORAGE_KEY}:${img.id}`, img);
                    ids.push(img.id);
                } catch { /* pula imagens que não cabem */ }
            }
            await set(STORAGE_INDEX_KEY, ids);
            try { await del(STORAGE_KEY); } catch { /* ok */ }
        } catch { /* migração é best-effort */ }
    };

    // Salva cada imagem individualmente (evita corromper tudo de uma vez)
    const saveImagesToDB = async (newImages: SavedImage[]) => {
        const ids: string[] = [];
        let errors = 0;
        for (const img of newImages) {
            try {
                await set(`${STORAGE_KEY}:${img.id}`, img);
                ids.push(img.id);
            } catch {
                errors++;
                console.warn('Falha ao salvar imagem (quota excedida?):', img.name);
            }
        }
        try {
            await set(STORAGE_INDEX_KEY, ids);
        } catch {
            console.warn('Falha ao salvar índice da galeria.');
        }
        if (errors > 0) {
            alert(`${errors} imagem(ns) não puderam ser salvas. O armazenamento do navegador pode estar cheio. Tente limpar algumas imagens antigas.`);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsLoading(true);
        const newImages: SavedImage[] = [];
        let errors = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const base64 = await processImageFile(file);
                newImages.push({
                    id: Date.now().toString() + '-' + i,
                    src: base64,
                    name: file.name || `Imagem ${i + 1}`
                });
            } catch (error) {
                console.error("Error processing file", file.name, error);
                errors++;
            }
        }

        if (errors > 0) {
            alert(`Não foi possível carregar ${errors} imagem(ns). Tente baixar a foto para o dispositivo antes de selecionar.`);
        }

        if (newImages.length > 0) {
            const updatedImages = [...images, ...newImages];
            setImages(updatedImages);
            await saveImagesToDB(updatedImages);
        }
        
        setIsLoading(false);
        
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const processImageFile = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Redução agressiva para caber no IndexedDB (1280px máximo)
                    const MAX_SIZE = 1280;
                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height = Math.round(height * (MAX_SIZE / width));
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width = Math.round(width * (MAX_SIZE / height));
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        // Fallback: tenta comprimir via canvas mínimo
                        const fallbackCanvas = document.createElement('canvas');
                        fallbackCanvas.width = Math.min(img.width, 800);
                        fallbackCanvas.height = Math.min(img.height, 800);
                        const fbCtx = fallbackCanvas.getContext('2d');
                        if (!fbCtx) {
                            reject(new Error('Canvas indisponível para processar imagem.'));
                            return;
                        }
                        fbCtx.fillStyle = '#FFFFFF';
                        fbCtx.fillRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);
                        fbCtx.drawImage(img, 0, 0, fallbackCanvas.width, fallbackCanvas.height);
                        resolve(fallbackCanvas.toDataURL('image/jpeg', 0.55));
                        return;
                    }

                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);

                    // JPEG qualidade 0.65 = bom equilíbrio entre qualidade e tamanho
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
                    resolve(dataUrl);
                };
                img.onerror = () => reject(new Error('Falha ao carregar dados da imagem.'));
                img.src = e.target?.result as string;
            };
            reader.onerror = () => reject(new Error('Falha ao ler arquivo.'));
            reader.readAsDataURL(file);
        });
    };

    const handleDeleteImage = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setImageToDelete(id);
    };

    const confirmDelete = async () => {
        if (!imageToDelete) return;
        const updatedImages = images.filter(img => img.id !== imageToDelete);
        setImages(updatedImages);
        // Remove do IndexedDB (chave individual)
        try {
            await del(`${STORAGE_KEY}:${imageToDelete}`);
        } catch { /* ok */ }
        // Atualiza índice
        await saveImagesToDB(updatedImages);
        if (selectedImage?.id === imageToDelete) {
            closeViewer();
        }
        setImageToDelete(null);
    };

    const cancelDelete = () => {
        setImageToDelete(null);
    };

    const openViewer = (image: SavedImage) => {
        setSelectedImage(image);
        setScale(1);
        setRotation(0);
        setPan({ x: 0, y: 0 });
    };

    const closeViewer = () => {
        setSelectedImage(null);
    };

    // Viewer Handlers
    const handlePointerDown = (e: React.PointerEvent) => {
        activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (activePointers.current.size === 1) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        } else if (activePointers.current.size === 2) {
            setIsDragging(false); // Stop panning when pinching
            const pts = Array.from(activePointers.current.values());
            const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            initialPinchDist.current = dist;
            initialPinchScale.current = scale;
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!activePointers.current.has(e.pointerId)) return;
        
        activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (activePointers.current.size === 1 && isDragging) {
            setPan({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        } else if (activePointers.current.size === 2) {
            const pts = Array.from(activePointers.current.values());
            const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            
            if (initialPinchDist.current) {
                const newScale = initialPinchScale.current * (dist / initialPinchDist.current);
                setScale(Math.min(Math.max(newScale, 0.2), 10));
            }
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        activePointers.current.delete(e.pointerId);
        
        if (activePointers.current.size < 2) {
            initialPinchDist.current = null;
        }
        
        if (activePointers.current.size === 1) {
            // Resume dragging with the remaining pointer
            const remainingPointer = Array.from(activePointers.current.values())[0];
            setIsDragging(true);
            setDragStart({ x: remainingPointer.x - pan.x, y: remainingPointer.y - pan.y });
        } else if (activePointers.current.size === 0) {
            setIsDragging(false);
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;
        setScale(s => Math.min(Math.max(s * (1 + delta), 0.2), 10));
    };

    const handleZoomIn = () => setScale(s => Math.min(s + 0.5, 10));
    const handleZoomOut = () => setScale(s => Math.max(s - 0.5, 0.2));
    const handleRotate = () => setRotation(r => (r + 90) % 360);
    const handleReset = () => {
        setScale(1);
        setRotation(0);
        setPan({ x: 0, y: 0 });
    };

    // --- SCANNER LOGIC ---
    const toggleScanner = async () => {
        if (isScannerActive) {
            stopScanner();
        } else {
            await startScanner();
        }
    };

    const startScanner = async () => {
        setScannerError(null);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
            setStream(mediaStream);
            setIsScannerActive(true);

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err: any) {
            console.error("Error accessing camera:", err);
            const msg =
                err.name === 'NotAllowedError'
                    ? 'Permissão da câmera negada. 📱 iPhone: Ajustes > Safari > Câmera. 📱 Android: Configurações > Apps > Navegador > Permissões > Câmera.'
                    : err.name === 'NotFoundError'
                    ? 'Nenhuma câmera encontrada no dispositivo.'
                    : err.name === 'NotReadableError'
                    ? 'A câmera está sendo usada por outro aplicativo.'
                    : 'Câmera indisponível (requer HTTPS ou localhost).';
            setScannerError(msg);
            // Fallback: abre câmera nativa do celular (funciona sem HTTPS)
            captureInputRef.current?.click();
        }
    };

    const stopScanner = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setIsScannerActive(false);
        setScannerError(null);
    };

    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    const captureScan = async () => {
        if (!videoRef.current) return;
        
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        if (scanMode === 'scan') {
            ctx.filter = 'grayscale(100%) contrast(150%) brightness(110%)';
        }
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        
        const newImage: SavedImage = {
            id: Date.now().toString(),
            src: base64,
            name: `Foto ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`
        };
        
        const updatedImages = [...images, newImage];
        setImages(updatedImages);
        await saveImagesToDB(updatedImages);
        
        // Visual feedback (flash)
        const flashEl = document.getElementById('scanner-flash');
        if (flashEl) {
            flashEl.style.opacity = '1';
            setTimeout(() => {
                flashEl.style.opacity = '0';
            }, 150);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col">
            {/* Header */}
            <div className="p-4 flex justify-between items-center bg-zinc-900/80 border-b border-zinc-800 shrink-0">
                <div className="flex items-center gap-4">
                    {selectedImage ? (
                        <button onClick={closeViewer} className="p-2 bg-zinc-800 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors">
                            <ArrowLeft size={24} />
                        </button>
                    ) : (
                        <ImageIcon className="text-pink-400" size={28} />
                    )}
                    <h2 className="text-white font-bold text-xl truncate max-w-[200px] sm:max-w-md">
                        {selectedImage ? selectedImage.name : "Galeria de Fórmulas"}
                    </h2>
                </div>
                
                <div className="flex items-center gap-3">
                    {!selectedImage && (
                        <>
                            <button 
                                onClick={toggleScanner}
                                className={`px-3 sm:px-4 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-transform active:scale-95 text-sm sm:text-base ${isScannerActive ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-emerald-400'}`}
                                title="Digitalizar Desenho"
                            >
                                <Scan size={20} />
                                <span className="hidden sm:inline">{isScannerActive ? 'Scanner Ativo' : 'Escanear'}</span>
                            </button>
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-pink-600 hover:bg-pink-500 text-white px-3 sm:px-4 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-transform active:scale-95 text-sm sm:text-base"
                            >
                                <Upload size={20} />
                                <span className="hidden sm:inline">Adicionar</span>
                            </button>
                        </>
                    )}
                    <button onClick={() => { stopScanner(); onClose(); }} className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white hover:bg-red-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 w-full relative overflow-hidden flex flex-col">
                {isScannerActive ? (
                    // --- SCANNER VIEW ---
                    <div className="flex-1 relative bg-black flex flex-col items-center justify-center">
                        {/* Scanner Error Banner */}
                        {scannerError && (
                            <div className="absolute top-4 left-4 right-4 z-30 bg-red-900/95 border border-red-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-sm">
                                <div className="flex items-start gap-3">
                                    <span className="text-lg">⚠️</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-red-200 text-sm font-bold mb-1">Câmera Indisponível</p>
                                        <p className="text-red-300 text-xs leading-relaxed">{scannerError}</p>
                                        <p className="text-red-400 text-[10px] mt-2">A câmera nativa do celular foi acionada como alternativa.</p>
                                    </div>
                                    <button onClick={() => setScannerError(null)} className="text-red-300 hover:text-white shrink-0">
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>
                        )}

                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />

                        {/* Scanner Overlay UI */}
                        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-8">
                            <div className="w-full max-w-md aspect-[3/4] border-2 border-emerald-500/50 rounded-xl relative">
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-lg"></div>
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-lg"></div>
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-lg"></div>
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-lg"></div>
                            </div>
                        </div>

                        {/* Flash Effect */}
                        <div id="scanner-flash" className="absolute inset-0 bg-white opacity-0 pointer-events-none transition-opacity duration-150"></div>

                        {/* Controls */}
                        <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-4 pb-safe">
                            <div className="flex bg-zinc-900/80 backdrop-blur-md rounded-full p-1 border border-zinc-700">
                                <button 
                                    onClick={() => setScanMode('color')}
                                    className={`px-6 py-2 rounded-full font-bold transition-all ${scanMode === 'color' ? 'bg-pink-600 text-white' : 'text-zinc-400'}`}
                                >
                                    Cor
                                </button>
                                <button 
                                    onClick={() => setScanMode('scan')}
                                    className={`px-6 py-2 rounded-full font-bold transition-all ${scanMode === 'scan' ? 'bg-emerald-600 text-white' : 'text-zinc-400'}`}
                                >
                                    Escaneado
                                </button>
                            </div>
                            
                            <button 
                                onClick={captureScan}
                                className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform"
                            >
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-zinc-900">
                                    <Camera size={32} />
                                </div>
                            </button>
                        </div>
                    </div>
                ) : isLoading && !selectedImage ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
                    </div>
                ) : selectedImage ? (
                    // --- FULLSCREEN VIEWER ---
                    <>
                        <div 
                            className="flex-1 w-full h-full relative flex items-center justify-center cursor-move touch-none"
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerUp}
                            onPointerCancel={handlePointerUp}
                            onWheel={handleWheel}
                        >
                            <img 
                                src={selectedImage.src} 
                                alt={selectedImage.name} 
                                className="max-w-none transition-transform duration-100 ease-out"
                                style={{
                                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale}) rotate(${rotation}deg)`,
                                    pointerEvents: 'none'
                                }}
                                draggable={false}
                            />
                        </div>
                        
                        {/* Controls Overlay */}
                        <div 
                            className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900/90 backdrop-blur-md border border-zinc-700 p-2 sm:p-3 rounded-2xl shadow-2xl flex items-center gap-2 sm:gap-4 z-10"
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            <button onClick={handleZoomOut} className="p-2 sm:p-3 bg-zinc-800 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-700 active:scale-95 transition-all">
                                <ZoomOut size={24} />
                            </button>
                            <button onClick={handleReset} className="p-2 sm:p-3 bg-zinc-800 rounded-xl text-blue-400 hover:text-blue-300 hover:bg-zinc-700 active:scale-95 transition-all" title="Ajustar à Tela">
                                <Maximize size={24} />
                            </button>
                            <button onClick={handleZoomIn} className="p-2 sm:p-3 bg-zinc-800 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-700 active:scale-95 transition-all">
                                <ZoomIn size={24} />
                            </button>
                            <div className="w-px h-8 bg-zinc-700 mx-1 sm:mx-2"></div>
                            <button onClick={handleRotate} className="p-2 sm:p-3 bg-zinc-800 rounded-xl text-orange-400 hover:text-orange-300 hover:bg-zinc-700 active:scale-95 transition-all">
                                <RotateCw size={24} />
                            </button>
                            <div className="w-px h-8 bg-zinc-700 mx-1 sm:mx-2"></div>
                            {onGenerate3D && (
                                <>
                                    <button 
                                        onClick={() => onGenerate3D(selectedImage.src)} 
                                        className="p-2 sm:p-3 bg-purple-600 hover:bg-purple-500 rounded-xl text-white active:scale-95 transition-all flex items-center gap-2"
                                        title="Gerar 3D com IA"
                                    >
                                        <Wand2 size={24} />
                                        <span className="hidden sm:inline font-bold text-sm">Gerar 3D</span>
                                    </button>
                                    <div className="w-px h-8 bg-zinc-700 mx-1 sm:mx-2"></div>
                                </>
                            )}
                            <button onClick={(e) => handleDeleteImage(e, selectedImage.id)} className="p-2 sm:p-3 bg-red-900/50 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-800 active:scale-95 transition-all">
                                <Trash2 size={24} />
                            </button>
                        </div>
                    </>
                ) : (
                    // --- GALLERY VIEW ---
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                        {/* Scanner Error Banner */}
                        {scannerError && (
                            <div className="mb-4 bg-red-900/95 border border-red-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-sm">
                                <div className="flex items-start gap-3">
                                    <span className="text-lg">⚠️</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-red-200 text-sm font-bold mb-1">Câmera Indisponível</p>
                                        <p className="text-red-300 text-xs leading-relaxed">{scannerError}</p>
                                        <p className="text-red-400 text-[10px] mt-2">A câmera nativa do celular foi acionada como alternativa.</p>
                                    </div>
                                    <button onClick={() => setScannerError(null)} className="text-red-300 hover:text-white shrink-0">
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {images.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-dashed border-zinc-600">
                                    <ImageIcon size={40} className="text-zinc-500" />
                                </div>
                                <h3 className="text-xl font-bold text-zinc-300 mb-2">Sua Galeria está Vazia</h3>
                                <p className="text-zinc-500 max-w-sm mb-8">
                                    Importe prints, fórmulas e tabelas para ter acesso rápido durante o trabalho.
                                </p>
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="bg-pink-600 hover:bg-pink-500 text-white px-8 py-4 rounded-xl font-bold shadow-lg flex items-center gap-3 transition-transform active:scale-95"
                                >
                                    <Upload size={24} />
                                    Importar Imagens
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {images.map(img => (
                                    <div 
                                        key={img.id} 
                                        className="group relative aspect-square bg-zinc-800 rounded-xl overflow-hidden cursor-pointer border border-zinc-700 hover:border-pink-500 transition-colors"
                                        onClick={() => openViewer(img)}
                                    >
                                        <img 
                                            src={img.src} 
                                            alt={img.name} 
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                            <Maximize size={32} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                                        </div>
                                        <button 
                                            onClick={(e) => handleDeleteImage(e, img.id)}
                                            className="absolute top-2 right-2 p-2 bg-black/60 rounded-lg text-zinc-300 hover:text-red-400 hover:bg-black/80 sm:opacity-0 sm:group-hover:opacity-100 transition-all z-10"
                                            title="Excluir"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                                            <p className="text-xs text-white truncate drop-shadow-md">{img.name}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Input oculto: câmera nativa (capture) — funciona sem HTTPS */}
            <input
                type="file"
                ref={captureInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                capture="environment"
                className="hidden"
            />

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                multiple
                className="hidden"
            />

            {/* Delete Confirmation Modal */}
            {imageToDelete && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-2">Excluir Imagem</h3>
                        <p className="text-zinc-400 mb-6">Tem certeza que deseja excluir esta imagem da sua galeria? Esta ação não pode ser desfeita.</p>
                        <div className="flex gap-3 justify-end">
                            <button 
                                onClick={cancelDelete}
                                className="px-4 py-2 rounded-xl font-bold text-zinc-300 hover:bg-zinc-800 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-lg transition-colors"
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PhotoFrame;
