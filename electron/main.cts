import path from 'node:path';
import { app, BrowserWindow, ipcMain, shell } from 'electron';

const WINDOW = {
  width: 1600,
  height: 900,
  minWidth: 1280,
  minHeight: 720
};

const BACKGROUND = '#060708';

/** Set by `desktop:dev` to load the Vite dev server instead of the built files. */
const DEV_URL = process.env.LIGHTHOUSE_DEV_URL;

/** Set by the smoke check: load the game, report what rendered, and quit. */
const SMOKE = process.env.LIGHTHOUSE_SMOKE === '1';

function createWindow () {
  const win = new BrowserWindow({
    ...WINDOW,
    show: false,
    title: 'The Lighthouse',
    backgroundColor: BACKGROUND,
    autoHideMenuBar: true,
    fullscreen: app.isPackaged && !SMOKE,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.removeMenu();
  win.once('ready-to-show', () => {
    if (!SMOKE) {
      win.show();
    }
  });

  // The game never opens pages of its own; any link goes to the system browser, never a second game window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);

    return { action: 'deny' };
  });

  win.webContents.on('before-input-event', (event, input) => {
    const toggle = input.type === 'keyDown' && (input.key === 'F11' || (input.alt && input.key === 'Enter'));

    if (toggle) {
      event.preventDefault();
      win.setFullScreen(!win.isFullScreen());
    }
  });

  if (SMOKE) {
    win.webContents.once('did-finish-load', async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const report = await win.webContents.executeJavaScript('JSON.stringify({ title: document.title, menu: !!document.querySelector("h1"), canvas: !!document.querySelector("canvas"), desktop: !!window.desktop })');
        console.log(`smoke ${report}`);
      } catch (error) {
        console.error('smoke failed', error);
      } finally {
        app.quit();
      }
    });
  }

  if (DEV_URL) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, '../dist-desktop/index.html'));
  }
}

async function main () {
  await app.whenReady();
  createWindow();
}

ipcMain.on('desktop:quit', () => {
  app.quit();
});

ipcMain.on('desktop:fullscreen', event => {
  const win = BrowserWindow.fromWebContents(event.sender);

  win?.setFullScreen(!win.isFullScreen());
});

app.on('window-all-closed', () => {
  app.quit();
});

main();
