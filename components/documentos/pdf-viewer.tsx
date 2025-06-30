"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { FileText, Download, ExternalLink } from "lucide-react"

interface PDFViewerProps {
  url: string
  fileName: string
}

export function PDFViewer({ url, fileName }: PDFViewerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>('')
  
  // Função para corrigir a URL do Cloudinary
  const getCorrectUrl = (originalUrl: string): string => {
    if (!originalUrl) return originalUrl;
    
    let correctedUrl = originalUrl;
    
    // Remover extensões duplicadas (ex: .pdf.raw, .doc.raw, etc.)
    const duplicatedExtensions = ['.pdf.raw', '.doc.raw', '.docx.raw', '.xls.raw', '.xlsx.raw', '.ppt.raw', '.pptx.raw'];
    duplicatedExtensions.forEach(ext => {
      if (correctedUrl.endsWith(ext)) {
        correctedUrl = correctedUrl.replace(ext, '.' + ext.split('.')[1]); // Remove a parte .raw
      }
    });
    
    // Padrão mais genérico: se termina com .{ext}.raw, remover o .raw
    const genericPattern = /\.(\w+)\.raw$/;
    if (genericPattern.test(correctedUrl)) {
      correctedUrl = correctedUrl.replace(genericPattern, '.$1');
    }
    
    // Se a URL do Cloudinary está usando /image/upload/, converter para /raw/upload/ para PDFs
    if (correctedUrl.includes('cloudinary.com') && correctedUrl.includes('/image/upload/')) {
      correctedUrl = correctedUrl.replace('/image/upload/', '/raw/upload/');
    }
    
    // Adicionar parâmetros para forçar visualização inline (não download)
    if (correctedUrl.includes('cloudinary.com')) {
      const separator = correctedUrl.includes('?') ? '&' : '?';
      correctedUrl += `${separator}fl_attachment=false&fl_inline=true`;
    }
    
    return correctedUrl;
  }
  
  useEffect(() => {
    // Debug: log da URL recebida
    console.log('PDFViewer - URL recebida:', url);
    console.log('PDFViewer - Nome do arquivo:', fileName);
    
    const correctedUrl = getCorrectUrl(url);
    console.log('PDFViewer - URL corrigida:', correctedUrl);
    
    let debugText = `URL Original: ${url}\n`;
    debugText += `URL Corrigida: ${correctedUrl}\n`;
    debugText += `Nome do arquivo: ${fileName}\n`;
    
    // Verificar se é uma URL do Cloudinary
    if (url.includes('cloudinary.com')) {
      if (url.includes('/image/upload/')) {
        debugText += 'PROBLEMA DETECTADO: URL usando /image/upload/ para PDF\n';
        debugText += 'CORREÇÃO: Convertendo para /raw/upload/\n';
      }
      
      if (url.endsWith('.pdf.raw')) {
        debugText += 'PROBLEMA DETECTADO: Extensão duplicada .pdf.raw\n';
        debugText += 'CORREÇÃO: Removendo extensão duplicada\n';
      }
    }
    
    setDebugInfo(debugText);
    
    // Testar acesso à URL corrigida
    if (correctedUrl) {
      fetch(correctedUrl, { method: 'HEAD' })
        .then(response => {
          console.log('PDFViewer - Status da URL corrigida:', response.status);
          if (response.status === 404) {
            setError('Documento não encontrado (404)');
          } else if (response.status === 401) {
            setError('Documento não autorizado (401)');
          } else if (!response.ok) {
            setError(`Erro ${response.status}: ${response.statusText}`);
          } else {
            setError(null); // Limpar erro se a URL estiver OK
          }
        })
        .catch(error => {
          console.error('PDFViewer - Erro ao testar URL:', error);
          setError('Erro de conexão: ' + error.message);
        });
    }
    
    setLoading(true)
  }, [url])
  
  const handleIframeLoad = () => {
    setLoading(false)
    setError(null)
    console.log("Documento carregado com sucesso:", url)
  }
  
  const handleIframeError = () => {
    setError('Não foi possível carregar o documento')
    setLoading(false)
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="relative flex-1 border rounded-md overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Carregando documento...</p>
            </div>
          </div>
        )}
        
        {error ? (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Erro ao visualizar documento</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            
            {debugInfo && (
              <div className="bg-gray-100 p-3 rounded-md mb-4 text-xs font-mono max-w-full overflow-auto">
                <pre className="whitespace-pre-wrap">{debugInfo}</pre>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                const correctedUrl = getCorrectUrl(url);
                window.open(correctedUrl, "_blank");
              }}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir no navegador
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                const correctedUrl = getCorrectUrl(url);
                window.open(correctedUrl, "_blank");
              }}>
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
            </div>
          </div>
        ) : (
          <div className="w-full h-full">
            {(() => {
              const correctedUrl = getCorrectUrl(url);
              
              // Usar Google Docs Viewer para melhor compatibilidade
              const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(correctedUrl)}&embedded=true`;
              
              return (
                <div className="w-full h-full relative">
                  <iframe 
                    src={viewerUrl}
                    width="100%"
                    height="100%"
                    title={fileName}
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                    className="w-full h-full border-0 rounded-md"
                    allow="fullscreen"
                    sandbox="allow-scripts allow-same-origin allow-popups"
                  >
                    <div className="p-4 text-center">
                        <p>
                          Seu navegador não pode exibir PDFs diretamente.{" "}
                          <a href={correctedUrl} target="_blank" rel="noopener noreferrer">
                            Clique aqui para baixar o arquivo.
                          </a>
                        </p>
                      </div>
                    </iframe>
                  </div>
                );
             })()
            }
          </div>
        )}
      </div>
      
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" size="sm" onClick={() => {
          const correctedUrl = getCorrectUrl(url);
          window.open(correctedUrl, "_blank");
        }}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Abrir em nova aba
        </Button>
        <Button variant="outline" size="sm" onClick={() => {
          const correctedUrl = getCorrectUrl(url);
          window.open(correctedUrl, "_blank");
        }}>
          <Download className="h-4 w-4 mr-2" />
          Baixar
        </Button>
      </div>
    </div>
  )
}
