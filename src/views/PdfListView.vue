<template>
  <div class="pdf-list-container">
    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading PDFs...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <i class="fas fa-exclamation-triangle"></i>
      <h3>Unable to Load PDFs</h3>
      <p>{{ error }}</p>
      <button @click="loadPdfs" class="btn btn-primary">
        <i class="fas fa-refresh me-2"></i>Retry
      </button>
    </div>

    <!-- Main Content -->
    <div v-else>
      <!-- Header -->
      <header class="page-header">
        <h1>PDF Library</h1>
        <p class="text-muted">{{ filteredPdfs.length }} documents available</p>
      </header>

      <!-- Filters -->
      <div class="filters-section">
        <div class="search-container">
          <i class="fas fa-search search-icon"></i>
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Search by title..." 
            class="search-input"
          >
        </div>
        
        <div class="filter-group">
          <select v-model="selectedClass" class="filter-select text-dark">
            <option value="">All Classes</option>
            <option v-for="classItem in uniqueClasses" :key="classItem" :value="classItem">{{ classItem }}</option>
          </select>
          
          <select v-model="selectedSubject" class="filter-select text-dark">
            <option value="">All Subjects</option>
            <option v-for="subject in uniqueSubjects" :key="subject" :value="subject">{{ subject }}</option>
          </select>

          <select v-model="selectedUnit" class="filter-select text-dark">
            <option value="">All Units</option>
            <option v-for="unit in uniqueUnits" :key="unit" :value="unit">{{ unit }}</option>
          </select>
        </div>

        <!-- Clear Filters -->
        <button 
          v-if="hasActiveFilters" 
          @click="clearFilters"
          class="btn btn-outline-secondary"
        >
          <i class="fas fa-times me-2"></i>Clear Filters
        </button>
      </div>

      <!-- Results Info -->
      <div class="results-info" v-if="searchQuery || hasActiveFilters">
        <p>{{ filteredPdfs.length }} results found</p>
      </div>

      <!-- PDF Grid -->
      <div class="pdf-grid">
        <article 
          v-for="pdf in filteredPdfs" 
          :key="pdf.name" 
          class="pdf-card"
          @click="navigateToPdf(pdf.name)"
        >
          <div class="card-header">
            <i class="fas fa-file-pdf pdf-icon"></i>
          </div>
          
          <h3 class="pdf-title">{{ pdf.name }}</h3>
          
          <div class="metadata-grid">
            <div class="metadata-item">
              <span class="label">Language</span>
              <span class="value">{{ pdf.language }}</span>
            </div>
            <div class="metadata-item">
              <span class="label">Class</span>
              <span class="value">{{ pdf.class }}</span>
            </div>
            <div class="metadata-item">
              <span class="label">Subject</span>
              <span class="value">{{ pdf.subject }}</span>
            </div>
            <div class="metadata-item">
              <span class="label">Unit</span>
              <span class="value">{{ pdf.unit }}</span>
            </div>
          </div>

          <div class="card-footer">
            <span class="author">{{ pdf.owner || 'Unknown' }}</span>
            <span class="view-action">
              View <i class="fas fa-arrow-right"></i>
            </span>
          </div>
        </article>
      </div>

      <!-- Empty State -->
      <div v-if="filteredPdfs.length === 0 && !isLoading" class="empty-state">
        <i class="fas fa-search fa-3x text-muted mb-3"></i>
        <h4>No PDFs Found</h4>
        <p class="text-muted">Try adjusting your search or filter criteria</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// State
const pdfs = ref([])
const isLoading = ref(true)
const error = ref('')

// Filter states
const searchQuery = ref('')
const selectedClass = ref('')
const selectedSubject = ref('')
const selectedUnit = ref('')

// API Configuration
const API_BASE_URL = 'https://api.github.com/repos/jatmanis1/axiostudy/contents/media'
const UNITS_ENDPOINT = `${API_BASE_URL}/`

// Load PDFs
const loadPdfs = async () => {
  isLoading.value = true
  error.value = ''
  try {
    const response = await fetch(UNITS_ENDPOINT)
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    
    const data = await response.json()
    pdfs.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error(err)
    error.value = 'Failed to load PDFs: ' + err.message
  } finally {
    isLoading.value = false
  }
}

// Computed: parsedPdfs with decoded values
const parsedPdfs = computed(() => {
  const subjectMap = {
    c: 'Chemistry',
    p: 'Physics',
    m: 'Maths',
    b: 'Biology'
  }

  const languageMap = {
    e: 'English',
    h: 'Hindi'
  }

  return pdfs.value.map(pdf => {
    const name = pdf.name || ''
    const [prefix] = name.split(/[^\w]/)
    const langCode = prefix?.[0] || ''
    const classCode = prefix?.[1] || ''
    const subjectCode = prefix?.[2] || ''
    const unitCode = prefix?.[4] || ''
    const subunitCode = prefix?.slice(5) || ''

    return {
      ...pdf,
      language: languageMap[langCode] || 'Unknown',
      class: classCode === '1' ? '1st year' : 
             classCode === '2' ? '2nd year' : 
             classCode === '3' ? '3rd year' : 
             classCode === '4' ? '4th year' : 'Unknown',
      subject: subjectMap[subjectCode] || 'Unknown',
      unit: subunit === '0'
        ? `Unit ${unit} (Complete Unit)`
        : subunit
          ? `Unit ${unit} (Subunit ${subunit})`
          : `Unit ${unit}`
    }
  })
})

// Filtered PDFs
const filteredPdfs = computed(() => {
  return parsedPdfs.value.filter(pdf => {
    const searchTerm = searchQuery.value.toLowerCase()
    const matchesSearch = !searchTerm || 
      pdf.name?.toLowerCase().includes(searchTerm) ||
      pdf.subject?.toLowerCase().includes(searchTerm) ||
      pdf.language?.toLowerCase().includes(searchTerm)

    const matchesClass = !selectedClass.value || pdf.class === selectedClass.value
    const matchesSubject = !selectedSubject.value || pdf.subject === selectedSubject.value
    const matchesUnit = !selectedUnit.value || pdf.unit === selectedUnit.value

    return matchesSearch && matchesClass && matchesSubject && matchesUnit
  })
})

// Computed options for filter dropdowns
const uniqueClasses = computed(() => [...new Set(parsedPdfs.value.map(pdf => pdf.class).filter(Boolean))].sort())
const uniqueSubjects = computed(() => [...new Set(parsedPdfs.value.map(pdf => pdf.subject).filter(Boolean))].sort())
const uniqueUnits = computed(() => [...new Set(parsedPdfs.value.map(pdf => pdf.unit).filter(Boolean))].sort())

// Utility
const hasActiveFilters = computed(() => selectedClass.value || selectedSubject.value || selectedUnit.value)

const clearFilters = () => {
  searchQuery.value = ''
  selectedClass.value = ''
  selectedSubject.value = ''
  selectedUnit.value = ''
}

// Navigation
const navigateToPdf = (pdfName) => {
  if (!pdfName) return console.error('Invalid PDF name')
  router.push(`/pdf/${encodeURIComponent(pdfName)}`)
}

// On mount
onMounted(() => {
  loadPdfs()
})
</script>
 


<style scoped>
/* Same styles as before */
.pdf-list-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  text-align: center;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* ... rest of the styles remain the same ... */


.pdf-list-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  text-align: center;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

.filters-section {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
}

.search-container {
  position: relative;
  margin-bottom: 1rem;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
}

.search-input {
  width: 100%;
  padding: 0.8rem 1rem 0.8rem 2.5rem;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #3498db;
}

.filter-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.filter-select {
  padding: 0.8rem;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  background: white;
  cursor: pointer;
}

.results-info {
  margin-bottom: 1rem;
  color: #666;
}

.pdf-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.pdf-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.pdf-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.course-badge {
  background: #e3f2fd;
  color: #1976d2;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
}

.pdf-icon {
  color: #dc3545;
  font-size: 1.2rem;
}

.pdf-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #2c3e50;
  line-height: 1.4;
}

.metadata-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.metadata-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.label {
  font-size: 0.75rem;
  color: #666;
  text-transform: uppercase;
  font-weight: 500;
}

.value {
  font-size: 0.9rem;
  color: #2c3e50;
  font-weight: 500;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid #eee;
  font-size: 0.9rem;
}

.author {
  color: #666;
}

.view-action {
  color: #3498db;
  font-weight: 500;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #666;
}

@media (max-width: 768px) {
  .pdf-grid {
    grid-template-columns: 1fr;
  }
  
  .metadata-grid {
    grid-template-columns: 1fr;
  }
  
  .filter-group {
    grid-template-columns: 1fr;
  }
}
</style>
