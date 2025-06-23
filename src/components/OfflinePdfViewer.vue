<script setup>
import { ref, onMounted } from 'vue'
// import * as pdfjsLib from 'pdfjs-dist/build/pdf'
// import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry'
import '../pdfWorker'; // <- Set the worker here

// pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

// PDF data & page management
const pdfList = ref([]); // List of saved PDFs
const pdfCanvas = ref(null); // Canvas for rendering PDFs
const currentPage = ref(1); // Current page
const totalPages = ref(0); // Total pages in the PDF
let pdfDoc = null; // PDF document instance

// Input for PDF URL and Name
const testUrl = ref('');
const testName = ref('');

// Load list of saved PDFs on component mount
onMounted(async () => {
    pdfList.value = await getStoredPdfNames();
});

// Open IndexedDB
const openDB = () => {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('pdfDatabase', 1);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('pdfs')) {
                db.createObjectStore('pdfs');
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
};

// Store PDF from URL to IndexedDB
const storePdf = async (url, name) => {
    const res = await fetch(url);
    const blob = await res.blob();

    const db = await openDB();
    const tx = db.transaction('pdfs', 'readwrite');
    tx.objectStore('pdfs').put(blob, name);

    await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = reject;
        tx.onabort = reject;
    });

    // Update the list of stored PDFs
    pdfList.value = await getStoredPdfNames();
};

// Get list of stored PDF names from IndexedDB
const getStoredPdfNames = async () => {
    const db = await openDB();
    const tx = db.transaction('pdfs', 'readonly');
    const store = tx.objectStore('pdfs');
    const request = store.getAllKeys();
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// Load PDF from IndexedDB and render pages
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

        pdfCanvas.value.innerHTML = ''; // Clear the canvas
        renderPages(currentPage.value);
    };

    request.onerror = () => {
        alert('Failed to load PDF from IndexedDB.');
    };
};


const renderPages = async (start) => {
    // pdfCanvas.value.innerHTML = ''; // Clear previous pages

    const end = Math.min(start + 4, totalPages.value); // Render 5 pages at a time
    for (let i = start; i <= end; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 }); // Adjust scale to fit the screen better
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        // Set the canvas size to the page's dimensions
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Apply some styles to ensure the canvas fits in the container properly
        canvas.style.maxWidth = '100%';
        canvas.style.margin = '10px 0';
        canvas.style.border = '1px solid #ddd';

        // Append the canvas to the container
        pdfCanvas.value.appendChild(canvas);

        // Render the page into the canvas
        await page.render({ canvasContext: context, viewport }).promise;
    }
};

const next = () => {
    if (currentPage.value + 5 <= totalPages.value) {
        currentPage.value += 5;
        renderPages(currentPage.value);
    }
};


</script>
<template>
    <div class="wrapper">
        <h2>Offline PDF Storage</h2>

        <!-- PDF input fields and save button -->
        <div class="input-box">
            <input v-model="testUrl" placeholder="PDF URL" />
            <input v-model="testName" placeholder="PDF Name" />
            <button @click="storePdf(testUrl, testName)">Save to IndexedDB</button>
        </div>

        <!-- List of saved PDFs -->
        <h3>Stored PDFs</h3>
        <ul>
            <li v-for="name in pdfList" :key="name">
                <button @click="loadPdf(name)">{{ name }}</button>
            </li>
        </ul>

        <!-- Canvas for rendering pages -->
        <div ref="pdfCanvas" class="pdf-container"></div>

        <!-- Pagination controls -->
        <div class="nav-buttons">
            <button @click="next" :disabled="currentPage + 4 >= totalPages">Next</button>
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
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
}

.nav-buttons {
    margin-top: 10px;
    display: flex;
    justify-content: center;
}

canvas {
    margin: 10px;
    border: 1px solid #ddd;
    box-sizing: border-box;
}
</style>
