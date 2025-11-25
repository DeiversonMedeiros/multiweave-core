import { useState, useEffect, useCallback } from 'react';

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
      console.log('[OFFLINE-DB] init start');
      return new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => { console.error('[OFFLINE-DB] init error:', request.error); reject(request.error); };
        request.onsuccess = () => { console.log('[OFFLINE-DB] init success'); resolve(request.result); };

        request.onupgradeneeded = (event) => {
          const database = (event.target as IDBOpenDBRequest).result;
          if (!database.objectStoreNames.contains(STORE_NAME)) {
            const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('type', 'type', { unique: false });
            store.createIndex('synced', 'synced', { unique: false });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            console.log('[OFFLINE-DB] store and indexes created');
          }
        };
      });
    };

    initDB()
      .then((database) => {
        setDb(database);
        setIsReady(true);
        console.log('[OFFLINE-DB] ready');
      })
      .catch((error) => {
        console.error('[OFFLINE-DB] fatal init error:', error);
      });
  }, []);

  // Salvar registro offline
  const saveOfflineRecord = useCallback(async (type: string, data: any): Promise<string> => {
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

      request.onsuccess = () => { console.log('[OFFLINE-DB] saved record:', id, type); resolve(id); };
      request.onerror = () => { console.error('[OFFLINE-DB] save error:', request.error); reject(request.error); };
    });
  }, [db]);

  // Buscar registros offline
  const getOfflineRecords = useCallback(async (type?: string): Promise<OfflineRecord[]> => {
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
        console.log('[OFFLINE-DB] getOfflineRecords:', { type, count: records.length });
        resolve(records);
      };
      request.onerror = () => { console.error('[OFFLINE-DB] get error:', request.error); reject(request.error); };
    });
  }, [db]);

  // Marcar registro como sincronizado
  const markAsSynced = useCallback(async (id: string): Promise<void> => {
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
          updateRequest.onsuccess = () => { console.log('[OFFLINE-DB] marked synced:', id); resolve(); };
          updateRequest.onerror = () => { console.error('[OFFLINE-DB] mark synced error:', updateRequest.error); reject(updateRequest.error); };
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => { console.error('[OFFLINE-DB] get by id error:', getRequest.error); reject(getRequest.error); };
    });
  }, [db]);

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
