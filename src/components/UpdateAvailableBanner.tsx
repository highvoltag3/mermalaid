import type { LatestReleaseInfo } from '../utils/githubRelease'
import './UpdateAvailableBanner.css'

type BannerVariant = 'editor' | 'landing'

interface UpdateAvailableBannerProps {
  update: LatestReleaseInfo
  onDismiss: () => void
  variant: BannerVariant
  /** Landing page resolves dark separately from mermaid theme */
  dark?: boolean
}

export default function UpdateAvailableBanner({
  update,
  onDismiss,
  variant,
  dark = false,
}: UpdateAvailableBannerProps) {
  const label =
    update.name && update.name !== update.tag ? update.name : `Version ${update.version}`

  return (
    <div
      className={`update-banner update-banner--${variant}${dark ? ' update-banner--dark' : ''}`}
      role="region"
      aria-label="New release available"
    >
      <div className="update-banner-inner">
        <span className="update-banner-text">
          <strong className="update-banner-title">Update available</strong>
          <span className="update-banner-meta">
            {label}
            <span className="update-banner-sep" aria-hidden="true">
              ·
            </span>
            <a
              href={update.releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="update-banner-link"
            >
              View release
            </a>
          </span>
        </span>
        <div className="update-banner-actions">
          <a
            href={update.releaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="update-banner-btn update-banner-btn-primary"
          >
            Download
          </a>
          <button
            type="button"
            className="update-banner-btn update-banner-btn-ghost"
            onClick={onDismiss}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
