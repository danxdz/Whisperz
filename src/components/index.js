/**
 * Barrel export for all components
 * This makes importing components cleaner in other files
 */

export { default as LoginView } from './LoginView';
export { default as DevTools } from './DevTools';
export { default as DevToolsPanel } from './DevToolsPanel';
export { default as DevToolsButton } from './DevToolsButton';
export { default as DevToolsWrapper } from './DevToolsWrapper';
export { default as MobileDevTools } from './MobileDevTools';
export { default as ConnectionStatus } from './ConnectionStatus';
export { default as ErrorBoundary } from './ErrorBoundary';
export { default as LoadingSpinner } from './LoadingSpinner';

// Future components can be added here as they are extracted:
// export { default as RegisterView } from './RegisterView';
// export { default as ChatView } from './ChatView';
// export { default as FriendsList } from './FriendsList';
// export { default as MessageList } from './MessageList';
// export { default as MessageInput } from './MessageInput';