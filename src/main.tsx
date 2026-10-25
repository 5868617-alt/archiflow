import { createRoot } from 'react-dom/client';
import { StoreProvider } from './data/store';
import { App } from './App';

const el = document.getElementById('root')!;
createRoot(el).render(<StoreProvider><App /></StoreProvider>);
