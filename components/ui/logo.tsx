"use client"

import Image from "next/image"

interface LogoProps {
  className?: string
}

export function Logo({ className = "" }: LogoProps) {
  return (
    <div className={`flex items-center ${className}`}>
      <Image
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Group%2077-mQmBag2LOsdRnSi3pwvTTD66B4OeGh.png"
        alt="OneFlow Logo"
        width={120}
        height={40}
        className="h-8 object-contain"
      />
    </div>
  )
}

