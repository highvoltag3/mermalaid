import { describe, expect, it } from 'vitest'
import { decideExternalReload } from './externalFileReload'

describe('decideExternalReload', () => {
  it('does nothing when disk already matches the editor (our own save)', () => {
    expect(
      decideExternalReload({ editorCode: 'A', lastKnownDiskContent: 'old', newDiskContent: 'A' }),
    ).toEqual({ action: 'none' })
  })

  it('does nothing on a stale event where disk is unchanged from last-seen (save then keep typing)', () => {
    // Saved "X1" (recorded as last-seen), user typed on to "X2"; the save's own fs event reads "X1".
    expect(
      decideExternalReload({ editorCode: 'X2', lastKnownDiskContent: 'X1', newDiskContent: 'X1' }),
    ).toEqual({ action: 'none' })
  })

  it('reloads an external change when the editor had no local edits', () => {
    expect(
      decideExternalReload({ editorCode: 'A', lastKnownDiskContent: 'A', newDiskContent: 'B' }),
    ).toEqual({ action: 'reload', content: 'B' })
  })

  it('reloads when there is no known baseline yet', () => {
    expect(
      decideExternalReload({ editorCode: 'A', lastKnownDiskContent: null, newDiskContent: 'B' }),
    ).toEqual({ action: 'reload', content: 'B' })
  })

  it('flags a conflict when both the editor and the disk diverged', () => {
    expect(
      decideExternalReload({ editorCode: 'local edits', lastKnownDiskContent: 'A', newDiskContent: 'external edits' }),
    ).toEqual({ action: 'conflict' })
  })
})
