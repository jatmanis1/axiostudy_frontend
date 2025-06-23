<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import * as pdfjsLib from 'pdfjs-dist'
import '../pdfWorker' // This sets the PDF.js worker

const router = useRouter();

// PDF data & page management
const pdfList = ref([]); // List of saved PDFs
const pdfCanvas = ref(null); // Canvas for rendering PDFs
const currentPage = ref(1); // Current page
const totalPages = ref(0); // Total pages in the PDF
let pdfDoc = null; // PDF document instance

// Input for PDF URL and Name
const testUrl = ref('');
const testName = ref('');
// const pdfList = ref([])

// onMounted(async () => {
//   const metaList = await getAllPdfMetadata()
//   pdfList.value = metaList
// })

// Navigation function
const goToUnit = (id) => {
  router.push(`/pdf/${id}`);
};

// Load list of saved PDFs on component mount
onMounted(async () => {
    const metaList = await getAllPdfMetadata()
    console.log(metaList)
    pdfList.value = metaList
    console.log(pdfList)
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

  pdfList.value = await getStoredPdfNames();
  console.log('dssfdfd',pdfList.value);
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

// Load and render PDF from IndexedDB
const loadPdf = async (name) => {
  currentPage.value = 1;
  const db = await openDB();
  const tx = db.transaction('pdfs', 'readonly');
  const store = tx.objectStore('pdfs');
  const request = store.get(name);

  request.onsuccess = async () => {
    const blob = request.result;

    if (!blob || !(blob instanceof Blob)) {
      alert('PDF not found or invalid.');
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

// Render 5 PDF pages
const renderPages = async (start) => {
  const end = Math.min(start + 4, totalPages.value);
  for (let i = start; i <= end; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.height = viewport.height;
    canvas.width = viewport.width;
    canvas.style.maxWidth = '100%';
    canvas.style.margin = '10px 0';
    canvas.style.border = '1px solid #ddd';

    pdfCanvas.value.appendChild(canvas);

    await page.render({ canvasContext: context, viewport }).promise;
  }
};
const getAllPdfMetadata = async () => {
  const db = await openDB()
  const tx = db.transaction('pdfs', 'readonly')
  const store = tx.objectStore('pdfs')
  const request = store.getAllKeys()

  return new Promise((resolve) => {
    request.onsuccess = async () => {
      const keys = request.result
      const metaList = []
      for (const key of keys) {
        const recordRequest = store.get(key)
        await new Promise((res) => {
          recordRequest.onsuccess = () => {
            const { meta } = recordRequest.result || {}
            metaList.push({ id: key, ...meta })
            res()
          }
        })
      }
      resolve(metaList)
    }
    request.onerror = () => resolve([])
  })
}

// Go to next pages
const next = () => {
  if (currentPage.value + 5 <= totalPages.value) {
    currentPage.value += 5;
    renderPages(currentPage.value);
  }
};
</script>

<template>
  <div class="container py-5 main-container">
    <!-- Header Section -->
    <header class="text-center mb-5">
      <h1 class="display-5 fw-bold text-dark mb-3">Study Repository</h1>
      <p class="text-secondary">Managed Knowledge Archive</p>
    </header>
    {{ pdfList }}
    <!-- Content Grid -->
    <div v-if="pdfList.length" class="row g-4">
      <div 
        v-for="note in pdfList"
        :key="note.id"
        class="col-12 col-sm-6 col-xl-4"
      >
        <article 
          class="resource-card card h-100 border-0 shadow-lg hover-transform"
          @click="goToUnit(note.id)"
        >
          <div class="card-body">
            <!-- Card Header -->
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="badge bg-primary-subtle text-primary-emphasis">{{ note.part }}</span>
              <i class="fas fa-book-open text-primary opacity-75"></i>
            </div>

            <!-- Main Content -->
            <h3 class="h5 card-title text-dark mb-3">{{ note.title }}</h3>
            
            <!-- Metadata Grid -->
            <div class="metadata-grid">
              <div class="metadata-item">
                <span class="text-uppercase text-muted small">Subject</span>
                <p class="mb-0 fw-medium">{{ note.subject }}</p>
              </div>
              <div class="metadata-item">
                <span class="text-uppercase text-muted small">Course</span>
                <p class="mb-0 fw-medium">{{ note.course }}</p>
              </div>
              <div class="metadata-item">
                <span class="text-uppercase text-muted small">Unit</span>
                <p class="mb-0 fw-medium">{{ note.unit }}</p>
              </div>
              <div class="metadata-item">
                <span class="text-uppercase text-muted small">Chapter</span>
                <p class="mb-0 fw-medium">{{ note.chapter }}</p>
              </div>
            </div>
          </div>

          <!-- Card Footer -->
          <footer class="card-footer bg-transparent border-top pt-3">
            <div class="d-flex justify-content-between small">
              <span class="text-muted">{{ note.owner }}</span>
              <span class="text-primary" style="cursor: pointer;">
                Explore <i class="fas fa-arrow-right ms-1"></i>
              </span>
            </div>
          </footer>
        </article>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state text-center py-6">
      <div class="empty-state-icon mb-4">
        <i class="fas fa-box-open fa-3x text-primary opacity-25"></i>
      </div>
      <h4 class="mb-3 text-dark">Knowledge Vault Empty</h4>
      <p class="text-secondary mb-4">Begin by curating your educational resources</p>
      <button class="btn btn-primary px-4 rounded-pill">
        <i class="fas fa-plus me-2"></i>Add Resource
      </button>
    </div>
  </div>
</template>

<style scoped>
.main-container {
  background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f5 100%);
  min-height: 100vh;
}

.resource-card {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(4px);
  border-radius: 12px;
  overflow: hidden;
}

.resource-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
}

.metadata-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin: 1.5rem 0;
}

.metadata-item {
  padding: 0.75rem;
  background: rgba(241, 243, 245, 0.4);
  border-radius: 8px;
}

.empty-state {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  padding: 4rem 2rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
}

.hover-transform {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.text-primary {
  color: #2c3e50 !important;
}

.bg-primary-subtle {
  background-color: rgba(44, 62, 80, 0.1) !important;
}
</style>
