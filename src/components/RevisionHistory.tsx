import { useState, useMemo } from 'react'
import {
  computeDiff,
  formatRevisionTime,
  type Revision,
  type DiffLine,
} from '../utils/revisionHistory'
import { useTheme } from '../hooks/useTheme'
import { isAppThemeDark } from '../utils/mermaidThemes'
import './RevisionHistory.css'

interface RevisionHistoryProps {
  isOpen: boolean
  onClose: () => void
  revisions: Revision[]
  currentCode: string
  onRestore: (id: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onClear: () => void
  onCreateCheckpoint: (name?: string) => void
}

type ViewMode = 'list' | 'diff'

interface DiffViewProps {
  diffLines: DiffLine[]
}

function DiffView({ diffLines }: DiffViewProps) {
  if (diffLines.length === 0) {
    return <div className="revision-diff-empty">No changes</div>
  }

  return (
    <div className="revision-diff">
      {diffLines.map((line, idx) => (
        <div
          key={idx}
          className={`revision-diff-line revision-diff-line-${line.type}`}
        >
          <span className="revision-diff-gutter">
            {line.type === 'removed' ? line.oldLineNo : ''}
          </span>
          <span className="revision-diff-gutter">
            {line.type === 'added' ? line.newLineNo : line.type === 'unchanged' ? line.newLineNo : ''}
          </span>
          <span className="revision-diff-marker">
            {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
          </span>
          <span className="revision-diff-content">{line.content || ' '}</span>
        </div>
      ))}
    </div>
  )
}

export default function RevisionHistory({
  isOpen,
  onClose,
  revisions,
  currentCode,
  onRestore,
  onRename,
  onDelete,
  onClear,
  onCreateCheckpoint,
}: RevisionHistoryProps) {
  const { mermaidTheme } = useTheme()
  const isDark = isAppThemeDark(mermaidTheme)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null)
  const [compareFromId, setCompareFromId] = useState<string | null>(null)
  const [compareToId, setCompareToId] = useState<string | null>(null)
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [editingNameValue, setEditingNameValue] = useState('')

  // Sorted by newest first for display
  const sortedRevisions = useMemo(
    () => [...revisions].sort((a, b) => b.timestamp - a.timestamp),
    [revisions],
  )

  const selectedRevision = useMemo(
    () => revisions.find((r) => r.id === selectedRevisionId),
    [revisions, selectedRevisionId],
  )

  const diffLines = useMemo(() => {
    if (viewMode === 'diff' && compareFromId && compareToId) {
      const fromRev = revisions.find((r) => r.id === compareFromId)
      const toRev = revisions.find((r) => r.id === compareToId)
      if (fromRev && toRev) {
        return computeDiff(fromRev.code, toRev.code)
      }
    }
    if (viewMode === 'diff' && selectedRevision) {
      return computeDiff(selectedRevision.code, currentCode)
    }
    return []
  }, [viewMode, selectedRevision, currentCode, compareFromId, compareToId, revisions])

  const handleSelectRevision = (id: string) => {
    setSelectedRevisionId(id)
    setCompareFromId(null)
    setCompareToId(null)
  }

  const handleStartRename = (revision: Revision) => {
    setEditingNameId(revision.id)
    setEditingNameValue(revision.name || '')
  }

  const handleSaveRename = () => {
    if (editingNameId && editingNameValue.trim()) {
      onRename(editingNameId, editingNameValue.trim())
    }
    setEditingNameId(null)
    setEditingNameValue('')
  }

  const handleCancelRename = () => {
    setEditingNameId(null)
    setEditingNameValue('')
  }

  const handleRestore = (id: string) => {
    if (confirm('Restore this revision? Your current changes will be replaced.')) {
      onRestore(id)
      onClose()
    }
  }

  const handleClearHistory = () => {
    if (confirm('Clear all revision history? This cannot be undone.')) {
      onClear()
      setSelectedRevisionId(null)
      setCompareFromId(null)
      setCompareToId(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="revision-history-backdrop" onClick={onClose}>
      <div
        className={`revision-history-panel ${isDark ? 'revision-history-dark' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Revision History"
      >
        <div className="revision-history-header">
          <h2>Revision History</h2>
          <div className="revision-history-header-actions">
            <button
              type="button"
              className="revision-history-btn revision-history-btn-primary"
              onClick={() => {
                const name = prompt('Checkpoint name (optional):')
                onCreateCheckpoint(name || undefined)
              }}
              title="Save current state as a named checkpoint"
            >
              Save Checkpoint
            </button>
            <button
              type="button"
              className="revision-history-close-btn"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="revision-history-body">
          <div className="revision-history-list-container">
            <div className="revision-history-list-header">
              <span className="revision-history-count">
                {sortedRevisions.length} revision{sortedRevisions.length !== 1 ? 's' : ''}
              </span>
              {sortedRevisions.length > 0 && (
                <button
                  type="button"
                  className="revision-history-btn revision-history-btn-text"
                  onClick={handleClearHistory}
                >
                  Clear All
                </button>
              )}
            </div>

            {sortedRevisions.length === 0 ? (
              <div className="revision-history-empty">
                <p>No revisions yet.</p>
                <p className="revision-history-empty-hint">
                  Revisions are saved automatically as you edit, or you can save
                  checkpoints manually.
                </p>
              </div>
            ) : (
              <ul className="revision-history-list" role="listbox">
                {sortedRevisions.map((revision, index) => (
                  <li
                    key={revision.id}
                    className={`revision-history-item ${selectedRevisionId === revision.id ? 'selected' : ''}`}
                    onClick={() => handleSelectRevision(revision.id)}
                    role="option"
                    aria-selected={selectedRevisionId === revision.id}
                  >
                    <div className="revision-history-item-main">
                      {editingNameId === revision.id ? (
                        <input
                          type="text"
                          className="revision-history-name-input"
                          value={editingNameValue}
                          onChange={(e) => setEditingNameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename()
                            if (e.key === 'Escape') handleCancelRename()
                          }}
                          onBlur={handleSaveRename}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="revision-history-item-name">
                          {revision.name || `Revision ${sortedRevisions.length - index}`}
                        </span>
                      )}
                      <span className="revision-history-item-time">
                        {formatRevisionTime(revision.timestamp)}
                      </span>
                    </div>
                    <div className="revision-history-item-preview">
                      {revision.code.split('\n').slice(0, 2).join(' ').slice(0, 60)}
                      {revision.code.length > 60 ? '...' : ''}
                    </div>
                    {selectedRevisionId === revision.id && (
                      <div
                        className="revision-history-item-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="revision-history-btn"
                          onClick={() => handleRestore(revision.id)}
                          title="Restore this revision"
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          className="revision-history-btn"
                          onClick={() => {
                            setViewMode('diff')
                            setCompareFromId(revision.id)
                            setCompareToId(null)
                          }}
                          title="Compare with current"
                        >
                          Compare
                        </button>
                        <button
                          type="button"
                          className="revision-history-btn"
                          onClick={() => handleStartRename(revision)}
                          title="Rename this revision"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          className="revision-history-btn revision-history-btn-danger"
                          onClick={() => {
                            if (confirm('Delete this revision?')) {
                              onDelete(revision.id)
                              if (selectedRevisionId === revision.id) {
                                setSelectedRevisionId(null)
                              }
                            }
                          }}
                          title="Delete this revision"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {viewMode === 'diff' && selectedRevision && (
            <div className="revision-history-diff-container">
              <div className="revision-history-diff-header">
                <span>
                  {compareFromId && compareToId
                    ? `Comparing revisions`
                    : `Changes from "${selectedRevision.name || 'Selected'}" to current`}
                </span>
                <button
                  type="button"
                  className="revision-history-btn revision-history-btn-text"
                  onClick={() => setViewMode('list')}
                >
                  Close Diff
                </button>
              </div>
              <DiffView diffLines={diffLines} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
