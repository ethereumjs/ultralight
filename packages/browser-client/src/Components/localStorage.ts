export function saveToLocalStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    console.log('something went wrong with local storage')
  }
}

