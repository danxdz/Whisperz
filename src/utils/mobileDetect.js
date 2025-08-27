/**
 * Mobile detection and optimization utilities
 */

export const isMobile = () => {
  // Check multiple indicators for mobile
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  
  // Check for mobile user agents
  if (/android/i.test(userAgent)) return true;
  if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) return true;
  if (/Mobile|mobile/i.test(userAgent)) return true;
  
  // Check for mobile screen size
  if (window.innerWidth <= 768) return true;
  
  // Check for touch support
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    // Additional check for screen size to avoid false positives on touch laptops
    if (window.innerWidth <= 768) return true;
  }
  
  return false;
};

export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

export const isAndroid = () => {
  return /android/i.test(navigator.userAgent);
};

export const getMobileConfig = () => {
  const mobile = isMobile();
  
  return {
    isMobile: mobile,
    isIOS: isIOS(),
    isAndroid: isAndroid(),
    // Reduce memory usage on mobile
    maxMessages: mobile ? 50 : 200,
    maxFriends: mobile ? 20 : 100,
    // Reduce update frequency on mobile
    updateInterval: mobile ? 60000 : 30000,
    // Disable heavy features on mobile
    enableDevTools: !mobile,
    enableAnimations: !mobile,
    // Use simpler encryption on mobile
    useSimpleEncryption: mobile
  };
};

export default {
  isMobile,
  isIOS,
  isAndroid,
  getMobileConfig
};