import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DocumentTitleControl from './DocumentTitleControl'

describe('DocumentTitleControl', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows the document stem with Edited/Saved and renames on Enter', async () => {
    const user = userEvent.setup()
    const onRename = vi.fn(async () => true)

    render(
      <div className="app">
        <DocumentTitleControl
          documentDisplayName="flow.mmd"
          documentPath={null}
          isEdited
          onRename={onRename}
          placement="overlay"
        />
      </div>,
    )

    expect(screen.getByRole('button', { name: /flow/i })).toHaveTextContent(
      'flow \u2014 Edited',
    )

    await user.click(screen.getByRole('button', { name: /flow/i }))
    const dialog = await screen.findByRole('dialog', { name: 'Rename document' })
    const input = await screen.findByLabelText('Name:')
    expect(input).toHaveValue('flow')
    expect(dialog).toHaveTextContent('Status:')
    expect(dialog).toHaveTextContent('Edited - not saved yet')
    expect(dialog).toHaveTextContent('Where:')
    expect(dialog).toHaveTextContent('Not saved to disk yet')
    expect(dialog.querySelector('.document-title-popover-key')).toBeTruthy()

    await user.clear(input)
    await user.type(input, 'checkout-flow{Enter}')

    await waitFor(() => {
      expect(onRename).toHaveBeenCalledWith('checkout-flow')
    })
  })

  it('cancels with Escape without renaming', async () => {
    const user = userEvent.setup()
    const onRename = vi.fn(async () => true)

    render(
      <div className="app">
        <DocumentTitleControl
          documentDisplayName="saved-flow.mmd"
          documentPath="/Users/me/Documents/saved-flow.mmd"
          isEdited={false}
          onRename={onRename}
        />
      </div>,
    )

    await user.click(screen.getByRole('button', { name: /saved-flow/i }))
    expect(await screen.findByText('~/Documents')).toBeInTheDocument()
    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Rename document' })).not.toBeInTheDocument()
    })
    expect(onRename).not.toHaveBeenCalled()
  })

  it('portals the popover under .app above sibling chrome', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <div className="app">
        <DocumentTitleControl
          documentDisplayName="flow.mmd"
          documentPath={null}
          isEdited
          onRename={async () => true}
        />
        <div className="editor-fake" style={{ position: 'relative', zIndex: 50 }}>
          underlay
        </div>
      </div>,
    )

    await user.click(screen.getByRole('button', { name: /flow/i }))
    const dialog = await screen.findByRole('dialog', { name: 'Rename document' })
    const app = container.querySelector('.app')
    expect(app?.contains(dialog)).toBe(true)
    expect(dialog.compareDocumentPosition(container.querySelector('.editor-fake')!)).toBe(
      Node.DOCUMENT_POSITION_PRECEDING,
    )
  })
})
