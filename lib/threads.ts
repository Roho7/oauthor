import type { OAuthorMessage } from "./tools";

export const HOME_THREAD = "_home";

const DB_NAME = "oauthor";
const STORE = "threads";

let db: Promise<IDBDatabase> | undefined;

function openDb(): Promise<IDBDatabase> {
  db ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return db;
}

async function run<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const store = (await openDb()).transaction(STORE, mode).objectStore(STORE);
  return new Promise((resolve, reject) => {
    const req = op(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadThread(key: string): Promise<OAuthorMessage[]> {
  try {
    return ((await run("readonly", (s) => s.get(key))) as OAuthorMessage[] | undefined) ?? [];
  } catch {
    return [];
  }
}

function conversationOnly(messages: OAuthorMessage[]): OAuthorMessage[] {
  return messages.flatMap((m) => {
    const parts = m.parts.flatMap((p) => (p.type === "text" && p.text.trim() ? [{ type: "text" as const, text: p.text }] : []));
    return parts.length ? [{ id: m.id, role: m.role, parts }] : [];
  });
}

export async function saveThread(key: string, messages: OAuthorMessage[]): Promise<void> {
  try {
    await run("readwrite", (s) => s.put(conversationOnly(messages), key));
  } catch {}
}

export async function moveThread(from: string, to: string, messages: OAuthorMessage[]): Promise<void> {
  await saveThread(to, messages);
  try {
    await run("readwrite", (s) => s.delete(from));
  } catch {}
}
