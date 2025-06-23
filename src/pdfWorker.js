import { GlobalWorkerOptions } from 'pdfjs-dist';

// Set up the worker for PDF.js
const worker = new Worker(new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url), {
    type: 'module',
});

GlobalWorkerOptions.workerPort = worker;  // Set the worker port
