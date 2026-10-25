import { createRoot } from 'react-dom/client';
import { LiveStoreProvider } from './store';
import { App } from '../App';

createRoot(document.getElementById('root')!).render(<LiveStoreProvider><App /></LiveStoreProvider>);
