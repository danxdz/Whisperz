import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Smile, MoreVertical, Search, Plus, Users, Settings, LogOut, Shield, Bell } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { cn } from '../../utils/cn';
import * as Avatar from '@radix-ui/react-avatar';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Tooltip from '@radix-ui/react-tooltip';

export function ModernChatInterface({ 
  user, 
  friends = [], 
  messages = [], 
  selectedFriend, 
  onSelectFriend,
  onSendMessage,
  onLogout,
  presence = {}
}) {
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (message.trim() && selectedFriend) {
      onSendMessage(selectedFriend.pub, message.trim());
      setMessage('');
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredFriends = friends.filter(friend =>
    friend.nickname?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??';
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Sidebar */}
      <motion.div 
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        className="w-80 bg-white/5 backdrop-blur-xl border-r border-white/10 flex flex-col"
      >
        {/* User Profile Section */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar.Root className="inline-flex h-10 w-10 select-none items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-500 to-indigo-500">
                <Avatar.Fallback className="text-white font-medium">
                  {getInitials(user?.alias || 'User')}
                </Avatar.Fallback>
              </Avatar.Root>
              <div>
                <p className="font-medium text-white">{user?.alias || 'Anonymous'}</p>
                <p className="text-xs text-gray-400">Online</p>
              </div>
            </div>
            
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-400">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="min-w-[200px] bg-slate-900 rounded-lg p-1 shadow-xl border border-white/10">
                  <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 rounded hover:bg-white/10 cursor-pointer">
                    <Settings className="h-4 w-4" />
                    Settings
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 rounded hover:bg-white/10 cursor-pointer">
                    <Bell className="h-4 w-4" />
                    Notifications
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 rounded hover:bg-white/10 cursor-pointer">
                    <Shield className="h-4 w-4" />
                    Privacy
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="h-px bg-white/10 my-1" />
                  <DropdownMenu.Item 
                    onClick={onLogout}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 rounded hover:bg-red-500/10 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Friends List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-2">
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <span className="text-xs font-medium text-gray-400 uppercase">Conversations</span>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            
            <AnimatePresence>
              {filteredFriends.map((friend, index) => {
                const isOnline = presence[friend.pub]?.online;
                const isSelected = selectedFriend?.pub === friend.pub;
                
                return (
                  <motion.div
                    key={friend.pub}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <button
                      onClick={() => onSelectFriend(friend)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200',
                        isSelected 
                          ? 'bg-violet-500/20 border border-violet-500/30' 
                          : 'hover:bg-white/5'
                      )}
                    >
                      <div className="relative">
                        <Avatar.Root className="inline-flex h-10 w-10 select-none items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                          <Avatar.Fallback className="text-white font-medium">
                            {getInitials(friend.nickname)}
                          </Avatar.Fallback>
                        </Avatar.Root>
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-slate-900 rounded-full" />
                        )}
                      </div>
                      
                      <div className="flex-1 text-left">
                        <p className="font-medium text-white">{friend.nickname}</p>
                        <p className="text-xs text-gray-400">
                          {isOnline ? 'Active now' : 'Offline'}
                        </p>
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedFriend ? (
          <>
            {/* Chat Header */}
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="px-6 py-4 bg-white/5 backdrop-blur-xl border-b border-white/10 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Avatar.Root className="inline-flex h-10 w-10 select-none items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                  <Avatar.Fallback className="text-white font-medium">
                    {getInitials(selectedFriend.nickname)}
                  </Avatar.Fallback>
                </Avatar.Root>
                <div>
                  <p className="font-medium text-white">{selectedFriend.nickname}</p>
                  <p className="text-xs text-gray-400">
                    {presence[selectedFriend.pub]?.online ? 'Active now' : 'Offline'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Tooltip.Provider>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <Button variant="ghost" size="icon">
                        <Users className="h-4 w-4" />
                      </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content className="bg-slate-800 text-white text-xs px-2 py-1 rounded">
                        View Profile
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </div>
            </motion.div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
              <AnimatePresence>
                {messages
                  .filter(msg => 
                    (msg.from === selectedFriend.pub && msg.to === user.pub) ||
                    (msg.from === user.pub && msg.to === selectedFriend.pub)
                  )
                  .map((msg, index) => {
                    const isSent = msg.from === user.pub;
                    
                    return (
                      <motion.div
                        key={msg.id || index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={cn('flex', isSent ? 'justify-end' : 'justify-start')}
                      >
                        <div className={cn(
                          'max-w-[70%] px-4 py-2.5 rounded-2xl',
                          isSent 
                            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-br-sm' 
                            : 'bg-white/10 text-white rounded-bl-sm'
                        )}>
                          <p className="break-words">{msg.text}</p>
                          <p className="text-xs mt-1 opacity-70">
                            {new Date(msg.timestamp).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="px-6 py-4 bg-white/5 backdrop-blur-xl border-t border-white/10"
            >
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Paperclip className="h-4 w-4" />
                </Button>
                
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                />
                
                <Button variant="ghost" size="icon">
                  <Smile className="h-4 w-4" />
                </Button>
                
                <Button 
                  onClick={handleSend}
                  variant="gradient"
                  size="icon"
                  disabled={!message.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-violet-500/20 to-indigo-500/20 rounded-full flex items-center justify-center">
                <Users className="h-12 w-12 text-violet-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Select a conversation</h3>
              <p className="text-gray-400">Choose a friend to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}