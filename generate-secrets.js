#!/usr/bin/env node

/**
 * Security Secret Generator for Whisperz
 * Generates cryptographically secure secrets for environment variables
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate a secure random string
function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

// Generate secure configuration
function generateSecureConfig() {
  const config = {
    VITE_INVITE_SECRET: generateSecret(32),
    VITE_GUN_PEERS: '',
    VITE_PEERJS_HOST: ''
  };

  return config;
}

// Main function
function main() {
  console.log('🔐 Whisperz Security Configuration Generator\n');
  
  const envPath = path.join(__dirname, '.env');
  
  // Check if .env already exists
  if (fs.existsSync(envPath)) {
    console.log('⚠️  Warning: .env file already exists!');
    console.log('   To prevent accidental overwrite, please rename or backup your existing .env file.\n');
    // eslint-disable-next-line no-undef
    process.exit(1);
  }

  // Generate secure configuration
  const config = generateSecureConfig();
  
  // Create .env content
  let envContent = '# Whisperz Security Configuration\n';
  envContent += '# Generated: ' + new Date().toISOString() + '\n';
  envContent += '# WARNING: Keep these values secret and never commit to version control!\n\n';
  
  envContent += '# HMAC Secret for invite links (REQUIRED - Must be unique and secret)\n';
  envContent += `VITE_INVITE_SECRET=${config.VITE_INVITE_SECRET}\n\n`;
  
  envContent += '# Gun.js relay servers (optional - comma-separated URLs)\n';
  envContent += '# Example: https://gun-relay1.com/gun,https://gun-relay2.com/gun\n';
  envContent += 'VITE_GUN_PEERS=\n\n';
  
  envContent += '# PeerJS server (optional - format: hostname:port)\n';
  envContent += '# Example: peerjs.example.com:443\n';
  envContent += 'VITE_PEERJS_HOST=\n';

  // Write .env file
  fs.writeFileSync(envPath, envContent, 'utf8');
  
  console.log('✅ Secure .env file generated successfully!\n');
  console.log('📋 Configuration Summary:');
  console.log('   - VITE_INVITE_SECRET: [SECURE RANDOM SECRET - 64 characters]');
  console.log('   - VITE_GUN_PEERS: (empty - using default public relays)');
  console.log('   - VITE_PEERJS_HOST: (empty - using default public server)\n');
  
  console.log('🔒 Security Notes:');
  console.log('   1. Never share or commit your .env file');
  console.log('   2. Use different secrets for development and production');
  console.log('   3. Rotate secrets regularly');
  console.log('   4. For production, use environment variables in your hosting platform\n');
  
  console.log('🚀 Next Steps:');
  console.log('   1. Review the generated .env file');
  console.log('   2. Optionally add custom Gun.js peers or PeerJS server');
  console.log('   3. Start the application with: npm run dev\n');
}

// Run the generator
main();

export { generateSecret, generateSecureConfig };