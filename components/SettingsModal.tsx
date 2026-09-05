'use client'

import { useState, useEffect } from 'react'
import { X, Save, Monitor, Moon, Sun } from 'lucide-react'
import { ModalPortal } from './ModalPortal'
import { RPC_URL, CHAIN_NAME } from '@/lib/chain'
import { applyTheme, readTheme } from '@/lib/useTheme'

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

  // Theme previews apply live, so dismissing without saving must put it back.
  const handleDismiss = () => {
    applyTheme(readTheme())
    onClose()
  }

  const handleSave = () => {
    localStorage.setItem('terminal-settings', JSON.stringify(settings))
    // Let the account-sync layer know there is something new to persist.
    window.dispatchEvent(new CustomEvent('terminal-settings-updated'))
    onClose()
  }

  if (!isOpen) return null

  return (

    <ModalPortal>
      <div className="modal-overlay" onClick={handleDismiss}>
      <div
        className="modal-panel max-w-2xl max-h-[90vh] my-auto overflow-auto p-4"
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
                onClick={() => { setSettings({ ...settings, theme: 'dark' }); applyTheme('dark') }}
                className={`flex-1 p-3 rounded border transition-all ${
                  settings.theme === 'dark'
                    ? 'bg-terminal-accent border-terminal-accent text-terminal-ink'
                    : 'bg-terminal-surface border-terminal-border'
                }`}
              >
                <Moon size={20} className="mx-auto mb-1" />
                <span className="text-xs">Dark</span>
              </button>
              <button
                onClick={() => { setSettings({ ...settings, theme: 'light' }); applyTheme('light') }}
                className={`flex-1 p-3 rounded border transition-all ${
                  settings.theme === 'light'
                    ? 'bg-terminal-accent border-terminal-accent text-terminal-ink'
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
                        ? 'bg-terminal-accent text-terminal-ink'
                        : 'bg-terminal-surface border border-terminal-border'
                    }`}
                  >
                    Market
                  </button>
                  <button
                    onClick={() => setSettings({ ...settings, defaultOrderType: 'limit' })}
                    className={`flex-1 py-2 rounded text-sm transition-all ${
                      settings.defaultOrderType === 'limit'
                        ? 'bg-terminal-accent text-terminal-ink'
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
                  <label className="block text-sm font-medium mb-2">{CHAIN_NAME} RPC endpoint</label>
                  <input
                    type="text"
                    placeholder={RPC_URL}
                    className="terminal-input w-full"
                    defaultValue={RPC_URL}
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
    </ModalPortal>
  )
}




