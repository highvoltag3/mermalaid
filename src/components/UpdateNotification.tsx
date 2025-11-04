import { useState, useEffect } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { checkForUpdates, installUpdate, UpdateInfo } from '../utils/updater'
import './UpdateNotification.css'

interface UpdateNotificationProps {
  onDismiss?: () => void
}

export default function UpdateNotification({ onDismiss }: UpdateNotificationProps) {
  const { theme } = useTheme()
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check for updates when component mounts
    const checkUpdates = async () => {
      // Only check in Tauri desktop app, not in web version
      setIsChecking(true)
      try {
        const update = await checkForUpdates()
        if (update) {
          setUpdateInfo(update)
          setIsVisible(true)
        }
      } catch (error) {
        // Silently fail if not in Tauri environment or other errors
        console.error('Error checking for updates:', error)
      } finally {
        setIsChecking(false)
      }
    }

    // Delay initial check by a few seconds to not interrupt startup
    const timeout = setTimeout(checkUpdates, 3000)

    return () => clearTimeout(timeout)
  }, [])

  const handleUpdate = async () => {
    if (!updateInfo) return

    setIsInstalling(true)
    try {
      await installUpdate()
      // If successful, the app will restart, so we won't reach here
    } catch (error) {
      console.error('Error installing update:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to install update: ${errorMessage}\n\nPlease try downloading manually from GitHub Releases.`)
      setIsInstalling(false)
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()
  }

  const handleLater = () => {
    // Store dismissal in localStorage with version to avoid showing again for same version
    if (updateInfo) {
      localStorage.setItem('mermalaid-update-dismissed', updateInfo.version)
    }
    handleDismiss()
  }

  if (!isVisible || !updateInfo) return null

  // Check if this version was already dismissed
  const dismissedVersion = localStorage.getItem('mermalaid-update-dismissed')
  if (dismissedVersion === updateInfo.version) {
    return null
  }

  return (
    <div className={`update-notification ${theme}`}>
      <div className="update-content">
        <div className="update-header">
          <h3>🚀 Update Available</h3>
          <button className="close-button" onClick={handleDismiss} aria-label="Close">
            ×
          </button>
        </div>
        <div className="update-body">
          <p className="update-message">
            A new version <strong>{updateInfo.version}</strong> is available!
          </p>
          {updateInfo.body && (
            <div className="update-notes">
              <details>
                <summary>Release Notes</summary>
                <div className="release-notes-content">
                  {updateInfo.body.split('\n').map((line, i) => {
                    // Skip empty lines
                    if (!line.trim()) return null
                    // Render markdown-style headers and lists
                    if (line.startsWith('#')) {
                      const level = line.match(/^#+/)?.length || 1
                      const text = line.replace(/^#+\s+/, '')
                      const HeadingTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements
                      return <HeadingTag key={i}>{text}</HeadingTag>
                    }
                    if (line.startsWith('- ') || line.startsWith('* ')) {
                      return <li key={i}>{line.substring(2)}</li>
                    }
                    return <p key={i}>{line}</p>
                  })}
                </div>
              </details>
            </div>
          )}
        </div>
        <div className="update-actions">
          <button
            className="update-button primary"
            onClick={handleUpdate}
            disabled={isInstalling}
          >
            {isInstalling ? 'Installing...' : 'Update Now'}
          </button>
          <button
            className="update-button secondary"
            onClick={handleLater}
            disabled={isInstalling}
          >
            Later
          </button>
          {updateInfo.downloadUrl && (
            <a
              href={updateInfo.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="update-button link"
            >
              View on GitHub
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

