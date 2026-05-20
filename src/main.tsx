import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { stages } from './data/stages';
import './styles.css';
import { logStageValidationSummary, validateAllStages } from './utils/stageValidator';

if (import.meta.env.DEV) {
  logStageValidationSummary(validateAllStages(stages));
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
