export interface QueuedRequest {
  id?: number;
  url: string;
  method: string;
  body?: string;
  headers?: Record<string, string>;
}

const DB_NAME = 'offline-queue';
const STORE_NAME = 'requests';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueRequest(data: QueuedRequest): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).add(data);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function processQueue(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const getAllReq = store.getAll();
  const requests: QueuedRequest[] = await new Promise((resolve, reject) => {
    getAllReq.onsuccess = () => resolve(getAllReq.result);
    getAllReq.onerror = () => reject(getAllReq.error);
  });

  for (const req of requests) {
    try {
      await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body,
      });
      if (req.id !== undefined) {
        store.delete(req.id);
      }
    } catch {
      // if one request fails, keep it in queue and stop processing
      break;
    }
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function sendOrQueue(url: string, options: RequestInit): Promise<Response | void> {
  if (navigator.onLine) {
    return fetch(url, options);
  }
  await queueRequest({
    url,
    method: options.method || 'GET',
    body: options.body as string | undefined,
    headers: options.headers as Record<string, string> | undefined,
  });
}
