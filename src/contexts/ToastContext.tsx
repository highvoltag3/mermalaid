import { createContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react'
import Toast from '../components/Toast'

export type ToastType = 'success' | 'error'

interface ToastState {
  message: string
  type: ToastType
}

interface ToastContextType {
  toast: ToastState | null
  showToast: (message: string, type?: ToastType) => void
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined)

const AUTO_DISMISS_MS = 3500
const AUTO_DISMISS_ERROR_MS = 5000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearToastTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    clearToastTimer()
    setToast({ message, type })
    const ms = type === 'error' ? AUTO_DISMISS_ERROR_MS : AUTO_DISMISS_MS
    timeoutRef.current = setTimeout(() => {
      setToast(null)
      timeoutRef.current = null
    }, ms)
  }, [clearToastTimer])

  const dismissToast = useCallback(() => {
    clearToastTimer()
    setToast(null)
  }, [clearToastTimer])

  useEffect(() => {
    return () => clearToastTimer()
  }, [clearToastTimer])

  return (
    <ToastContext.Provider value={{ toast, showToast }}>
      {children}
      {toast && (
        <div className="toast-container">
          <Toast
            message={toast.message}
            type={toast.type}
            onDismiss={dismissToast}
          />
        </div>
      )}
    </ToastContext.Provider>
  )
}
