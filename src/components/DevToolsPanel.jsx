import { useState, useEffect, useRef } from 'react';
import hybridGunService from '../services/hybridGunService';
import friendsService from '../services/friendsService';
import webrtcService from '../services/webrtcService';
import gunAuthService from '../services/gunAuthService';
import envValidator from '../utils/envValidator';

/**
 * DevToolsPanel Component
 * Comprehensive developer tools with multiple tabs for debugging
 */
function DevToolsPanel({ isVisible, onClose }) {
  const [activeTab, setActiveTab] = useState('console');
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [networkData, setNetworkData] = useState([]);
  const [performance, setPerformance] = useState({});
  const [storageData, setStorageData] = useState({});
  const [messages, setMessages] = useState([]);
  const [envVars, setEnvVars] = useState({});
  const logEndRef = useRef(null);

  // Console logging
  useEffect(() => {
    if (!isVisible) return;

    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    const captureLog = (type, ...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      setLogs(prev => [...prev.slice(-100), {
        type,
        message,
        timestamp: new Date().toLocaleTimeString(),
        id: Date.now() + Math.random()
      }]);
    };

    console.log = (...args) => { originalLog(...args); captureLog('log', ...args); };
    console.error = (...args) => { originalError(...args); captureLog('error', ...args); };
    console.warn = (...args) => { originalWarn(...args); captureLog('warn', ...args); };
    console.info = (...args) => { originalInfo(...args); captureLog('info', ...args); };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
    };
  }, [isVisible]);

  // Database stats
  useEffect(() => {
    if (!isVisible) return;

    const loadStats = async () => {
      const dbStats = await hybridGunService.getDatabaseStats();
      setStats(dbStats);
    };

    loadStats();
    const interval = setInterval(loadStats, 3000);
    return () => clearInterval(interval);
  }, [isVisible]);

  // Network monitoring
  useEffect(() => {
    if (!isVisible) return;

    const checkNetwork = () => {
      const gun = gunAuthService.gun;
      const peer = webrtcService.peer;
      
      const networkInfo = {
        timestamp: new Date().toLocaleTimeString(),
        gun: {
          status: gun?._?.opt?.peers ? 'connected' : 'disconnected',
          peers: gun?._?.opt?.peers ? Object.keys(gun._.opt.peers).length : 0,
        },
        webrtc: {
          status: peer?.disconnected ? 'disconnected' : peer?.destroyed ? 'destroyed' : 'connected',
          id: peer?.id || 'none',
          connections: peer?.connections ? Object.keys(peer.connections).length : 0,
        },
        online: navigator.onLine,
      };

      setNetworkData(prev => [...prev.slice(-50), networkInfo]);
    };

    checkNetwork();
    const interval = setInterval(checkNetwork, 2000);
    return () => clearInterval(interval);
  }, [isVisible]);

  // Performance monitoring
  useEffect(() => {
    if (!isVisible) return;

    const checkPerformance = () => {
      const perf = {
        memory: performance.memory ? {
          used: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
          total: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
          limit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB',
        } : null,
        timing: performance.timing ? {
          loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
          domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        } : null,
      };
      setPerformance(perf);
    };

    checkPerformance();
    const interval = setInterval(checkPerformance, 1000);
    return () => clearInterval(interval);
  }, [isVisible]);

  // Storage inspection
  useEffect(() => {
    if (!isVisible) return;

    const inspectStorage = () => {
      const storage = {
        localStorage: {},
        sessionStorage: {},
        cookies: document.cookie,
      };

      // LocalStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        try {
          storage.localStorage[key] = {
            value: localStorage.getItem(key),
            size: new Blob([localStorage.getItem(key)]).size,
          };
        } catch (e) {
          storage.localStorage[key] = { error: e.message };
        }
      }

      // SessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        try {
          storage.sessionStorage[key] = {
            value: sessionStorage.getItem(key),
            size: new Blob([sessionStorage.getItem(key)]).size,
          };
        } catch (e) {
          storage.sessionStorage[key] = { error: e.message };
        }
      }

      setStorageData(storage);
    };

    inspectStorage();
    const interval = setInterval(inspectStorage, 5000);
    return () => clearInterval(interval);
  }, [isVisible]);

  // Environment variables
  useEffect(() => {
    if (!isVisible) return;
    setEnvVars(envValidator.getAll());
  }, [isVisible]);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!isVisible) return null;

  const handleClearData = async () => {
    if (confirm('This will delete all your data. Are you sure?')) {
      await hybridGunService.clearAllData();
      await friendsService.clearAllFriends();
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  };

  const handleExportLogs = () => {
    const data = {
      logs,
      stats,
      networkData,
      performance,
      storageData,
      envVars,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whisperz-debug-${Date.now()}.json`;
    a.click();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'console':
        return (
          <div className="devtools-console">
            <div className="console-controls">
              <button onClick={() => setLogs([])}>Clear</button>
              <button onClick={handleExportLogs}>Export All</button>
              <select onChange={(e) => {
                if (e.target.value) {
                  setLogs(logs.filter(l => l.type === e.target.value));
                }
              }}>
                <option value="">All Types</option>
                <option value="log">Log</option>
                <option value="error">Error</option>
                <option value="warn">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>
            <div className="console-output">
              {logs.map((log) => (
                <div key={log.id} className={`log-entry log-${log.type}`}>
                  <span className="log-time">[{log.timestamp}]</span>
                  <span className="log-type">{log.type.toUpperCase()}</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        );

      case 'network':
        return (
          <div className="devtools-network">
            <h4>Network Status</h4>
            <div className="network-current">
              {networkData.length > 0 && (
                <div className="network-status-grid">
                  <div>🌐 Online: {networkData[networkData.length - 1].online ? '✅' : '❌'}</div>
                  <div>🔫 Gun.js: {networkData[networkData.length - 1].gun.status} ({networkData[networkData.length - 1].gun.peers} peers)</div>
                  <div>📡 WebRTC: {networkData[networkData.length - 1].webrtc.status}</div>
                  <div>🆔 Peer ID: {networkData[networkData.length - 1].webrtc.id}</div>
                  <div>🔗 Connections: {networkData[networkData.length - 1].webrtc.connections}</div>
                </div>
              )}
            </div>
            <h4>History</h4>
            <div className="network-history">
              {networkData.slice(-10).reverse().map((data, i) => (
                <div key={i} className="network-entry">
                  <span>{data.timestamp}</span> - 
                  Gun: {data.gun.status} | 
                  WebRTC: {data.webrtc.status} | 
                  Online: {data.online ? '✅' : '❌'}
                </div>
              ))}
            </div>
          </div>
        );

      case 'performance':
        return (
          <div className="devtools-performance">
            <h4>Performance Metrics</h4>
            {performance.memory && (
              <div className="perf-section">
                <h5>Memory Usage</h5>
                <div className="perf-grid">
                  <div>Used: {performance.memory.used}</div>
                  <div>Total: {performance.memory.total}</div>
                  <div>Limit: {performance.memory.limit}</div>
                  <div>Usage: {((parseFloat(performance.memory.used) / parseFloat(performance.memory.limit)) * 100).toFixed(1)}%</div>
                </div>
              </div>
            )}
            {performance.timing && (
              <div className="perf-section">
                <h5>Page Load</h5>
                <div className="perf-grid">
                  <div>Total Load: {performance.timing.loadTime}ms</div>
                  <div>DOM Ready: {performance.timing.domReady}ms</div>
                </div>
              </div>
            )}
            {stats && (
              <div className="perf-section">
                <h5>Database Stats</h5>
                <div className="perf-grid">
                  <div>Conversations: {stats.conversations}</div>
                  <div>Messages: {stats.messages}</div>
                  <div>Offline Messages: {stats.offlineMessages}</div>
                  <div>Friends: {stats.friends}</div>
                </div>
              </div>
            )}
          </div>
        );

      case 'storage':
        return (
          <div className="devtools-storage">
            <h4>Storage Inspector</h4>
            <div className="storage-section">
              <h5>LocalStorage ({Object.keys(storageData.localStorage || {}).length} items)</h5>
              <div className="storage-list">
                {Object.entries(storageData.localStorage || {}).map(([key, data]) => (
                  <details key={key} className="storage-item">
                    <summary>
                      {key} ({data.size ? `${data.size} bytes` : 'error'})
                      <button onClick={() => {
                        localStorage.removeItem(key);
                        setStorageData(prev => ({
                          ...prev,
                          localStorage: { ...prev.localStorage, [key]: undefined }
                        }));
                      }}>Delete</button>
                    </summary>
                    <pre>{data.value || data.error}</pre>
                  </details>
                ))}
              </div>
            </div>
            <div className="storage-section">
              <h5>SessionStorage ({Object.keys(storageData.sessionStorage || {}).length} items)</h5>
              <div className="storage-list">
                {Object.entries(storageData.sessionStorage || {}).map(([key, data]) => (
                  <details key={key} className="storage-item">
                    <summary>
                      {key} ({data.size ? `${data.size} bytes` : 'error'})
                      <button onClick={() => {
                        sessionStorage.removeItem(key);
                        setStorageData(prev => ({
                          ...prev,
                          sessionStorage: { ...prev.sessionStorage, [key]: undefined }
                        }));
                      }}>Delete</button>
                    </summary>
                    <pre>{data.value || data.error}</pre>
                  </details>
                ))}
              </div>
            </div>
          </div>
        );

      case 'environment':
        return (
          <div className="devtools-environment">
            <h4>Environment Variables</h4>
            <div className="env-info">
              <div>Mode: {import.meta.env.MODE}</div>
              <div>Production: {import.meta.env.PROD ? 'Yes' : 'No'}</div>
              <div>Development: {import.meta.env.DEV ? 'Yes' : 'No'}</div>
            </div>
            <h5>Configured Variables</h5>
            <div className="env-list">
              {Object.entries(envVars).map(([key, value]) => (
                <div key={key} className="env-item">
                  <span className="env-key">{key}:</span>
                  <span className="env-value">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'actions':
        return (
          <div className="devtools-actions">
            <h4>Debug Actions</h4>
            <div className="actions-grid">
              <button onClick={handleClearData} className="danger-btn">
                🗑️ Clear All Data
              </button>
              <button onClick={handleExportLogs}>
                📥 Export Debug Data
              </button>
              <button onClick={() => window.location.reload()}>
                🔄 Reload App
              </button>
              <button onClick={() => {
                console.log('Test log message');
                console.warn('Test warning message');
                console.error('Test error message');
                console.info('Test info message');
              }}>
                🧪 Test Console
              </button>
              <button onClick={() => {
                throw new Error('Test error for ErrorBoundary');
              }}>
                💥 Trigger Error
              </button>
              <button onClick={() => {
                localStorage.setItem('test-key', 'test-value');
                sessionStorage.setItem('test-key', 'test-value');
              }}>
                💾 Test Storage
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="devtools-panel">
      <div className="devtools-header">
        <h3>🛠️ Developer Tools</h3>
        <button onClick={onClose} className="close-btn">×</button>
      </div>
      
      <div className="devtools-tabs">
        {['console', 'network', 'performance', 'storage', 'environment', 'actions'].map(tab => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="devtools-content">
        {renderTabContent()}
      </div>

      <style jsx>{`
        .devtools-panel {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 400px;
          background: rgba(0, 0, 0, 0.95);
          border-top: 2px solid #00ff00;
          color: #00ff00;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          z-index: 10000;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        .devtools-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          border-bottom: 1px solid #00ff00;
          background: rgba(0, 0, 0, 0.8);
        }

        .devtools-header h3 {
          margin: 0;
          color: #00ff00;
        }

        .close-btn {
          background: none;
          border: 1px solid #00ff00;
          color: #00ff00;
          padding: 5px 10px;
          cursor: pointer;
          border-radius: 3px;
        }

        .close-btn:hover {
          background: rgba(0, 255, 0, 0.1);
        }

        .devtools-tabs {
          display: flex;
          border-bottom: 1px solid #00ff00;
          background: rgba(0, 0, 0, 0.8);
        }

        .tab {
          padding: 10px 20px;
          background: none;
          border: none;
          color: #00ff00;
          cursor: pointer;
          border-right: 1px solid rgba(0, 255, 0, 0.2);
          transition: background 0.2s;
        }

        .tab:hover {
          background: rgba(0, 255, 0, 0.1);
        }

        .tab.active {
          background: rgba(0, 255, 0, 0.2);
          font-weight: bold;
        }

        .devtools-content {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
        }

        .console-controls {
          display: flex;
          gap: 10px;
          margin-bottom: 10px;
        }

        .console-controls button,
        .console-controls select {
          background: rgba(0, 255, 0, 0.1);
          border: 1px solid #00ff00;
          color: #00ff00;
          padding: 5px 10px;
          cursor: pointer;
          border-radius: 3px;
        }

        .console-output {
          background: rgba(0, 0, 0, 0.5);
          padding: 10px;
          border-radius: 3px;
          max-height: 250px;
          overflow-y: auto;
        }

        .log-entry {
          margin-bottom: 5px;
          padding: 3px;
          border-left: 3px solid;
        }

        .log-log { border-left-color: #00ff00; }
        .log-error { border-left-color: #ff0000; color: #ff6666; }
        .log-warn { border-left-color: #ffff00; color: #ffff66; }
        .log-info { border-left-color: #00ffff; color: #66ffff; }

        .log-time {
          color: #808080;
          margin-right: 10px;
        }

        .log-type {
          font-weight: bold;
          margin-right: 10px;
        }

        .network-status-grid,
        .perf-grid,
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
          margin: 10px 0;
        }

        .network-status-grid div,
        .perf-grid div {
          padding: 10px;
          background: rgba(0, 255, 0, 0.1);
          border: 1px solid rgba(0, 255, 0, 0.3);
          border-radius: 3px;
        }

        .network-history {
          background: rgba(0, 0, 0, 0.5);
          padding: 10px;
          border-radius: 3px;
          max-height: 200px;
          overflow-y: auto;
        }

        .network-entry {
          margin-bottom: 5px;
          padding: 3px;
        }

        .storage-section {
          margin-bottom: 20px;
        }

        .storage-list {
          background: rgba(0, 0, 0, 0.5);
          padding: 10px;
          border-radius: 3px;
          max-height: 200px;
          overflow-y: auto;
        }

        .storage-item {
          margin-bottom: 10px;
          padding: 5px;
          background: rgba(0, 255, 0, 0.05);
          border: 1px solid rgba(0, 255, 0, 0.2);
          border-radius: 3px;
        }

        .storage-item summary {
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .storage-item button {
          background: rgba(255, 0, 0, 0.2);
          border: 1px solid #ff0000;
          color: #ff0000;
          padding: 2px 8px;
          cursor: pointer;
          border-radius: 3px;
          font-size: 10px;
        }

        .storage-item pre {
          margin-top: 10px;
          padding: 10px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 3px;
          overflow-x: auto;
          font-size: 11px;
        }

        .env-info {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
          padding: 10px;
          background: rgba(0, 255, 0, 0.1);
          border-radius: 3px;
        }

        .env-list {
          background: rgba(0, 0, 0, 0.5);
          padding: 10px;
          border-radius: 3px;
        }

        .env-item {
          display: flex;
          margin-bottom: 5px;
        }

        .env-key {
          font-weight: bold;
          margin-right: 10px;
          color: #00ffff;
        }

        .env-value {
          color: #ffff00;
        }

        .actions-grid button {
          padding: 15px;
          background: rgba(0, 255, 0, 0.1);
          border: 1px solid #00ff00;
          color: #00ff00;
          cursor: pointer;
          border-radius: 3px;
          transition: all 0.2s;
        }

        .actions-grid button:hover {
          background: rgba(0, 255, 0, 0.2);
          transform: scale(1.05);
        }

        .actions-grid .danger-btn {
          background: rgba(255, 0, 0, 0.1);
          border-color: #ff0000;
          color: #ff0000;
        }

        .actions-grid .danger-btn:hover {
          background: rgba(255, 0, 0, 0.2);
        }

        h4, h5 {
          color: #00ff00;
          margin: 10px 0;
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .devtools-panel {
            height: 60vh;
          }

          .devtools-tabs {
            overflow-x: auto;
            white-space: nowrap;
          }

          .tab {
            font-size: 11px;
            padding: 8px 12px;
          }
        }
      `}</style>
    </div>
  );
}

export default DevToolsPanel;