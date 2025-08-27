#!/usr/bin/env node

/**
 * Reset Database Script
 * Run this to clear all Gun database data
 * Usage: node reset-db.js
 */

console.log('🗑️ Gun Database Reset Tool');
console.log('==========================');
console.log('');
console.log('This tool helps reset the Gun database when running locally.');
console.log('');
console.log('To reset the database in the browser:');
console.log('');
console.log('1. Open the browser console (F12)');
console.log('2. Run: window.resetGunDB()');
console.log('3. Or click the "Reset Database" button on the login page');
console.log('');
console.log('The reset function will:');
console.log('  - Clear all localStorage Gun data');
console.log('  - Clear all sessionStorage Gun data');
console.log('  - Delete IndexedDB databases');
console.log('  - Require a page refresh to take effect');
console.log('');
console.log('After reset, you can create a new admin account by visiting:');
console.log('  http://localhost:5173?setup=admin');
console.log('');