'use client'

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react'
import { X, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { ModalPortal } from './ModalPortal'

type ConfirmType = 'warning' | 'danger' | 'info' | 'success'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: ConfirmType
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | null>(null)

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    // Fallback to browser confirm
    return {
      confirm: async (options: ConfirmOptions) => window.confirm(options.message)
    }
  }
  return context
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean
  resolve: ((value: boolean) => void) | null
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'warning',
    resolve: null,
  })

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        type: options.type || 'warning',
        resolve,
      })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    state.resolve?.(true)
    setState(prev => ({ ...prev, isOpen: false, resolve: null }))
  }, [state.resolve])

  const handleCancel = useCallback(() => {
    state.resolve?.(false)
    setState(prev => ({ ...prev, isOpen: false, resolve: null }))
  }, [state.resolve])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (state.isOpen) {
        if (e.key === 'Escape') {
          handleCancel()
        } else if (e.key === 'Enter') {
          handleConfirm()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.isOpen, handleCancel, handleConfirm])

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state.isOpen && (
        <ConfirmModal
          title={state.title}
          message={state.message}
          confirmText={state.confirmText}
          cancelText={state.cancelText}
          type={state.type}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  )
}

interface ConfirmModalProps {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: ConfirmType
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmModal({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const icons = {
    warning: <AlertTriangle size={24} className="text-terminal-warning" />,
    danger: <AlertTriangle size={24} className="text-terminal-danger" />,
    info: <Info size={24} className="text-terminal-accent" />,
    success: <CheckCircle2 size={24} className="text-terminal-success" />,
  }

  const confirmButtonStyles = {
    warning: 'bg-terminal-warning/20 border-terminal-warning/50 text-terminal-warning hover:bg-terminal-warning/30',
    danger: 'bg-terminal-danger/20 border-terminal-danger/50 text-terminal-danger hover:bg-terminal-danger/30',
    info: 'bg-terminal-accent/20 border-terminal-accent/50 text-terminal-accent hover:bg-terminal-accent/30',
    success: 'bg-terminal-success/20 border-terminal-success/50 text-terminal-success hover:bg-terminal-success/30',
  }

  return (
    <ModalPortal>
    <div
      className="modal-overlay !z-[200]"
      onClick={onCancel}
    >
      <div
        className="modal-panel max-w-md my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-terminal-border">
          {icons[type]}
          <h3 className="text-lg font-semibold text-terminal-text-primary flex-1">{title}</h3>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-terminal-border/50 rounded transition-colors"
          >
            <X size={18} className="text-terminal-text-muted" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          <p className="text-terminal-text-secondary whitespace-pre-wrap">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-terminal-border">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-terminal-border text-terminal-text-secondary hover:bg-terminal-border/30 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg border font-medium transition-colors ${confirmButtonStyles[type]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  )
}

