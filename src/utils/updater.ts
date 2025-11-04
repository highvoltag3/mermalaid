// Dynamic imports to avoid Vite errors in web development
// These will only be loaded when actually running in Tauri

const GITHUB_REPO = 'highvoltag3/mermalaid';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

// Type definitions for Tauri modules (loaded dynamically)
type TauriUpdaterCheck = (options: { timeout: number }) => Promise<{ available: boolean; version: string } | null>;
type TauriGetVersion = () => Promise<string>;
type TauriRelaunch = () => Promise<void>;
type TauriUpdate = {
  available: boolean;
  version: string;
  downloadAndInstall: () => Promise<void>;
};

export interface UpdateInfo {
  version: string;
  body: string;
  publishedAt: string;
  downloadUrl?: string;
}

/**
 * Check if we're running in a Tauri environment
 * Uses synchronous check first for performance, then async verification
 */
function isTauriEnvironmentSync(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  // Check for Tauri global object (most reliable indicator)
  return !!(window as { __TAURI__?: unknown }).__TAURI__;
}

/**
 * Verify Tauri environment by attempting to use API
 * This is more reliable but slower than sync check
 */
async function isTauriEnvironment(): Promise<boolean> {
  // Quick synchronous check first
  if (!isTauriEnvironmentSync()) {
    return false;
  }
  
  try {
    // Verify by attempting to use Tauri API
    const { getVersion } = await import('@tauri-apps/api/app');
    await getVersion();
    return true;
  } catch {
    return false;
  }
}

/**
 * Check for updates from GitHub Releases
 * Returns update info if a newer version is available
 */
export async function checkForUpdates(): Promise<UpdateInfo | null> {
  // Early return if not in Tauri environment (fast sync check first)
  if (!isTauriEnvironmentSync()) {
    return null;
  }

  // Verify Tauri environment (slower async check)
  if (!(await isTauriEnvironment())) {
    return null;
  }

  try {
    // Dynamically import Tauri modules (only works in Tauri environment)
    // Wrap in try-catch to handle module resolution errors in web dev
    let check: TauriUpdaterCheck;
    let getVersion: TauriGetVersion;
    
    try {
      const updaterModule = await import('@tauri-apps/plugin-updater');
      check = updaterModule.check as TauriUpdaterCheck;
      const appModule = await import('@tauri-apps/api/app');
      getVersion = appModule.getVersion as TauriGetVersion;
    } catch (importError) {
      // Module not available (web development or build issue)
      console.debug('Tauri modules not available (running in web mode)');
      return null;
    }
    
    // First check using Tauri's updater plugin
    const update = await check({
      timeout: 10000,
    });

    if (update && update.available) {
      const currentVersion = await getVersion();
      const latestVersion = update.version;

      // Compare versions (simple string comparison, can be improved)
      if (compareVersions(latestVersion, currentVersion) > 0) {
        // Also fetch release info from GitHub API for release notes
        try {
          const response = await fetch(GITHUB_API_URL);
          if (response.ok) {
            const release = await response.json();
            return {
              version: latestVersion,
              body: release.body || `Version ${latestVersion} is now available!`,
              publishedAt: release.published_at,
              downloadUrl: release.html_url,
            };
          }
        } catch (error) {
          console.error('Failed to fetch release info from GitHub:', error);
        }

        // Fallback if GitHub API fails
        return {
          version: latestVersion,
          body: `Version ${latestVersion} is now available!`,
          publishedAt: new Date().toISOString(),
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to check for updates:', error);
    // Fallback: try GitHub API directly
    if (isTauriEnvironmentSync()) {
      try {
        let getVersion: TauriGetVersion;
        try {
          const appModule = await import('@tauri-apps/api/app');
          getVersion = appModule.getVersion as TauriGetVersion;
        } catch {
          return null;
        }
        const currentVersion = await getVersion();
        const response = await fetch(GITHUB_API_URL);
        if (response.ok) {
          const release = await response.json();
          const latestVersion = release.tag_name.replace(/^v/, ''); // Remove 'v' prefix if present

          if (compareVersions(latestVersion, currentVersion) > 0) {
            return {
              version: latestVersion,
              body: release.body || `Version ${latestVersion} is now available!`,
              publishedAt: release.published_at,
              downloadUrl: release.html_url,
            };
          }
        }
      } catch (fallbackError) {
        console.error('Fallback update check failed:', fallbackError);
      }
    }
    return null;
  }
}

/**
 * Install the available update
 */
export async function installUpdate(): Promise<void> {
  // Only install in Tauri desktop app
  if (!isTauriEnvironmentSync()) {
    throw new Error('Update installation is only available in the desktop app');
  }

  try {
    // Dynamically import Tauri modules
    // Wrap in try-catch to handle module resolution errors in web dev
    let check: TauriUpdaterCheck;
    let relaunch: TauriRelaunch;
    
    try {
      const updaterModule = await import('@tauri-apps/plugin-updater');
      check = updaterModule.check as TauriUpdaterCheck;
      const processModule = await import('@tauri-apps/api/process');
      relaunch = processModule.relaunch as TauriRelaunch;
    } catch (importError) {
      // Module not available (web development)
      throw new Error('Tauri modules not available (running in web mode)');
    }
    
    const update = await check({
      timeout: 10000,
    }) as TauriUpdate | null;

    if (update?.available) {
      // Download the update
      await update.downloadAndInstall();
      
      // Restart the app to apply the update
      await relaunch();
    } else {
      throw new Error('No update available to install');
    }
  } catch (error) {
    console.error('Failed to install update:', error);
    throw error;
  }
}

/**
 * Compare semantic versions
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 * Handles version strings like "1.2.3", "1.2.3-beta", "v1.2.3"
 */
function compareVersions(v1: string, v2: string): number {
  // Remove 'v' prefix and extract version parts
  const normalizeVersion = (version: string): number[] => {
    const cleaned = version.replace(/^v/i, '').split('-')[0]; // Remove 'v' prefix and pre-release suffix
    return cleaned.split('.').map(part => {
      const num = parseInt(part, 10);
      return isNaN(num) ? 0 : num;
    });
  };

  const parts1 = normalizeVersion(v1);
  const parts2 = normalizeVersion(v2);
  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;

    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
}

