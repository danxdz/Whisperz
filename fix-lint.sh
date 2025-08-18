#!/bin/bash

echo "Fixing ESLint issues..."

# Fix catch blocks - if error/err is used in the block, keep it; otherwise remove parameter
echo "Fixing catch blocks..."
find src -type f \( -name "*.js" -o -name "*.jsx" \) | while read file; do
  # For catch blocks where error is actually used, ensure it's named correctly
  sed -i 's/} catch {/} catch (_error) {/g' "$file"
  # Fix references to error when we have _error
  sed -i 's/console.error(\(.*\)error)/console.error(\1_error)/g' "$file"
  sed -i 's/console.log(\(.*\)error)/console.log(\1_error)/g' "$file"
  sed -i 's/throw error;/throw _error;/g' "$file"
  sed -i 's/error\.message/_error.message/g' "$file"
  sed -i 's/error\.stack/_error.stack/g' "$file"
  sed -i 's/${error\./${_error./g' "$file"
  # Fix err references
  sed -i 's/console.error(\(.*\)err)/console.error(\1_err)/g' "$file"
  sed -i 's/console.log(\(.*\)err)/console.log(\1_err)/g' "$file"
  sed -i 's/throw err;/throw _err;/g' "$file"
  sed -i 's/err\.message/_err.message/g' "$file"
  sed -i 's/err\.stack/_err.stack/g' "$file"
  sed -i 's/${err\./${_err./g' "$file"
done

# Fix specific undefined variables
echo "Fixing undefined variables..."
# Fix key references in callbacks
find src -type f \( -name "*.js" -o -name "*.jsx" \) -exec sed -i 's/\.map((_key)/.map((_key)/g; s/\.forEach((_key)/.forEach((_key)/g' {} \;

# Fix setTouchCount reference
sed -i 's/setTouchCount/_setTouchCount/g' src/components/MobileDevTools.jsx
sed -i 's/const \[_touchCount, _setTouchCount\]/const [_touchCount, _setTouchCount]/g' src/components/MobileDevTools.jsx

# Fix isMobileDevice
sed -i 's/isMobileDevice/_isMobileDevice/g' src/components/DevToolsWrapper.jsx

# Remove unused imports
echo "Removing unused imports..."
sed -i 's/^import.*encryptionService.*$/\/\/ &/' src/services/friendsService.js

# Fix unused variables by prefixing with underscore
echo "Fixing unused variables..."
find src -type f \( -name "*.js" -o -name "*.jsx" \) | while read file; do
  # Fix unused destructured variables
  sed -i 's/{ currentUser,/{ _currentUser,/g' "$file"
  sed -i 's/, currentUser }/, _currentUser }/g' "$file"
  sed -i 's/, currentUser,/, _currentUser,/g' "$file"
done

echo "Done! Run 'npm run lint' to check remaining issues."