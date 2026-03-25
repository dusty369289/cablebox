/**
 * IndexedDB storage for local video file blobs.
 * Separate database from channel metadata to avoid migration complexity.
 */

const DB_NAME = 'cablebox-blobs';
const DB_VERSION = 1;
const STORE_NAME = 'video-blobs';

function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME);
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

export async function saveVideoBlob(videoId: string, blob: Blob): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readwrite');
		tx.objectStore(STORE_NAME).put(blob, videoId);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function getVideoBlob(videoId: string): Promise<Blob | null> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readonly');
		const request = tx.objectStore(STORE_NAME).get(videoId);
		request.onsuccess = () => resolve(request.result ?? null);
		request.onerror = () => reject(request.error);
	});
}

export async function deleteVideoBlob(videoId: string): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readwrite');
		tx.objectStore(STORE_NAME).delete(videoId);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function deleteVideoBlobsByIds(videoIds: string[]): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readwrite');
		const store = tx.objectStore(STORE_NAME);
		for (const id of videoIds) {
			store.delete(id);
		}
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function getStorageEstimate(): Promise<{ used: number; quota: number } | null> {
	if (!navigator.storage?.estimate) return null;
	const est = await navigator.storage.estimate();
	return { used: est.usage ?? 0, quota: est.quota ?? 0 };
}
