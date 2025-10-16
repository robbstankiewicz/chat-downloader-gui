import { app, BrowserWindow } from "electron";
import { spawn } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { chmodSync, appendFileSync } from "fs";
import kill from "tree-kill";
import getPort from "get-port";

let mainWindow;
let pythonProcess = null;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const logPath = join(app.getPath("userData"), "app.log");

function logToFile(message) {
    const timestamp = new Date().toISOString();
    appendFileSync(logPath, `[${timestamp}] ${message}\n`);
}

function killPythonProcess() {
    if (!pythonProcess) return;
    logToFile(`Removing python process ${pythonProcess?.pid}`);
    try {
        if (process.platform === "win32" && pythonProcess.pid) {
            kill(pythonProcess.pid);
        } else {
            pythonProcess.kill();
            pythonProcess = null;
        }
    } catch (e) {
        logToFile(`Error executing taskkill: ${e.message}`);
        pythonProcess.kill();
    }
}

async function findFreePort() {
    try {
        const port = await getPort();
        console.log(`Found free port: ${port}`);
        return port;
    } catch (error) {
        console.error("Error finding free port:", error);
        return null;
    }
}

function startServer(port) {
    const isDev = process.env.NODE_ENV === "development";
    const isWin = process.platform === "win32";
    const isLinux = process.platform === "linux";

    let mainExec = isWin ? "python" : "python3";
    let backendDirectory = join(__dirname, "server");
    if (!isDev) {
        // prod
        backendDirectory = join(process.resourcesPath, "app", "server");
        if (isWin) {
            mainExec = join(backendDirectory, "main.exe");
        } else if (isLinux) {
            mainExec = join(backendDirectory, "main");
            try {
                chmodSync(mainExec, 0o755);
            } catch (err) {
                logToFile(`Error setting permissions: ${err.message}`);
            }
        }
    }

    try {
        const dbPath = isDev
            ? join(__dirname, "sql_app.db")
            : join(app.getPath("userData"), "sql_app.db");



        const envVars = {
            ...process.env,
            DATABASE_URL: `sqlite:///${dbPath}`,
            PYTHONPATH: isDev ? backendDirectory : undefined,
            LOG_FILE_PATH: logPath,
            UVI_PORT: port.toString(),
        };

        const spawnArgs = isDev ? ["main.py"] : [];
        pythonProcess = spawn(mainExec, spawnArgs, {
            cwd: backendDirectory,
            env: envVars,
        });

        pythonProcess.stdout.on("data", (data) => {
            console.log(`Python backend stdout: ${data.toString()}`);
        });

        pythonProcess.stderr.on("data", (data) => {
            const err = `Python backend stderr: ${data.toString()}`;
            console.error(err);
            logToFile(err);
        });

        pythonProcess.on("spawn", () => {
            console.log("Python backend process spawned successfully.");
        });

        pythonProcess.on("error", (err) => {
            console.error("Failed to start Python backend process:", err);
            logToFile(`Failed to start Python backend process: ${err.message}`);
            pythonProcess = null;
        });
    } catch (error) {
        console.error("Error spawning Python backend process:", error);
        logToFile(`Error spawning Python backend process: ${err.message}`);
    }
}

async function createWindow() {
    const port = await findFreePort();
    startServer(port);
    mainWindow = new BrowserWindow({
        width: 1300,
        height: 800,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            additionalArguments: [`--port=${port}`],
        },
    });

    async function loadFiles() {
        if (process.env.NODE_ENV === "development") {
            mainWindow.loadURL(`http://localhost:4200`);
        } else {
            mainWindow.loadFile(
                join(
                    __dirname,
                    `angular/dist/angular/browser/index.html`,
                ),
            );
        }
    }
    await loadFiles();

    if (process.env.NODE_ENV === "development") {
        mainWindow.webContents.openDevTools();
    }

    // Fix for angular reload https://github.com/maximegris/angular-electron/issues/15
    mainWindow.webContents.on("did-fail-load", async () => {
        await loadFiles();
    });

    mainWindow.on("closed", function () {
        mainWindow = null;
    });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    killPythonProcess();
    app.quit();
});
