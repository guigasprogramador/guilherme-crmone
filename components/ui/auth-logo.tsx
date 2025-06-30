import Image from "next/image"

interface AuthLogoProps {
  className?: string
}

export function AuthLogo({ className = "" }: AuthLogoProps) {
  return (
    <div className={`flex items-center ${className}`}>
      <div className="bg-[#1B3A53] rounded-lg px-4 py-2 shadow-md">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Group%2077-mQmBag2LOsdRnSi3pwvTTD66B4OeGh.png"
          alt="OneFlow Logo"
          width={120}
          height={40}
          className="h-8 object-contain"
        />
      </div>
    </div>
  )
}