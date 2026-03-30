import pkg from '../package.json'

/** Application semver from package.json (overridable via VITE_APP_VERSION in getAppVersion). */
export const APP_VERSION: string = pkg.version
