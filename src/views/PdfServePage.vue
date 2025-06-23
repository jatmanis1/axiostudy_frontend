<template>
  <div class="pdf-viewer-container">
    <!-- PDF Status Section -->
    <div v-if="!pdfLoaded" class="pdf-status-section">
      <h2>PDF Document bn Viewer</h2>
      
      <!-- Status Messages -->
      <div class="status-messages">
        <div v-if="checkingCache" class="status-message">
          🔍 Checking local storage...
        </div>
        <div v-if="loadingFromCache" class="status-message">
          📁 Loading PDF from local storage...
        </div>
        <div v-if="downloadingFromBackend" class="status-message">
          📥 Downloading PDF from server...
        </div>
      </div>
      
      <!-- Download Progress -->
      <div v-if="downloadingFromBackend" class="progress-section">
        <h3>Downloading PDF...</h3>
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: downloadProgress + '%' }"
          ></div>
        </div>
        <p class="progress-text">
          {{ downloadProgress.toFixed(1) }}% 
          ({{ formatBytes(downloadedBytes) }} / {{ formatBytes(totalBytes) }})
        </p>
        <p class="download-speed">Speed: {{ downloadSpeed }}</p>
      </div>
      
      <div v-if="downloadError" class="error">
        {{ downloadError }}
      </div>
      
      <!-- Manual Load Button -->
      <div v-if="!checkingCache && !loadingFromCache && !downloadingFromBackend && !pdfLoaded" class="download-controls">
        <button @click="loadPDF" class="download-btn">
          📄 Load PDF Document
        </button>
      </div>
    </div>

    <!-- PDF Viewer Section -->
    <div v-if="pdfLoaded" class="pdf-viewer-section">
      <!-- Storage Info -->
      <div class="storage-info">
        <span v-if="loadedFromCache" class="cache-indicator">📁 Loaded from local storage</span>
        <span v-else class="backend-indicator">🌐 Downloaded from server</span>
      </div>

      <!-- PDF Controls -->
      <div class="pdf-controls">
        <div class="control-group">
          <button @click="previousPage" :disabled="currentPage <= 1">← Previous</button>
          <span class="page-info">
            Page {{ currentPage }} of {{ totalPages }}
          </span>
          <button @click="nextPage" :disabled="currentPage >= totalPages">Next →</button>
        </div>
        
        <div class="control-group">
          <button @click="zoomOut" :disabled="scale <= 0.5">Zoom Out</button>
          <span class="zoom-info">{{ Math.round(scale * 100) }}%</span>
          <button @click="zoomIn" :disabled="scale >= 3">Zoom In</button>
        </div>
        
        <div class="control-group">
          <button @click="downloadPDF" class="download-btn">💾 Download</button>
          <button @click="clearCache" class="clear-btn">🗑️ Clear Cache</button>
          <button @click="resetViewer" class="reset-btn">🔄 Reset</button>
        </div>
      </div>

      <!-- PDF Canvas -->
      <div class="pdf-canvas-container" ref="canvasContainer">
        <canvas 
          ref="pdfCanvas"
          :style="{ transform: `scale(${scale})`, transformOrigin: 'top left' }"
        ></canvas>
      </div>
      
      <!-- Page Navigation -->
      <div class="page-navigation">
        <input 
          type="number" 
          v-model.number="pageInput" 
          :min="1" 
          :max="totalPages"
          @keyup.enter="goToPage"
          class="page-input"
        >
        <button @click="goToPage">Go to Page</button>
      </div>
    </div>
  </div>
</template>

<script>
import * as pdfjsLib from 'pdfjs-dist'

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

// Store PDF document outside of Vue's reactive system
let pdfDocument = null

// IndexedDB Service - Inline Implementation
class PDFIndexedDBService {
  constructor() {
    this.dbName = 'PDFStorage'
    this.dbVersion = 1
    this.storeName = 'pdfs'
    this.db = null
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, { keyPath: 'id' })
          objectStore.createIndex('url', 'url', { unique: true })
          objectStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
      
      request.onsuccess = (event) => {
        this.db = event.target.result
        resolve(this.db)
      }
      
      request.onerror = (event) => {
        reject(event.target.error)
      }
    })
  }

  generatePDFId(url) {
    return btoa(url).replace(/[^a-zA-Z0-9]/g, '')
  }

  async checkPDFExists(url) {
    try {
      if (!this.db) await this.initDB()
      
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const objectStore = transaction.objectStore(this.storeName)
      const index = objectStore.index('url')
      
      return new Promise((resolve, reject) => {
        const request = index.count(url)
        request.onsuccess = () => resolve(request.result > 0)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Error checking PDF existence:', error)
      return false
    }
  }

  async savePDFToIndexedDB(url, blob, metadata = {}) {
    try {
      if (!this.db) await this.initDB()
      
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const objectStore = transaction.objectStore(this.storeName)
      
      const pdfData = {
        id: this.generatePDFId(url),
        url: url,
        blob: blob,
        timestamp: Date.now(),
        size: blob.size,
        type: blob.type,
        metadata: metadata
      }
      
      return new Promise((resolve, reject) => {
        const request = objectStore.put(pdfData)
        request.onsuccess = () => {
          console.log('PDF saved to IndexedDB:', url)
          resolve(request.result)
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Error saving PDF to IndexedDB:', error)
      throw error
    }
  }

  async getPDFFromIndexedDB(url) {
    try {
      if (!this.db) await this.initDB()
      
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const objectStore = transaction.objectStore(this.storeName)
      const index = objectStore.index('url')
      
      return new Promise((resolve, reject) => {
        const request = index.get(url)
        request.onsuccess = () => {
          const result = request.result
          if (result) {
            console.log('PDF retrieved from IndexedDB:', url)
            resolve(result.blob)
          } else {
            resolve(null)
          }
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Error retrieving PDF from IndexedDB:', error)
      return null
    }
  }

  async getAllPDFs() {
    try {
      if (!this.db) await this.initDB()
      
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const objectStore = transaction.objectStore(this.storeName)
      
      return new Promise((resolve, reject) => {
        const request = objectStore.getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Error getting all PDFs:', error)
      return []
    }
  }

  async clearAllPDFs() {
    try {
      if (!this.db) await this.initDB()
      
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const objectStore = transaction.objectStore(this.storeName)
      
      return new Promise((resolve, reject) => {
        const request = objectStore.clear()
        request.onsuccess = () => {
          console.log('All PDFs cleared from IndexedDB')
          resolve()
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Error clearing PDFs:', error)
      throw error
    }
  }

  async deletePDF(url) {
    try {
      if (!this.db) await this.initDB()
      
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const objectStore = transaction.objectStore(this.storeName)
      const id = this.generatePDFId(url)
      
      return new Promise((resolve, reject) => {
        const request = objectStore.delete(id)
        request.onsuccess = () => {
          console.log('PDF deleted from IndexedDB:', url)
          resolve()
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Error deleting PDF:', error)
      throw error
    }
  }

  async getStorageUsage() {
    try {
      const pdfs = await this.getAllPDFs()
      let totalSize = 0
      
      pdfs.forEach(pdf => {
        totalSize += pdf.size || 0
      })
      
      return {
        count: pdfs.length,
        totalSize: totalSize,
        pdfs: pdfs.map(pdf => ({
          url: pdf.url,
          size: pdf.size,
          timestamp: pdf.timestamp,
          metadata: pdf.metadata
        }))
      }
    } catch (error) {
      console.error('Error getting storage usage:', error)
      return { count: 0, totalSize: 0, pdfs: [] }
    }
  }
}

// Create service instance
const pdfIndexedDBService = new PDFIndexedDBService()

export default {
  name: 'PDFViewer',
  props: {
    pdfUrl: {
      type: String,
      default: 'http://127.0.0.1:8000/api/pdf1/'
    }
  },
  
  data() {
    return {
      // Status flags
      checkingCache: false,
      loadingFromCache: false,
      downloadingFromBackend: false,
      loadedFromCache: false,
      
      // Download progress
      downloadProgress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      downloadSpeed: '0 KB/s',
      downloadStartTime: null,
      
      // PDF states
      pdfLoaded: false,
      downloadError: null,
      currentPage: 1,
      totalPages: 0,
      scale: 1.0,
      pageInput: 1,
      pdfBlob: null
    }
  },
  
  async mounted() {
    // Initialize IndexedDB
    await pdfIndexedDBService.initDB()
    this.loadPDF()
  },
  
  methods: {
    async loadPDF() {
      try {
        this.downloadError = null
        
        // Step 1: Check if PDF exists in IndexedDB
        this.checkingCache = true
        const existsInCache = await pdfIndexedDBService.checkPDFExists(this.pdfUrl)
        this.checkingCache = false
        
        if (existsInCache) {
          // Step 2: Load from IndexedDB
          await this.loadFromIndexedDB()
        } else {
          // Step 3: Download from backend and save to IndexedDB
          await this.downloadFromBackend()
        }
        
      } catch (error) {
        this.downloadError = 'Error loading PDF: ' + error.message
        console.error('PDF loading error:', error)
        this.checkingCache = false
        this.loadingFromCache = false
        this.downloadingFromBackend = false
      }
    },
    
    async loadFromIndexedDB() {
      try {
        this.loadingFromCache = true
        
        const blob = await pdfIndexedDBService.getPDFFromIndexedDB(this.pdfUrl)
        
        if (blob) {
          this.pdfBlob = blob
          this.loadedFromCache = true
          await this.renderPDFFromBlob()
          console.log('✅ PDF loaded from IndexedDB cache')
        } else {
          // Fallback to backend if blob not found
          await this.downloadFromBackend()
        }
        
      } catch (error) {
        console.error('Error loading from IndexedDB:', error)
        // Fallback to backend
        await this.downloadFromBackend()
      } finally {
        this.loadingFromCache = false
      }
    },
    
    async downloadFromBackend() {
      try {
        this.downloadingFromBackend = true
        this.downloadStartTime = Date.now()
        this.loadedFromCache = false
        
        // Get PDF info first (if available)
        try {
          const infoResponse = await fetch(this.pdfUrl.replace('/api/pdf1/', '/api/pdf1/info/'))
          if (infoResponse.ok) {
            const infoData = await infoResponse.json()
            this.totalBytes = infoData.file_size
          }
        } catch (infoError) {
          console.warn('Could not get PDF info, proceeding without size info')
        }
        
        // Download PDF with progress tracking
        const response = await fetch(this.pdfUrl)
        
        if (!response.ok) {
          throw new Error('Failed to download PDF from backend')
        }
        
        const reader = response.body.getReader()
        const chunks = []
        
        // If we don't have total bytes, try to get from content-length
        if (!this.totalBytes) {
          this.totalBytes = parseInt(response.headers.get('content-length')) || 0
        }
        
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) break
          
          chunks.push(value)
          this.downloadedBytes += value.length
          
          if (this.totalBytes > 0) {
            this.downloadProgress = (this.downloadedBytes / this.totalBytes) * 100
          }
          
          // Calculate download speed
          const elapsed = (Date.now() - this.downloadStartTime) / 1000
          if (elapsed > 0) {
            const speed = this.downloadedBytes / elapsed
            this.downloadSpeed = this.formatBytes(speed) + '/s'
          }
        }
        
        // Create blob from chunks
        this.pdfBlob = new Blob(chunks, { type: 'application/pdf' })
        
        // Save to IndexedDB for future use
        try {
          await pdfIndexedDBService.savePDFToIndexedDB(this.pdfUrl, this.pdfBlob, {
            fileName: 'document.pdf',
            downloadedAt: new Date().toISOString()
          })
          console.log('✅ PDF saved to IndexedDB cache')
        } catch (saveError) {
          console.warn('Could not save PDF to IndexedDB:', saveError)
        }
        
        // Render the PDF
        await this.renderPDFFromBlob()
        console.log('✅ PDF downloaded from backend and rendered')
        
      } catch (error) {
        this.downloadError = 'Error downloading PDF: ' + error.message
        console.error('Download error:', error)
      } finally {
        this.downloadingFromBackend = false
      }
    },
    
    async renderPDFFromBlob() {
      try {
        const arrayBuffer = await this.pdfBlob.arrayBuffer()
        
        pdfDocument = await pdfjsLib.getDocument({
          data: arrayBuffer
        }).promise
        
        this.totalPages = pdfDocument.numPages
        this.pdfLoaded = true
        
        // Render first page
        await this.renderPage(1)
        
      } catch (error) {
        this.downloadError = 'Error rendering PDF: ' + error.message
        console.error('PDF rendering error:', error)
      }
    },
    
    async renderPage(pageNumber) {
      try {
        const page = await pdfDocument.getPage(pageNumber)
        const canvas = this.$refs.pdfCanvas
        const context = canvas.getContext('2d')
        
        const viewport = page.getViewport({ scale: 1.5 })
        canvas.width = viewport.width
        canvas.height = viewport.height
        
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        }
        
        await page.render(renderContext).promise
        this.currentPage = pageNumber
        this.pageInput = pageNumber
        
      } catch (error) {
        console.error('Error rendering page:', error)
        this.downloadError = 'Error rendering page: ' + error.message
      }
    },
    
    async clearCache() {
      try {
        const confirmed = confirm('Are you sure you want to clear the PDF cache? This will remove all stored PDFs.')
        if (confirmed) {
          await pdfIndexedDBService.clearAllPDFs()
          alert('PDF cache cleared successfully!')
        }
      } catch (error) {
        console.error('Error clearing cache:', error)
        alert('Error clearing cache: ' + error.message)
      }
    },
    
    // Navigation methods
    async previousPage() {
      if (this.currentPage > 1) {
        await this.renderPage(this.currentPage - 1)
      }
    },
    
    async nextPage() {
      if (this.currentPage < this.totalPages) {
        await this.renderPage(this.currentPage + 1)
      }
    },
    
    async goToPage() {
      if (this.pageInput >= 1 && this.pageInput <= this.totalPages) {
        await this.renderPage(this.pageInput)
      }
    },
    
    // Zoom methods
    zoomIn() {
      if (this.scale < 3) {
        this.scale += 0.25
      }
    },
    
    zoomOut() {
      if (this.scale > 0.5) {
        this.scale -= 0.25
      }
    },
    
    downloadPDF() {
      if (this.pdfBlob) {
        const url = URL.createObjectURL(this.pdfBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'document.pdf'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    },
    
    resetViewer() {
      // Reset all reactive data
      this.checkingCache = false
      this.loadingFromCache = false
      this.downloadingFromBackend = false
      this.loadedFromCache = false
      this.downloadProgress = 0
      this.downloadedBytes = 0
      this.totalBytes = 0
      this.downloadSpeed = '0 KB/s'
      this.downloadError = null
      this.pdfLoaded = false
      this.currentPage = 1
      this.totalPages = 0
      this.scale = 1.0
      this.pageInput = 1
      this.pdfBlob = null
      this.downloadStartTime = null
      
      // Clear the non-reactive PDF document
      pdfDocument = null
      
      // Restart the loading process
      this.loadPDF()
    },
    
    formatBytes(bytes) {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }
  },
  
  beforeUnmount() {
    pdfDocument = null
  }
}
</script>

<style scoped>
.pdf-viewer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.pdf-status-section {
  text-align: center;
  padding: 40px;
}

.status-messages {
  margin: 20px 0;
}

.status-message {
  padding: 15px;
  background-color: #e3f2fd;
  border-radius: 8px;
  margin: 10px 0;
  color: #1565c0;
  font-weight: 500;
}

.storage-info {
  text-align: center;
  margin-bottom: 15px;
}

.cache-indicator {
  background-color: #e8f5e8;
  color: #2e7d32;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.backend-indicator {
  background-color: #fff3e0;
  color: #f57c00;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.download-btn {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
}

.download-btn:hover {
  background-color: #0056b3;
}

.clear-btn {
  background-color: #dc3545 !important;
  color: white !important;
}

.clear-btn:hover {
  background-color: #c82333 !important;
}

.progress-section {
  margin-top: 30px;
}

.progress-bar {
  width: 100%;
  height: 20px;
  background-color: #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
  margin: 20px 0;
}

.progress-fill {
  height: 100%;
  background-color: #28a745;
  transition: width 0.3s ease;
}

.progress-text, .download-speed {
  margin: 10px 0;
  font-size: 14px;
  color: #666;
}

.error {
  color: #dc3545;
  margin-top: 20px;
  padding: 15px;
  background-color: #f8d7da;
  border-radius: 6px;
}

.pdf-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.control-group button {
  padding: 8px 12px;
  border: 1px solid #ddd;
  background-color: white;
  border-radius: 4px;
  cursor: pointer;
}

.control-group button:hover:not(:disabled) {
  background-color: #f0f0f0;
}

.control-group button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info, .zoom-info {
  font-weight: bold;
  padding: 0 10px;
}

.reset-btn {
  background-color: #6c757d !important;
  color: white !important;
}

.reset-btn:hover {
  background-color: #5a6268 !important;
}

.pdf-canvas-container {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: auto;
  max-height: 800px;
  background-color: #f5f5f5;
  padding: 20px;
  text-align: center;
}

.page-navigation {
  margin-top: 20px;
  text-align: center;
}

.page-input {
  width: 60px;
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-right: 10px;
  text-align: center;
}

@media (max-width: 768px) {
  .pdf-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .control-group {
    justify-content: center;
  }
}

</style>
