'use client'

import { useState, useEffect } from 'react'
import { X, Save, Monitor, Moon, Sun } from 'lucide-react'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState({
    theme: 'dark',
    autoRefresh: true,
    refreshInterval: 10,
    notifications: true,
    soundEnabled: true,
    leverageLimit: 10,
    defaultOrderType: 'market',
    showAdvanced: false,
  })

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem('terminal-settings')
    if (saved) {
      try {
        setSettings({ ...settings, ...JSON.parse(saved) })
      } catch (e) {
        console.error('Failed to load settings:', e)
      }
    }
  }, [])

  const handleSave = () => {
    localStorage.setItem('terminal-settings', JSON.stringify(settings))
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="terminal-card w-full max-w-2xl max-h-[90vh] overflow-auto bg-terminal-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-terminal-border rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Theme */}
          <div>
            <label className="block text-sm font-medium mb-2">Theme</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSettings({ ...settings, theme: 'dark' })}
                className={`flex-1 p-3 rounded border transition-all ${
                  settings.theme === 'dark'
                    ? 'bg-terminal-accent border-terminal-accent text-white'
                    : 'bg-terminal-surface border-terminal-border'
                }`}
              >
                <Moon size={20} className="mx-auto mb-1" />
                <span className="text-xs">Dark</span>
              </button>
              <button
                onClick={() => setSettings({ ...settings, theme: 'light' })}
                className={`flex-1 p-3 rounded border transition-all ${
                  settings.theme === 'light'
                    ? 'bg-terminal-accent border-terminal-accent text-white'
                    : 'bg-terminal-surface border-terminal-border'
                }`}
              >
                <Sun size={20} className="mx-auto mb-1" />
                <span className="text-xs">Light</span>
              </button>
            </div>
          </div>

          {/* Auto Refresh */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Auto Refresh</label>
              <button
                onClick={() => setSettings({ ...settings, autoRefresh: !settings.autoRefresh })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.autoRefresh ? 'bg-terminal-accent' : 'bg-terminal-border'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.autoRefresh ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            {settings.autoRefresh && (
              <div className="mt-2">
                <label className="text-xs text-terminal-text-secondary">
                  Refresh Interval (seconds)
                </label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={settings.refreshInterval}
                  onChange={(e) =>
                    setSettings({ ...settings, refreshInterval: parseInt(e.target.value) || 10 })
                  }
                  className="terminal-input w-full mt-1"
                />
              </div>
            )}
          </div>

          {/* Notifications */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Notifications</label>
              <button
                onClick={() =>
                  setSettings({ ...settings, notifications: !settings.notifications })
                }
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.notifications ? 'bg-terminal-accent' : 'bg-terminal-border'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.notifications ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            {settings.notifications && (
              <div className="mt-2">
                <label className="flex items-center gap-2 text-xs text-terminal-text-secondary">
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={(e) =>
                      setSettings({ ...settings, soundEnabled: e.target.checked })
                    }
                    className="rounded"
                  />
                  <span>Enable sound notifications</span>
                </label>
              </div>
            )}
          </div>

          {/* Trading Settings */}
          <div className="pt-4 border-t border-terminal-border">
            <h3 className="text-sm font-semibold mb-4">Trading Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Maximum Leverage
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={settings.leverageLimit}
                  onChange={(e) =>
                    setSettings({ ...settings, leverageLimit: parseInt(e.target.value) })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-terminal-text-secondary mt-1">
                  <span>1x</span>
                  <span className="font-semibold">{settings.leverageLimit}x</span>
                  <span>20x</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Default Order Type
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSettings({ ...settings, defaultOrderType: 'market' })}
                    className={`flex-1 py-2 rounded text-sm transition-all ${
                      settings.defaultOrderType === 'market'
                        ? 'bg-terminal-accent text-white'
                        : 'bg-terminal-surface border border-terminal-border'
                    }`}
                  >
                    Market
                  </button>
                  <button
                    onClick={() => setSettings({ ...settings, defaultOrderType: 'limit' })}
                    className={`flex-1 py-2 rounded text-sm transition-all ${
                      settings.defaultOrderType === 'limit'
                        ? 'bg-terminal-accent text-white'
                        : 'bg-terminal-surface border border-terminal-border'
                    }`}
                  >
                    Limit
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced */}
          <div className="pt-4 border-t border-terminal-border">
            <button
              onClick={() => setSettings({ ...settings, showAdvanced: !settings.showAdvanced })}
              className="text-sm font-medium text-terminal-text-secondary hover:text-terminal-text-primary"
            >
              {settings.showAdvanced ? 'Hide' : 'Show'} Advanced Settings
            </button>
            {settings.showAdvanced && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">RPC Endpoint</label>
                  <input
                    type="text"
                    placeholder="https://api.mainnet-beta.solana.com"
                    className="terminal-input w-full"
                    defaultValue={process.env.NEXT_PUBLIC_SOLANA_RPC_URL || ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">API Key</label>
                  <input
                    type="password"
                    placeholder="Enter API key"
                    className="terminal-input w-full"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-4 mt-6 pt-6 border-t border-terminal-border">
          <button onClick={onClose} className="terminal-button flex-1">
            Cancel
          </button>
          <button onClick={handleSave} className="terminal-button-primary flex-1 flex items-center justify-center gap-2">
            <Save size={16} />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  )
}




