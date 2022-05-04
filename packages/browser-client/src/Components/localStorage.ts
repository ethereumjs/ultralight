export function saveToLocalStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    console.log('something went wrong with local storage')
  }
}

export async function addToIndexedDB(type: string, key: string, value: any, db: IDBDatabase) {
  const request = db.transaction(type, 'readwrite').objectStore(type).add(value, key)
  request.onsuccess = () => {
    console.log('added to indexeddb')
    return request.result
  }
  request.onerror = () => {
    return
  }
}

export async function removeFromIndexedDB(type: string, key: string, db: IDBDatabase) {
  const request = db.transaction(type, 'readwrite').objectStore(type).delete(key)
  request.onsuccess = () => {
    console.log('removed from indexeddb')
    return request.result
  }
  request.onerror = () => {
    return
  }
}
