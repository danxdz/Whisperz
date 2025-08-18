import { useState, useEffect } from 'react';

/**
 * Custom hook for managing localStorage with React state
 * Provides automatic synchronization between localStorage and component state
 * 
 * @param {string} key - The localStorage key
 * @param {*} initialValue - The initial value if no value exists in localStorage
 * @returns {[*, Function]} - Current value and setter function
 */
export function useLocalStorage(_, initialValue) {
  // Get initial value from localStorage or use provided initial value
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      // console.error(`Error loading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Update localStorage when state changes
  const setValue = (value) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      setStoredValue(valueToStore);
      window.localStorage.setItem(_, JSON.stringify(valueToStore));
      
      // Dispatch a custom event to sync across tabs
      window.dispatchEvent(new CustomEvent('localStorage-update', {
        detail: { key, value: valueToStore }
      }));
    } catch {
      // console.error(`Error saving to localStorage key "${key}":`, error);
    }
  };

  // Listen for changes in other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === key && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch {
          // console.error(`Error parsing localStorage change for key "${key}":`, error);
        }
      }
    };

    const handleCustomEvent = (e) => {
      if (e.detail.key === key) {
        setStoredValue(e.detail.value);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorage-update', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorage-update', handleCustomEvent);
    };
  }, [key]);

  return [storedValue, setValue];
}

export default useLocalStorage;