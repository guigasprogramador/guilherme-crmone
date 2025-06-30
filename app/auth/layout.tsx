// Arquivo: /app/auth/layout.tsx
import "@/app/globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.className} bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen`}>
        <ThemeProvider defaultTheme="light" storageKey="crm-theme">
          <div className="flex items-center justify-center min-h-screen p-4">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
