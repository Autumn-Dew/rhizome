const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electron", {
    // Signal that the lyrics renderer is loaded and ready
    desktopLyricsReady: function() {
        return ipcRenderer.send("desktop-lyrics-ready")
    },
    // Receive lyrics data from main process
    onDesktopLyricsUpdate: function(callback) {
        const handler = (_event, data) => callback(data)
        ipcRenderer.on("desktop-lyrics-update", handler)
        // Return unsubscribe function
        return () => ipcRenderer.removeListener("desktop-lyrics-update", handler)
    },
    // Receive lock state changes from main process
    onDesktopLyricsLockChanged: function(callback) {
        const handler = (_event, locked) => callback(locked)
        ipcRenderer.on("desktop-lyrics-lock-changed", handler)
        // Return unsubscribe function
        return () => ipcRenderer.removeListener("desktop-lyrics-lock-changed", handler)
    }
})
