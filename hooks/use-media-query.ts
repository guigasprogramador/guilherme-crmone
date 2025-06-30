"use client"

import { useState, useEffect } from "react"

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  
  useEffect(() => {
    // Create a media query list
    const media = window.matchMedia(query)
    
    // Set the initial value
    setMatches(media.matches)
    
    // Define a callback function to handle changes
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }
    
    // Add the listener to the media query
    media.addEventListener("change", listener)
    
    // Clean up function
    return () => {
      media.removeEventListener("change", listener)
    }
  }, [query])
  
  return matches
}
