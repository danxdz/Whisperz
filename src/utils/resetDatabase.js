/**
 * Utility to reset/clear the GunDB database
 * This will clear all local storage data related to Gun
 */

export const resetGunDatabase = () => {
  try {
    console.log('🗑️ Starting database reset...');
    
    // Clear all localStorage items related to Gun
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('gun/') ||
        key.startsWith('radata') ||
        key.startsWith('_gun_') ||
        key === 'gun' ||
        key === 'gun_instance' ||
        key.includes('SEA') ||
        key.includes('sea')
      )) {
        keysToRemove.push(key);
      }
    }
    
    // Remove all Gun-related keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`  ✅ Removed: ${key}`);
    });
    
    // Clear sessionStorage as well
    const sessionKeysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (
        key.startsWith('gun/') ||
        key.startsWith('radata') ||
        key.startsWith('_gun_') ||
        key === 'gun' ||
        key.includes('SEA') ||
        key.includes('sea')
      )) {
        sessionKeysToRemove.push(key);
      }
    }
    
    sessionKeysToRemove.forEach(key => {
      sessionStorage.removeItem(key);
      console.log(`  ✅ Removed from session: ${key}`);
    });
    
    // Clear IndexedDB if it exists
    if (window.indexedDB) {
      const databases = ['radata', 'gun', 'gunDB'];
      databases.forEach(dbName => {
        try {
          indexedDB.deleteDatabase(dbName);
          console.log(`  ✅ Deleted IndexedDB: ${dbName}`);
        } catch (e) {
          // Ignore errors for non-existent databases
        }
      });
    }
    
    console.log('✅ Database reset complete!');
    console.log('🔄 Please refresh the page to start fresh.');
    
    return true;
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    return false;
  }
};

// Add to window for easy access from console
if (typeof window !== 'undefined') {
  window.resetGunDB = resetGunDatabase;
  console.log('💡 Database reset available: Call window.resetGunDB() to clear all Gun data');
}

export default resetGunDatabase;