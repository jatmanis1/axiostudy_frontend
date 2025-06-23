import { createRouter, createWebHistory } from 'vue-router';
import PdfViewer from '../views/PdfViewer.vue';
import OfflinePdfViewer from '../views/OfflinePdfViewer.vue';
import Units from '../views/Units.vue';
import Reader from '../views/Reader.vue';
import PdfServePage from '../views/PdfServePage.vue';
import PdfListView from '../views/PdfListView.vue';
import s3 from '../views/s3.vue';
const routes = [
    {
        path: '/',
        name: 'Home',
        component: PdfListView,
    },
    {
        path: '/download',
        name: 'OfflinePdfViewer',
        component: OfflinePdfViewer,
    },
    {
        path: '/pdf/:id',
        name: 'PdfServePage',
        component: PdfServePage,
    },
    {
        path: '/units',
        name: 'Units',
        component: Units,
    },
    {
        path: '/reader/:id',
        name: 's3',
        component: s3,
    }, {
        path: '/reader/:id',
        name: 'Reader',
        component: Reader,
    },

];

const router = createRouter({
    history: createWebHistory(process.env.BASE_URL),
    routes,
});

export default router;
