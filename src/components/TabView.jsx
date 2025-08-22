import React, { useState } from 'react';

/**
 * TabView Component - IRC-style tab navigation
 * Minimal, clean, text-focused design
 */
function TabView({ children, defaultTab = 0 }) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Filter out null/undefined children
  const tabs = React.Children.toArray(children).filter(child => child);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#1a1a1a',
      color: '#e0e0e0',
      fontFamily: 'Consolas, Monaco, "Courier New", monospace'
    }}>
      {/* Tab Bar - IRC Style */}
      <div style={{
        display: 'flex',
        background: '#2a2a2a',
        borderBottom: '1px solid #444',
        flexShrink: 0
      }}>
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => setActiveTab(index)}
            style={{
              padding: '10px 20px',
              background: activeTab === index ? '#1a1a1a' : 'transparent',
              border: 'none',
              borderRight: '1px solid #444',
              color: activeTab === index ? '#00ff00' : '#808080',
              cursor: 'pointer',
              fontSize: '14px',
              fontFamily: 'inherit',
              transition: 'all 0.2s',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== index) {
                e.target.style.color = '#e0e0e0';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== index) {
                e.target.style.color = '#808080';
              }
            }}
          >
            {tab.props.label}
            {tab.props.badge && (
              <span style={{
                marginLeft: '8px',
                padding: '2px 6px',
                background: '#00ff00',
                color: '#1a1a1a',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 'bold'
              }}>
                {tab.props.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative'
      }}>
        {tabs[activeTab]}
      </div>
    </div>
  );
}

// Tab Panel Component
export function TabPanel({ children, label, badge }) {
  return (
    <div style={{
      height: '100%',
      overflow: 'auto'
    }}>
      {children}
    </div>
  );
}

export default TabView;