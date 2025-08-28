/**
 * Barrel export for all components
 * This makes importing components cleaner in other files
 */

export { default as LoginView } from './LoginView';
export { default as SimpleDevToolsButton } from './SimpleDevToolsButton';
export { default as DevToolsWrapper } from './DevToolsWrapper';
export { default as MobileDevTools } from './MobileDevTools';
export { default as MobileDevToolsCompact } from './MobileDevToolsCompact';
export { default as ConnectionStatus } from './ConnectionStatus';
// WebRTCStatus removed - using Gun.js only
export { default as ErrorBoundary } from './ErrorBoundary';
export { default as LoadingSpinner } from './LoadingSpinner';
export { default as ThemeToggle } from './ThemeToggle';
export { default as EnhancedDevTools } from './EnhancedDevTools';
export { default as OnlineUsers } from './OnlineUsers';
export { default as ExpandableFriends } from './ExpandableFriends';
export { default as CollapsibleSidebar } from './CollapsibleSidebar';
export { default as ResizableSidebar } from './ResizableSidebar';
export { default as SwipeableChat } from './SwipeableChat';
export { default as InviteModal } from './InviteModal';

// Newly extracted components
export { default as AuthContainer } from './AuthContainer';
export { default as MainChatInterface } from './MainChatInterface';
export { default as LoadingScreen } from './LoadingScreen';
export { default as ErrorScreen } from './ErrorScreen';

// Future components can be added here as they are extracted:
// export { default as RegisterView } from './RegisterView';
// export { default as ChatView } from './ChatView';
// export { default as FriendsList } from './FriendsList';
// export { default as MessageList } from './MessageList';
// export { default as MessageInput } from './MessageInput';