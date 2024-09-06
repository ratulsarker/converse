const { ipcRenderer } = require('electron')

let isRecording = false

document.addEventListener('DOMContentLoaded', () => {
  const recordButton = document.getElementById('recordButton')
  const statusElement = document.getElementById('status')
  const chunkList = document.getElementById('chunkList')

  recordButton.addEventListener('click', () => {
    if (!isRecording) {
      ipcRenderer.send('start-recording')
    } else {
      ipcRenderer.send('stop-recording')
    }
  })

  ipcRenderer.on('recording-status', (event, message) => {
    statusElement.textContent = message
    if (message === 'Recording started') {
      isRecording = true
      recordButton.textContent = 'Stop Recording'
    } else if (message === 'Recording stopped') {
      isRecording = false
      recordButton.textContent = 'Start Recording'
    }
  })

  ipcRenderer.on('chunk-completed', (event, filePath) => {
    const li = document.createElement('li')
    li.textContent = `Chunk saved: ${filePath}`
    chunkList.appendChild(li)
  })
})