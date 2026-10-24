/**
 * IP Detectives — Preload Script
 * Exposes a small, safe API to the renderer via contextBridge.
 * The renderer can NEVER access Node.js directly.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  /** Load all saved profiles. Returns { profiles: { ... } }. */
  loadProfiles:  ()          => ipcRenderer.invoke('load-profiles'),

  /** Save profiles object to disk. Returns true on success. */
  saveProfiles:  (data)      => ipcRenderer.invoke('save-profiles', data),

  /** Load a JSON file from /data. Returns parsed object or null. */
  loadGameData:  (filename)  => ipcRenderer.invoke('load-game-data', filename),

  /** Export a CSV string via Save dialog. Returns true if saved. */
  exportCSV:     (csvString) => ipcRenderer.invoke('export-csv', csvString),

  /** Quit the application. */
  quit:          ()          => ipcRenderer.invoke('quit')
});
