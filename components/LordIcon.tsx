"use client";
import { useEffect, useRef } from "react";

interface LordIconProps {
  src: string;
  trigger: string;
  colors?: string;
  stroke?: string;
  style?: React.CSSProperties;
  className?: string;
}

export const LordIcon: React.FC<LordIconProps> = ({ src, trigger, colors, stroke, style, className }) => {
  const iconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load lordicon script if not already loaded
    if (!document.querySelector('script[src*="lordicon.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://cdn.lordicon.com/lordicon.js';
      script.async = true;
      document.head.appendChild(script);
    }

    // Create the lord-icon element
    if (iconRef.current) {
      const lordIcon = document.createElement('lord-icon');
      lordIcon.setAttribute('src', src);
      lordIcon.setAttribute('trigger', trigger);
      if (colors) lordIcon.setAttribute('colors', colors);
      
      // Apply styles
      if (style) {
        Object.assign(lordIcon.style, style);
      }
      
      iconRef.current.innerHTML = '';
      iconRef.current.appendChild(lordIcon);
    }
  }, [src, trigger, colors, style]);

  return <div ref={iconRef} className={className} />;
};
