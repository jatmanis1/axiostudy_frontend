<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import * as pdfjsLib from 'pdfjs-dist/build/pdf'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../pdfWorker', import.meta.url).toString()

const route = useRoute()
const pdfCanvas = ref(null)
const currentPage = ref(1)
const totalPages = ref(0)
const zoomLevel = ref(1.1)

let pdfDoc = null
const renderedPages = new Set()

const pdfId = route.params.id
const pdfName = `pdf_${pdfId}`

onMounted(async () => {
    const exists = await checkIfPdfExists(pdfId)
    if (!exists) {
        const res = await fetch(`http://127.0.0.1:8000/api/unitdata/${pdfId}`)
        const data = await res.json()
        const { title, chapter, unit, part, course } = data

        await storePdf(
            `http://127.0.0.1:8000/api/unit/${pdfId}`,
            pdfId,
            { title, chapter, unit, part, course }
        )
    }
    await loadPdf(pdfId)
})

// ---------- IndexedDB ----------
const openDB = () =>
    new Promise((resolve, reject) => {
        const req = indexedDB.open('pdfDatabase', 1)
        req.onupgradeneeded = (e) => {
            const db = e.target.result
            if (!db.objectStoreNames.contains('pdfs')) {
                db.createObjectStore('pdfs')
            }
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
    })

const checkIfPdfExists = async (id) => {
    const db = await openDB()
    const tx = db.transaction('pdfs', 'readonly')
    const request = tx.objectStore('pdfs').get(id)
    return new Promise((resolve) => {
        request.onsuccess = () => resolve(!!request.result)
        request.onerror = () => resolve(false)
    })
}

const storePdf = async (url, id, meta) => {
    const res = await fetch(url)
    if (!res.ok) return alert('Failed to fetch PDF from backend')
    const blob = await res.blob()
    const db = await openDB()
    const tx = db.transaction('pdfs', 'readwrite')
    tx.objectStore('pdfs').put({ blob, meta }, id)
    await new Promise((resolve, reject) => {
        tx.oncomplete = resolve
        tx.onerror = reject
        tx.onabort = reject
    })
}

// ---------- Load PDF ----------
const loadPdf = async (name) => {
    currentPage.value = 1
    const db = await openDB()
    const tx = db.transaction('pdfs', 'readonly')
    const store = tx.objectStore('pdfs')
    const request = store.get(name)

    request.onsuccess = async () => {
        const record = request.result
        const blob = record?.blob
        if (!blob || !(blob instanceof Blob)) return alert('Invalid PDF in DB')
        const url = URL.createObjectURL(blob)
        pdfDoc = await pdfjsLib.getDocument(url).promise
        totalPages.value = pdfDoc.numPages
        renderInitialPages()
    }

    request.onerror = () => alert('Error loading PDF from DB')
}

// ---------- Rendering ----------
const renderPage = async (pageNum) => {
    if (renderedPages.has(pageNum) || pageNum > totalPages.value) return

    const page = await pdfDoc.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1 })
    const scale = (window.innerWidth / viewport.width) * zoomLevel.value
    const scaledViewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.id = `page-${pageNum}`
    const context = canvas.getContext('2d')
    canvas.width = scaledViewport.width
    canvas.height = scaledViewport.height

    await page.render({ canvasContext: context, viewport: scaledViewport }).promise
    pdfCanvas.value.appendChild(canvas)

    renderedPages.add(pageNum)
}

const renderInitialPages = () => {
    pdfCanvas.value.innerHTML = ''
    renderedPages.clear()
    for (let i = 1; i <= Math.min(3, totalPages.value); i++) {
        renderPage(i)
    }
    observeVisiblePages()
}

const observeVisiblePages = () => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const pageId = parseInt(entry.target.id.replace('page-', ''), 10)
                if (pageId < totalPages.value) {
                    renderPage(pageId + 1)
                    renderPage(pageId + 2)
                }
            }
        })
    }, {
        root: pdfCanvas.value,
        threshold: 0.3
    })

    document.querySelectorAll('canvas[id^="page-"]').forEach(canvas => observer.observe(canvas))
}

// ---------- Zoom ----------
const zoomIn = () => {
    if (zoomLevel.value < 2) {
        zoomLevel.value += 0.1
        rerenderAll()
    }
}

const zoomOut = () => {
    if (zoomLevel.value > 0.7) {
        zoomLevel.value -= 0.1
        rerenderAll()
    }
}

const rerenderAll = async () => {
    const rendered = Array.from(renderedPages)
    pdfCanvas.value.innerHTML = ''
    renderedPages.clear()
    for (const pageNum of rendered) {
        await renderPage(pageNum)
    }
    observeVisiblePages()
}
</script>

<template>
  <div class="wrapper">
    <div class="toolbar">
      <div class="toolbar-inner">
        <div class="zoom-controls">
            <!-- <p> {{ currentPage }}</p> -->
          <button @click="zoomOut">−</button>
          <span>{{ Math.round(zoomLevel * 100) }}%</span>
          <button @click="zoomIn">+</button>
        </div>
      </div>
    </div>

    <!-- PDF container -->
    <div ref="pdfCanvas" class="pdf-container"></div>
  </div>
</template>

<style scoped>
.wrapper {
  font-family: sans-serif;
}

.toolbar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 10px 0;
  z-index: 9999;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.toolbar-inner {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 30px;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar button {
  background: #333;
  border: none;
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.toolbar button:hover {
  background: #555;
}

.pdf-container {
  margin-top: 60px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 10px;
}

canvas {
  display: block;
  margin-bottom: 20px;
  border: 1px solid #ccc;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>
