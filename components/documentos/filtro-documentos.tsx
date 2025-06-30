"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Check, Filter, Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface FiltroDocumentosProps {
  onFilterChange: (filters: DocumentoFiltros) => void
  tiposDocumentos: string[]
  categorias: { id: string; nome: string }[]
  licitacoes: { id: string; nome: string }[]
}

export interface DocumentoFiltros {
  termo?: string;
  tipo?: string;
  tags?: string[];
  licitacao?: string;
  formato?: string;
  categorias?: string[];
}

export function FiltroDocumentos({ onFilterChange, tiposDocumentos, categorias, licitacoes }: FiltroDocumentosProps) {
  const [filtros, setFiltros] = useState<DocumentoFiltros>({})
  const [activeFiltersCount, setActiveFiltersCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  // Formatos de arquivo comuns
  const formatos = ["pdf", "docx", "xlsx", "pptx", "jpg", "png", "txt"]

  // Atualiza o contador de filtros ativos
  useEffect(() => {
    let count = 0;
    if (filtros.termo) count++;
    if (filtros.tipo) count++;
    if (filtros.tags?.length) count += filtros.tags.length;
    if (filtros.categorias?.length) count += filtros.categorias.length;
    if (filtros.licitacao) count++;
    if (filtros.formato) count++;
    
    setActiveFiltersCount(count);
  }, [filtros])

  // Função para aplicar o filtro
  const aplicarFiltro = () => {
    // Converter valores "todos" para undefined para o filtro
    const filtrosAplicados = {
      termo: filtros.termo,
      tipo: filtros.tipo === "todos" ? undefined : filtros.tipo,
      tags: filtros.tags,
      categorias: filtros.categorias,
      licitacao: filtros.licitacao === "todos" ? undefined : filtros.licitacao,
      formato: filtros.formato === "todos" ? undefined : filtros.formato
    };
    
    onFilterChange(filtrosAplicados);
    setIsOpen(false);
  }

  // Função para limpar filtros
  const limparFiltros = () => {
    setFiltros({})
    onFilterChange({})
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-9 gap-1"
          data-filtro-button
        >
          <span className="text-sm font-normal">Filtros</span>
          {activeFiltersCount > 0 && (
            <Badge className="ml-1 bg-primary h-5 w-5 p-0 flex items-center justify-center">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80" 
        align="end" 
        side="bottom" 
        sideOffset={5}
        alignOffset={0}
        avoidCollisions={true}
      >
        <div className="space-y-3 max-h-[calc(100vh-120px)] overflow-y-auto pr-1">
          <div className="font-medium">Filtrar Documentos</div>
          
          {/* Busca por termo */}
          <div className="space-y-1">
            <Label htmlFor="termo">Buscar</Label>
            <div className="flex">
              <Input
                id="termo"
                placeholder="Nome do documento"
                value={filtros.termo || ""}
                onChange={(e) => setFiltros({...filtros, termo: e.target.value})}
                className="rounded-r-none"
              />
              <Button 
                className="rounded-l-none" 
                variant="secondary"
                onClick={aplicarFiltro}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Tipo de documento */}
          <div className="space-y-1">
            <Label htmlFor="tipo">Tipo</Label>
            <Select 
              value={filtros.tipo || "todos"} 
              onValueChange={(value) => setFiltros({...filtros, tipo: value})}
            >
              <SelectTrigger id="tipo" className="w-full">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {tiposDocumentos.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {tipo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Categorias */}
          <div className="space-y-1">
            <Label>Categorias</Label>
            <div className="flex flex-wrap gap-2 p-2 border rounded-md">
              {categorias.map((cat) => (
                <Badge
                  key={cat.id}
                  variant={filtros.categorias?.includes(cat.id) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    const newCategorias = filtros.categorias || [];
                    const index = newCategorias.indexOf(cat.id);
                    if (index === -1) {
                      setFiltros({
                        ...filtros,
                        categorias: [...newCategorias, cat.id]
                      });
                    } else {
                      newCategorias.splice(index, 1);
                      setFiltros({
                        ...filtros,
                        categorias: newCategorias.length > 0 ? newCategorias : undefined
                      });
                    }
                  }}
                >
                  {cat.nome}
                </Badge>
              ))}
            </div>
          </div>
          
          {/* Licitação */}
          <div className="space-y-1">
            <Label htmlFor="licitacao">Licitação</Label>
            <Select 
              value={filtros.licitacao || "todos"} 
              onValueChange={(value) => setFiltros({...filtros, licitacao: value})}
            >
              <SelectTrigger id="licitacao" className="w-full">
                <SelectValue placeholder="Todas as licitações" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as licitações</SelectItem>
                {licitacoes.map((lic) => (
                  <SelectItem key={lic.id} value={lic.id}>
                    {lic.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Formato */}
          <div className="space-y-1">
            <Label htmlFor="formato">Formato</Label>
            <Select 
              value={filtros.formato || "todos"} 
              onValueChange={(value) => setFiltros({...filtros, formato: value})}
            >
              <SelectTrigger id="formato" className="w-full">
                <SelectValue placeholder="Todos os formatos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os formatos</SelectItem>
                {formatos.map((formato) => (
                  <SelectItem key={formato} value={formato}>
                    .{formato}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-between pt-2 sticky bottom-0 bg-white">
            <Button variant="outline" size="sm" onClick={limparFiltros}>
              Limpar
            </Button>
            <Button size="sm" onClick={aplicarFiltro}>
              <Check className="h-4 w-4 mr-1" />
              Aplicar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
