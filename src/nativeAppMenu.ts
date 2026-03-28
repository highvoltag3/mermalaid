import { isTauri } from '@tauri-apps/api/core'
import { Menu, MenuItem, PredefinedMenuItem, Submenu } from '@tauri-apps/api/menu'
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

  const menu = await Menu.new({
    items: [appMenu, fileMenu],
  })
  await menu.setAsAppMenu()
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
