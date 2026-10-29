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
      <DocumentTitleControl
        documentDisplayName="flow.mmd"
        documentPath={null}
        isEdited
        onRename={onRename}
        placement="toolbar"
      />,
    )

    expect(screen.getByRole('button', { name: /flow/i })).toHaveTextContent(
      'flow \u2014 Edited',
    )

    await user.click(screen.getByRole('button', { name: /flow/i }))
    const input = await screen.findByLabelText('Name:')
    expect(input).toHaveValue('flow')
    expect(screen.getByText(/Edited - not saved yet/)).toBeInTheDocument()
    expect(screen.getByText(/Not saved to disk yet/)).toBeInTheDocument()

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
      <DocumentTitleControl
        documentDisplayName="saved-flow.mmd"
        documentPath="/Users/me/Documents/saved-flow.mmd"
        isEdited={false}
        onRename={onRename}
      />,
    )

    await user.click(screen.getByRole('button', { name: /saved-flow/i }))
    expect(await screen.findByText('~/Documents')).toBeInTheDocument()
    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Rename document' })).not.toBeInTheDocument()
    })
    expect(onRename).not.toHaveBeenCalled()
  })
})
