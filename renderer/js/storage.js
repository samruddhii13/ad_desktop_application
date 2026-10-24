/**
 * storage.js — Thin wrapper around the preload API for profile persistence.
 * Handles loading, saving, corrupt-file recovery, and game data fetching.
 */

/** Default empty save structure. */
function defaultSave() {
  return { profiles: {} };
}

/**
 * Load all saved profiles from disk.
 * Returns a valid save object even if the file is missing or corrupt.
 */
export async function loadProfiles() {
  try {
    const data = await window.api.loadProfiles();
    if (data && typeof data.profiles === 'object') return data;
  } catch (err) {
    console.warn('storage.loadProfiles — falling back to defaults:', err);
  }
  return defaultSave();
}

/**
 * Persist the full save object to disk.
 * @param {object} data — the full { profiles: { ... } } object
 * @returns {boolean} true on success
 */
export async function saveProfiles(data) {
  try {
    return await window.api.saveProfiles(data);
  } catch (err) {
    console.error('storage.saveProfiles — failed:', err);
    return false;
  }
}

/**
 * Load a JSON data file from the /data directory.
 * @param {string} filename — e.g. 'questions.json'
 * @returns {object|null}
 */
export async function loadGameData(filename) {
  try {
    return await window.api.loadGameData(filename);
  } catch (err) {
    console.error(`storage.loadGameData(${filename}) — failed:`, err);
    return null;
  }
}

/**
 * Trigger a CSV export via the main process (Save-As dialog).
 * @param {string} csvString — raw CSV content
 * @returns {boolean}
 */
export async function exportCSV(csvString) {
  try {
    return await window.api.exportCSV(csvString);
  } catch (err) {
    console.error('storage.exportCSV — failed:', err);
    return false;
  }
}

/** Quit the application. */
export async function quitApp() {
  try {
    await window.api.quit();
  } catch (err) {
    console.error('storage.quitApp — failed:', err);
  }
}
