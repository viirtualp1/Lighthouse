import '@fontsource/onest/400.css';
import '@fontsource/onest/600.css';
import '@fontsource/oswald/400.css';
import '@fontsource/oswald/500.css';
import '@fontsource/cormorant-garamond/600.css';
import './style.css';
import { createApp } from 'vue';
import App from './App.vue';
import { i18n } from './i18n';

createApp(App).use(i18n).mount('#app');
