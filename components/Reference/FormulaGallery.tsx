import React, { useEffect, useState } from 'react';
import { Search, Image as ImageIcon, Maximize2, X, Upload, FileText, FileBadge2, Trash2, Camera, ClipboardPaste } from 'lucide-react';
import { db } from '../../firebase';
import { ref, push, onValue, remove, set } from 'firebase/database';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Formatos de imagem suportados (MIME types + extensões)
const SUPPORTED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/bmp',
  'image/gif',
  'image/tiff',
  'image/heic',
  'image/heif',
  'image/svg+xml',
  'image/avif',
];

const SUPPORTED_IMAGE_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif',
  '.tiff', '.tif', '.heic', '.heif', '.svg', '.avif',
];

const SUPPORTED_FORMATS_LABEL = 'JPG, PNG, WebP, BMP, GIF, TIFF, HEIC, SVG, AVIF';

// Valida se um arquivo é imagem suportada (verifica MIME type e extensão)
const isSupportedImage = (file: File): boolean => {
  const mimeOk = SUPPORTED_IMAGE_MIME_TYPES.includes(file.type);
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  const extOk = SUPPORTED_IMAGE_EXTENSIONS.includes(ext);
  return mimeOk || extOk;
};

const isSupportedPdf = (file: File): boolean => {
  if (file.type === 'application/pdf') return true;
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  return ext === '.pdf';
};

const isSupportedFile = (file: File): boolean => {
  return isSupportedImage(file) || isSupportedPdf(file);
};

interface FormulaItem {
  id: string;
  title: string;
  description: string;
  category: string;
  url: string; // This will hold the Base64 string
  type: 'image' | 'pdf';
  page?: string;
  isUpload?: boolean;
  thumbnailUrl?: string;
}

const FORMULAS: FormulaItem[] = [
  { id: '1', title: "Seno", description: "Cateto oposto ao ângulo sobre hipotenusa. Ex: 50 ÷ 100 = 0.5 sin⁻¹ = 30°", category: "Trigonometria", url: '', type: 'image', page: '01' },
  { id: '2', title: "Cosseno", description: "Cateto adjacente ao ângulo sobre hipotenusa. Ex: 50 ÷ 100 = 0.5 cos⁻¹ = 60°", category: "Trigonometria", url: '', type: 'image', page: '02' },
  { id: '3', title: "Tangente", description: "Cateto Oposto ao ângulo sobre Cateto adjacente. Ex: 50 ÷ 100 = 0.5 tan⁻¹ = 26.5°", category: "Trigonometria", url: '', type: 'image', page: '03' },
  { id: '4', title: "Furação de Flange", description: "Cálculo para furação de flange. Ex: 120 x sen (180 ÷ 5) = 70.5", category: "Caldeiraria", url: '', type: 'image', page: '04' },
  { id: '5', title: "Raio e Arco entre 3 pontos", description: "Cálculo de raio e arco entre 3 pontos quaisquer.", category: "Geometria", url: '', type: 'image', page: '05' },
  { id: '6', title: "Desenvolvimento de pontos aleatórios", description: "Comandos para calculadora casio fx 82 MS.", category: "Cálculos", url: '', type: 'image', page: '06' },
  { id: '7', title: "Chapéu Chinês", description: "Cálculo de ângulo da cunha e corda para chapéu chinês.", category: "Caldeiraria", url: '', type: 'image', page: '07' },
  { id: '8', title: "Serpentina em Gomos", description: "Cálculo de serpentina em gomos.", category: "Caldeiraria", url: '', type: 'image', page: '08' },
  { id: '9', title: "Grau Hipotenusa e Arco", description: "Cálculo de grau, hipotenusa e arco.", category: "Trigonometria", url: '', type: 'image', page: '09' },
  { id: '10', title: "Raio de Curva Padrão 90°", description: "Constante 38.1 para todas as curvas de raio padrão.", category: "Tubulação", url: '', type: 'image', page: '10' },
  { id: '11', title: "Raio de Curva em Qualquer Grau", description: "Cálculo de raio de curva em qualquer grau.", category: "Tubulação", url: '', type: 'image', page: '11' },
  { id: '12', title: "Tirar Grau em Curva de 90°", description: "Cálculo para tirar grau em curva de 90°.", category: "Tubulação", url: '', type: 'image', page: '12' },
  { id: '13', title: "Curva de Gomos 90°", description: "Cálculo e planificação de curva de gomos 90°.", category: "Caldeiraria", url: '', type: 'image', page: '13' },
  { id: '14', title: "Boca de Lobo 90° Ø Iguais", description: "Cálculo e planificação de boca de lobo 90° com diâmetros iguais.", category: "Caldeiraria", url: '', type: 'image', page: '14' },
  { id: '15', title: "Cotovelo a 40°", description: "Cálculo e planificação de cotovelo a 40°.", category: "Caldeiraria", url: '', type: 'image', page: '15' },
  { id: '16', title: "Unha no Tubo 90°", description: "Cálculo e planificação de unha no tubo 90°.", category: "Caldeiraria", url: '', type: 'image', page: '16' },
  { id: '17', title: "Redução Concêntrica no Tubo", description: "Cálculo de redução concêntrica no tubo.", category: "Tubulação", url: '', type: 'image', page: '17' },
  { id: '18', title: "Redução Concêntrica ou Cone", description: "Cálculo de redução concêntrica ou cone.", category: "Caldeiraria", url: '', type: 'image', page: '18' },
  { id: '19', title: "Unha nas Costas da Curva 90°", description: "Cálculo e planificação de unha nas costas da curva 90°.", category: "Caldeiraria", url: '', type: 'image', page: '19' },
  { id: '20', title: "Boca de Lobo 45° Ø Iguais", description: "Cálculo e planificação de boca de lobo 45° com diâmetros iguais.", category: "Caldeiraria", url: '', type: 'image', page: '20' },
  { id: '21', title: "Redução Excêntrica na Chapa", description: "Cálculo de redução excêntrica na chapa.", category: "Caldeiraria", url: '', type: 'image', page: '21' },
  { id: '22', title: "Bica Industrial", description: "Cálculo de bica industrial (Retângulo para retângulo).", category: "Caldeiraria", url: '', type: 'image', page: '22-24' },
  { id: '23', title: "Elipse Plano", description: "Cálculo de elipse plano.", category: "Geometria", url: '', type: 'image', page: '25' },
  { id: '24', title: "Exaustor e Ventilador", description: "Cálculo de medidas para exaustor e ventilador.", category: "Caldeiraria", url: '', type: 'image', page: '26' },
  { id: '25', title: "Perna de Moça ou Y", description: "Cálculo e planificação de perna de moça ou Y.", category: "Caldeiraria", url: '', type: 'image', page: '27' },
  { id: '26', title: "Cálculo do S pela Face Externa", description: "Cálculo do S pela face externa.", category: "Tubulação", url: '', type: 'image', page: '28' },
  { id: '27', title: "Quadrado para Redondo", description: "Cálculo e planificação de quadrado para redondo.", category: "Caldeiraria", url: '', type: 'image', page: '29' },
  { id: '28', title: "Retângulo P/ Redondo Concêntrico", description: "Cálculo e planificação de retângulo para redondo concêntrico.", category: "Caldeiraria", url: '', type: 'image', page: '30' },
  { id: '29', title: "Retângulo P/ Redondo Excêntrico", description: "Cálculo e planificação de retângulo para redondo excêntrico.", category: "Caldeiraria", url: '', type: 'image', page: '31' },
  { id: '30', title: "Quadrado P/ Redondo com Base a 45°", description: "Cálculo e planificação de quadrado para redondo com base a 45°.", category: "Caldeiraria", url: '', type: 'image', page: '32' },
  { id: '31', title: "Boca de Lobo no Cone a 90°", description: "Cálculo e planificação de boca de lobo no cone a 90°.", category: "Caldeiraria", url: '', type: 'image', page: '33' },
  { id: '32', title: "Quadrado P/ Redondo com Boca a 30°", description: "Cálculo e planificação de quadrado para redondo com boca a 30°.", category: "Caldeiraria", url: '', type: 'image', page: '34' },
  { id: '33', title: "Elicoide", description: "Cálculo de elicoide (soldas alinhadas).", category: "Caldeiraria", url: '', type: 'image', page: '35' },
  { id: '34', title: "Elicoide Concêntrico", description: "Cálculo de elicoide concêntrico (soldas desalinhadas).", category: "Caldeiraria", url: '', type: 'image', page: '36' },
  { id: '35', title: "Elicoide Cônico", description: "Cálculo de elicoide cônico (soldas desalinhadas).", category: "Caldeiraria", url: '', type: 'image', page: '37' },
  { id: '36', title: "Bota na Curva a 90°", description: "Cálculo e esquema do modelo da bota na curva a 90°.", category: "Caldeiraria", url: '', type: 'image', page: '38-39' },
  { id: '37', title: "Boca de Lobo no Cone a 42°", description: "Cálculo e planificação de boca de lobo no cone a 42°.", category: "Caldeiraria", url: '', type: 'image', page: '40' },
  { id: '38', title: "Calça Cônica", description: "Cálculo de calça cônica.", category: "Caldeiraria", url: '', type: 'image', page: '41' },
  { id: '39', title: "Curva Cônica 90°", description: "Cálculo e planificação de curva cônica 90°.", category: "Caldeiraria", url: '', type: 'image', page: '42-43' },
  { id: '40', title: "Redução Concêntrica na Chapa (Triangulação)", description: "Processo de triangulação para redução concêntrica.", category: "Caldeiraria", url: '', type: 'image', page: '44' },
  { id: '41', title: "Elipse Cônico", description: "Cálculo de elipse cônico.", category: "Geometria", url: '', type: 'image', page: '45' },
  { id: '42', title: "Retângulo P/ Redondo com Bocas a 90°", description: "Cálculo e planificação de retângulo para redondo com bocas a 90°.", category: "Caldeiraria", url: '', type: 'image', page: '46' },
  { id: '43', title: "Retângulo P/ Redondo Excêntrico (Cantos Arredondados)", description: "Cálculo e planificação de retângulo para redondo excêntrico com dois cantos arredondados.", category: "Caldeiraria", url: '', type: 'image', page: '47' },
  { id: '44', title: "Pequenos Deslocamentos com Curvas", description: "Cálculo de pequenos deslocamentos com curvas.", category: "Tubulação", url: '', type: 'image', page: '48' },
];

const FormulaGallery: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFormula, setSelectedFormula] = useState<FormulaItem | null>(null);
  const [files, setFiles] = useState<FormulaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pdfThumbnails, setPdfThumbnails] = useState<Record<string, string>>({});
  const [clipboardPreview, setClipboardPreview] = useState<string | null>(null);
  // Camera state (getUserMedia)
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const captureInputRef = React.useRef<HTMLInputElement>(null); // fallback: input com capture

  const inferUploadCategory = (fileName: string, isPdf: boolean) => {
    const normalizedName = fileName.toLowerCase();
    if (normalizedName.includes('flange') || normalizedName.includes('curva') || normalizedName.includes('tubo') || normalizedName.includes('te')) {
      return 'Tubulação';
    }
    if (normalizedName.includes('tri') || normalizedName.includes('seno') || normalizedName.includes('cos') || normalizedName.includes('tan')) {
      return 'Trigonometria';
    }
    if (normalizedName.includes('cone') || normalizedName.includes('boca') || normalizedName.includes('chap')) {
      return 'Caldeiraria';
    }
    return isPdf ? 'Uploads PDF' : 'Uploads Imagem';
  };

  const generatePdfThumbnail = async (pdfUrl: string) => {
    const pdf = await getDocument(pdfUrl).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.1 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas indisponível para gerar miniatura do PDF.');
    }
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: context, viewport, canvas }).promise;
    return canvas.toDataURL('image/png');
  };

  // Load files from Realtime Database
  useEffect(() => {
    const filesRef = ref(db, 'gallery');
    const unsubscribe = onValue(filesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loadedFiles = Object.keys(data).map(key => ({
          id: key,
          ...data[key],
          isUpload: true,
          category: data[key].category && data[key].category !== 'Uploads'
            ? data[key].category
            : inferUploadCategory(data[key].title || data[key].name || key, data[key].type === 'pdf')
        }));
        setFiles(loadedFiles);
      } else {
        setFiles([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const pdfUploads = files.filter(file => file.type === 'pdf' && file.url && !pdfThumbnails[file.id]);
    if (pdfUploads.length === 0) return;

    const buildThumbs = async () => {
      for (const pdfFile of pdfUploads) {
        try {
          const thumbnail = await generatePdfThumbnail(pdfFile.url);
          if (!cancelled) {
            setPdfThumbnails(prev => ({ ...prev, [pdfFile.id]: thumbnail }));
          }
        } catch (error) {
          console.error(`Falha ao gerar miniatura do PDF ${pdfFile.title}:`, error);
        }
      }
    };

    buildThumbs();
    return () => {
      cancelled = true;
    };
  }, [files, pdfThumbnails]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFiles = Array.from(e.target.files);
    const supportedFiles = selectedFiles.filter(file => isSupportedFile(file));
    const rejectedFiles = selectedFiles.filter(file => !isSupportedFile(file));

    if (supportedFiles.length === 0) {
      const rejectedNames = rejectedFiles.map(f => {
        const ext = '.' + f.name.split('.').pop()?.toLowerCase();
        return `• ${f.name} (${ext || 'sem extensão'})`;
      }).join('\n');
      alert(`Nenhum arquivo suportado encontrado.\n\nFormatos aceitos: ${SUPPORTED_FORMATS_LABEL} e PDF.\n\nArquivos rejeitados:\n${rejectedNames}`);
      e.target.value = '';
      return;
    }

    if (rejectedFiles.length > 0) {
      const rejectedNames = rejectedFiles.map(f => f.name).join(', ');
      alert(`Alguns arquivos foram ignorados (formato não suportado): ${rejectedNames}\n\nFormatos aceitos: ${SUPPORTED_FORMATS_LABEL} e PDF.`);
    }

    const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error(`Falha ao ler ${file.name}`));
      reader.readAsDataURL(file);
    });

    setLoading(true);

    try {
      const filesRef = ref(db, 'gallery');
      for (const file of supportedFiles) {
        const isPdf = isSupportedPdf(file);
        const base64String = await readFileAsDataUrl(file);
        const newFile = {
          title: file.name,
          description: isPdf ? "Documento PDF carregado" : "Imagem carregada",
          category: inferUploadCategory(file.name, isPdf),
          url: base64String,
          type: isPdf ? 'pdf' : 'image',
          isUpload: true
        };
        const newFileRef = push(filesRef);
        await set(newFileRef, newFile);
      }
    } catch (error) {
      console.error(error);
      alert('Não foi possível importar um ou mais arquivos.');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  // Handler para colar imagens da área de transferência (prints/screenshots)
  const handleClipboardPaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (!blob) continue;

        // Mostra preview antes de confirmar
        const reader = new FileReader();
        reader.onloadend = () => {
          setClipboardPreview(reader.result as string);
        };
        reader.readAsDataURL(blob);
        return;
      }
    }
  };

  // Confirma o upload da imagem colada (print)
  const confirmClipboardUpload = async () => {
    if (!clipboardPreview) return;

    setLoading(true);
    try {
      const filesRef = ref(db, 'gallery');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const newFile = {
        title: `Print_${timestamp}.png`,
        description: 'Print / screenshot colado da área de transferência',
        category: 'Uploads Imagem',
        url: clipboardPreview,
        type: 'image' as const,
        isUpload: true,
      };
      const newFileRef = push(filesRef);
      await set(newFileRef, newFile);
      setClipboardPreview(null);
    } catch (error) {
      console.error(error);
      alert('Não foi possível salvar o print.');
    } finally {
      setLoading(false);
    }
  };

  // ─── CÂMERA (getUserMedia) ───
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
    } catch (err: any) {
      console.error('Erro ao acessar câmera:', err);
      const msg =
        err.name === 'NotAllowedError'
          ? 'Permissão da câmera negada. No celular, verifique as configurações do navegador para liberar a câmera. No iPhone: Ajustes > Safari > Câmera. No Android: Configurações > Apps > Navegador > Permissões > Câmera.'
          : err.name === 'NotFoundError'
          ? 'Nenhuma câmera encontrada no dispositivo.'
          : err.name === 'NotReadableError'
          ? 'A câmera está sendo usada por outro aplicativo.'
          : 'Não foi possível acessar a câmera. Verifique se seu navegador suporta acesso à câmera (requer HTTPS ou localhost).';
      setCameraError(msg);
      // Fallback: abre a câmera nativa do celular via capture (funciona sem HTTPS)
      captureInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
    setCameraError(null);
  };

  // Conecta o stream ao elemento <video> quando aberto
  useEffect(() => {
    if (isCameraOpen && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [isCameraOpen, cameraStream]);

  // Limpa a câmera ao desmontar
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg', 0.85);

    // Efeito flash
    const flash = document.getElementById('gallery-camera-flash');
    if (flash) {
      flash.style.opacity = '1';
      setTimeout(() => { flash.style.opacity = '0'; }, 150);
    }

    // Salva direto no Firebase
    setLoading(true);
    try {
      const filesRef = ref(db, 'gallery');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const newFile = {
        title: `Foto_${timestamp}.jpg`,
        description: 'Foto capturada pela câmera',
        category: 'Uploads Imagem',
        url: base64,
        type: 'image' as const,
        isUpload: true,
      };
      const newFileRef = push(filesRef);
      await set(newFileRef, newFile);
      stopCamera();
    } catch (error) {
      console.error(error);
      alert('Não foi possível salvar a foto.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUpload = async (e: React.MouseEvent, item: FormulaItem) => {
    e.stopPropagation();
    if (!item.isUpload) return;
    if (!window.confirm(`Excluir "${item.title}" da galeria?`)) return;
    try {
      await remove(ref(db, `gallery/${item.id}`));
      setPdfThumbnails(prev => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      if (selectedFormula?.id === item.id) {
        setSelectedFormula(null);
      }
    } catch (error) {
      console.error(error);
      alert('Não foi possível excluir o arquivo da galeria.');
    }
  };

  const allItems = [
    ...FORMULAS.map(f => ({...f, url: '', type: 'image' as const})),
    ...files.map(file => ({ ...file, thumbnailUrl: file.type === 'pdf' ? pdfThumbnails[file.id] : undefined }))
  ];
  const filteredFormulas = allItems.filter(f => 
    f.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white" onPaste={handleClipboardPaste} tabIndex={-1}>
      {/* Camera Error Toast */}
      {cameraError && (
        <div className="absolute top-2 left-2 right-2 z-[300] bg-red-900/95 border border-red-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-sm animate-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-red-200 text-sm font-bold mb-1">Câmera Indisponível</p>
              <p className="text-red-300 text-xs leading-relaxed">{cameraError}</p>
              <p className="text-red-400 text-[10px] mt-2">A câmera nativa do celular foi acionada como alternativa.</p>
            </div>
            <button onClick={() => setCameraError(null)} className="text-red-300 hover:text-white shrink-0">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Search Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-10 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Buscar fórmula ou traçado..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-safety-yellow/50 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {/* Botão Câmera (mobile/desktop) */}
          <button
            onClick={startCamera}
            className="bg-emerald-600 text-white px-3 py-3 rounded-xl font-bold cursor-pointer hover:bg-emerald-500 flex items-center gap-2 whitespace-nowrap active:scale-95 transition-all"
            title="Tirar foto com a câmera"
          >
            <Camera size={18} />
            <span className="hidden sm:inline text-sm">Foto</span>
          </button>
          {/* Input oculto: fallback com câmera nativa (capture) — funciona sem HTTPS */}
          <input
            ref={captureInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            capture="environment"
            onChange={handleUpload}
          />

          {/* Botão Upload */}
          <label className="bg-safety-yellow text-black px-4 py-3 rounded-xl font-bold cursor-pointer hover:bg-yellow-400 flex items-center gap-2 whitespace-nowrap active:scale-95 transition-all">
            <Upload size={18} />
            {loading ? 'Importando...' : <span className="hidden sm:inline">Importar</span>}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp,image/bmp,image/gif,image/tiff,image/heic,image/heif,image/svg+xml,image/avif,.jpg,.jpeg,.png,.webp,.bmp,.gif,.tiff,.tif,.heic,.heif,.svg,.avif,application/pdf,.pdf"
              multiple
              onChange={handleUpload}
            />
          </label>
        </div>
        {/* Badge de formatos + dica de colar print */}
        <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
          <span className="bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700 flex items-center gap-1">
            <ImageIcon size={10} />
            {SUPPORTED_FORMATS_LABEL} • PDF
          </span>
          <span className="bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700 flex items-center gap-1">
            <ClipboardPaste size={10} />
            Ctrl+V cola print
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFormulas.map((formula) => (
            <div 
              key={formula.id}
              onClick={() => setSelectedFormula(formula)}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-safety-yellow/50 transition-all cursor-pointer group active:scale-[0.98]"
            >
              <div className={`aspect-video flex items-center justify-center relative overflow-hidden ${formula.type === 'pdf' ? 'bg-gradient-to-br from-red-950 via-slate-900 to-slate-950' : 'bg-slate-800'}`}>
                {formula.isUpload && (
                  <button
                    onClick={(e) => handleDeleteUpload(e, formula)}
                    className="absolute left-2 top-2 z-10 rounded-full border border-red-500/30 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20"
                    title="Excluir upload"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                {formula.type === 'pdf' ? (
                  formula.thumbnailUrl ? (
                    <img src={formula.thumbnailUrl} alt={`Miniatura de ${formula.title}`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 shadow-lg">
                        <FileBadge2 className="text-red-400" size={52} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-red-300">Documento PDF</span>
                    </div>
                  )
                ) : (
                  <ImageIcon className="text-slate-700 group-hover:scale-110 transition-transform" size={48} />
                )}
                <div className={`absolute top-2 right-2 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold ${formula.type === 'pdf' ? 'bg-red-950/80 text-red-200 border border-red-500/30' : 'bg-black/60 text-slate-400'}`}>
                  {formula.type === 'pdf' ? 'PDF' : formula.page ? `PAG ${formula.page}` : 'Arquivo'}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <span className="text-xs font-bold text-safety-yellow flex items-center gap-1">
                    <Maximize2 size={12} /> Ver Detalhes
                  </span>
                </div>
              </div>
              <div className="p-4">
                <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">
                  {formula.category}
                </div>
                <h3 className="font-bold text-slate-100 mb-2 line-clamp-1">{formula.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {formula.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {filteredFormulas.length === 0 && (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500">
            <Search size={48} className="mb-4 opacity-20" />
            <p>Nenhuma fórmula encontrada para "{searchTerm}"</p>
          </div>
        )}
      </div>

      {/* ─── Camera Modal ─── */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col">
          {/* Live preview */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="flex-1 w-full h-full object-cover"
          />

          {/* Flash effect */}
          <div id="gallery-camera-flash" className="absolute inset-0 bg-white opacity-0 pointer-events-none transition-opacity duration-150" />

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/70 to-transparent">
            <span className="text-white font-bold text-sm bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
              📷 Câmera
            </span>
            <button
              onClick={stopCamera}
              className="w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
            >
              <X size={22} />
            </button>
          </div>

          {/* Capture button */}
          <div className="absolute bottom-10 left-0 right-0 flex justify-center">
            <button
              onClick={capturePhoto}
              disabled={loading}
              className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
            >
              <div className="w-16 h-16 bg-white rounded-full shadow-lg" />
            </button>
          </div>
        </div>
      )}

      {/* Clipboard Preview Modal */}
      {clipboardPreview && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setClipboardPreview(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <div>
                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <ClipboardPaste size={12} /> Print da Área de Transferência
                </div>
                <h2 className="text-lg font-bold text-white">Confirmar Upload</h2>
              </div>
              <button onClick={() => setClipboardPreview(null)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-4">
              <div className="aspect-video bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 mb-4">
                <img src={clipboardPreview} alt="Preview do print" className="w-full h-full object-contain" />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setClipboardPreview(null)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmClipboardUpload}
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-xl font-bold bg-safety-yellow text-black hover:bg-yellow-400 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar na Galeria'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedFormula && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedFormula(null)}>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md sticky top-0">
              <div>
                <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">{selectedFormula.category}</div>
                <h2 className="text-xl font-bold text-white">{selectedFormula.title}</h2>
              </div>
              <button 
                onClick={() => setSelectedFormula(null)}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="aspect-video bg-slate-800 rounded-2xl mb-6 flex items-center justify-center border border-slate-700 overflow-hidden">
                {selectedFormula.type === 'pdf' ? (
                  <div className="relative w-full h-full">
                    <div className="absolute left-3 top-3 z-10 rounded-full border border-red-500/30 bg-red-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-red-200">
                      PDF Importado
                    </div>
                    <iframe src={selectedFormula.url} className="w-full h-full" title="PDF Viewer" />
                  </div>
                ) : selectedFormula.url ? (
                  <img src={selectedFormula.url} alt={selectedFormula.title} className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center p-8">
                    <ImageIcon className="mx-auto mb-4 text-slate-600" size={64} />
                    <p className="text-slate-400 text-sm italic">
                      Referência visual baseada na página {selectedFormula.page || selectedFormula.id} do manual técnico.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <section>
                  <h4 className="text-xs font-bold text-safety-yellow uppercase tracking-widest mb-2">Descrição / Fórmula</h4>
                  <div className="bg-black/40 p-4 rounded-xl border border-slate-800 font-mono text-sm leading-relaxed text-slate-200">
                    {selectedFormula.description}
                  </div>
                </section>

                <section className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl">
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Dica do Mestre</h4>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Sempre confira as unidades de medida (mm/pol) antes de iniciar o traçado na chapa. Utilize o compasso de ponta seca para maior precisão nos pontos de tangência.
                  </p>
                </section>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Tubista Pro Gallery • {selectedFormula.type === 'pdf' ? 'PDF' : selectedFormula.page ? `Pag ${selectedFormula.page}` : 'Arquivo'}</span>
              <button 
                onClick={() => setSelectedFormula(null)}
                className="bg-safety-yellow text-black font-bold px-6 py-2 rounded-xl hover:bg-yellow-400 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormulaGallery;
