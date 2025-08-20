#!/bin/bash

# Fix all components to use friend.publicKey consistently

echo "Fixing online status key access in components..."

# Fix ExpandableFriends.jsx
sed -i 's/friend\.pub || friend\.publicKey/friend.publicKey/g' src/components/ExpandableFriends.jsx
sed -i 's/f\.pub || f\.publicKey/f.publicKey/g' src/components/ExpandableFriends.jsx
sed -i 's/onlineStatus instanceof Map ? onlineStatus\.get(friend\.publicKey) : onlineStatus\[friend\.publicKey\]/onlineStatus[friend.publicKey]/g' src/components/ExpandableFriends.jsx

# Fix ResizableSidebar.jsx  
sed -i 's/friend\.pub || friend\.publicKey/friend.publicKey/g' src/components/ResizableSidebar.jsx
sed -i 's/f\.pub || f\.publicKey/f.publicKey/g' src/components/ResizableSidebar.jsx

# Fix CollapsibleSidebar.jsx
sed -i 's/friend\.pub || friend\.publicKey/friend.publicKey/g' src/components/CollapsibleSidebar.jsx
sed -i 's/f\.pub || f\.publicKey/f.publicKey/g' src/components/CollapsibleSidebar.jsx

# Fix OnlineUsers.jsx
sed -i 's/friend\.pub || friend\.publicKey/friend.publicKey/g' src/components/OnlineUsers.jsx
sed -i 's/a\.pub || a\.publicKey/a.publicKey/g' src/components/OnlineUsers.jsx
sed -i 's/b\.pub || b\.publicKey/b.publicKey/g' src/components/OnlineUsers.jsx

# Fix SwipeableChat.jsx
sed -i 's/friend\.pub || friend\.publicKey/friend.publicKey/g' src/components/SwipeableChat.jsx

echo "Done! All components now use friend.publicKey consistently."