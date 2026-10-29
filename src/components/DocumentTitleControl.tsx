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

type PopoverCoords = {
  top: number
  left: number
  width: number
}

const THEME_VAR_NAMES = [
  '--app-bg',
  '--app-fg',
  '--app-border',
  '--app-accent',
  '--app-muted',
  '--app-surface',
] as const

function readThemeVars(from: Element | null): CSSProperties {
  if (!from || typeof window === 'undefined') return {}
  const styles = window.getComputedStyle(from)
  const vars: Record<string, string> = {}
  for (const name of THEME_VAR_NAMES) {
    const value = styles.getPropertyValue(name).trim()
    if (value) vars[name] = value
  }
  return vars as CSSProperties
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
  const [coords, setCoords] = useState<PopoverCoords | null>(null)
  const [themeVars, setThemeVars] = useState<CSSProperties>({})
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
    const left = Math.min(
      Math.max(12, rect.left + rect.width / 2 - width / 2),
      window.innerWidth - width - 12,
    )
    setCoords({
      top: rect.bottom + 8,
      left,
      width,
    })
    const app = document.querySelector('.app')
    setThemeVars(readThemeVars(app ?? trigger))
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updateCoords()
  }, [open, updateCoords])

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

    const onReposition = () => updateCoords()

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, close, updateCoords])

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

  const popoverStyle: CSSProperties | undefined = coords
    ? {
        ...themeVars,
        top: coords.top,
        left: coords.left,
        width: coords.width,
        // Inline opaque fill so theme vars / cascade cannot leave the panel transparent.
        backgroundColor:
          (themeVars as Record<string, string>)['--app-bg'] ||
          (themeVars as Record<string, string>)['--app-surface'] ||
          '#ffffff',
        backgroundImage: 'none',
        opacity: 1,
      }
    : undefined

  const popover =
    open && coords && typeof document !== 'undefined'
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
