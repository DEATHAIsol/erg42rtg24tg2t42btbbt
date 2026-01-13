'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void
  showSuccess: (message: string, duration?: number) => void
  showError: (message: string, duration?: number) => void
  showWarning: (message: string, duration?: number) => void
  showInfo: (message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    // Return fallback that uses alert for backwards compatibility
    return {
      showToast: (message: string) => alert(message),
      showSuccess: (message: string) => alert(message),
      showError: (message: string) => alert(message),
      showWarning: (message: string) => alert(message),
      showInfo: (message: string) => alert(message),
    }
  }
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const showToast = (message: string, type: ToastType = 'info', duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newToast: Toast = { id, message, type, duration }
    setToasts(prev => [...prev, newToast])

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
    }
  }

  const value: ToastContextType = {
    showToast,
    showSuccess: (message, duration) => showToast(message, 'success', duration),
    showError: (message, duration) => showToast(message, 'error', duration),
    showWarning: (message, duration) => showToast(message, 'warning', duration),
    showInfo: (message, duration) => showToast(message, 'info', duration),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[], onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onRemove }: { toast: Toast, onRemove: (id: string) => void }) {
  const [isExiting, setIsExiting] = useState(false)

  const handleRemove = () => {
    setIsExiting(true)
    setTimeout(() => onRemove(toast.id), 200)
  }

  const icons = {
    success: <CheckCircle2 size={20} className="text-terminal-success flex-shrink-0" />,
    error: <AlertCircle size={20} className="text-terminal-danger flex-shrink-0" />,
    warning: <AlertTriangle size={20} className="text-terminal-warning flex-shrink-0" />,
    info: <Info size={20} className="text-terminal-accent flex-shrink-0" />,
  }

  const bgColors = {
    success: 'bg-terminal-success/10 border-terminal-success/30',
    error: 'bg-terminal-danger/10 border-terminal-danger/30',
    warning: 'bg-terminal-warning/10 border-terminal-warning/30',
    info: 'bg-terminal-accent/10 border-terminal-accent/30',
  }

  return (
    <div
      className={`
        ${bgColors[toast.type]}
        border rounded-lg p-4 shadow-lg backdrop-blur-sm
        flex items-start gap-3 min-w-[280px]
        animate-in slide-in-from-right-5 duration-200
        ${isExiting ? 'animate-out slide-out-to-right-5 opacity-0' : ''}
      `}
    >
      {icons[toast.type]}
      <p className="text-sm text-terminal-text-primary flex-1 break-words">{toast.message}</p>
      <button
        onClick={handleRemove}
        className="p-1 hover:bg-terminal-border/50 rounded transition-colors flex-shrink-0"
      >
        <X size={16} className="text-terminal-text-muted" />
      </button>
    </div>
  )
}

