<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import * as pdfjsLib from 'pdfjs-dist/build/pdf'

// Setup PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../pdfWorker', import.meta.url).toString()

const route = useRoute()
const pdfCanvas = ref(null)
const currentPage = ref(1)
const totalPages = ref(0)
const zoomLevel = ref(1.1)

let pdfDoc = null

// Get ID from route
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

// ---------- IndexedDB Functions ----------
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

// ---------- Load and Render PDF ----------
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
        renderPages(currentPage.value)
    }

    request.onerror = () => alert('Error loading PDF from DB')
}
const renderPages = async () => {
    if (!pdfCanvas.value) return;
    pdfCanvas.value.innerHTML = ''; // Clear old canvases

    const deviceWidth = window.innerWidth;

    for (let i = 1; i <= totalPages.value; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1.1 });

        const scale = (deviceWidth / viewport.width) * zoomLevel.value;
        const scaledViewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.id = `page-${i}`;
        const context = canvas.getContext('2d');

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        await page.render({ canvasContext: context, viewport: scaledViewport }).promise;

        pdfCanvas.value.appendChild(canvas);
    }

    observeVisiblePages(); // Initialize observer after all pages are rendered
};



const observeVisiblePages = () => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const visibleId = parseInt(entry.target.id.replace('page-', ''), 10);
                currentPage.value = visibleId;
                document.getElementById('currentPageIndicator').innerText =
                    `Page: ${visibleId}, Total: ${totalPages.value}`;
            }
        });
    }, {
        root: null,
        threshold: 0.1
    });

    document.querySelectorAll('canvas[id^="page-"]').forEach(canvas => observer.observe(canvas));
};


// ---------- Pagination ----------
const prev = () => {
    if (currentPage.value > 5) {
        currentPage.value -= 5
        renderPages(currentPage.value)
    }
}
const next = () => {
    if (currentPage.value + 5 <= totalPages.value) {
        currentPage.value += 5
        renderPages(currentPage.value)
    }
}


const handleWheel = (event) => {
    event.preventDefault()
    if (event.deltaY < 0) {
        zoomIn()
    } else {
        zoomOut()
    }
}
// ---------- Toolbar Actions ----------
const zoomIn = () => {
  if (zoomLevel.value < 2) {
    zoomLevel.value += 0.1
    renderPages(currentPage.value)
  }
}

const zoomOut = () => {
  if (zoomLevel.value > 0.7) {
    zoomLevel.value -= 0.1
    renderPages(currentPage.value)
  }
}

const jumpToPage = () => {
    if (currentPage.value < 1 || currentPage.value > totalPages.value) return;
    renderPages(currentPage.value)
}




</script>
<template>
    <div  class="wrapper">
        <!-- HTML HEAD: Ensure this exists -->
            <meta name="viewport" content="width=device-width, initial-scale=1.0">

<!-- Floating Header -->
            
            <!-- HTML HEAD: Ensure this exists -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<!-- </div> -->
<div class="toolbar">
            <div class="toolbar-inner">
                <div class="page-navigation">
                <!-- <input type="number" v-model.number="currentPage" :min="1" :max="totalPages" @change="jumpToPage" /> -->
                <span> {{ currentPage }}</span>
                <span>/ {{ totalPages }}</span>
                </div>
                <div class="zoom-controls">
                <button @click="zoomOut">−</button>
                <span>{{ Math.round(zoomLevel * 100) }}%</span>
                <button @click="zoomIn">+</button>
                </div>
            </div>
        </div>
  <!-- PDF container -->
  <div ref="pdfCanvas"></div>
  <button @click="next">next</button>
  
</div>

</template>

<style scoped>
.wrapper {
    padding: 0px;
    font-family: sans-serif;
}

.input-box input {
    margin: 0 5px;
    padding: 5px;
}

button {
    margin: 5px;
    padding: 8px 12px;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 4px;
}

.pdf-container {
    margin-top: 0px;
    max-height: 80vh;
    overflow-y: auto;
}

.nav-buttons {
    margin-top: 10px;
}

canvas {
    margin: 0px;
    border: 1px solid #ddd;
    box-sizing: border-box;
}
.save-btn,
.download-btn {
    margin-top: 20px;
}
.wrapper {
    margin-top: 0px; /* Make space for the fixed header */
}

.header {
    position: fixed; /* Fixes the header to the top of the page */
    top: 0;
    left: 0;
    width: 100%;
    background-color: #fff;
    z-index: 1000; /* Ensures it's always on top */
    padding: 0px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2); /* Adds a small shadow for better visibility */
}

.pdf-container {
    margin-top: 10px; /* Ensures content below the header has some space */
}

.nav-buttons {
    margin-top: 10px;
}

.save-btn {
    margin-top: 10px;
}


.toolbar {
  position: fixed;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 10px 15px;
  border-radius: 6px;
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  white-space: nowrap;
}

.toolbar input {
  width: 50px;
  text-align: center;
  background: #222;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 6px;
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
  margin-top: 60px; /* space for toolbar */
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
  flex-wrap: wrap;
}

.page-navigation,
.zoom-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

input[type="number"] {
  width: 60px;
  padding: 4px;
  border-radius: 4px;
  border: none;
}

</style>
