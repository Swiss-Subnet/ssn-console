import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@/app';
import { isNil } from '@/lib/nil';
import './index.css';

const root = document.getElementById('root');
if (isNil(root)) {
  throw new Error('Failed to find the root element');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
