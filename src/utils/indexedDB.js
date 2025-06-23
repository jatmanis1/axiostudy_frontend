export const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('pdfDatabase', 1)

        request.onupgradeneeded = (event) => {
            const db = event.target.result
            if (!db.objectStoreNames.contains('pdfs')) {
                db.createObjectStore('pdfs')
            }
        }

        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

export const getPdfFromIndexedDB = async (pdfId) => {
    // Validate pdfId before proceeding
    if (!pdfId || pdfId === '' || pdfId === 'undefined') {
        console.warn('Invalid pdfId provided to getPdfFromIndexedDB:', pdfId)
        return null
    }

    try {
        const db = await openDB()
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('pdfs', 'readonly')
            const store = transaction.objectStore('pdfs')
            const request = store.get(pdfId)

            request.onsuccess = () => resolve(request.result || null)
            request.onerror = () => {
                console.error('Error getting PDF from IndexedDB:', request.error)
                resolve(null) // Return null instead of rejecting
            }
        })
    } catch (error) {
        console.error('Error opening IndexedDB:', error)
        return null
    }
}

export const storePdfInIndexedDB = async (pdfId, pdfBlob) => {
    if (!pdfId || pdfId === '' || pdfId === 'undefined') {
        throw new Error('Invalid pdfId provided to storePdfInIndexedDB')
    }

    if (!pdfBlob) {
        throw new Error('Invalid pdfBlob provided to storePdfInIndexedDB')
    }

    try {
        const db = await openDB()
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('pdfs', 'readwrite')
            const store = transaction.objectStore('pdfs')
            const request = store.put(pdfBlob, pdfId)

            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
        })
    } catch (error) {
        console.error('Error storing PDF in IndexedDB:', error)
        throw error
    }
}
