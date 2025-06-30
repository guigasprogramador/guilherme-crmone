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
  
  useEffect(() => {
    // Debug: log da URL recebida
    console.log('PDFViewer - URL recebida:', url);
    console.log('PDFViewer - Nome do arquivo:', fileName);
    
    let debugText = `URL Original: ${url}\n`;
    debugText += `Nome do arquivo: ${fileName}\n`;
    
    // Verificar se é uma URL do Cloudinary e se está usando o resource_type correto
    if (url.includes('cloudinary.com')) {
      if (url.includes('/image/upload/')) {
        debugText += 'PROBLEMA: URL usando /image/upload/ para PDF\n';
        // Converter para raw/upload para PDFs
        const rawUrl = url.replace('/image/upload/', '/raw/upload/');
        debugText += `URL corrigida: ${rawUrl}\n`;
        
        // Definir tipo para as respostas
        type FetchResponse = Response | { status: string; error: any };
        
        // Testar ambas as URLs
        Promise.all([
          fetch(url, { method: 'HEAD' }).catch(e => ({ status: 'error', error: e.message })),
          fetch(rawUrl, { method: 'HEAD' }).catch(e => ({ status: 'error', error: e.message }))
        ]).then(([originalResponse, rawResponse]: [FetchResponse, FetchResponse]) => {
          let testResults = 'Teste de URLs:\n';
          testResults += `image/upload: ${'status' in originalResponse ? originalResponse.status : originalResponse.error}\n`;
          testResults += `raw/upload: ${'status' in rawResponse ? rawResponse.status : rawResponse.error}\n`;
          setDebugInfo(debugText + testResults);
        });
      } else if (url.includes('/raw/upload/')) {
        debugText += 'OK: URL usando /raw/upload/ para PDF\n';
        setDebugInfo(debugText);
      }
    }
    
    // Testar acesso à URL original
    if (url) {
      fetch(url, { method: 'HEAD' })
        .then(response => {
          console.log('PDFViewer - Status da URL:', response.status);
          if (response.status === 404) {
            setError('Documento não encontrado (404)');
          } else if (response.status === 401) {
            setError('Documento não autorizado (401)');
          } else if (!response.ok) {
            setError(`Erro ${response.status}: ${response.statusText}`);
          }
        })
        .catch(error => {
          console.error('PDFViewer - Erro ao testar URL:', error);
          setError('Erro de conexão: ' + error.message);
        });
    }
    
    setLoading(true)
    setError(null)
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
                // Se a URL original tem /image/upload/, tentar com /raw/upload/
                const testUrl = url.includes('/image/upload/') ? url.replace('/image/upload/', '/raw/upload/') : url;
                window.open(testUrl, "_blank");
              }}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir no navegador
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                const testUrl = url.includes('/image/upload/') ? url.replace('/image/upload/', '/raw/upload/') : url;
                window.open(testUrl, "_blank");
              }}>
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
            </div>
          </div>
        ) : (
          <div className="w-full h-full">
            {/* Corrigir URL para usar /raw/upload/ se necessário */}
            {(() => {
              const correctedUrl = url.includes('/image/upload/') ? url.replace('/image/upload/', '/raw/upload/') : url;
              
              // Adicionar parâmetros para melhor compatibilidade
              const pdfUrl = `${correctedUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`;
              
              return (
                <div className="w-full h-full relative">
                  <iframe 
                    src={pdfUrl}
                    width="100%"
                    height="100%"
                    title={fileName}
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                    className="w-full h-full border-0 rounded-md"
                    allow="fullscreen"
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
             })()}
          </div>
        )}
      </div>
      
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" size="sm" onClick={() => {
          const correctedUrl = url.includes('/image/upload/') ? url.replace('/image/upload/', '/raw/upload/') : url;
          window.open(correctedUrl, "_blank");
        }}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Abrir em nova aba
        </Button>
        <Button variant="outline" size="sm" onClick={() => {
          const correctedUrl = url.includes('/image/upload/') ? url.replace('/image/upload/', '/raw/upload/') : url;
          window.open(correctedUrl, "_blank");
        }}>
          <Download className="h-4 w-4 mr-2" />
          Baixar
        </Button>
      </div>
    </div>
  )
}
