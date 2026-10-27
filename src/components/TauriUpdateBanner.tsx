import { isTauri } from '@tauri-apps/api/core'
import type { UpdaterState, UpdateStatus } from '../hooks/useUpdater'
import './UpdateAvailableBanner.css'
import './TauriUpdateBanner.css'

type BannerVariant = 'editor' | 'landing'

interface TauriUpdateBannerProps {
  updater: UpdaterState
  variant: BannerVariant
  dark?: boolean
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatProgress(downloaded: number, total: number | null): string {
  if (total) {
    const percent = Math.round((downloaded / total) * 100)
    return `${formatBytes(downloaded)} / ${formatBytes(total)} (${percent}%)`
  }
  return formatBytes(downloaded)
}

function getStatusMessage(status: UpdateStatus): string | null {
  switch (status) {
    case 'checking':
      return 'Checking for updates…'
    case 'up-to-date':
      return 'Mermalaid is up to date.'
    case 'disabled':
      return 'Auto-updates are not configured for this build.'
    default:
      return null
  }
}

export default function TauriUpdateBanner({
  updater,
  variant,
  dark = false,
}: TauriUpdateBannerProps) {
  const { status, update, progress, error, downloadAndInstall, skipVersion, dismissUpdate } = updater

  // Don't show anything in web builds
  if (!isTauri()) {
    return null
  }

  // Status messages (checking, up-to-date, disabled)
  const statusMessage = getStatusMessage(status)
  if (statusMessage) {
    return (
      <div
        className={`update-banner update-banner--${variant}${dark ? ' update-banner--dark' : ''} update-banner--status`}
        role="status"
        aria-label={statusMessage}
      >
        <div className="update-banner-inner">
          <span className="update-banner-text">
            <span className="update-banner-title">{statusMessage}</span>
          </span>
          {(status === 'up-to-date' || status === 'disabled') && (
            <div className="update-banner-actions">
              <button
                type="button"
                className="update-banner-btn update-banner-btn-ghost"
                onClick={dismissUpdate}
              >
                OK
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Error state
  if (status === 'error' && error) {
    return (
      <div
        className={`update-banner update-banner--${variant}${dark ? ' update-banner--dark' : ''} update-banner--error`}
        role="alert"
      >
        <div className="update-banner-inner">
          <span className="update-banner-text">
            <strong className="update-banner-title">Update check failed</strong>
            <span className="update-banner-meta">{error}</span>
          </span>
          <div className="update-banner-actions">
            <button
              type="button"
              className="update-banner-btn update-banner-btn-ghost"
              onClick={dismissUpdate}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Downloading state with progress
  if (status === 'downloading' && progress) {
    const progressPercent = progress.contentLength
      ? Math.round((progress.downloaded / progress.contentLength) * 100)
      : null

    return (
      <div
        className={`update-banner update-banner--${variant}${dark ? ' update-banner--dark' : ''}`}
        role="status"
        aria-label="Downloading update"
      >
        <div className="update-banner-inner">
          <span className="update-banner-text">
            <strong className="update-banner-title">Downloading update…</strong>
            <span className="update-banner-meta">
              {formatProgress(progress.downloaded, progress.contentLength)}
            </span>
          </span>
          <div className="update-banner-progress-container">
            <div
              className="update-banner-progress-bar"
              style={{ width: progressPercent ? `${progressPercent}%` : '100%' }}
              role="progressbar"
              aria-valuenow={progressPercent ?? undefined}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      </div>
    )
  }

  // Ready state (downloaded, waiting for restart)
  if (status === 'ready') {
    return (
      <div
        className={`update-banner update-banner--${variant}${dark ? ' update-banner--dark' : ''}`}
        role="status"
        aria-label="Update ready to install"
      >
        <div className="update-banner-inner">
          <span className="update-banner-text">
            <strong className="update-banner-title">Update downloaded</strong>
            <span className="update-banner-meta">
              Restart Mermalaid to apply the update.
            </span>
          </span>
          <div className="update-banner-actions">
            <button
              type="button"
              className="update-banner-btn update-banner-btn-primary"
              onClick={() => {
                void import('@tauri-apps/plugin-process').then(({ relaunch }) => relaunch())
              }}
            >
              Restart Now
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Update available state
  if (status === 'available' && update) {
    const versionLabel = `Version ${update.version}`

    return (
      <div
        className={`update-banner update-banner--${variant}${dark ? ' update-banner--dark' : ''}`}
        role="region"
        aria-label="New update available"
      >
        <div className="update-banner-inner">
          <span className="update-banner-text">
            <strong className="update-banner-title">Update available</strong>
            <span className="update-banner-meta">
              {versionLabel}
              {update.body && (
                <>
                  <span className="update-banner-sep" aria-hidden="true">·</span>
                  <span className="update-banner-notes">{update.body.split('\n')[0]}</span>
                </>
              )}
            </span>
          </span>
          <div className="update-banner-actions">
            <button
              type="button"
              className="update-banner-btn update-banner-btn-primary"
              onClick={() => void downloadAndInstall()}
            >
              Update &amp; Restart
            </button>
            <button
              type="button"
              className="update-banner-btn update-banner-btn-ghost"
              onClick={skipVersion}
              title="Skip this version (you can check for updates later from the menu)"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Idle or other states - don't show anything
  return null
}
