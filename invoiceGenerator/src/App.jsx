import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import InvoiceForm from './components/invoiceForm';
import HistoryPage from './components/HistoryPage';
import './App.css';
import './index.css';

const App = () => {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<InvoiceForm />} />
          <Route path="/invoices" element={<HistoryPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;
