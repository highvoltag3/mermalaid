import './Toast.css'

interface ToastProps {
  message: string
  type: 'success' | 'error'
  onDismiss: () => void
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
        {type === 'success' ? '✓' : '!'}
      </span>
      <span className="toast-message">{message}</span>
    </div>
  )
}
