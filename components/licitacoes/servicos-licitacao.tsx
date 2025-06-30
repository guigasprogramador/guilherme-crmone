"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Edit3, Save, Plus, Trash2, DollarSign, Loader2, PackageIcon } from "lucide-react" // Edit3 para editar
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useLicitacaoServicos, LicitacaoServico } from "@/hooks/comercial/useLicitacaoServicos" // Caminho corrigido
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface ServicosLicitacaoProps {
  licitacaoId: string;
  isEditing: boolean; // Prop para controlar se a licitação principal está em modo de edição
  onServicosUpdated?: () => void; // Callback para notificar atualização (ex: recalcular valor total da licitação)
}

const initialServicoFormData: Partial<Omit<LicitacaoServico, 'id' | 'licitacaoId' | 'createdAt' | 'updatedAt'>> = {
  nome: "",
  descricao: "",
  valor: 0,
  unidade: "un", // Unidade padrão
  quantidade: 1,
};

export function ServicosLicitacao({ licitacaoId, isEditing, onServicosUpdated }: ServicosLicitacaoProps) {
  const {
    servicos,
    isLoading,
    error,
    fetchServicos, // O hook já chama no useEffect, mas podemos chamar para refresh se necessário
    createServico,
    updateServico,
    deleteServico,
  } = useLicitacaoServicos(licitacaoId);

  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [servicoFormData, setServicoFormData] = useState<Partial<Omit<LicitacaoServico, 'id' | 'licitacaoId' | 'createdAt' | 'updatedAt'>>>(initialServicoFormData);
  const [servicoEmEdicao, setServicoEmEdicao] = useState<LicitacaoServico | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [idServicoParaExcluir, setIdServicoParaExcluir] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);


  const handleOpenAddModal = () => {
    setServicoEmEdicao(null);
    setServicoFormData(initialServicoFormData);
    setShowAddEditModal(true);
  };

  const handleOpenEditModal = (servico: LicitacaoServico) => {
    setServicoEmEdicao(servico);
    setServicoFormData({
      nome: servico.nome,
      descricao: servico.descricao || "",
      valor: servico.valor || 0,
      unidade: servico.unidade || "un",
      quantidade: servico.quantidade || 1,
    });
    setShowAddEditModal(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const numValue = (name === 'valor' || name === 'quantidade') ? parseFloat(value) : value;
    setServicoFormData(prev => ({ ...prev, [name]: numValue }));
  };

  const handleSubmitServico = async () => {
    if (!servicoFormData.nome || (servicoFormData.valor !== undefined && servicoFormData.valor <= 0) || (servicoFormData.quantidade !== undefined && servicoFormData.quantidade <= 0) ) {
      toast.error("Nome, valor e quantidade (maior que zero) são obrigatórios.");
      return;
    }
    setIsSubmitting(true);
    try {
      if (servicoEmEdicao && servicoEmEdicao.id) {
        // Atualizar
        await updateServico(servicoEmEdicao.id, licitacaoId, servicoFormData);
        toast.success("Serviço atualizado com sucesso!");
      } else {
        // Criar
        const payload = {
          ...servicoFormData,
          licitacaoId: licitacaoId,
        } as Omit<LicitacaoServico, 'id' | 'createdAt' | 'updatedAt'>; // Cast para o tipo esperado
        await createServico(payload);
        toast.success("Serviço adicionado com sucesso!");
      }
      setShowAddEditModal(false);
      setServicoEmEdicao(null);
      if (onServicosUpdated) onServicosUpdated(); // Notificar pai
    } catch (err) {
      toast.error(`Erro ao salvar serviço: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDeleteConfirm = (servicoId: string) => {
    setIdServicoParaExcluir(servicoId);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!idServicoParaExcluir) return;
    setIsSubmitting(true); // Reutilizar para o botão de exclusão no alert
    try {
      await deleteServico(idServicoParaExcluir, licitacaoId);
      toast.success("Serviço excluído com sucesso!");
      setShowDeleteConfirm(false);
      setIdServicoParaExcluir(null);
      if (onServicosUpdated) onServicosUpdated(); // Notificar pai
    } catch (err) {
      toast.error(`Erro ao excluir serviço: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setIsSubmitting(false);
    }
  };


  // Formatar valor monetário
  const formatarValor = (valor?: number | null) => {
    if (valor === null || valor === undefined) return "N/A";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const calcularValorTotalServicos = () => {
    return servicos.reduce((acc, servico) => {
      const valor = servico.valor || 0;
      const quantidade = servico.quantidade || 0;
      return acc + (valor * quantidade);
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-base font-medium text-gray-700">Serviços/Itens Propostos</h3>
        {isEditing && ( // Botão de adicionar só aparece se a licitação principal estiver em modo de edição
          <Button size="sm" className="gap-2" onClick={handleOpenAddModal}>
            <Plus className="w-4 h-4" />
            Adicionar Item/Serviço
          </Button>
        )}
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="ml-2 text-muted-foreground">Carregando serviços...</p>
        </div>
      ) : error ? (
        <p className="text-red-500 text-center">Erro ao carregar serviços: {error}</p>
      ) : servicos.length > 0 ? (
        <div className="border rounded-md">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Descrição</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Unit.</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd.</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Unidade</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                {isEditing && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {servicos.map((servico) => (
                <tr key={servico.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{servico.nome}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{servico.descricao || "-"}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-500">{formatarValor(servico.valor)}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-500">{servico.quantidade || 1}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-500 hidden sm:table-cell">{servico.unidade || "-"}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-gray-700">
                    {formatarValor((servico.valor || 0) * (servico.quantidade || 0))}
                  </td>
                  {isEditing && (
                    <td className="px-4 py-3 text-sm text-right space-x-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditModal(servico)}>
                        <Edit3 className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDeleteConfirm(servico.id)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end items-center px-4 py-3 bg-gray-50 border-t">
            <span className="text-sm font-medium text-gray-700">Valor Total dos Serviços:</span>
            <span className="text-lg font-bold text-gray-900 ml-2">
              {formatarValor(calcularValorTotalServicos())}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 border rounded-md bg-gray-50">
          <PackageIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500">Nenhum serviço cadastrado para esta licitação.</p>
          {isEditing && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-2"
              onClick={handleOpenAddModal}
            >
              <Plus className="w-4 h-4" />
              Adicionar Item/Serviço
            </Button>
          )}
        </div>
      )}
      
      {/* Modal Adicionar/Editar Serviço */}
      <Dialog open={showAddEditModal} onOpenChange={(isOpen) => {
        setShowAddEditModal(isOpen);
        if (!isOpen) setServicoEmEdicao(null); // Limpar ao fechar
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{servicoEmEdicao ? "Editar Serviço" : "Adicionar Novo Serviço"}</DialogTitle>
            <DialogDescription>
              {servicoEmEdicao ? "Modifique os dados do serviço." : "Preencha os dados do novo serviço para a licitação."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="servico-nome">Nome do Serviço*</Label>
              <Input id="servico-nome" name="nome" value={servicoFormData.nome || ""} onChange={handleFormChange} placeholder="Nome do serviço/item"/>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="servico-descricao">Descrição</Label>
              <Textarea id="servico-descricao" name="descricao" value={servicoFormData.descricao || ""} onChange={handleFormChange} placeholder="Descrição detalhada"/>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="servico-valor">Valor Unitário*</Label>
                <Input id="servico-valor" name="valor" type="number" value={servicoFormData.valor || 0} onChange={handleFormChange} placeholder="0.00"/>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="servico-quantidade">Quantidade*</Label>
                <Input id="servico-quantidade" name="quantidade" type="number" value={servicoFormData.quantidade || 1} onChange={handleFormChange} placeholder="1"/>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="servico-unidade">Unidade</Label>
                <Input id="servico-unidade" name="unidade" value={servicoFormData.unidade || "un"} onChange={handleFormChange} placeholder="un, vb, m²"/>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddEditModal(false); setServicoEmEdicao(null); }} disabled={isSubmitting}>Cancelar</Button>
            <Button onClick={handleSubmitServico} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Save className="h-4 w-4 mr-2" />}
              {servicoEmEdicao ? "Salvar Alterações" : "Adicionar Serviço"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog para Excluir Serviço */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIdServicoParaExcluir(null)} disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-500 hover:bg-red-600" // Mantido como estava, ou use destructive variant
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Trash2 className="h-4 w-4 mr-2" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}