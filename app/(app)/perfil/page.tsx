"use client"

import { useState, useEffect } from "react";
import { CLOUDINARY_CLOUD_NAME } from "@/lib/cloudinary/public";
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Save, Upload, LoaderCircle } from "lucide-react"
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import ProtectedRoute from "@/components/auth/protected-route";

export default function PerfilPage() {
  // Get user from auth context
  const { user, loading } = useAuth();
  
  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [deadlineAlerts, setDeadlineAlerts] = useState(true);
  
  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setAvatarUrl(user.avatar_url || "");
      
      // Fetch additional user details from API
      const fetchUserDetails = async () => {
        try {
          const response = await fetch("/api/users/profile", {
            credentials: "include",
          });
          
          if (response.ok) {
            const data = await response.json();
            setBio(data.bio || "");
            setPhone(data.phone || "");
            setPosition(data.position || "");
            setEmailNotifications(data.preferences?.emailNotifications ?? true);
            setSmsNotifications(data.preferences?.smsNotifications ?? false);
            setDeadlineAlerts(data.preferences?.deadlineAlerts ?? true);
          }
        } catch (error) {
          console.error("Error fetching user details:", error);
        }
      };
      
      fetchUserDetails();
    }
  }, [user]);
  
  // Handle avatar upload
  const handleAvatarUpload = async (file: File) => {
    // Validate file type and size
    if (!file.type.includes("image")) {
      toast.error("Formato inválido. Por favor, envie uma imagem.");
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast.error("Arquivo muito grande. Tamanho máximo: 2MB");
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Upload para Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "crm_documents");
      formData.append("folder", "avatars");
      formData.append("resource_type", "image");
      
      const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData,
      });
      
      const cloudinaryData = await cloudinaryResponse.json();
      
      if (!cloudinaryData.secure_url) {
        throw new Error("Erro ao enviar imagem para Cloudinary");
      }
      
      // Salvar URL no banco de dados através da API
      const profileResponse = await fetch("/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          avatarUrl: cloudinaryData.secure_url,
        }),
        credentials: "include",
      });
      
      if (!profileResponse.ok) {
        throw new Error("Erro ao salvar avatar no perfil");
      }
      
      setAvatarUrl(cloudinaryData.secure_url);
      toast.success("Avatar atualizado com sucesso");
      
    } catch (error) {
      console.error("Erro ao fazer upload do avatar:", error);
      
      let errorMessage = "Erro ao atualizar avatar";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };
  
  // Handle profile update
  const handleProfileUpdate = async () => {
    setIsSaving(true);
    
    try {
      const response = await fetch("/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          bio,
          phone,
          position,
        }),
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Falha ao atualizar perfil");
      }
      
      toast.success("Perfil atualizado com sucesso");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Erro ao atualizar perfil. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle preferences update
  const handlePreferencesUpdate = async () => {
    setIsSaving(true);
    
    try {
      const response = await fetch("/api/users/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailNotifications,
          smsNotifications,
          deadlineAlerts,
        }),
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Falha ao atualizar preferências");
      }
      
      toast.success("Preferências atualizadas com sucesso");
    } catch (error) {
      console.error("Error updating preferences:", error);
      toast.error("Erro ao atualizar preferências. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };
  
  // Get initials for avatar fallback
  const getInitials = () => {
    if (!name) return "U";
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };
  
  return (
    <ProtectedRoute>
      <div className="flex flex-col p-4 md:p-8 gap-6 pb-20 md:pb-8">
        <h1 className="text-2xl font-bold">Meu Perfil</h1>

        <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
          <Card>
            <CardContent className="pt-6 flex flex-col items-center">
              <Avatar className="h-32 w-32">
                <AvatarImage src={avatarUrl || "/placeholder.svg?height=128&width=128"} alt={name} />
                <AvatarFallback>{getInitials()}</AvatarFallback>
              </Avatar>
              <label htmlFor="avatar-upload" className="w-full">
                <Button className="w-full" disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Alterar Foto
                    </>
                  )}
                </Button>
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleAvatarUpload(file);
                  }
                }}
                disabled={isUploading}
              />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>Atualize suas informações pessoais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome</Label>
                    <Input 
                      id="nome" 
                      placeholder="Seu nome" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cargo">Cargo</Label>
                    <Input 
                      id="cargo" 
                      placeholder="Seu cargo" 
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="Seu email" 
                      value={email}
                      readOnly 
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input 
                      id="telefone" 
                      placeholder="Seu telefone" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Biografia</Label>
                  <Textarea
                    id="bio"
                    placeholder="Conte um pouco sobre você"
                    className="min-h-[100px]"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button onClick={handleProfileUpdate} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preferências</CardTitle>
                <CardDescription>Configure suas preferências de notificação</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications">Notificações por Email</Label>
                    <p className="text-sm text-muted-foreground">Receba notificações por email sobre licitações</p>
                  </div>
                  <Switch 
                    id="email-notifications" 
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sms-notifications">Notificações por SMS</Label>
                    <p className="text-sm text-muted-foreground">Receba notificações por SMS sobre licitações</p>
                  </div>
                  <Switch 
                    id="sms-notifications" 
                    checked={smsNotifications}
                    onCheckedChange={setSmsNotifications}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="prazo-notifications">Alertas de Prazo</Label>
                    <p className="text-sm text-muted-foreground">Receba alertas quando o prazo estiver próximo</p>
                  </div>
                  <Switch 
                    id="prazo-notifications" 
                    checked={deadlineAlerts}
                    onCheckedChange={setDeadlineAlerts}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button onClick={handlePreferencesUpdate} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Preferências
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
