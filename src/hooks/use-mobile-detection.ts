"use client";

import { useState, useEffect } from 'react';

interface MobileDetection {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  screenWidth: number;
  userAgent: string;
}

export function useMobileDetection(): MobileDetection {
  const [detection, setDetection] = useState<MobileDetection>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouchDevice: false,
    screenWidth: 1024,
    userAgent: '',
  });

  useEffect(() => {
    const checkDevice = () => {
      const screenWidth = window.innerWidth;
      const userAgent = navigator.userAgent.toLowerCase();
      
      // Check for touch device
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Mobile detection based on screen width and user agent
      const isMobile = screenWidth <= 768 || /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      
      // Tablet detection
      const isTablet = screenWidth > 768 && screenWidth <= 1024 && isTouchDevice;
      
      // Desktop detection
      const isDesktop = screenWidth > 1024 && !isTouchDevice;

      setDetection({
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice,
        screenWidth,
        userAgent,
      });
    };

    // Initial check
    checkDevice();

    // Listen for window resize
    window.addEventListener('resize', checkDevice);
    
    return () => {
      window.removeEventListener('resize', checkDevice);
    };
  }, []);

  return detection;
}

// Utility hook for mobile-first responsive design
export function useMobileFirst() {
  const { isMobile, isTablet, screenWidth } = useMobileDetection();
  
  return {
    isMobile,
    isTablet,
    showMobileUI: isMobile,
    showTabletUI: isTablet,
    showDesktopUI: screenWidth > 1024,
    breakpoint: screenWidth <= 768 ? 'mobile' : screenWidth <= 1024 ? 'tablet' : 'desktop'
  };
}

// Hook for conditional mobile rendering
export function useConditionalMobile<T, K>(
  mobileComponent: T,
  desktopComponent: K,
  threshold: number = 768
): T | K {
  const { screenWidth } = useMobileDetection();
  
  return screenWidth <= threshold ? mobileComponent : desktopComponent;
} 