import { useState, useEffect } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { getStoredApiKey, storeApiKey, clearApiKey } from '../utils/aiErrorFixer'
import './Settings.css'

interface SettingsProps {
  isOpen: boolean
  onClose: () => void
}

export default function Settings({ isOpen, onClose }: SettingsProps) {
  const { theme } = useTheme()
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredApiKey()
      setApiKey(stored || '')
    }
  }, [isOpen])

  const handleSave = () => {
    if (apiKey.trim()) {
      storeApiKey(apiKey.trim())
      alert('Settings saved successfully!')
      onClose()
    } else {
      clearApiKey()
      alert('API key cleared')
      onClose()
    }
  }

  const handleClear = () => {
    if (confirm('Clear API key?')) {
      setApiKey('')
      clearApiKey()
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`settings-modal ${theme}`} onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="settings-content">
          <div className="settings-section">
            <h3>AI Error Fixer</h3>
            <p className="settings-description">
              Add your OpenAI API key to enable AI-powered error fixing. Your key is stored locally and never shared.
            </p>
            
            <div className="settings-field">
              <label htmlFor="api-key">OpenAI API Key</label>
              <div className="api-key-input-wrapper">
                <input
                  id="api-key"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="api-key-input"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="toggle-visibility"
                  title={showApiKey ? 'Hide' : 'Show'}
                >
                  {showApiKey ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              <p className="settings-hint">
                Get your API key from{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  platform.openai.com
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button onClick={handleClear} className="button-secondary">
            Clear
          </button>
          <div>
            <button onClick={onClose} className="button-secondary">
              Cancel
            </button>
            <button onClick={handleSave} className="button-primary">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

