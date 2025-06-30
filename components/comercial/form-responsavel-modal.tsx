"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch"; // Para o campo 'ativo'
import { useToast } from "@/components/ui/use-toast"; // Para feedback
import { Responsavel } from '@/types/comercial'; // Ajuste o path se necessário
import { useResponsaveis } from '@/hooks/comercial/use-responsaveis'; // Ajuste o path se necessário
import { Loader2 } from 'lucide-react';

interface FormResponsavelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  responsavelParaEditar?: Responsavel | null;
  onResponsavelSalvo: () => void; // Callback para atualizar a lista após salvar
}

export function FormResponsavelModal({
  open,
  onOpenChange,
  responsavelParaEditar,
  onResponsavelSalvo,
}: FormResponsavelModalProps) {
  const { toast } = useToast();
  const { createResponsavel, updateResponsavel, isLoading: isHookLoading } = useResponsaveis();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<Responsavel>>({
    nome: "",
    email: "",
    cargo: "",
    departamento: "",
    telefone: "",
    ativo: true, // Default para novo responsável
    user_id: null, // Default como null
  });

  const isEditMode = !!responsavelParaEditar;

  useEffect(() => {
    if (responsavelParaEditar && open) {
      setFormData({
        nome: responsavelParaEditar.nome || "",
        email: responsavelParaEditar.email || "",
        cargo: responsavelParaEditar.cargo || "",
        departamento: responsavelParaEditar.departamento || "",
        telefone: responsavelParaEditar.telefone || "",
        ativo: responsavelParaEditar.ativo !== undefined ? responsavelParaEditar.ativo : true,
        user_id: responsavelParaEditar.user_id || null,
      });
    } else if (!isEditMode && open) {
      // Reset para novo responsável quando o modal abre para criação
      setFormData({
        nome: "",
        email: "",
        cargo: "",
        departamento: "",
        telefone: "",
        ativo: true,
        user_id: null,
      });
    }
  }, [responsavelParaEditar, open, isEditMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, ativo: checked }));
  };

  // TODO: Adicionar um Select para user_id, populado com usuários da API /api/users
  // que ainda não estão vinculados a nenhum responsável na tabela 'responsaveis'.
  // Por agora, user_id será um input de texto ou gerenciado externamente se necessário.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.nome || !formData.email) {
      toast({ title: "Erro de Validação", description: "Nome e Email são obrigatórios.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    try {
      if (isEditMode && responsavelParaEditar?.id) {
        // A função updateResponsavel espera o payload sem o id, pois o id é passado como primeiro argumento
        const { id, created_at, updated_at, ...payload } = formData;
        await updateResponsavel(responsavelParaEditar.id, payload as Partial<Omit<Responsavel, 'id' | 'created_at' | 'updated_at'>>);
        toast({ title: "Sucesso", description: "Responsável atualizado com sucesso." });
      } else {
        await createResponsavel(formData as Omit<Responsavel, 'id' | 'created_at' | 'updated_at'>); // Cast para o tipo esperado
        toast({ title: "Sucesso", description: "Responsável criado com sucesso." });
      }
      onResponsavelSalvo();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao salvar responsável.", variant: "destructive" });
      console.error("Falha ao salvar responsável:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Editar Responsável" : "Adicionar Novo Responsável"}</DialogTitle>
            <DialogDescription>
              {isEditMode ? "Atualize os dados do responsável." : "Preencha os dados do novo responsável."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nome" className="text-right">Nome*</Label>
              <Input id="nome" name="nome" value={formData.nome || ""} onChange={handleChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email*</Label>
              <Input id="email" name="email" type="email" value={formData.email || ""} onChange={handleChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cargo" className="text-right">Cargo</Label>
              <Input id="cargo" name="cargo" value={formData.cargo || ""} onChange={handleChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="departamento" className="text-right">Departamento</Label>
              <Input id="departamento" name="departamento" value={formData.departamento || ""} onChange={handleChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="telefone" className="text-right">Telefone</Label>
              <Input id="telefone" name="telefone" value={formData.telefone || ""} onChange={handleChange} className="col-span-3" />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user_id" className="text-right">ID do Usuário (Opcional)</Label>
              <Input id="user_id" name="user_id" value={formData.user_id || ""} onChange={handleChange} className="col-span-3" placeholder="ID do usuário do sistema (se aplicável)" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ativo" className="text-right">Ativo</Label>
              <Switch id="ativo" checked={formData.ativo} onCheckedChange={handleSwitchChange} /> {/* Removido col-span-3 para alinhar corretamente */}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting || isHookLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || isHookLoading}>
              {(isSubmitting || isHookLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? "Salvar Alterações" : "Criar Responsável"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
