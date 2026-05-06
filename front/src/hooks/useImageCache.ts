import { useState, useEffect, useCallback, useRef } from 'react';

const DB_NAME = 'whatsapp-image-cache';
const DB_VERSION = 1;
const STORE_NAME = 'images';

interface CachedImage {
  url: string;
  data: string;
  timestamp: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'url' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

export function useImageCache() {
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    openDB()
      .then(db => {
        setDb(db);
      })
  }, []);

  const getCachedImage = useCallback(async (url: string): Promise<string | null> => {
    if (!url) return null;

    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(url);

        request.onsuccess = () => {
          const result = request.result as CachedImage | undefined;
          if (result && result.data) {
            resolve(result.data);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => {
          resolve(null);
        };
      });
    } catch (err) {
      return null;
    }
  }, []);

  const cacheImage = useCallback(async (url: string, dataUrl: string) => {
    if (!url || !dataUrl) return;

    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put({ url, data: dataUrl, timestamp: Date.now() });

      transaction.oncomplete = () => {
      };
      transaction.onerror = () => {
      };
    } catch (err) {
    }
  }, []);

  const getOrFetchImage = useCallback(async (url: string, instanceId?: number): Promise<string> => {
    if (!url) return '';

    // Se já é um data URL, retorna direto
    if (url.startsWith('data:')) return url;

    // Tenta pegar do cache primeiro
    const cached = await getCachedImage(url);
    if (cached) return cached;

    // Se é formato msg_id:, busca no endpoint do Django
    if (url.startsWith('msg_id:') && instanceId) {
      const messageId = url.replace('msg_id:', '');
      const cacheKey = `msg:${messageId}`;

      const cached = await getCachedImage(cacheKey);
      if (cached) return cached;

      const apiUrl = `${import.meta.env.VITE_API_URL || '/api'}whatsapp-instances/${instanceId}/media/?message_id=${messageId}`;

      try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        if (data.base64 && typeof data.base64 === 'string') {
          const dataUrl = `data:${data.mime_type || 'image/jpeg'};base64,${data.base64}`;
          await cacheImage(cacheKey, dataUrl);
          return dataUrl;
        }
      } catch (err) {
      }
      return '';
    }

    // Para URLs normais, tenta baixar e cachear
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const reader = new FileReader();
      return new Promise((resolve) => {
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          cacheImage(url, dataUrl);
          resolve(dataUrl);
        };
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      return url;
    }
  }, [getCachedImage, cacheImage]);

  return { getCachedImage, cacheImage, getOrFetchImage, db };
}
