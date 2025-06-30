import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { Documento } from '@/types/licitacoes';

// Path para o arquivo de "banco de dados"
const dbPath = path.join(process.cwd(), 'data', 'documentos.json');

// Interface para categoria
interface Categoria {
  id: string;
  nome: string;
}

// Função para carregar os dados do arquivo
async function carregarDocumentos(): Promise<Documento[]> {
  try {
    if (!fs.existsSync(dbPath)) {
      console.error('Arquivo de documentos não encontrado');
      return [];
    }
    
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erro ao carregar documentos:', error);
    return [];
  }
}

// GET - Listar categorias de documentos
export async function GET(request: NextRequest) {
  try {
    const documentos = await carregarDocumentos();
    
    // Categorias fixas (podemos melhorar isso no futuro com uma tabela própria)
    const categoriasFixas: Categoria[] = [
      { id: "juridicos", nome: "Jurídicos" },
      { id: "projetos", nome: "Projetos" },
      { id: "comerciais", nome: "Comerciais" },
      { id: "administrativos", nome: "Administrativos" },
      { id: "contratuais", nome: "Contratuais" },
      { id: "tecnicos", nome: "Técnicos" }
    ];
    
    // Adicionalmente, podemos extrair categorias dinâmicas dos documentos existentes
    // (isto é uma simulação, já que o modelo Documento atual não tem categoriaId/categoria)
    
    return NextResponse.json(categoriasFixas);
  } catch (error) {
    console.error('Erro ao listar categorias de documentos:', error);
    return NextResponse.json(
      { error: 'Erro ao listar categorias de documentos' },
      { status: 500 }
    );
  }
}
