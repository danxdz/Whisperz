// Test script to check app state
console.log("=== Testing Whisperz App State ===");

// Check if Gun is loaded
if (typeof Gun !== 'undefined') {
  console.log("✓ Gun.js is loaded");
} else {
  console.log("✗ Gun.js not found");
}

// Check localStorage
const gunData = localStorage.getItem('gun/');
console.log("Gun data in localStorage:", gunData ? "Present" : "Not found");

// Enable DevTools
localStorage.setItem('enableDevTools', 'true');
console.log("✓ DevTools enabled");

// Check if app is rendered
const root = document.getElementById('root');
if (root) {
  console.log("✓ React root found");
  console.log("Root content:", root.innerHTML.substring(0, 200));
} else {
  console.log("✗ React root not found");
}

// Try to find login form
const loginForm = document.querySelector('.auth-container');
if (loginForm) {
  console.log("✓ Login form is visible");
} else {
  console.log("✗ Login form not found");
}

// Check for ChatView
const chatView = document.querySelector('.chat-container');
if (chatView) {
  console.log("✓ Chat view is visible (user logged in)");
} else {
  console.log("✗ Chat view not found (user not logged in)");
}

console.log("=== End Test ===");
