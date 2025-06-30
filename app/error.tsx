"use client"

import { useEffect } from "react"
import Link from "next/link"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-4">Erro</h1>
      <p className="mb-4">Ocorreu um erro ao carregar esta página</p>
      <div className="flex gap-4">
        <button onClick={reset} className="px-4 py-2 bg-blue-500 text-white rounded">
          Tentar novamente
        </button>
        <Link href="/" className="px-4 py-2 bg-gray-200 rounded">
          Voltar para a página inicial
        </Link>
      </div>
    </div>
  )
}

