"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { HelpCircle, FileText, Mail, Phone, MessageSquare, ExternalLink } from "lucide-react"

export default function SuportePage() {
  const [activeTab, setActiveTab] = useState("faq")
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    assunto: "",
    mensagem: "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Formulário enviado:", formData)
    toast.success("Mensagem enviada com sucesso! Nossa equipe entrará em contato em breve.")
    setFormData({
      nome: "",
      email: "",
      assunto: "",
      mensagem: "",
    })
  }

  const faqItems = [
    {
      question: "Como adicionar uma nova licitação?",
      answer: "Para adicionar uma nova licitação, acesse a página de Licitações e clique no botão 'Nova Licitação' no canto superior direito. Preencha todos os campos obrigatórios e clique em 'Salvar'."
    },
    {
      question: "Como editar os detalhes de um cliente?",
      answer: "Para editar os detalhes de um cliente, acesse a página Comercial, clique no cliente desejado para abrir os detalhes e depois clique no botão 'Editar'. Após fazer as alterações necessárias, clique em 'Salvar'."
    },
    {
      question: "Como atualizar o status de uma licitação?",
      answer: "Existem duas formas de atualizar o status de uma licitação: 1) Na visualização de tabela, clique na licitação para abrir os detalhes e altere o status no painel lateral; 2) Na visualização Kanban, arraste o card da licitação para a coluna do novo status desejado."
    },
    {
      question: "Como adicionar documentos a uma licitação?",
      answer: "Para adicionar documentos a uma licitação, abra os detalhes da licitação, vá para a aba 'Documentos' e clique no botão 'Adicionar Documento'. Selecione o arquivo desejado e adicione uma descrição se necessário."
    },
    {
      question: "Como exportar dados do sistema?",
      answer: "Para exportar dados, acesse a página correspondente (Licitações, Comercial, etc.) e procure pelo botão de exportação, geralmente localizado próximo aos filtros. Você pode exportar os dados em formatos como CSV, Excel ou PDF, dependendo da seção."
    },
    {
      question: "Como configurar notificações?",
      answer: "Para configurar suas notificações, acesse a página de Configurações através do menu lateral e selecione a aba 'Notificações'. Lá você pode personalizar quais tipos de alertas deseja receber e por quais canais (email, sistema, etc.)."
    },
  ]

  const tutoriais = [
    {
      title: "Guia de Início Rápido",
      description: "Aprenda os conceitos básicos para começar a usar o sistema.",
      icon: FileText,
      link: "/documentos/guia-inicio-rapido.pdf"
    },
    {
      title: "Tutorial de Licitações",
      description: "Como gerenciar licitações de forma eficiente.",
      icon: FileText,
      link: "/documentos/tutorial-licitacoes.pdf"
    },
    {
      title: "Gestão de Clientes",
      description: "Aprenda a gerenciar sua base de clientes e contatos.",
      icon: FileText,
      link: "/documentos/gestao-clientes.pdf"
    },
    {
      title: "Relatórios e Dashboards",
      description: "Como extrair insights dos dados do sistema.",
      icon: FileText,
      link: "/documentos/relatorios-dashboards.pdf"
    },
  ]

  return (
    <div className="p-4 md:p-6 overflow-hidden">
      <h1 className="text-2xl font-bold mb-6">Suporte</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="faq">
            <HelpCircle className="w-4 h-4 mr-2" />
            Perguntas Frequentes
          </TabsTrigger>
          <TabsTrigger value="tutoriais">
            <FileText className="w-4 h-4 mr-2" />
            Tutoriais
          </TabsTrigger>
          <TabsTrigger value="contato">
            <MessageSquare className="w-4 h-4 mr-2" />
            Contato
          </TabsTrigger>
        </TabsList>

        <TabsContent value="faq" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Perguntas Frequentes</CardTitle>
              <CardDescription>
                Encontre respostas para as dúvidas mais comuns sobre o sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqItems.map((item, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
                    <AccordionContent>{item.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tutoriais" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tutoriais e Documentação</CardTitle>
              <CardDescription>
                Aprenda a utilizar todas as funcionalidades do sistema com nossos guias detalhados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tutoriais.map((tutorial, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className="bg-primary/10 p-2 rounded-lg">
                            <tutorial.icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-medium">{tutorial.title}</h3>
                            <p className="text-sm text-muted-foreground">{tutorial.description}</p>
                          </div>
                        </div>
                        <div className="mt-4">
                          <Button variant="outline" className="w-full" asChild>
                            <a href={tutorial.link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center">
                              Acessar
                              <ExternalLink className="ml-2 h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contato" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Entre em Contato</CardTitle>
                  <CardDescription>
                    Preencha o formulário abaixo e nossa equipe entrará em contato o mais breve possível.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nome">Nome</Label>
                        <Input
                          id="nome"
                          name="nome"
                          placeholder="Seu nome completo"
                          value={formData.nome}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="seu.email@exemplo.com"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assunto">Assunto</Label>
                      <Input
                        id="assunto"
                        name="assunto"
                        placeholder="Assunto da mensagem"
                        value={formData.assunto}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mensagem">Mensagem</Label>
                      <Textarea
                        id="mensagem"
                        name="mensagem"
                        placeholder="Descreva sua dúvida ou problema em detalhes"
                        rows={5}
                        value={formData.mensagem}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full md:w-auto">
                      Enviar Mensagem
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Informações de Contato</CardTitle>
                  <CardDescription>
                    Outras formas de entrar em contato com nossa equipe de suporte.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h3 className="font-medium">E-mail</h3>
                      <p className="text-sm text-muted-foreground">suporte@crmlicitacoes.com.br</p>
                      <p className="text-sm text-muted-foreground">comercial@crmlicitacoes.com.br</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h3 className="font-medium">Telefone</h3>
                      <p className="text-sm text-muted-foreground">(11) 3456-7890</p>
                      <p className="text-sm text-muted-foreground">0800 123 4567</p>
                    </div>
                  </div>

                  <div className="pt-4">
                    <h3 className="font-medium mb-2">Horário de Atendimento</h3>
                    <p className="text-sm text-muted-foreground">Segunda a Sexta: 8h às 18h</p>
                    <p className="text-sm text-muted-foreground">Sábado: 9h às 13h</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
