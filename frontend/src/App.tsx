import React, { useState } from 'react';
import { Compass, Image, Sparkles, Clock, Settings, Layers, RefreshCw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'discovery' | 'collections' | 'rules' | 'history' | 'settings'>('discovery');

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Sidebar Navigation */}
      <aside style={{
        width: '240px',
        background: '#070b13',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 16px',
        gap: '24px'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(139, 92, 246, 0.4)'
          }}>
            <Sparkles size={18} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>AuraDesk</h1>
            <p style={{ fontSize: '11px', color: '#64748b' }}>The Reality Weaver</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[
            { id: 'discovery', label: 'Multiversal Portal', icon: Compass },
            { id: 'collections', label: 'Sanctum of Memories', icon: Image },
            { id: 'rules', label: 'Eye of Agamotto', icon: Sparkles },
            { id: 'history', label: 'Time Stone History', icon: Clock },
            { id: 'settings', label: 'Settings & Integrations', icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  transition: 'all 0.15s ease',
                  background: isActive ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                  color: isActive ? '#a78bfa' : '#94a3b8',
                  outline: 'none',
                  textAlign: 'left'
                }}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#090d16',
        overflow: 'auto',
        padding: '32px'
      }}>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
          paddingBottom: '20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#f8fafc' }}>
              {activeTab === 'discovery' && 'Multiversal Portal'}
              {activeTab === 'collections' && 'Sanctum of Memories'}
              {activeTab === 'rules' && 'Eye of Agamotto — Rules Engine'}
              {activeTab === 'history' && 'Time Stone — History & Rotation'}
              {activeTab === 'settings' && 'Settings & External APIs'}
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              Desktop wallpaper discovery, collections, and context-aware automation
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: '#f8fafc',
              fontSize: '13px',
              cursor: 'pointer'
            }}>
              <RefreshCw size={14} />
              <span>Rotate Now</span>
            </button>
          </div>
        </header>

        {/* Dashboard Placeholder card */}
        <div className="glass-panel" style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#e2e8f0' }}>System Status</h3>
          <p style={{ fontSize: '13px', color: '#94a3b8' }}>
            AuraDesk workspace structure and frontend dependencies successfully initialized.
          </p>
        </div>
      </main>
    </div>
  );
}
