import { useEffect, useRef } from 'react';
import { saveDraft } from '../api/invoiceApi';

const LS_KEY = 'invoiceDraft';

export function useAutoSave(data, delayMs = 1500) {
  const timerRef = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      // Layer 1: API save
      try {
        await saveDraft(data);
      } catch {
        // silent — API may not be reachable during dev without vercel dev running
      }
      // Layer 2: localStorage backup
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({ ...data, _savedAt: Date.now() }));
      } catch {
        // ignore quota errors
      }
    }, delayMs);

    return () => clearTimeout(timerRef.current);
  }, [data, delayMs]);
}

export { LS_KEY };
