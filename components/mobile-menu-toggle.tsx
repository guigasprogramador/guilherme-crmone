"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, FileText, Settings, LogOut, HelpCircle, DollarSign, FileSpreadsheet, Briefcase, FolderKanban, Bell } from "lucide-react"
import { Logo } from "@/components/ui/logo"
import { Separator } from "@/components/ui/separator"

export function MobileMenuToggle() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const routes = [
    { path: "/dashboard", label: "Dashboard", icon: Home },
    { path: "/comercial", label: "Comercial", icon: DollarSign },
    { path: "/licitacoes", label: "Licitações", icon: FileText },
    { path: "/documentos", label: "Documentos", icon: FileSpreadsheet },
    { path: "/propostas", label: "Propostas", icon: Briefcase },
    { path: "/projetos", label: "Projetos", icon: FolderKanban },
  ]

  const secondaryRoutes = [
    { path: "/notificacoes", label: "Notificações", icon: Bell },
  ]

  const bottomRoutes = [
    { path: "/configuracoes", label: "Configurações", icon: Settings },
    { path: "/suporte", label: "Suporte", icon: HelpCircle },
    { path: "/sair", label: "Sair da conta", icon: LogOut },
  ]

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 bg-sidebar text-white w-80 sm:w-96">
        <SheetHeader className="border-b border-white/10 p-4">
          <SheetTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Logo />
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setOpen(false)}
              className="text-white hover:bg-white/10 h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col h-full py-4">
          {/* Main Navigation */}
          <div className="flex-1 overflow-auto">
            <nav className="grid gap-1 px-3">
              {routes.map((route) => {
                const isActive = pathname === route.path || (route.path === '/dashboard' && pathname === '/')
                return (
                  <Link key={route.path} href={route.path} onClick={() => setOpen(false)}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start text-white hover:bg-white/10 transition-all duration-200 h-12 px-4",
                        isActive && "bg-white/20 text-white font-medium"
                      )}
                    >
                      <route.icon className="h-5 w-5 mr-3" />
                      <span className="text-base">{route.label}</span>
                    </Button>
                  </Link>
                )
              })}
            </nav>
            
            {/* Secondary Navigation */}
            {secondaryRoutes.length > 0 && (
              <>
                <Separator className="my-4 mx-3 bg-white/10" />
                <nav className="grid gap-1 px-3">
                  {secondaryRoutes.map((route) => {
                    const isActive = pathname === route.path
                    return (
                      <Link key={route.path} href={route.path} onClick={() => setOpen(false)}>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start text-white hover:bg-white/10 transition-all duration-200 h-12 px-4",
                            isActive && "bg-white/20 text-white font-medium"
                          )}
                        >
                          <route.icon className="h-5 w-5 mr-3" />
                          <span className="text-base">{route.label}</span>
                        </Button>
                      </Link>
                    )
                  })}
                </nav>
              </>
            )}
          </div>
          
          {/* Bottom Navigation */}
          <div className="border-t border-white/10 pt-4">
            <nav className="grid gap-1 px-3">
              {bottomRoutes.map((route) => {
                const isActive = pathname === route.path
                return (
                  <Link key={route.path} href={route.path} onClick={() => setOpen(false)}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start text-white hover:bg-white/10 transition-all duration-200 h-12 px-4",
                        isActive && "bg-white/20 text-white font-medium",
                        route.path === '/sair' && "text-red-300 hover:text-red-200 hover:bg-red-500/10"
                      )}
                    >
                      <route.icon className="h-5 w-5 mr-3" />
                      <span className="text-base">{route.label}</span>
                    </Button>
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

