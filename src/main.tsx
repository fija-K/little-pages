import '@fontsource/patrick-hand';
import '@fontsource/caveat';
import '@fontsource/kalam';
import '@fontsource/shadows-into-light';
import '@fontsource/nunito';
import '@fontsource/indie-flower';
import '@fontsource/gaegu';
import '@fontsource/delius';
import '@fontsource/lora';
import '@fontsource/courier-prime';
import '@fontsource/amatic-sc';
import '@fontsource/homemade-apple';
import '@fontsource/sacramento';

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
