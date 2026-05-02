import './styles.css';
import { createBlackHoleApp } from './blackHoleScene.js';

const root = document.querySelector('#app');
let app = null;

try {
  app = createBlackHoleApp(root);
} catch (error) {
  root.classList.add('render-fallback');
  root.textContent = 'WebGL is unavailable in this browser. Use a current desktop or mobile browser with hardware acceleration enabled.';
  console.error(error);
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => app?.dispose());
}
