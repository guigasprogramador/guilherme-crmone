"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Camera, 
  Upload, 
  Trash2, 
  Save, 
  Loader2,
  Shield,
  Bell,
  Palette,
  Eye,
  EyeOff,
  Key
} from "lucide-react"

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  avatarUrl?: string
  bio?: string
  phone?: string
  position?: string
  preferences: {
    emailNotifications: boolean
    smsNotifications: boolean
    theme: 'light' | 'dark' | 'system'
  }
  createdAt: string
  updatedAt: string
}

interface GerenciarPerfilProps {
  onProfileUpdated?: (profile: UserProfile) => void
}

export function GerenciarPerfil({ onProfileUpdated }: GerenciarPerfilProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [activeTab, setActiveTab] = useState("perfil")
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Estados para alteração de senha
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Carregar perfil do usuário
  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/users/profile', {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar perfil')
      }

      const data = await response.json()
      setProfile(data)
    } catch (error: any) {
      console.error('Erro ao carregar perfil:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar o perfil",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Validar dados do perfil
  const validateProfile = (data: Partial<UserProfile>): Record<string, string> => {
    const newErrors: Record<string, string> = {}

    if (!data.name?.trim()) {
      newErrors.name = "Nome é obrigatório"
    } else if (data.name.trim().length < 2) {
      newErrors.name = "Nome deve ter pelo menos 2 caracteres"
    }

    if (!data.email?.trim()) {
      newErrors.email = "Email é obrigatório"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = "Email inválido"
    }

    if (data.phone && !/^[\d\s\-\(\)\+]+$/.test(data.phone)) {
      newErrors.phone = "Telefone inválido"
    }

    if (data.bio && data.bio.length > 500) {
      newErrors.bio = "Bio deve ter no máximo 500 caracteres"
    }

    return newErrors
  }

  // Validar senha
  const validatePassword = (): Record<string, string> => {
    const newErrors: Record<string, string> = {}

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = "Senha atual é obrigatória"
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = "Nova senha é obrigatória"
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = "Nova senha deve ter pelo menos 8 caracteres"
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      newErrors.newPassword = "Nova senha deve conter pelo menos 1 maiúscula, 1 minúscula e 1 número"
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = "Confirmação de senha não confere"
    }

    return newErrors
  }

  // Atualizar perfil
  const handleUpdateProfile = async () => {
    if (!profile) return

    const validationErrors = validateProfile(profile)
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      toast({
        title: "Erro de validação",
        description: "Corrija os erros antes de salvar",
        variant: "destructive"
      })
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(profile)
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar perfil')
      }

      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso"
      })

      if (onProfileUpdated) {
        onProfileUpdated(profile)
      }

      // Recarregar perfil para obter dados atualizados
      await loadProfile()

    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  // Upload de avatar para Cloudinary
  const handleAvatarUpload = async (file: File) => {
    if (!file) return

    // Validar arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Selecione apenas arquivos de imagem",
        variant: "destructive"
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast({
        title: "Erro",
        description: "Arquivo muito grande. Máximo 5MB",
        variant: "destructive"
      })
      return
    }

    try {
      setIsUploadingAvatar(true)
      
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/auth/avatar', {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro no upload')
      }

      const data = await response.json()
      
      // Atualizar avatar no estado local
      if (profile) {
        setProfile({
          ...profile,
          avatarUrl: data.avatarUrl
        })
      }

      toast({
        title: "Sucesso",
        description: "Avatar atualizado com sucesso"
      })

    } catch (error: any) {
      console.error('Erro no upload do avatar:', error)
      toast({
        title: "Erro",
        description: error.message || "Erro ao fazer upload do avatar",
        variant: "destructive"
      })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  // Remover avatar
  const handleRemoveAvatar = async () => {
    try {
      setIsUploadingAvatar(true)
      
      const response = await fetch('/api/auth/avatar', {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Erro ao remover avatar')
      }

      // Atualizar avatar no estado local
      if (profile) {
        setProfile({
          ...profile,
          avatarUrl: undefined
        })
      }

      toast({
        title: "Sucesso",
        description: "Avatar removido com sucesso"
      })

    } catch (error: any) {
      console.error('Erro ao remover avatar:', error)
      toast({
        title: "Erro",
        description: "Erro ao remover avatar",
        variant: "destructive"
      })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  // Alterar senha
  const handleChangePassword = async () => {
    const validationErrors = validatePassword()
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      return
    }

    try {
      setSaving(true)
      
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao alterar senha')
      }

      toast({
        title: "Sucesso",
        description: "Senha alterada com sucesso"
      })

      // Limpar formulário
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      })
      setShowPasswordForm(false)

    } catch (error: any) {
      console.error('Erro ao alterar senha:', error)
      toast({
        title: "Erro",
        description: error.message || "Erro ao alterar senha",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  // Handlers para inputs
  const handleInputChange = (field: string, value: any) => {
    if (!profile) return

    setProfile({
      ...profile,
      [field]: value
    })

    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handlePreferenceChange = (field: string, value: any) => {
    if (!profile) return

    setProfile({
      ...profile,
      preferences: {
        ...profile.preferences,
        [field]: value
      }
    })
  }

  // Obter iniciais do nome para avatar fallback
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Obter cor do badge baseado no role
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive'
      case 'manager': return 'default'
      case 'user': return 'secondary'
      default: return 'outline'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando perfil...</span>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Erro ao carregar perfil</p>
        <Button onClick={loadProfile} className="mt-4">
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meu Perfil</h1>
          <p className="text-muted-foreground">
            Gerencie suas informações pessoais e preferências
          </p>
        </div>
        <Badge variant={getRoleBadgeVariant(profile.role)}>
          {profile.role}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="perfil">
            <User className="h-4 w-4 mr-2" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="preferencias">
            <Bell className="h-4 w-4 mr-2" />
            Preferências
          </TabsTrigger>
          <TabsTrigger value="seguranca">
            <Shield className="h-4 w-4 mr-2" />
            Segurança
          </TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>
                Atualize suas informações básicas e foto de perfil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile.avatarUrl} alt={profile.name} />
                    <AvatarFallback className="text-lg">
                      {getInitials(profile.name)}
                    </AvatarFallback>
                  </Avatar>
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Alterar Foto
                    </Button>
                    
                    {profile.avatarUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveAvatar}
                        disabled={isUploadingAvatar}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remover
                      </Button>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    JPG, PNG ou WebP. Máximo 5MB.
                  </p>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handleAvatarUpload(file)
                      }
                    }}
                  />
                </div>
              </div>

              <Separator />

              {/* Campos do perfil */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Nome Completo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={profile.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="(11) 99999-9999"
                    className={errors.phone ? "border-red-500" : ""}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-500">{errors.phone}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">Cargo/Posição</Label>
                  <Input
                    id="position"
                    value={profile.position || ''}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    placeholder="Ex: Gerente de Vendas"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Biografia</Label>
                <Textarea
                  id="bio"
                  value={profile.bio || ''}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Conte um pouco sobre você..."
                  rows={4}
                  className={errors.bio ? "border-red-500" : ""}
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  {errors.bio && (
                    <p className="text-red-500">{errors.bio}</p>
                  )}
                  <p className="ml-auto">
                    {(profile.bio || '').length}/500 caracteres
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={handleUpdateProfile}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferencias" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notificações</CardTitle>
              <CardDescription>
                Configure como você deseja receber notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações por Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber notificações importantes por email
                  </p>
                </div>
                <Switch
                  checked={profile.preferences.emailNotifications}
                  onCheckedChange={(checked) => 
                    handlePreferenceChange('emailNotifications', checked)
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações por SMS</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber notificações urgentes por SMS
                  </p>
                </div>
                <Switch
                  checked={profile.preferences.smsNotifications}
                  onCheckedChange={(checked) => 
                    handlePreferenceChange('smsNotifications', checked)
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
              <CardDescription>
                Personalize a aparência da interface
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Tema</Label>
                <Select
                  value={profile.preferences.theme}
                  onValueChange={(value) => 
                    handlePreferenceChange('theme', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Claro</SelectItem>
                    <SelectItem value="dark">Escuro</SelectItem>
                    <SelectItem value="system">Sistema</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              onClick={handleUpdateProfile}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Preferências
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="seguranca" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>
                Mantenha sua conta segura com uma senha forte
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showPasswordForm ? (
                <Button 
                  onClick={() => setShowPasswordForm(true)}
                  variant="outline"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Alterar Senha
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">
                      Senha Atual <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({
                          ...prev,
                          currentPassword: e.target.value
                        }))}
                        className={errors.currentPassword ? "border-red-500" : ""}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPasswords(prev => ({
                          ...prev,
                          current: !prev.current
                        }))}
                      >
                        {showPasswords.current ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {errors.currentPassword && (
                      <p className="text-sm text-red-500">{errors.currentPassword}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">
                      Nova Senha <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({
                          ...prev,
                          newPassword: e.target.value
                        }))}
                        className={errors.newPassword ? "border-red-500" : ""}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPasswords(prev => ({
                          ...prev,
                          new: !prev.new
                        }))}
                      >
                        {showPasswords.new ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {errors.newPassword && (
                      <p className="text-sm text-red-500">{errors.newPassword}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Mínimo 8 caracteres, incluindo maiúscula, minúscula e número
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">
                      Confirmar Nova Senha <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({
                          ...prev,
                          confirmPassword: e.target.value
                        }))}
                        className={errors.confirmPassword ? "border-red-500" : ""}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPasswords(prev => ({
                          ...prev,
                          confirm: !prev.confirm
                        }))}
                      >
                        {showPasswords.confirm ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Button 
                      onClick={handleChangePassword}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Alterando...
                        </>
                      ) : (
                        "Alterar Senha"
                      )}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setShowPasswordForm(false)
                        setPasswordData({
                          currentPassword: "",
                          newPassword: "",
                          confirmPassword: ""
                        })
                        setErrors({})
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações da Conta</CardTitle>
              <CardDescription>
                Detalhes sobre sua conta e atividade
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">ID da Conta</Label>
                  <p className="font-mono">{profile.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tipo de Conta</Label>
                  <p className="capitalize">{profile.role}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Criada em</Label>
                  <p>{new Date(profile.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Última atualização</Label>
                  <p>{new Date(profile.updatedAt).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

