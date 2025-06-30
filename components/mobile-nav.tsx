"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Home, FileText, Bell, Settings, LayoutDashboard, DollarSign, Briefcase, FolderKanban } from "lucide-react"

export function MobileNav() {
  const pathname = usePathname()

  const routes = [
    { path: "/dashboard", label: "Home", icon: Home },
    { path: "/comercial", label: "Comercial", icon: DollarSign },
    { path: "/licitacoes", label: "Licitações", icon: LayoutDashboard },
    { path: "/documentos", label: "Docs", icon: FileText },
    { path: "/propostas", label: "Propostas", icon: Briefcase },
  ]

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-white border-t border-gray-200 flex items-center justify-around lg:hidden shadow-lg">
        {routes.map((route) => {
          const isActive = pathname === route.path || (route.path === '/dashboard' && pathname === '/')
          return (
            <Link key={route.path} href={route.path} className="flex-1">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "flex flex-col h-14 w-full items-center justify-center rounded-none transition-all duration-200 relative",
                  isActive 
                    ? "text-primary bg-primary/5" 
                    : "text-muted-foreground hover:text-primary hover:bg-primary/5",
                )}
              >
                <route.icon className={cn(
                  "h-5 w-5 transition-all duration-200",
                  isActive ? "scale-110" : ""
                )} />
                <span className={cn(
                  "text-xs mt-1 font-medium transition-all duration-200",
                  isActive ? "text-primary" : ""
                )}>
                  {route.label}
                </span>
                {isActive && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-primary rounded-b-full" />
                )}
              </Button>
            </Link>
          )
        })}
      </div>
      
      {/* Safe Area for devices with home indicator */}
      <div className="fixed bottom-0 left-0 w-full h-safe-area-inset-bottom bg-white lg:hidden" />
    </>
  )
}

