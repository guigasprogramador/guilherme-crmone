"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthLogo } from "@/components/ui/auth-logo";

export default function AuthPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <AuthLogo className="scale-150" />
        </div>
        
        <Card className="w-full shadow-xl border-0">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold text-center text-gray-800">CRM Licitações</CardTitle>
            <CardDescription className="text-center text-gray-600">
              Escolha uma opção para continuar
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4">
              <Link href="/auth/login">
                <Button className="w-full h-11 bg-blue-600 hover:bg-blue-700">Entrar</Button>
              </Link>
              <Link href="/auth/register">
                <Button variant="outline" className="w-full h-11">Criar uma conta</Button>
              </Link>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col">
            <p className="text-xs text-center text-gray-500 mt-4">
              © {new Date().getFullYear()} CRM Licitações - OneFlow. Todos os direitos reservados.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}