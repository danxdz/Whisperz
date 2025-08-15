import { useState, useEffect, useRef } from 'react';
import hybridGunService from '../services/hybridGunService';
import friendsService from '../services/friendsService';

/**
 * DevTools Component
 * Provides debugging tools and database statistics for developers
 * 
 * @param {Object} props
 * @param {boolean} props.isVisible - Whether the dev tools panel is visible
 * @param {Function} props.onClose - Callback to close the dev tools
 */
function DevTools({ isVisible, onClose }) {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const logEndRef = useRef(null);

  useEffect(() => {
    if (!isVisible) return;

    // Load stats
    const loadStats = async () => {
      const dbStats = await hybridGunService.getDatabaseStats();
      setStats(dbStats);
    };
    loadStats();
    const interval = setInterval(loadStats, 5000);

    // Capture console logs
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    const captureLog = (type, ...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      setLogs(prev => [...prev.slice(-50), {
        type,
        message,
        timestamp: new Date().toLocaleTimeString()
      }]);
    };

    console.log = (...args) => { originalLog(...args); captureLog('log', ...args); };
    console.error = (...args) => { originalError(...args); captureLog('error', ...args); };
    console.warn = (...args) => { originalWarn(...args); captureLog('warn', ...args); };

    return () => {
      clearInterval(interval);
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, [isVisible]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!isVisible) return null;

  const handleClearData = async () => {
    if (confirm('This will delete all your data. Are you sure?')) {
      await hybridGunService.clearAllData();
      await friendsService.clearAllFriends();
      window.location.reload();
    }
  };

  const handleExportLogs = () => {
    const logText = logs.map(l => `[${l.timestamp}] ${l.type.toUpperCase()}: ${l.message}`).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-logs-${Date.now()}.txt`;
    a.click();
  };

  return (
    <div className="devtools">
      <div className="devtools-header">
        <h3>Developer Tools</h3>
        <button onClick={onClose} className="close-btn">×</button>
      </div>
      
      <div className="devtools-section">
        <h4>Database Stats</h4>
        {stats && (
          <div className="stats-grid">
            <div>Conversations: {stats.conversations}</div>
            <div>Messages: {stats.messages}</div>
            <div>Offline Messages: {stats.offlineMessages}</div>
            <div>Friends: {stats.friends}</div>
          </div>
        )}
      </div>

      <div className="devtools-section">
        <h4>Actions</h4>
        <div className="devtools-actions">
          <button onClick={handleClearData} className="danger-btn">Clear All Data</button>
          <button onClick={handleExportLogs}>Export Logs</button>
          <button onClick={() => setLogs([])}>Clear Console</button>
        </div>
      </div>

      <div className="devtools-section">
        <h4>Console Output</h4>
        <div className="console-output">
          {logs.map((log, i) => (
            <div key={i} className={`log-entry log-${log.type}`}>
              <span className="log-time">[{log.timestamp}]</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}

export default DevTools;