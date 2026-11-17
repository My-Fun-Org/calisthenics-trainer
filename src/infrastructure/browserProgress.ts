import initSqlJs, { type Database } from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm-browser.wasm?url";
import {
  ensureSchema,
  isBlankProgress,
  persistedFields,
  readProgress,
  writeProgress,
} from "./progressDb";
import { loadState, saveState, STORAGE_KEY, type PersistedState } from "./storage";

const IDB_NAME = "calisthenics.progress";
const IDB_STORE = "files";
const IDB_KEY = "progress.sqlite";

let opening: Promise<Database> | null = null;

export async function loadProgress(): Promise<PersistedState> {
  const db = await database();
  return readProgress(db);
}

export async function saveProgress(state: PersistedState): Promise<void> {
  const persisted = persistedFields(state);
  try {
    const db = await database();
    writeProgress(db, persisted);
    await storeBytes(db.export());
  } catch {
    saveState(persisted);
  }
}

async function database(): Promise<Database> {
  opening ??= createDatabase();
  return opening;
}

async function createDatabase(): Promise<Database> {
  const SQL = await initSqlJs({
    locateFile: () => wasmUrl,
  });
  const bytes = await readBytes();
  const db = bytes ? new SQL.Database(bytes) : new SQL.Database();
  ensureSchema(db);
  const stored = readProgress(db);
  if (!isBlankProgress(stored)) {
    return db;
  }
  const legacy = loadState();
  if (isBlankProgress(legacy)) {
    return db;
  }
  writeProgress(db, legacy);
  await storeBytes(db.export());
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // The SQLite copy is already saved. Leaving the old key is harmless on the next load.
  }
  return db;
}

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the progress database"));
  });
}

async function readBytes(): Promise<Uint8Array | null> {
  const db = await openIndexedDb();
  try {
    const stored = await requestResult<Blob | ArrayBuffer | Uint8Array | undefined>(
      db.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).get(IDB_KEY),
    );
    if (!stored) {
      return null;
    }
    if (stored instanceof Blob) {
      return new Uint8Array(await stored.arrayBuffer());
    }
    if (stored instanceof ArrayBuffer) {
      return new Uint8Array(stored);
    }
    return stored;
  } finally {
    db.close();
  }
}

async function storeBytes(bytes: Uint8Array): Promise<void> {
  const db = await openIndexedDb();
  try {
    const file = new Blob([Uint8Array.from(bytes)]);
    await requestResult(db.transaction(IDB_STORE, "readwrite").objectStore(IDB_STORE).put(file, IDB_KEY));
  } finally {
    db.close();
  }
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Progress database request failed"));
  });
}
