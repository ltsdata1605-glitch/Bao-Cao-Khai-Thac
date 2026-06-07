/**
 * IndexedDB Service for "Báo Cáo Khai Thác"
 */

const DB_NAME = 'BaoCaoKhaiThacDB';
const DB_VERSION = 1;

export interface SyncLog {
  id: string;
  timestamp: string;
  status: 'success' | 'error';
  message: string;
}

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object stores
      if (!db.objectStoreNames.contains('drafts')) {
        db.createObjectStore('drafts');
      }
      if (!db.objectStoreNames.contains('reports')) {
        db.createObjectStore('reports', { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains('saved_totals')) {
        db.createObjectStore('saved_totals');
      }
      if (!db.objectStoreNames.contains('sync_logs')) {
        db.createObjectStore('sync_logs', { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject(new Error('Failed to open IndexedDB: ' + (event.target as IDBOpenDBRequest).error?.message));
    };
  });
}

// Helper to run transactions safely
async function getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<{ store: IDBObjectStore, transaction: IDBTransaction }> {
  const db = await initDB();
  const transaction = db.transaction(storeName, mode);
  const store = transaction.objectStore(storeName);
  return { store, transaction };
}

export const DBService = {
  // --- Draft Management ---
  async saveDraft(data: any): Promise<void> {
    const { store } = await getStore('drafts', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(data, 'current_draft');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async loadDraft(): Promise<any | null> {
    const { store } = await getStore('drafts');
    return new Promise((resolve) => {
      const request = store.get('current_draft');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  },

  // --- Daily Reports Management ---
  async saveReport(report: any): Promise<void> {
    const { store } = await getStore('reports', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(report);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async getReport(date: string): Promise<any | null> {
    const { store } = await getStore('reports');
    return new Promise((resolve) => {
      const request = store.get(date);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  },

  async getAllReports(): Promise<any[]> {
    const { store } = await getStore('reports');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  async deleteReport(date: string): Promise<void> {
    const { store } = await getStore('reports', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(date);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // --- Saved Totals Management ---
  async saveTotals(totals: any): Promise<void> {
    const { store } = await getStore('saved_totals', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(totals, 'cumulative_totals');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async loadTotals(): Promise<any | null> {
    const { store } = await getStore('saved_totals');
    return new Promise((resolve) => {
      const request = store.get('cumulative_totals');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  },

  // --- Sync Logs Management ---
  async addSyncLog(status: 'success' | 'error', message: string): Promise<SyncLog> {
    const { store } = await getStore('sync_logs', 'readwrite');
    const log: SyncLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      status,
      message
    };
    return new Promise((resolve, reject) => {
      const request = store.put(log);
      request.onsuccess = () => resolve(log);
      request.onerror = () => reject(request.error);
    });
  },

  async getSyncLogs(): Promise<SyncLog[]> {
    const { store } = await getStore('sync_logs');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        // Sort logs descending by timestamp
        const sorted = (request.result || []).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        resolve(sorted.slice(0, 30)); // Top 30 logs
      };
      request.onerror = () => reject(request.error);
    });
  },

  async clearAllData(): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['drafts', 'reports', 'saved_totals', 'sync_logs'], 'readwrite');
      transaction.objectStore('drafts').clear();
      transaction.objectStore('reports').clear();
      transaction.objectStore('saved_totals').clear();
      transaction.objectStore('sync_logs').clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
};
