import { useState, useEffect } from 'react';

export function useResponsive() {
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
    isTiny: window.innerWidth <= 320,    // 4-inch screens
    isMobile: window.innerWidth <= 480,   // Mobile
    isTablet: window.innerWidth <= 768,   // Tablet
    isDesktop: window.innerWidth > 768    // Desktop
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setDimensions({
        width,
        height,
        isTiny: width <= 320,
        isMobile: width <= 480,
        isTablet: width <= 768,
        isDesktop: width > 768
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return dimensions;
}

// Responsive values helper
export function responsive(tinyValue, mobileValue, tabletValue, desktopValue) {
  const width = window.innerWidth;
  if (width <= 320) return tinyValue;
  if (width <= 480) return mobileValue;
  if (width <= 768) return tabletValue;
  return desktopValue;
}