import { jsPDF } from "jspdf";

/**
 * Converte um elemento SVG em um elemento Canvas HTML5.
 * Útil para gerar imagens a partir de vetores.
 */
const svgToCanvas = (svgElement: SVGSVGElement, width: number, height: number, backgroundColor: string = '#000000'): Promise<HTMLCanvasElement> => {
  return new Promise((resolve, reject) => {
    try {
      // 1. Clonar o SVG para não alterar o original na tela
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
      
      // 2. Definir dimensões fixas para garantir qualidade
      clonedSvg.setAttribute('width', width.toString());
      clonedSvg.setAttribute('height', height.toString());
      
      // 3. Serializar para XML String
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clonedSvg);
      
      // 4. Criar Imagem BLOB
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // Preencher fundo (importante pois SVG é transparente por padrão)
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, width, height);
          
          // Desenhar a imagem SVG
          ctx.drawImage(img, 0, 0, width, height);
          
          // Adicionar marca d'água discreta
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.font = '16px monospace';
          ctx.fillText('Tubista Pro Master', 20, height - 20);
          
          URL.revokeObjectURL(url);
          resolve(canvas);
        } else {
          reject(new Error("Falha ao obter contexto 2D do Canvas"));
        }
      };
      
      img.onerror = (e) => {
        reject(e);
      };
      
      img.src = url;
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Exporta e compartilha como Imagem (PNG)
 */
export const shareAsImage = async (svgElement: SVGSVGElement, fileName: string) => {
  try {
    const canvas = await svgToCanvas(svgElement, svgElement.clientWidth * 2, svgElement.clientHeight * 2); // 2x resolução para nitidez
    
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      
      const file = new File([blob], `${fileName}.png`, { type: 'image/png' });
      
      // Tenta usar a API de Compartilhamento Nativo (Mobile)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'Isométrico - Tubista Pro',
            text: `Projeto: ${fileName}`,
            files: [file],
          });
        } catch (err) {
          console.warn('Compartilhamento cancelado ou falhou, baixando arquivo...', err);
          downloadBlob(blob, `${fileName}.png`);
        }
      } else {
        // Fallback para download direto (Desktop)
        downloadBlob(blob, `${fileName}.png`);
      }
    }, 'image/png');
    
  } catch (error) {
    console.error("Erro ao exportar imagem:", error);
    alert("Erro ao gerar imagem. Tente novamente.");
  }
};

/**
 * Exporta e compartilha como PDF
 */
export const shareAsPDF = async (svgElement: SVGSVGElement, fileName: string) => {
  try {
    // A4 Dimensions in mm (Landscape usually better for isometric)
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Gerar imagem do canvas
    const canvas = await svgToCanvas(svgElement, 1920, 1080, '#ffffff'); // Fundo branco para PDF economizar tinta
    const imgData = canvas.toDataURL('image/png');
    
    // Adicionar Cabeçalho
    pdf.setFillColor(0, 0, 0); // Black header
    pdf.rect(0, 0, pageWidth, 20, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.text("TUBISTA PRO - ISOMÉTRICO", 10, 13);
    
    pdf.setFontSize(10);
    pdf.text(`Projeto: ${fileName}`, 100, 13);
    pdf.text(`Data: ${new Date().toLocaleDateString()}`, pageWidth - 40, 13);
    
    // Adicionar Imagem Centralizada
    const margin = 10;
    const imgWidth = pageWidth - (margin * 2);
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Se a altura passar da página, ajusta pela altura
    let finalW = imgWidth;
    let finalH = imgHeight;
    
    if (finalH > (pageHeight - 30)) {
        finalH = pageHeight - 40;
        finalW = (canvas.width * finalH) / canvas.height;
    }
    
    const xPos = (pageWidth - finalW) / 2;
    const yPos = 25; // Abaixo do cabeçalho
    
    pdf.addImage(imgData, 'PNG', xPos, yPos, finalW, finalH);
    
    // Salvar/Compartilhar
    const pdfBlob = pdf.output('blob');
    const file = new File([pdfBlob], `${fileName}.pdf`, { type: 'application/pdf' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
            title: 'Isométrico PDF',
            text: `Projeto: ${fileName}`,
            files: [file]
        });
    } else {
        pdf.save(`${fileName}.pdf`);
    }

  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    alert("Erro ao criar PDF.");
  }
};

const downloadBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};