import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '../hooks/useTheme'
import { getAppThemeCssVars } from '../utils/mermaidThemes'
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
  /** Return false to keep the popover open after a failed rename. */
  onRename: (nextRawName: string) => boolean | Promise<boolean>
  /** `overlay` for the desktop title strip, `mobile` for the brand stack. */
  placement?: 'overlay' | 'mobile'
}

type PopoverCoords = {
  top: number
  left: number
  width: number
}

function sameCoords(a: PopoverCoords | null, b: PopoverCoords): boolean {
  return !!a && a.top === b.top && a.left === b.left && a.width === b.width
}

export default function DocumentTitleControl({
  documentDisplayName,
  documentPath,
  isEdited,
  onRename,
  placement = 'overlay',
}: DocumentTitleControlProps) {
  const { mermaidTheme } = useTheme()
  const themeVars = getAppThemeCssVars(mermaidTheme)
  const [open, setOpen] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [coords, setCoords] = useState<PopoverCoords | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const nameFieldId = useId()

  const stem = getDocumentTitleStem(documentDisplayName)
  const label = formatDocumentTitleControlLabel(documentDisplayName, isEdited)
  const whereLabel = getDocumentDirectoryLabel(documentPath)
  const triggerAriaLabel = `Rename ${stem}`

  const close = useCallback(() => {
    setOpen(false)
    setIsSubmitting(false)
    setCoords(null)
  }, [])

  const openPopover = useCallback(() => {
    setDraftName(getDocumentTitleStem(documentDisplayName))
    setOpen(true)
  }, [documentDisplayName])

  const updateCoords = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const width = Math.min(340, Math.max(280, window.innerWidth - 24))
    const next: PopoverCoords = {
      top: rect.bottom + 8,
      left: Math.min(
        Math.max(12, rect.left + rect.width / 2 - width / 2),
        window.innerWidth - width - 12,
      ),
      width,
    }
    setCoords((prev) => (sameCoords(prev, next) ? prev : next))
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updateCoords()
  }, [open, updateCoords])

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (isSubmitting) return
      const target = event.target as Node | null
      if (!target) return
      if (popoverRef.current?.contains(target)) return
      if (triggerRef.current?.contains(target)) return
      close()
      triggerRef.current?.focus()
    }

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        if (isSubmitting) return
        close()
        triggerRef.current?.focus()
      }
    }

    let frame = 0
    const onReposition = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        updateCoords()
      })
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [open, close, updateCoords, isSubmitting])

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const ok = await onRename(draftName)
      if (!ok) {
        setIsSubmitting(false)
        inputRef.current?.focus()
        inputRef.current?.select()
        return
      }
      close()
      triggerRef.current?.focus()
    } catch (err) {
      console.error('Document rename failed:', err)
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

  const popoverStyle: CSSProperties | undefined = coords
    ? {
        ...(themeVars as CSSProperties),
        top: coords.top,
        left: coords.left,
        width: coords.width,
        backgroundColor: themeVars['--app-bg'] || themeVars['--app-surface'] || '#ffffff',
      }
    : undefined

  const popover =
    open && coords
      ? createPortal(
          <div
            ref={popoverRef}
            id={titleId}
            className="document-title-popover"
            role="dialog"
            aria-modal="true"
            aria-label="Rename document"
            style={popoverStyle}
          >
            <form className="document-title-popover-form" onSubmit={(e) => void submit(e)}>
              <div className="document-title-popover-row">
                <label className="document-title-popover-key" htmlFor={nameFieldId}>
                  Name:
                </label>
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
              </div>

              <div className="document-title-popover-row document-title-popover-meta">
                <span className="document-title-popover-key">Status:</span>
                <span className="document-title-popover-status">
                  <span
                    className={`document-title-status-dot ${isEdited ? 'is-edited' : 'is-saved'}`}
                    aria-hidden="true"
                  />
                  <span className="document-title-popover-status-text">
                    {isEdited ? 'Edited - not saved yet' : 'Saved'}
                  </span>
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
          </div>,
          document.body,
        )
      : null

  return (
    <div
      className={`document-title-control document-title-control--${placement}`}
      data-tauri-drag-region={placement === 'overlay' ? true : undefined}
    >
      <button
        ref={triggerRef}
        type="button"
        className="document-title-trigger"
        aria-label={triggerAriaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? titleId : undefined}
        title={documentDisplayName}
        onClick={() => (open ? close() : openPopover())}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="document-title-trigger-text">{label}</span>
        <span className="document-title-trigger-chevron" aria-hidden="true">
          ⌄
        </span>
      </button>
      {popover}
    </div>
  )
}
