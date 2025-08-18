const fs = require('fs');

// Read the file
let content = fs.readFileSync('src/services/friendsService.js', 'utf8');

// Fix the problematic comment
content = content.replace(
  /if \(!isValid\) \{[\s\S]*?\/\/ \}\);[\s]*\}/,
  `if (!isValid) {
        // Signature valid but data mismatch
      }`
);

// Write back
fs.writeFileSync('src/services/friendsService.js', content);
console.log('Fixed!');