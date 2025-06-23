<script setup>
import { ref, onMounted } from 'vue'
// import * as pdfjsLib from 'pdfjs-dist/build/pdf'
// import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry'
import '../pdfWorker'; // <- Set the worker here


// pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const pdfList = ref([])
const pdfCanvas = ref(null)
const currentPage = ref(1)
const totalPages = ref(0)
let pdfDoc = null

// On component mount: load list of saved PDFs
onMounted(async () => {
    pdfList.value = await getStoredPdfNames()
})

// Open IndexedDB
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

// Store PDF from URL
const storePdf = async (url, name) => {
    const res = await fetch(url)
    const blob = await res.blob()
    const db = await openDB()
    const tx = db.transaction('pdfs', 'readwrite')
    tx.objectStore('pdfs').put(blob, name)
    await tx.complete
    pdfList.value = await getStoredPdfNames()
}

// Get list of stored PDF names
const getStoredPdfNames = async () => {
    const db = await openDB()
    const tx = db.transaction('pdfs', 'readonly')
    const store = tx.objectStore('pdfs')
    const request = store.getAllKeys()
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

// Load a PDF from IndexedDB and render pages
// const loadPdf = async (name) => {
//     currentPage.value = 1
//     const db = await openDB()
//     const tx = db.transaction('pdfs', 'readonly')
//     const blob = await tx.objectStore('pdfs').get(name)
//     if (!blob) return alert('PDF not found')

//     const url = URL.createObjectURL(blob)
//     pdfDoc = await pdfjsLib.getDocument(url).promise
//     totalPages.value = pdfDoc.numPages

//     pdfCanvas.value.innerHTML = ''
//     renderPages(currentPage.value)
// }
const loadPdf = async (name) => {
    currentPage.value = 1;
    const db = await openDB();
    const tx = db.transaction('pdfs', 'readonly');
    const store = tx.objectStore('pdfs');
    const request = store.get(name);

    request.onsuccess = async () => {
        const blob = request.result;

        if (!blob || !(blob instanceof Blob)) {
            alert('PDF not found or invalid. Maybe it was not saved properly.');
            return;
        }

        const url = URL.createObjectURL(blob);
        pdfDoc = await pdfjsLib.getDocument(url).promise;
        totalPages.value = pdfDoc.numPages;

        pdfCanvas.value.innerHTML = '';
        renderPages(currentPage.value);
    };

    request.onerror = () => {
        alert('Failed to load PDF from IndexedDB.');
    };
};


// Render a page
const renderPages = async (start) => {
    pdfCanvas.value.innerHTML = ''
    const end = Math.min(start + 4, totalPages.value)
    for (let i = start; i <= end; i++) {
        const page = await pdfDoc.getPage(i)
        const viewport = page.getViewport({ scale: 1.5 })
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        canvas.height = viewport.height
        canvas.width = viewport.width
        pdfCanvas.value.appendChild(canvas)
        await page.render({ canvasContext: context, viewport }).promise
    }
}

// Pagination
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

// Test input
const testUrl = ref('http://127.0.0.1:8000/api/media/')
const testName = ref('My PDF')
</script>

<template>
    <div class="wrapper">
        <h2>Offline PDF Storage</h2>

        <div class="input-box">
            <input v-model="testUrl" placeholder="PDF URL" />
            <input v-model="testName" placeholder="PDF Name" />
            <button @click="storePdf(testUrl, testName)">Save to IndexedDB</button>
        </div>

        <h3>Stored PDFs</h3>
        <ul>
            <li v-for="name in pdfList" :key="name">
                <button @click="loadPdf(name)">{{ name }}</button>
            </li>
        </ul>

        <div ref="pdfCanvas" class="pdf-container"></div>

        <div v-if="pdfDoc" class="nav-buttons">
            <button @click="prev" :disabled="currentPage <= 1">Prev</button>
            <button @click="next" :disabled="currentPage + 5 > totalPages">Next</button>
        </div>
    </div>
</template>

<style scoped>
.wrapper {
    padding: 20px;
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
    margin-top: 20px;
    max-height: 80vh;
    overflow-y: auto;
}

.nav-buttons {
    margin-top: 10px;
}
</style>
