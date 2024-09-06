const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')

let recordingProcess = null
let chunkInterval = null
let chunkCounter = 0
const CHUNK_DURATION = 5 * 60 // 5 minutes in seconds

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  win.loadFile('index.html')
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

ipcMain.on('start-recording', (event) => {
  if (recordingProcess) {
    event.reply('recording-status', 'Already recording')
    return
  }

  const ffmpegPath = path.join(__dirname, 'resources', 'ffmpeg', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
  const outputDir = path.join(app.getPath('userData'), 'recordings')
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  chunkCounter = 0
  startNewChunk(ffmpegPath, outputDir, event)

  chunkInterval = setInterval(() => {
    if (recordingProcess) {
      recordingProcess.kill()
      startNewChunk(ffmpegPath, outputDir, event)
    }
  }, CHUNK_DURATION * 1000)

  event.reply('recording-status', 'Recording started')
})

function startNewChunk(ffmpegPath, outputDir, event) {
  const outputFile = path.join(outputDir, `chunk_${chunkCounter}.wav`)
  chunkCounter++

  recordingProcess = spawn(ffmpegPath, [
    '-f', 'dshow',
    '-i', 'audio=virtual-audio-capturer',
    '-acodec', 'pcm_s16le',
    '-t', CHUNK_DURATION.toString(),
    outputFile
  ])

  recordingProcess.stderr.on('data', (data) => {
    console.log(`FFmpeg stderr: ${data}`)
  })

  recordingProcess.on('close', (code) => {
    console.log(`FFmpeg process exited with code ${code}`)
    event.reply('chunk-completed', outputFile)
  })
}

ipcMain.on('stop-recording', (event) => {
  if (recordingProcess) {
    clearInterval(chunkInterval)
    recordingProcess.kill()
    recordingProcess = null
    event.reply('recording-status', 'Recording stopped')
  } else {
    event.reply('recording-status', 'No active recording')
  }
})