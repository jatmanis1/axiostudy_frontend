class PDFIndexedDBService {
    constructor() {
        this.dbName = 'PDFStorageDB'
        this.dbVersion = 1
        this.storeName = 'pdfs'
        this.db = null
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion)

            request.onerror = () => reject(request.error)
            request.onsuccess = () => {
                this.db = request.result
                resolve(this.db)
            }

            request.onupgradeneeded = (event) => {
                const db = event.target.result
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id' })
                    store.createIndex('url', 'url', { unique: true })
                    store.createIndex('downloadDate', 'downloadDate', { unique: false })
                }
            }
        })
    }

    async checkPDFExists(pdfUrl) {
        try {
            if (!this.db) await this.initDB()

            const transaction = this.db.transaction([this.storeName], 'readonly')
            const store = transaction.objectStore(this.storeName)
            const index = store.index('url')

            return new Promise((resolve, reject) => {
                const request = index.get(pdfUrl)
                request.onsuccess = () => {
                    resolve(request.result ? true : false)
                }
                request.onerror = () => reject(request.error)
            })
        } catch (error) {
            console.error('Error checking PDF existence:', error)
            return false
        }
    }

    async getPDFFromIndexedDB(pdfUrl) {
        try {
            if (!this.db) await this.initDB()

            const transaction = this.db.transaction([this.storeName], 'readonly')
            const store = transaction.objectStore(this.storeName)
            const index = store.index('url')

            return new Promise((resolve, reject) => {
                const request = index.get(pdfUrl)
                request.onsuccess = () => {
                    if (request.result) {
                        resolve(request.result.blob)
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

    async savePDFToIndexedDB(pdfUrl, blob, metadata = {}) {
        try {
            if (!this.db) await this.initDB()

            const transaction = this.db.transaction([this.storeName], 'readwrite')
            const store = transaction.objectStore(this.storeName)

            const pdfData = {
                id: Date.now() + Math.random(), // Simple ID generation
                url: pdfUrl,
                blob: blob,
                downloadDate: new Date().toISOString(),
                fileSize: blob.size,
                ...metadata
            }

            return new Promise((resolve, reject) => {
                const request = store.add(pdfData)
                request.onsuccess = () => resolve(true)
                request.onerror = () => reject(request.error)
            })
        } catch (error) {
            console.error('Error saving PDF to IndexedDB:', error)
            return false
        }
    }

    async deletePDF(pdfUrl) {
        try {
            if (!this.db) await this.initDB()

            const transaction = this.db.transaction([this.storeName], 'readwrite')
            const store = transaction.objectStore(this.storeName)
            const index = store.index('url')

            return new Promise((resolve, reject) => {
                const getRequest = index.get(pdfUrl)
                getRequest.onsuccess = () => {
                    if (getRequest.result) {
                        const deleteRequest = store.delete(getRequest.result.id)
                        deleteRequest.onsuccess = () => resolve(true)
                        deleteRequest.onerror = () => reject(deleteRequest.error)
                    } else {
                        resolve(false)
                    }
                }
                getRequest.onerror = () => reject(getRequest.error)
            })
        } catch (error) {
            console.error('Error deleting PDF from IndexedDB:', error)
            return false
        }
    }

    async getAllStoredPDFs() {
        try {
            if (!this.db) await this.initDB()

            const transaction = this.db.transaction([this.storeName], 'readonly')
            const store = transaction.objectStore(this.storeName)

            return new Promise((resolve, reject) => {
                const request = store.getAll()
                request.onsuccess = () => {
                    const pdfs = request.result.map(item => ({
                        url: item.url,
                        downloadDate: item.downloadDate,
                        fileSize: item.fileSize
                    }))
                    resolve(pdfs)
                }
                request.onerror = () => reject(request.error)
            })
        } catch (error) {
            console.error('Error getting all stored PDFs:', error)
            return []
        }
    }

    async clearAllPDFs() {
        try {
            if (!this.db) await this.initDB()

            const transaction = this.db.transaction([this.storeName], 'readwrite')
            const store = transaction.objectStore(this.storeName)

            return new Promise((resolve, reject) => {
                const request = store.clear()
                request.onsuccess = () => resolve(true)
                request.onerror = () => reject(request.error)
            })
        } catch (error) {
            console.error('Error clearing all PDFs:', error)
            return false
        }
    }
}

export default new PDFIndexedDBService()
