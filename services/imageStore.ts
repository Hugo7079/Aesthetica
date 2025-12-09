// Lightweight IndexedDB wrapper for storing generated images locally
// Stores blobs keyed by challenge id

const DB_NAME = 'aesthetica-images';
const STORE_NAME = 'images';
const DB_VERSION = 1;

const openDB = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, DB_VERSION);
  req.onupgradeneeded = () => {
    const db = req.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
  };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const putBlob = async (id: string, blob: Blob) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ id, blob, createdAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const getBlobRecord = async (id: string): Promise<{id: string; blob: Blob; createdAt: number} | undefined> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result as any);
    req.onerror = () => reject(req.error);
  });
};

const dataURLToBlob = (dataURL: string): Blob => {
  const parts = dataURL.split(',');
  const meta = parts[0];
  const base64 = parts[1];
  const mimeMatch = meta.match(/data:([^;]+);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binary = atob(base64);
  const len = binary.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = binary.charCodeAt(i);
  return new Blob([u8], { type: mime });
};

const blobToDataURL = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

export const saveImage = async (id: string, urlOrDataUrl: string): Promise<void> => {
  try {
    let blob: Blob;
    if (urlOrDataUrl.startsWith('data:')) {
      blob = dataURLToBlob(urlOrDataUrl);
    } else {
      // Fetch external URL and store blob
      const res = await fetch(urlOrDataUrl, { cache: 'reload' });
      blob = await res.blob();
    }
    await putBlob(id, blob);
  } catch (e) {
    console.warn('Failed to saveImage to IndexedDB', e);
  }
};

export const getImageDataUrl = async (id: string): Promise<string | null> => {
  try {
    const rec = await getBlobRecord(id);
    if (!rec || !rec.blob) return null;
    return await blobToDataURL(rec.blob);
  } catch (e) {
    console.warn('Failed to getImageDataUrl', e);
    return null;
  }
};

export const deleteImage = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const listStoredIds = async (): Promise<string[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAllKeys();
    req.onsuccess = () => resolve(req.result as string[]);
    req.onerror = () => reject(req.error);
  });
};

export default { saveImage, getImageDataUrl, deleteImage, listStoredIds };
