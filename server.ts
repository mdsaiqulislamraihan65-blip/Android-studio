import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import admZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { spawn, exec } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
const PORT = 3000;

app.use(express.json());

const WORKSPACE_DIR = path.join(process.cwd(), 'workspace');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Ensure directories exist
if (!fs.existsSync(WORKSPACE_DIR)) fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({ dest: UPLOADS_DIR });

// Helper to find the Android project root (where build.gradle is)
function findProjectRoot(dir: string): string {
  const files = fs.readdirSync(dir);
  if (files.includes('build.gradle') || files.includes('build.gradle.kts')) {
    return dir;
  }
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      const found = findProjectRoot(fullPath);
      if (found) return found;
    }
  }
  return dir; // fallback to the root if not found
}

let activeProjectRoot = WORKSPACE_DIR;

app.post('/api/upload', upload.single('projectZip'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Clear existing workspace
    if (fs.existsSync(WORKSPACE_DIR)) {
      fs.rmSync(WORKSPACE_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(WORKSPACE_DIR, { recursive: true });

    // Extract ZIP
    const zip = new admZip(req.file.path);
    zip.extractAllTo(WORKSPACE_DIR, true);

    // Clean up uploaded zip
    fs.unlinkSync(req.file.path);

    // Find project root
    activeProjectRoot = findProjectRoot(WORKSPACE_DIR);

    res.json({ message: 'Project uploaded and extracted successfully', root: activeProjectRoot });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Recursively get files
function getFiles(dir: string, baseDir: string): any[] {
  const results: any[] = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results.push({
          name: file,
          path: path.relative(baseDir, fullPath),
          isDirectory: true,
          children: getFiles(fullPath, baseDir)
        });
      } else {
        results.push({
          name: file,
          path: path.relative(baseDir, fullPath),
          isDirectory: false
        });
      }
    });
  } catch (err) {
    console.error('Error reading dir:', err);
  }
  return results;
}

app.get('/api/files', (req, res) => {
  if (!fs.existsSync(activeProjectRoot)) {
    return res.json([]);
  }
  const files = getFiles(activeProjectRoot, activeProjectRoot);
  res.json(files);
});

app.get('/api/files/content', (req, res) => {
  const filePath = req.query.path as string;
  if (!filePath) return res.status(400).json({ error: 'Path required' });
  
  const fullPath = path.join(activeProjectRoot, filePath);
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    res.json({ content });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/files/save', (req, res) => {
  const { path: filePath, content } = req.body;
  if (!filePath) return res.status(400).json({ error: 'Path required' });
  
  const fullPath = path.join(activeProjectRoot, filePath);
  try {
    fs.writeFileSync(fullPath, content, 'utf-8');
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Download APK endpoint
app.get('/api/download-apk', (req, res) => {
  const apkPath = path.join(activeProjectRoot, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  if (fs.existsSync(apkPath)) {
    res.download(apkPath);
  } else {
    res.status(404).json({ error: 'APK not found. Please build the project first.' });
  }
});

// Socket.io for Terminal and Build Logs
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Terminal session
  let ptyProcess: any = null;

  socket.on('terminal:start', () => {
    if (ptyProcess) return;
    
    // Fallback to basic spawn if node-pty is not used
    ptyProcess = spawn('bash', [], {
      cwd: activeProjectRoot,
      env: process.env
    });

    ptyProcess.stdout.on('data', (data: Buffer) => {
      socket.emit('terminal:data', data.toString());
    });

    ptyProcess.stderr.on('data', (data: Buffer) => {
      socket.emit('terminal:data', data.toString());
    });

    ptyProcess.on('close', () => {
      socket.emit('terminal:data', '\r\n[Process exited]\r\n');
      ptyProcess = null;
    });
  });

  socket.on('terminal:data', (data: string) => {
    if (ptyProcess) {
      ptyProcess.stdin.write(data);
    }
  });

  // Build process
  socket.on('build:start', () => {
    socket.emit('build:log', 'Starting Android Build Environment Setup...\n');
    socket.emit('build:log', 'Step 1: Installing Java & Required Tools (Please wait, this will take a few minutes on first run)...\n');

    // Run everything directly in terminal logic
    const setupScript = `
      set -e
      if ! command -v javac &> /dev/null; then
        echo "Installing OpenJDK 17 and tools..."
        apt-get update
        apt-get install -y openjdk-17-jdk wget unzip zip git
      else
        echo "Java is already installed."
      fi

      export ANDROID_HOME=/opt/android-sdk
      export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

      if [ ! -d "$ANDROID_HOME/cmdline-tools/latest/bin" ]; then
        echo "Setting up Android SDK..."
        mkdir -p $ANDROID_HOME/cmdline-tools
        wget -q https://dl.google.com/android/repository/commandlinetools-linux-10406996_latest.zip -O android_tools.zip
        unzip -q android_tools.zip -d $ANDROID_HOME/cmdline-tools
        mv $ANDROID_HOME/cmdline-tools/cmdline-tools $ANDROID_HOME/cmdline-tools/latest
        rm android_tools.zip
        echo "Installing Android SDK Platform & Build Tools..."
        yes | sdkmanager --licenses
        sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
      else
        echo "Android SDK is already setup."
      fi

      echo "Setting local.properties..."
      echo "sdk.dir=/opt/android-sdk" > local.properties

      if [ ! -f "gradlew" ]; then
         echo "Error: gradlew not found in the project root. Please upload a valid Android project."
         exit 1
      fi

      echo "Making gradlew executable..."
      chmod +x gradlew

      echo "Running ./gradlew assembleDebug..."
      ./gradlew assembleDebug
    `;

    const buildProcess = spawn('bash', ['-c', setupScript], {
      cwd: activeProjectRoot,
      env: process.env
    });

    buildProcess.stdout.on('data', (data: Buffer) => {
      socket.emit('build:log', data.toString());
    });

    buildProcess.stderr.on('data', (data: Buffer) => {
      socket.emit('build:log', data.toString());
    });

    buildProcess.on('close', (code) => {
      if (code === 0) {
        socket.emit('build:log', '\nBuild completed successfully! APK is ready.\n');
        socket.emit('build:success');
      } else {
        socket.emit('build:log', `\nBuild failed with exit code ${code}.\n`);
        socket.emit('build:error', `Exit code ${code}`);
      }
    });
  });

  socket.on('disconnect', () => {
    if (ptyProcess) {
      ptyProcess.kill();
    }
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
