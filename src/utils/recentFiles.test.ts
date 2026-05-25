import { beforeEach, describe, expect, it } from 'vitest'
import {
  addRecentFile,
  clearRecentFiles,
  getRecentPaths,
  recentFileLabel,
  removeRecentFile,
} from './recentFiles'

describe('recentFiles', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips paths and dedupes', () => {
    addRecentFile('/a/x.mmd')
    addRecentFile('/b/y.mmd')
    addRecentFile('/a/x.mmd')
    expect(getRecentPaths()).toEqual(['/a/x.mmd', '/b/y.mmd'])
  })

  it('caps list length', () => {
    for (let i = 0; i < 15; i += 1) {
      addRecentFile(`/p/${i}`)
    }
    expect(getRecentPaths().length).toBe(10)
    expect(getRecentPaths()[0]).toBe('/p/14')
  })

  it('removeRecentFile drops one entry', () => {
    addRecentFile('/one')
    addRecentFile('/two')
    removeRecentFile('/one')
    expect(getRecentPaths()).toEqual(['/two'])
  })

  it('clearRecentFiles empties storage', () => {
    addRecentFile('/z')
    clearRecentFiles()
    expect(getRecentPaths()).toEqual([])
  })

  it('recentFileLabel uses last path segment', () => {
    expect(recentFileLabel('/Users/me/diagram.mmd')).toBe('diagram.mmd')
    expect(recentFileLabel(String.raw`C:\dev\file.mmd`)).toBe('file.mmd')
  })

  it('getRecentPaths returns empty array for invalid JSON', () => {
    localStorage.setItem('mermalaid-recent-files', 'not-json')
    expect(getRecentPaths()).toEqual([])
  })
})
