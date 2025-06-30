'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function DebugUrl() {
  const [testUrl, setTestUrl] = useState('')
  const [result, setResult] = useState('')

  const testUrl1 = async () => {
    if (!testUrl) {
      setResult('Por favor, insira uma URL para testar')
      return
    }

    try {
      setResult('Testando URL...')
      
      // Teste 1: Fetch simples
      const response = await fetch(testUrl, { method: 'HEAD' })
      setResult(`Status: ${response.status} - ${response.statusText}`)
      
    } catch (error: any) {
      setResult(`Erro: ${error.message}`)
    }
  }

  const testUrl2 = () => {
    if (!testUrl) {
      setResult('Por favor, insira uma URL para testar')
      return
    }

    // Teste 2: Abrir em nova aba
    window.open(testUrl, '_blank')
    setResult('URL aberta em nova aba')
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Debug de URL</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Input
            placeholder="Cole a URL aqui para testar"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <Button onClick={testUrl1}>Testar Fetch</Button>
          <Button onClick={testUrl2}>Abrir em Nova Aba</Button>
        </div>
        
        {result && (
          <div className="p-4 bg-gray-100 rounded">
            <p>{result}</p>
          </div>
        )}
        
        {testUrl && (
          <div className="border rounded p-4">
            <h3 className="font-semibold mb-2">Preview da URL:</h3>
            <iframe 
              src={testUrl} 
              width="100%" 
              height="400px" 
              title="URL Preview"
              className="border"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}