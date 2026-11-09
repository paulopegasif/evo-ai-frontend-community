import { createRoot } from 'react-dom/client';
import "@evoapi/design-system/styles";
// React Flow CSS imported here so it is processed BEFORE globals.css and
// our theming overrides in globals.css can win the cascade (EVO-1270).
import '@xyflow/react/dist/style.css';
import './styles/globals.css';
import './brand/theme.css'; // White-label palette overrides (must load after globals.css)
import './i18n/config'; // Importar configuração do i18n
import App from './App.tsx';
import { initTheme } from './utils/themeUtils';
import { initGA4 } from './utils/ga4Utils';
import { reloadOnceForStaleChunks } from './utils/chunkReload';

// Vite emits this when a lazy chunk (or its CSS) fails to load — typically a
// tab still running the previous build after a deploy. Reload once to fetch the
// new index.html instead of leaving a blank page; if we already reloaded
// recently, let the error propagate to the root ErrorBoundary.
window.addEventListener('vite:preloadError', event => {
  if (reloadOnceForStaleChunks()) event.preventDefault();
});

// Inicialização do tema antes do React montar
initTheme();

// Inicialização do Google Analytics 4
initGA4();

// ⚡ OTIMIZAÇÃO: StrictMode removido para evitar duplicação de requests
// Em desenvolvimento, StrictMode executa useEffect 2x para detectar problemas
createRoot(document.getElementById('root')!).render(
    <App />
);
