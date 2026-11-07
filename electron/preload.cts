import { contextBridge, ipcRenderer } from 'electron';

/** The only bridge between the game page and the desktop shell: quitting and switching fullscreen. */
contextBridge.exposeInMainWorld('desktop', {
  quit: () => ipcRenderer.send('desktop:quit'),
  toggleFullscreen: () => ipcRenderer.send('desktop:fullscreen')
});
