import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// main entry point for the React application,it finds the 'root' div in index.html and tells React to render the App component inside it
const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);

// React.StrictMode: helps find potential problems in the app during development
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);