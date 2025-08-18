const fs = require('fs');
let content = fs.readFileSync('src/services/friendsService.js', 'utf8');
const lines = content.split('\n');
// Fix lines 76-77 by properly commenting them
lines[75] = '        //   expected: dataToVerify,';
lines[76] = '        //   got: verified';
fs.writeFileSync('src/services/friendsService.js', lines.join('\n'));
console.log('Fixed!');
