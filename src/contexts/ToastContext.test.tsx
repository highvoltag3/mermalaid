/**
 * README § Toast Notifications — feedback for save / export / errors.
 */
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToast } from '../hooks/useToast'
import { ToastProvider } from './ToastContext'

function Trigger() {
  const { showToast } = useToast()
  return (
    <button type="button" onClick={() => showToast('Fixture message', 'success')}>
      Show
    </button>
  )
}

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('showToast renders message until auto-dismiss', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Show' }))
    expect(screen.getByText('Fixture message')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(3500)
    })

    expect(screen.queryByText('Fixture message')).not.toBeInTheDocument()
  })
})
