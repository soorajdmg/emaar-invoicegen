import React, { useState, useEffect } from 'react';
import './navbar.css';

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
  </svg>
);
const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>
  </svg>
);
const NewInvoiceIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/>
    <path d="M14 3v5h5M12 11v6M9 14h6"/>
  </svg>
);
const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5l4.5 4.5L19 7.5"/>
  </svg>
);
const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/>
    <circle cx="12" cy="12" r="3"/>
    <path d="M3 3l18 18"/>
  </svg>
);

const Navbar = ({
  invoiceData,
  onGenerate,
  onNewInvoice,
  genState,
  totalText,
  showPreviewBtn,
  previewOpen,
  onTogglePreview,
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(stored);
    document.documentElement.setAttribute('data-theme', stored ? 'dark' : 'light');
  }, []);

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('darkMode', next);
  };

  const genLabel =
    genState === 'loading' ? 'Generating…' :
    genState === 'done'    ? 'Downloaded'  :
                             'Generate invoice';

  return (
    <>
      <header className="navbar">
        {/* Brand */}
        <div className="brand">
          <a
            className="brand-plate"
            href="https://www.behance.net/prmurugaraj"
            target="_blank"
            rel="noopener noreferrer"
            title="behance.net/prmurugaraj"
          >
            <span className="brand-name">murugaraj</span>
            <span className="brand-sub">Creative Retoucher</span>
          </a>
          <span className="brand-label">Invoice generator</span>
        </div>

        {/* Actions */}
        <div className="navbar-actions">
          {/* Theme toggle */}
          <button className="nav-btn nav-btn-icon" onClick={toggleDarkMode} title="Toggle dark mode" aria-label="Toggle dark mode">
            {isDarkMode ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* Preview toggle — only shown when not wide enough for side-by-side */}
          {showPreviewBtn && (
            <button
              className={`nav-btn${previewOpen ? ' nav-btn-active' : ''}`}
              onClick={onTogglePreview}
              title="Toggle invoice preview"
            >
              {previewOpen ? <EyeOffIcon /> : <EyeIcon />}
              <span className="hide-mobile">Preview</span>
            </button>
          )}

          {/* New invoice */}
          <button className="nav-btn" onClick={onNewInvoice} title="New invoice">
            <NewInvoiceIcon />
            <span className="hide-mobile">New invoice</span>
          </button>

          {/* Generate — desktop only */}
          <button
            className="nav-btn-generate hide-mobile"
            onClick={onGenerate}
            disabled={genState !== 'idle'}
          >
            {genState === 'loading' ? (
              <span className="spin" />
            ) : genState === 'done' ? (
              <CheckIcon />
            ) : (
              <DownloadIcon />
            )}
            <span>{genLabel}</span>
          </button>
        </div>
      </header>

      {/* Mobile sticky footer */}
      <div className="mobile-footer show-mobile">
        <div className="mobile-total">
          <span className="mobile-total-label">Total due ({invoiceData?.currency})</span>
          <span className="mobile-total-amount">{totalText}</span>
        </div>
        <button
          className="nav-btn-generate-mobile"
          onClick={onGenerate}
          disabled={genState !== 'idle'}
        >
          {genState === 'loading' ? (
            <span style={{ width:16,height:16,borderRadius:'50%',border:'2px solid rgba(255,255,255,.35)',borderTopColor:'#fff',animation:'ivspin .7s linear infinite',display:'inline-block' }} />
          ) : genState === 'done' ? (
            <CheckIcon />
          ) : (
            <DownloadIcon />
          )}
          <span>{genState === 'loading' ? 'Generating…' : genState === 'done' ? 'Done' : 'Generate'}</span>
        </button>
      </div>
    </>
  );
};

export default Navbar;
