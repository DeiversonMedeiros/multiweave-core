// =====================================================
// SERVIÇO DE FILA OFFLINE - INDEXEDDB PURO
// =====================================================
// Versão: 1.0.0
// Descrição: Sistema robusto de fila offline usando IndexedDB puro
//            - Sem dependências pesadas
//            - Compatível com qualquer navegador moderno
//            - Transacional e confiável

const DB_NAME = 'erp_offline_db';
const STORE_NAME = 'time_records_queue';
const DB_VERSION = 1;

export interface OfflineRecord {
  id: string;
  payload: any;
  createdAt: string; // ISO UTC
  synced: boolean;
}

/**
 * Abre conexão com IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Criar object store se não existir
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        // Índice para buscar registros não sincronizados
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Salva registro offline na fila
 */
export async function saveOfflineRecord(payload: any): Promise<string> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const record: OfflineRecord = {
      id: crypto.randomUUID(),
      payload,
      createdAt: new Date().toISOString(),
      synced: false
    };

    const req = store.put(record);

    req.onsuccess = () => resolve(record.id);
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Busca registros pendentes de sincronização
 */
export async function getPendingRecords(): Promise<OfflineRecord[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('synced');
    const records: OfflineRecord[] = [];

    const req = index.openCursor(IDBKeyRange.only(false)); // false = não sincronizados

    req.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        records.push(cursor.value as OfflineRecord);
        cursor.continue();
      } else {
        // Ordenar por data de criação (mais antigos primeiro)
        records.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        resolve(records);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Marca registro como sincronizado
 */
export async function markAsSynced(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const req = store.get(id);

    req.onsuccess = () => {
      const record = req.result as OfflineRecord;
      if (record) {
        record.synced = true;
        const updateReq = store.put(record);
        updateReq.onsuccess = () => resolve();
        updateReq.onerror = () => reject(updateReq.error);
      } else {
        resolve(); // Já foi removido ou não existe
      }
    };

    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Remove registro sincronizado da fila
 */
export async function removeSyncedRecord(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Conta registros pendentes
 */
export async function countPendingRecords(): Promise<number> {
  const records = await getPendingRecords();
  return records.length;
}

/**
 * Limpa registros sincronizados antigos (mais de 7 dias)
 */
export async function cleanupOldSyncedRecords(): Promise<void> {
  const db = await openDB();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('createdAt');

    const req = index.openCursor(IDBKeyRange.upperBound(sevenDaysAgo.toISOString()));

    req.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
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

    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });
}
