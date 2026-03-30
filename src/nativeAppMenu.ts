import { isTauri } from '@tauri-apps/api/core'
import { Menu, MenuItem, PredefinedMenuItem, Submenu } from '@tauri-apps/api/menu'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { openUrl } from '@tauri-apps/plugin-opener'
import packageJson from '../package.json'
import {
  clearRecentFiles,
  getRecentPaths,
  recentFileLabel,
} from './utils/recentFiles'

export type NativeMenuHandlers = {
  onNew: () => void
  onOpen: () => void
  onSave: () => void
  onSaveAs: () => void
  onPrint: () => void
  onShare: () => void
  onDuplicate: () => void
  onOpenRecent: (path: string) => void
}

let getHandlers: () => NativeMenuHandlers = () => ({
  onNew: () => {},
  onOpen: () => {},
  onSave: () => {},
  onSaveAs: () => {},
  onPrint: () => {},
  onShare: () => {},
  onDuplicate: () => {},
  onOpenRecent: () => {},
})

export function setNativeMenuHandlerSource(next: () => NativeMenuHandlers): void {
  getHandlers = next
}

const runMenuAction = (label: string, action: () => Promise<void>) => {
  void action().catch((err) => {
    console.error(`Menu action failed (${label}):`, err)
  })
}

/** Window ▸ Hide/Show item; recreated on each menu rebuild. */
let hideShowWindowMenuItem: MenuItem | null = null
let windowMenuVisibilitySyncAttached = false

async function syncWindowHideShowMenuLabel(): Promise<void> {
  const item = hideShowWindowMenuItem
  if (!item) return
  try {
    const appWindow = getCurrentWindow()
    const visible = await appWindow.isVisible()
    await item.setText(visible ? 'Hide' : 'Show')
    await item.setAccelerator(visible ? 'CmdOrCtrl+H' : null)
  } catch (err) {
    console.error('syncWindowHideShowMenuLabel failed:', err)
  }
}

function attachWindowHideShowMenuSync(): void {
  if (windowMenuVisibilitySyncAttached || !isTauri()) return
  windowMenuVisibilitySyncAttached = true

  void getCurrentWindow().onFocusChanged(() => {
    void syncWindowHideShowMenuLabel()
  })

  document.addEventListener('visibilitychange', () => {
    void syncWindowHideShowMenuLabel()
  })
}

async function buildAndSetAppMenu(): Promise<void> {
  const h = getHandlers()
  const recents = getRecentPaths()

  const recentEntries = await Promise.all(
    recents.map((path, i) =>
      MenuItem.new({
        id: `recent_${i}`,
        text: recentFileLabel(path),
        action: () => {
          h.onOpenRecent(path)
        },
      }),
    ),
  )

  const openRecentItems =
    recentEntries.length > 0
      ? [
          ...recentEntries,
          await PredefinedMenuItem.new({ item: 'Separator' }),
          await MenuItem.new({
            id: 'recent_clear',
            text: 'Clear Menu',
            action: () => {
              clearRecentFiles()
              void rebuildNativeAppMenu()
            },
          }),
        ]
      : [
          await MenuItem.new({
            id: 'recent_empty',
            text: 'No Recent Files',
            enabled: false,
          }),
        ]

  const openRecent = await Submenu.new({
    id: 'submenu_open_recent',
    text: 'Open Recent',
    items: openRecentItems,
  })

  const appMenu = await Submenu.new({
    id: 'submenu_app',
    text: 'Mermalaid',
    items: [
      await PredefinedMenuItem.new({
        item: {
          About: {
            name: 'Mermalaid',
            version: packageJson.version,
            copyright: 'Mermalaid contributors',
          },
        },
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await PredefinedMenuItem.new({ item: 'Hide' }),
      await PredefinedMenuItem.new({ item: 'HideOthers' }),
      await PredefinedMenuItem.new({ item: 'ShowAll' }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await PredefinedMenuItem.new({ item: 'Quit' }),
    ],
  })

  const fileMenu = await Submenu.new({
    id: 'submenu_file',
    text: 'File',
    items: [
      await MenuItem.new({
        id: 'file_new',
        text: 'New',
        accelerator: 'CmdOrCtrl+N',
        action: () => h.onNew(),
      }),
      await MenuItem.new({
        id: 'file_open',
        text: 'Open…',
        accelerator: 'CmdOrCtrl+O',
        action: () => h.onOpen(),
      }),
      openRecent,
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await MenuItem.new({
        id: 'file_save',
        text: 'Save',
        accelerator: 'CmdOrCtrl+S',
        action: () => h.onSave(),
      }),
      await MenuItem.new({
        id: 'file_save_as',
        text: 'Save As…',
        accelerator: 'CmdOrCtrl+Shift+S',
        action: () => h.onSaveAs(),
      }),
      await MenuItem.new({
        id: 'file_duplicate',
        text: 'Duplicate…',
        action: () => h.onDuplicate(),
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await MenuItem.new({
        id: 'file_share',
        text: 'Share…',
        action: () => h.onShare(),
      }),
      await MenuItem.new({
        id: 'file_print',
        text: 'Print…',
        accelerator: 'CmdOrCtrl+P',
        action: () => h.onPrint(),
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await MenuItem.new({
        id: 'file_new_tab',
        text: 'New Tab',
        accelerator: 'CmdOrCtrl+T',
        enabled: false,
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await PredefinedMenuItem.new({ item: 'CloseWindow' }),
    ],
  })

  const editMenu = await Submenu.new({
    id: 'submenu_edit',
    text: 'Edit',
    items: [
      await PredefinedMenuItem.new({ item: 'Undo' }),
      await PredefinedMenuItem.new({ item: 'Redo' }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await PredefinedMenuItem.new({ item: 'Cut' }),
      await PredefinedMenuItem.new({ item: 'Copy' }),
      await PredefinedMenuItem.new({ item: 'Paste' }),
      await PredefinedMenuItem.new({ item: 'SelectAll' }),
    ],
  })

  const viewMenu = await Submenu.new({
    id: 'submenu_view',
    text: 'View',
    items: [
      await MenuItem.new({
        id: 'view_reload',
        text: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        action: () => {
          window.location.reload()
        },
      }),
      await MenuItem.new({
        id: 'view_force_reload',
        text: 'Force Reload',
        accelerator: 'CmdOrCtrl+Shift+R',
        action: () => {
          window.location.reload()
        },
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await PredefinedMenuItem.new({ item: 'Fullscreen' }),
    ],
  })

  const windowHideShowItem = await MenuItem.new({
    id: 'window_hide',
    text: 'Hide',
    accelerator: 'CmdOrCtrl+H',
    action: () => {
      runMenuAction('Hide or show window', async () => {
        const appWindow = getCurrentWindow()
        if (await appWindow.isVisible()) {
          await appWindow.hide()
        } else {
          await appWindow.show()
          await appWindow.setFocus()
        }
        await syncWindowHideShowMenuLabel()
      })
    },
  })
  hideShowWindowMenuItem = windowHideShowItem

  const windowMenu = await Submenu.new({
    id: 'submenu_window',
    text: 'Window',
    items: [
      await PredefinedMenuItem.new({ item: 'Minimize' }),
      await MenuItem.new({
        id: 'window_maximize',
        text: 'Maximize',
        action: () => {
          runMenuAction('Maximize', async () => {
            const appWindow = getCurrentWindow()
            if (await appWindow.isMinimized()) {
              await appWindow.unminimize()
              await appWindow.show()
            }
            await appWindow.maximize()
            await appWindow.setFocus()
            await syncWindowHideShowMenuLabel()
          })
        },
      }),
      await MenuItem.new({
        id: 'window_fill',
        text: 'Fill Window',
        action: () => {
          runMenuAction('Fill Window', async () => {
            const appWindow = getCurrentWindow()
            if (await appWindow.isMinimized()) {
              await appWindow.unminimize()
            }
            if (!(await appWindow.isFullscreen())) {
              await appWindow.setSimpleFullscreen(true)
            }
            await appWindow.setFocus()
            await syncWindowHideShowMenuLabel()
          })
        },
      }),
      await MenuItem.new({
        id: 'window_center',
        text: 'Center Window',
        action: () => {
          runMenuAction('Center Window', async () => {
            const appWindow = getCurrentWindow()
            if (await appWindow.isFullscreen()) {
              await appWindow.setSimpleFullscreen(false)
            }
            if (await appWindow.isMinimized()) {
              await appWindow.unminimize()
            }
            await appWindow.center()
            await appWindow.setFocus()
            await syncWindowHideShowMenuLabel()
          })
        },
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await MenuItem.new({
        id: 'window_bring_to_front',
        text: 'Bring to Front',
        action: () => {
          runMenuAction('Bring to Front', async () => {
            const appWindow = getCurrentWindow()
            if (await appWindow.isMinimized()) {
              await appWindow.unminimize()
            }
            await appWindow.show()
            await appWindow.setFocus()
            await syncWindowHideShowMenuLabel()
          })
        },
      }),
      windowHideShowItem,
    ],
  })

  const helpMenu = await Submenu.new({
    id: 'submenu_help',
    text: 'Help',
    items: [
      await MenuItem.new({
        id: 'help_docs',
        text: 'Mermalaid on GitHub',
        action: () => {
          runMenuAction('Open GitHub', async () => {
            try {
              await openUrl('https://github.com/highvoltag3/mermalaid')
            } catch {
              window.open('https://github.com/highvoltag3/mermalaid', '_blank', 'noopener,noreferrer')
            }
          })
        },
      }),
      await MenuItem.new({
        id: 'help_mermaid_docs',
        text: 'Mermaid Syntax Docs',
        action: () => {
          runMenuAction('Open Mermaid Docs', async () => {
            try {
              await openUrl('https://mermaid.js.org/syntax/sequenceDiagram.html')
            } catch {
              window.open('https://mermaid.js.org/syntax/sequenceDiagram.html', '_blank', 'noopener,noreferrer')
            }
          })
        },
      }),
    ],
  })

  const menu = await Menu.new({
    items: [appMenu, fileMenu, editMenu, viewMenu, windowMenu, helpMenu],
  })
  await menu.setAsAppMenu()
  await syncWindowHideShowMenuLabel()
  attachWindowHideShowMenuSync()
}

/** Install menu once; call {@link rebuildNativeAppMenu} after recent files change. */
export async function initNativeAppMenu(): Promise<void> {
  if (!isTauri()) return
  await buildAndSetAppMenu()
}

export async function rebuildNativeAppMenu(): Promise<void> {
  if (!isTauri()) return
  await buildAndSetAppMenu()
}
