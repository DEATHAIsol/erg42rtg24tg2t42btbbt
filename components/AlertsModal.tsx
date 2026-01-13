'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Bell, BellOff } from 'lucide-react'
import { useToast } from './Toast'

interface MarketAlert {
  id: string
  marketId: string
  marketQuestion: string
  condition: 'price-above' | 'price-below' | 'volume-above'
  value: number
  enabled: boolean
  createdAt: string
}

interface AlertsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AlertsModal({ isOpen, onClose }: AlertsModalProps) {
  const toast = useToast()
  const [alerts, setAlerts] = useState<MarketAlert[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newAlert, setNewAlert] = useState({
    marketId: '',
    marketQuestion: '',
    condition: 'price-above' as MarketAlert['condition'],
    value: 0,
  })

  useEffect(() => {
    // Load alerts from localStorage
    const saved = localStorage.getItem('market-alerts')
    if (saved) {
      try {
        setAlerts(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load alerts:', e)
      }
    }
  }, [])

  const saveAlerts = (updatedAlerts: MarketAlert[]) => {
    localStorage.setItem('market-alerts', JSON.stringify(updatedAlerts))
    setAlerts(updatedAlerts)
  }

  const handleAddAlert = () => {
    if (!newAlert.marketId || !newAlert.marketQuestion || newAlert.value <= 0) {
      toast.showWarning('Please fill in all fields')
      return
    }

    const newMarketAlert: MarketAlert = {
      id: Date.now().toString(),
      ...newAlert,
      enabled: true,
      createdAt: new Date().toISOString(),
    }

    saveAlerts([...alerts, newMarketAlert])
    setNewAlert({
      marketId: '',
      marketQuestion: '',
      condition: 'price-above',
      value: 0,
    })
    setShowAddForm(false)
  }

  const handleDeleteAlert = (id: string) => {
    saveAlerts(alerts.filter((a) => a.id !== id))
  }

  const handleToggleAlert = (id: string) => {
    saveAlerts(
      alerts.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="terminal-card w-full max-w-3xl max-h-[90vh] overflow-auto bg-terminal-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Price Alerts</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-terminal-border rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Add Alert Button */}
        <div className="mb-4">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="terminal-button-primary w-full flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            <span>Add New Alert</span>
          </button>
        </div>

        {/* Add Alert Form */}
        {showAddForm && (
          <div className="terminal-card mb-4 bg-terminal-bg">
            <h3 className="font-semibold mb-4">Create Alert</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Market ID</label>
                <input
                  type="text"
                  value={newAlert.marketId}
                  onChange={(e) => setNewAlert({ ...newAlert, marketId: e.target.value })}
                  placeholder="0x..."
                  className="terminal-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Market Question</label>
                <input
                  type="text"
                  value={newAlert.marketQuestion}
                  onChange={(e) =>
                    setNewAlert({ ...newAlert, marketQuestion: e.target.value })
                  }
                  placeholder="Will Bitcoin reach $100k?"
                  className="terminal-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Condition</label>
                <select
                  value={newAlert.condition}
                  onChange={(e) =>
                    setNewAlert({ ...newAlert, condition: e.target.value as MarketAlert['condition'] })
                  }
                  className="terminal-input w-full"
                >
                  <option value="price-above">Price Above</option>
                  <option value="price-below">Price Below</option>
                  <option value="volume-above">Volume Above</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {newAlert.condition === 'price-above' || newAlert.condition === 'price-below'
                    ? 'Price (¢)'
                    : 'Volume ($)'}
                </label>
                <input
                  type="number"
                  value={newAlert.value}
                  onChange={(e) =>
                    setNewAlert({ ...newAlert, value: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                  step="0.01"
                  className="terminal-input w-full"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddAlert} className="terminal-button-primary flex-1">
                  Add Alert
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="terminal-button flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Alerts List */}
        <div className="space-y-2">
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-terminal-text-secondary">
              No alerts set. Create one to get notified about market movements.
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className="terminal-card bg-terminal-bg flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      onClick={() => handleToggleAlert(alert.id)}
                      className="p-1 hover:bg-terminal-border rounded"
                    >
                      {alert.enabled ? (
                        <Bell size={16} className="text-terminal-accent" />
                      ) : (
                        <BellOff size={16} className="text-terminal-text-secondary" />
                      )}
                    </button>
                    <span className="font-medium text-sm">{alert.marketQuestion}</span>
                  </div>
                  <div className="text-xs text-terminal-text-secondary ml-7">
                    {alert.condition === 'price-above' && `Alert when price > ${alert.value}¢`}
                    {alert.condition === 'price-below' && `Alert when price < ${alert.value}¢`}
                    {alert.condition === 'volume-above' &&
                      `Alert when volume > $${alert.value.toLocaleString()}`}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteAlert(alert.id)}
                  className="p-2 hover:bg-terminal-danger/20 rounded transition-colors"
                >
                  <Trash2 size={16} className="text-terminal-danger" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-terminal-border">
          <button onClick={onClose} className="terminal-button-primary w-full">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

