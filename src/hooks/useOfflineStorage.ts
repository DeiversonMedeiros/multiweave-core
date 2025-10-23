import { useState, useEffect } from 'react';

interface OfflineRecord {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  synced: boolean;
}

const DB_NAME = 'PortalColaboradorOffline';
const DB_VERSION = 1;
const STORE_NAME = 'records';

export function useOfflineStorage() {
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Inicializar IndexedDB
  useEffect(() => {
    const initDB = async () => {
      return new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
          const database = (event.target as IDBOpenDBRequest).result;
          if (!database.objectStoreNames.contains(STORE_NAME)) {
            const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('type', 'type', { unique: false });
            store.createIndex('synced', 'synced', { unique: false });
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };
      });
    };

    initDB()
      .then((database) => {
        setDb(database);
        setIsReady(true);
      })
      .catch((error) => {
        console.error('Erro ao inicializar IndexedDB:', error);
      });
  }, []);

  // Salvar registro offline
  const saveOfflineRecord = async (type: string, data: any): Promise<string> => {
    if (!db) throw new Error('Database not initialized');

    const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const record: OfflineRecord = {
      id,
      type,
      data,
      timestamp: Date.now(),
      synced: false
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(record);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  };

  // Buscar registros offline
  const getOfflineRecords = async (type?: string): Promise<OfflineRecord[]> => {
    if (!db) return [];

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        let records = request.result as OfflineRecord[];
        if (type) {
          records = records.filter(record => record.type === type);
        }
        resolve(records);
      };
      request.onerror = () => reject(request.error);
    });
  };

  // Marcar registro como sincronizado
  const markAsSynced = async (id: string): Promise<void> => {
    if (!db) return;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (record) {
          record.synced = true;
          const updateRequest = store.put(record);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  };

  // Remover registros sincronizados antigos
  const cleanupSyncedRecords = async (olderThanDays: number = 7): Promise<void> => {
    if (!db) return;

    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(cutoffTime);
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const record = cursor.value as OfflineRecord;
          if (record.synced) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  };

  return {
    isReady,
    saveOfflineRecord,
    getOfflineRecords,
    markAsSynced,
    cleanupSyncedRecords
  };
}
