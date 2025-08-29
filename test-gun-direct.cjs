#!/usr/bin/env node

// Direct test of Gun connection to check what's actually in the database
const Gun = require('gun');

const RELAY_URL = 'https://gun-relay-nchb.onrender.com/gun';

console.log('🔍 Direct Gun Database Test');
console.log('📡 Connecting to:', RELAY_URL);
console.log('');

const gun = Gun({
  peers: [RELAY_URL],
  localStorage: false,
  radisk: false
});

console.log('Checking _whisperz_system.config...\n');

// Method 1: Using .once() to get current value
gun.get('_whisperz_system').get('config').once((data, key) => {
  console.log('📦 Current value (.once):');
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log('No data found');
  }
  console.log('');
});

// Method 2: Check if the path exists at all
gun.get('_whisperz_system').once((data, key) => {
  console.log('📂 _whisperz_system root:');
  if (data) {
    console.log('Keys found:', Object.keys(data).filter(k => k !== '_'));
  } else {
    console.log('_whisperz_system does not exist');
  }
  console.log('');
});

// Method 3: Try alternative paths that might be used
const alternativePaths = [
  ['_whisperz_system', 'reset'],
  ['whisperz', 'config'],
  ['config', 'instance'],
  ['instance'],
];

alternativePaths.forEach(path => {
  setTimeout(() => {
    if (path.length === 1) {
      gun.get(path[0]).once((data) => {
        console.log(`🔍 Checking gun.get('${path[0]}'):`);
        if (data) {
          console.log('Found data:', typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
        } else {
          console.log('No data');
        }
        console.log('');
      });
    } else {
      gun.get(path[0]).get(path[1]).once((data) => {
        console.log(`🔍 Checking gun.get('${path[0]}').get('${path[1]}'):`);
        if (data) {
          console.log('Found data:', typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
        } else {
          console.log('No data');
        }
        console.log('');
      });
    }
  }, 1000);
});

// Keep script running for a bit to receive all responses
setTimeout(() => {
  console.log('✅ Test complete');
  process.exit(0);
}, 5000);