"use client"

import { usePathname } from "next/navigation";
import { SideNav } from "@/components/side-nav";
import { MobileNav } from "@/components/mobile-nav";
import { UserNav } from "@/components/user-nav";
import { MobileMenuToggle } from "@/components/mobile-menu-toggle";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useIsMobile } from "@/components/ui/use-mobile";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith("/auth");
  const isMobile = useIsMobile();

  if (isAuthPage) return <>{children}</>; // não renderiza sidebar/header no login

  return (
    <div className="flex min-h-screen bg-[#F5F5F5] relative">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <SideNav />
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col w-full min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-white px-4 md:px-6 shadow-sm">
          <div className="flex flex-1 items-center justify-between gap-4">
            {/* Mobile Menu Toggle */}
            <div className="lg:hidden">
              <MobileMenuToggle />
            </div>
            
            {/* Page Title - Hidden on mobile to save space */}
            <div className="hidden sm:block flex-1">
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {pathname === '/dashboard' && 'Dashboard'}
                {pathname === '/comercial' && 'Comercial'}
                {pathname === '/licitacoes' && 'Licitações'}
                {pathname === '/documentos' && 'Documentos'}
                {pathname === '/propostas' && 'Propostas'}
                {pathname === '/projetos' && 'Projetos'}
                {pathname === '/configuracoes' && 'Configurações'}
                {pathname === '/suporte' && 'Suporte'}
              </h1>
            </div>
            
            {/* Header Actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/notificacoes">
                <Button variant="ghost" size="icon" className="text-muted-foreground relative h-9 w-9">
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
                    3
                  </span>
                </Button>
              </Link>
              <UserNav />
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-4 sm:p-6 max-w-full">
            {children}
          </div>
        </main>
        
        {/* Mobile Bottom Padding */}
        <div className="h-16 lg:hidden" /> {/* Spacer for mobile nav */}
      </div>
      
      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}
