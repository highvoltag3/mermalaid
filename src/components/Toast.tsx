import './Toast.css'

interface ToastProps {
  message: string
  type: 'success' | 'error' | 'warning'
  onDismiss: () => void
}

const TOAST_ICONS: Record<ToastProps['type'], string> = {
  success: '✓',
  error: '!',
  warning: '⚠',
}

export default function Toast({ message, type, onDismiss }: ToastProps) {
  return (
    <div
      className={`toast toast-${type}`}
      role="status"
      aria-live="polite"
      onClick={onDismiss}
    >
      <span className="toast-icon" aria-hidden>
        {TOAST_ICONS[type]}
      </span>
      <span className="toast-message">{message}</span>
    </div>
  )
}
