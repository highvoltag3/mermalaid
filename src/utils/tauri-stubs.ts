// Stub module for Tauri APIs when running in web development
// This prevents Vite from trying to resolve Tauri modules during web builds

export const check = () => {
  throw new Error('Tauri API not available in web environment');
};

export const getVersion = () => {
  throw new Error('Tauri API not available in web environment');
};

export const relaunch = () => {
  throw new Error('Tauri API not available in web environment');
};

// Export everything as empty to prevent import errors
export default {};

