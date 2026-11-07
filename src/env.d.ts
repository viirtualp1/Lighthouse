/// <reference types="vite/client" />

/** Present only inside the desktop (Electron) build, exposed by its preload script. */
interface DesktopBridge {
  quit: () => void;
  toggleFullscreen: () => void;
}

interface Window {
  desktop?: DesktopBridge;
}
