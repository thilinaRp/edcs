const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const isDev = process.env.NODE_ENV !== 'production';

let serverProcess;

function startServer() {
  // Path to the server script
  const serverPath = path.join(__dirname, isDev ? 'server.ts' : 'server.js');
  
  // In production, we might need to point to a compiled version or use tsx
  const execArgv = isDev ? ['--loader', 'tsx'] : [];
  
  serverProcess = fork(serverPath, [], {
    env: { 
      ...process.env, 
      NODE_ENV: isDev ? 'development' : 'production',
      USER_DATA_PATH: app.getPath('userData')
    },
    execArgv
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start server:', err);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "File Records Keeper",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'public/icon.png') // Optional: add an icon later
  });

  // In development, load from the local dev server
  // In production, the Express server will serve the static files
  const startUrl = 'http://localhost:3000';
  
  win.loadURL(startUrl);

  if (isDev) {
    win.webContents.openDevTools();
  }

  win.on('closed', () => {
    app.quit();
  });
}

app.whenReady().then(() => {
  startServer();
  // Wait a bit for server to start before creating window
  setTimeout(createWindow, isDev ? 2000 : 500);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (serverProcess) serverProcess.kill();
});
