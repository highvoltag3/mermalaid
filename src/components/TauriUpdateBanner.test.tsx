import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TauriUpdateBanner from './TauriUpdateBanner'

vi.mock('@tauri-apps/api/core', () => ({
  isTauri: () => true,
}))

describe('TauriUpdateBanner', () => {
  afterEach(() => {
    cleanup()
  })

  it('dismisses the up-to-date status on OK', async () => {
    const user = userEvent.setup()
    const dismissUpdate = vi.fn()

    render(
      <TauriUpdateBanner
        updater={{
          status: 'up-to-date',
          update: null,
          progress: null,
          error: null,
          checkForUpdates: vi.fn(),
          downloadAndInstall: vi.fn(),
          skipVersion: vi.fn(),
          dismissUpdate,
        }}
        variant="editor"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'OK' }))
    expect(dismissUpdate).toHaveBeenCalledOnce()
  })
})
