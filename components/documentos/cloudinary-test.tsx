'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface CloudinaryTestProps {
  url?: string
}

export function CloudinaryTest({ url: initialUrl }: CloudinaryTestProps) {
  const [url, setUrl] = useState(initialUrl || '')
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const testUrl = async () => {
    if (!url) return
    
    setTesting(true)
    setResult(null)
    
    try {
      // Teste 1: Verificar se a URL responde
      const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' })
      
      // Teste 2: Tentar carregar como imagem para verificar se é acessível
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      const loadPromise = new Promise((resolve, reject) => {
        img.onload = () => resolve('success')
        img.onerror = () => reject('error')
        img.src = url
      })
      
      await loadPromise
      
      setResult({
        success: true,
        message: 'URL do Cloudinary está acessível e funcionando corretamente!'
      })
    } catch (error) {
      console.error('Erro ao testar URL:', error)
      setResult({
        success: false,
        message: `Erro ao acessar a URL: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Teste de URL do Cloudinary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="url">URL do Documento</Label>
          <Input
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://res.cloudinary.com/..."
          />
        </div>
        
        <Button 
          onClick={testUrl} 
          disabled={!url || testing}
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testando...
            </>
          ) : (
            'Testar URL'
          )}
        </Button>
        
        {result && (
          <Alert className={result.success ? 'border-green-500' : 'border-red-500'}>
            {result.success ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}
        
        {url && (
          <div className="mt-4">
            <Label>Preview:</Label>
            <div className="mt-2 border rounded p-2">
              <iframe
                src={url}
                width="100%"
                height="200"
                title="Preview"
                className="border-0"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}