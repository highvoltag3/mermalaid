import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import {
  formatDocumentTitleControlLabel,
  getDocumentDirectoryLabel,
  getDocumentTitleStem,
} from '../utils/documentTitle'
import './DocumentTitleControl.css'

export type DocumentTitleControlProps = {
  documentDisplayName: string
  documentPath: string | null
  isEdited: boolean
  /** Apply a rename. Return false/void to keep the popover open on failure. */
  onRename: (nextRawName: string) => boolean | void | Promise<boolean | void>
  /** Visual placement: overlay title bar, centered in toolbar, or mobile brand stack. */
  placement?: 'overlay' | 'toolbar' | 'mobile'
}

export default function DocumentTitleControl({
  documentDisplayName,
  documentPath,
  isEdited,
  onRename,
  placement = 'toolbar',
}: DocumentTitleControlProps) {
  const [open, setOpen] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const nameFieldId = useId()

  const label = formatDocumentTitleControlLabel(documentDisplayName, isEdited)
  const whereLabel = getDocumentDirectoryLabel(documentPath)

  const close = useCallback(() => {
    setOpen(false)
    setIsSubmitting(false)
  }, [])

  const openPopover = useCallback(() => {
    setDraftName(getDocumentTitleStem(documentDisplayName))
    setOpen(true)
  }, [documentDisplayName])

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => {
      const input = inputRef.current
      if (!input) return
      input.focus()
      input.select()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (popoverRef.current?.contains(target)) return
      if (triggerRef.current?.contains(target)) return
      close()
    }

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        close()
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open, close])

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const result = await onRename(draftName)
      if (result === false) {
        setIsSubmitting(false)
        inputRef.current?.focus()
        inputRef.current?.select()
        return
      }
      close()
      triggerRef.current?.focus()
    } catch {
      setIsSubmitting(false)
      inputRef.current?.focus()
    }
  }

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' && !open) {
      event.preventDefault()
      openPopover()
    }
  }

  return (
    <div
      className={`document-title-control document-title-control--${placement}`}
      data-tauri-drag-region={placement === 'overlay' ? true : undefined}
    >
      <button
        ref={triggerRef}
        type="button"
        className="document-title-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? titleId : undefined}
        title={documentDisplayName}
        onClick={() => (open ? close() : openPopover())}
        onKeyDown={onTriggerKeyDown}
        data-tauri-drag-region={undefined}
      >
        <span className="document-title-trigger-text">{label}</span>
        <span className="document-title-trigger-chevron" aria-hidden="true">
          ⌄
        </span>
      </button>

      {open && (
        <div
          ref={popoverRef}
          id={titleId}
          className="document-title-popover"
          role="dialog"
          aria-label="Rename document"
        >
          <form className="document-title-popover-form" onSubmit={(e) => void submit(e)}>
            <label className="document-title-popover-row" htmlFor={nameFieldId}>
              <span className="document-title-popover-key">Name:</span>
              <input
                ref={inputRef}
                id={nameFieldId}
                className="document-title-popover-input"
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                disabled={isSubmitting}
              />
            </label>

            <div className="document-title-popover-row document-title-popover-meta">
              <span className="document-title-popover-key">Status:</span>
              <span className="document-title-popover-status">
                <span
                  className={`document-title-status-dot ${isEdited ? 'is-edited' : 'is-saved'}`}
                  aria-hidden="true"
                />
                {isEdited ? 'Edited - not saved yet' : 'Saved'}
              </span>
            </div>

            <div className="document-title-popover-row document-title-popover-meta">
              <span className="document-title-popover-key">Where:</span>
              <span className="document-title-popover-where" title={documentPath ?? undefined}>
                {whereLabel ?? 'Not saved to disk yet'}
              </span>
            </div>

            <p className="document-title-popover-hint">
              Press Return to rename · Esc to cancel
            </p>
          </form>
        </div>
      )}
    </div>
  )
}
