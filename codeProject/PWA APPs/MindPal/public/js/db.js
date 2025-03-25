// public/js/db.js
const DB_NAME = 'mindpal-db';
const DB_VERSION = 1;
let db;

// Initialize the database
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = event => {
      reject('Database error: ' + event.target.errorCode);
    };
    
    request.onsuccess = event => {
      db = event.target.result;
      resolve(db);
    };
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      
      // Notes store
      if (!db.objectStoreNames.contains('notes')) {
        const notesStore = db.createObjectStore('notes', { keyPath: 'id', autoIncrement: true });
        notesStore.createIndex('title', 'title', { unique: false });
        notesStore.createIndex('dateCreated', 'dateCreated', { unique: false });
        notesStore.createIndex('lastModified', 'lastModified', { unique: false });
        notesStore.createIndex('syncStatus', 'syncStatus', { unique: false });
      }
      
      // Tasks store
      if (!db.objectStoreNames.contains('tasks')) {
        const tasksStore = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
        tasksStore.createIndex('title', 'title', { unique: false });
        tasksStore.createIndex('dueDate', 'dueDate', { unique: false });
        tasksStore.createIndex('priority', 'priority', { unique: false });
        tasksStore.createIndex('completed', 'completed', { unique: false });
        tasksStore.createIndex('syncStatus', 'syncStatus', { unique: false });
      }
      
      // Media store
      if (!db.objectStoreNames.contains('media')) {
        const mediaStore = db.createObjectStore('media', { keyPath: 'id', autoIncrement: true });
        mediaStore.createIndex('title', 'title', { unique: false });
        mediaStore.createIndex('type', 'type', { unique: false });
        mediaStore.createIndex('blobUrl', 'blobUrl', { unique: false });
      }
      
      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
  });
}

// CRUD operations for notes
function addNote(note) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['notes'], 'readwrite');
    const store = transaction.objectStore('notes');
    
    note.syncStatus = navigator.onLine ? 'synced' : 'pending';
    note.dateCreated = new Date().toISOString();
    note.lastModified = new Date().toISOString();
    
    const request = store.add(note);
    
    request.onsuccess = event => {
      const noteId = event.target.result;
      resolve(noteId);
    };
    
    request.onerror = event => {
      reject('Error adding note: ' + event.target.error);
    };
  });
}

function getAllNotes() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['notes'], 'readonly');
    const store = transaction.objectStore('notes');
    const request = store.getAll();
    
    request.onsuccess = event => {
      resolve(event.target.result);
    };
    
    request.onerror = event => {
      reject('Error getting notes: ' + event.target.error);
    };
  });
}

function getNoteById(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['notes'], 'readonly');
    const store = transaction.objectStore('notes');
    const request = store.get(id);
    
    request.onsuccess = event => {
      resolve(event.target.result);
    };
    
    request.onerror = event => {
      reject('Error getting note: ' + event.target.error);
    };
  });
}

function updateNote(id, updatedNote) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['notes'], 'readwrite');
    const store = transaction.objectStore('notes');
    
    updatedNote.lastModified = new Date().toISOString();
    updatedNote.syncStatus = navigator.onLine ? 'synced' : 'pending';
    
    const request = store.put(updatedNote);
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = event => {
      reject('Error updating note: ' + event.target.error);
    };
  });
}

function deleteNote(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['notes'], 'readwrite');
    const store = transaction.objectStore('notes');
    const request = store.delete(id);
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = event => {
      reject('Error deleting note: ' + event.target.error);
    };
  });
}

// Export the database functions
window.MindPalDB = {
  init: initDB,
  notes: {
    add: addNote,
    getAll: getAllNotes,
    getById: getNoteById,
    update: updateNote,
    delete: deleteNote
  },
  tasks: {
    // Task CRUD operations
  },
  media: {
    // Media CRUD operations
  },
  settings: {
    // Settings operations
    get: function(key) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['settings'], 'readonly');
        const store = transaction.objectStore('settings');
        const request = store.get(key);
        
        request.onsuccess = event => {
          resolve(event.target.result ? event.target.result.value : null);
        };
        
        request.onerror = event => {
          reject('Error getting setting: ' + event.target.error);
        };
      });
    },
    set: function(key, value) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['settings'], 'readwrite');
        const store = transaction.objectStore('settings');
        const request = store.put({key, value});
        
        request.onsuccess = () => {
          resolve();
        };
        
        request.onerror = event => {
          reject('Error setting setting: ' + event.target.error);
        };
      });
    }
  }
};

// API simulation layer
window.ApiSimulator = {
  // Simulate network delay for realistic behavior
  delay: async (ms = 300) => {
    if (navigator.onLine) {
      await new Promise(resolve => setTimeout(resolve, ms));
    }
    return true;
  },
  
  // Notes API
  notes: {
    async getAll() {
      await this.delay();
      return window.MindPalDB.notes.getAll();
    },
    
    async create(note) {
      await this.delay();
      const id = await window.MindPalDB.notes.add(note);
      return { ...note, id, synced: true };
    },
    
    async update(id, note) {
      await this.delay();
      await window.MindPalDB.notes.update(id, note);
      return { ...note, id, synced: true };
    },
    
    async delete(id) {
      await this.delay();
      await window.MindPalDB.notes.delete(id);
      return { success: true };
    }
  },
  
  // Tasks API - similar structure
  tasks: {
    // Similar methods as notes
    async getAll() {
      await this.delay();
      return window.MindPalDB.tasks.getAll();
    },
    
    async create(task) {
      await this.delay();
      const id = await window.MindPalDB.tasks.add(task);
      return { ...task, id, synced: true };
    },
    
    async update(id, task) {
      await this.delay();
      await window.MindPalDB.tasks.update(id, task);
      return { ...task, id, synced: true };
    },
    
    async delete(id) {
      await this.delay();
      await window.MindPalDB.tasks.delete(id);
      return { success: true };
    }
  },
  
  // Currency API simulation with fallback data
  currency: {
    async getExchangeRates() {
      await this.delay();
      
      if (navigator.onLine) {
        try {
          // Try to fetch real data when online
          const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
          if (response.ok) {
            const data = await response.json();
            // Store in IndexedDB for offline use
            await window.MindPalDB.settings.set('currency_data', data);
            await window.MindPalDB.settings.set('currency_last_updated', new Date().toISOString());
            return data;
          }
        } catch (error) {
          console.error('Failed to fetch currency data:', error);
        }
      }
      
      // Return cached data or fallback
      const cachedData = await window.MindPalDB.settings.get('currency_data');
      return cachedData || getFallbackCurrencyData();
    }
  }
};

// Fallback currency data function
function getFallbackCurrencyData() {
  return {
    base: "USD",
    date: "2023-05-01",
    rates: {
      EUR: 0.91,
      GBP: 0.80,
      JPY: 136.5,
      // Add more currencies as needed
    }
  };
}
