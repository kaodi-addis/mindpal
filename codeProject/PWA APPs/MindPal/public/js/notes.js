// public/js/notes.js
function initNotesView() {
    // Load notes from IndexedDB
    loadNotes();
    
    // Setup event listeners
    setupNoteEventListeners();
  }
  
  async function loadNotes() {
    try {
      const notes = await window.MindPalDB.notes.getAll();
      renderNotesList(notes);
    } catch (error) {
      console.error('Failed to load notes:', error);
      showErrorMessage('Failed to load notes. Please try again.');
    }
  }
  
  function renderNotesList(notes) {
    const notesContainer = document.getElementById('notes-list');
    
    if (!notesContainer) return;
    
    if (notes.length === 0) {
      notesContainer.innerHTML = `
        <div class="empty-state">
          <h3>No notes yet</h3>
          <p>Create your first note to get started.</p>
          <button id="create-first-note" class="btn-primary">Create Note</button>
        </div>
      `;
      
      // Add event listener for the create button
      const createButton = document.getElementById('create-first-note');
      if (createButton) {
        createButton.addEventListener('click', openNoteEditor);
      }
      
      return;
    }
    
    // Sort notes by last modified date (newest first)
    notes.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    
    // Create HTML for notes list
    const notesHTML = notes.map(note => `
      <div class="note-card" data-id="${note.id}">
        <h3 class="note-title">${escapeHTML(note.title || 'Untitled')}</h3>
        <p class="note-preview">${escapeHTML(getPreviewText(note.content))}</p>
        <div class="note-meta">
          <span class="note-date">${formatDate(note.lastModified)}</span>
          ${note.syncStatus === 'pending' ? '<span class="sync-pending">Not synced</span>' : ''}
        </div>
        <div class="note-actions">
          <button class="btn-edit" data-id="${note.id}">Edit</button>
          <button class="btn-delete" data-id="${note.id}">Delete</button>
        </div>
      </div>
    `).join('');
    
    notesContainer.innerHTML = `
      <div class="notes-header">
        <h2>My Notes</h2>
        <button id="new-note" class="btn-primary">New Note</button>
      </div>
      <div class="notes-grid">
        ${notesHTML}
      </div>
    `;
    
    // Add event listeners
    setupNoteCardEventListeners();
  }
  
  function setupNoteEventListeners() {
    // New note button
    document.addEventListener('click', event => {
      if (event.target.id === 'new-note') {
        openNoteEditor();
      }
    });
    
    // Search functionality
    const searchInput = document.getElementById('search-notes');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(searchNotes, 300));
    }
  }
  
  function setupNoteCardEventListeners() {
    // Edit note
    document.querySelectorAll('.btn-edit').forEach(button => {
      button.addEventListener('click', event => {
        const noteId = parseInt(event.target.getAttribute('data-id'));
        openNoteEditor(noteId);
      });
    });
    
    // Delete note
    document.querySelectorAll('.btn-delete').forEach(button => {
      button.addEventListener('click', event => {
        const noteId = parseInt(event.target.getAttribute('data-id'));
        confirmDeleteNote(noteId);
      });
    });
    
    // Note card click (open note)
    document.querySelectorAll('.note-card').forEach(card => {
      card.addEventListener('click', event => {
        // Only trigger if not clicking on a button
        if (!event.target.classList.contains('btn-edit') && 
            !event.target.classList.contains('btn-delete')) {
          const noteId = parseInt(card.getAttribute('data-id'));
          openNoteEditor(noteId);
        }
      });
    });
  }
  
  async function openNoteEditor(noteId = null) {
    const editorContainer = document.getElementById('note-editor-container');
    
    if (!editorContainer) {
      console.error('Editor container not found');
      return;
    }
    
    let note = { title: '', content: '', tags: [] };
    
    if (noteId) {
      try {
        note = await window.MindPalDB.notes.getById(noteId);
      } catch (error) {
        console.error('Failed to load note:', error);
        showErrorMessage('Failed to load note. Please try again.');
        return;
      }
    }
    
    // Create editor HTML
    editorContainer.innerHTML = `
      <div class="editor-overlay"></div>
      <div class="editor-panel">
        <div class="editor-header">
          <h2>${noteId ? 'Edit Note' : 'New Note'}</h2>
          <button id="close-editor" class="btn-close">&times;</button>
        </div>
        <div class="editor-body">
          <input type="text" id="note-title" placeholder="Title" value="${escapeHTML(note.title)}">
          <div class="editor-toolbar">
            <button data-format="bold" title="Bold"><b>B</b></button>
            <button data-format="italic" title="Italic"><i>I</i></button>
            <button data-format="underline" title="Underline"><u>U</u></button>
            <button data-format="insertUnorderedList" title="Bullet List">•</button>
            <button data-format="insertOrderedList" title="Numbered List">1.</button>
          </div>
          <div id="note-content" class="content-editable" contenteditable="true">${note.content}</div>
          <div class="tags-container">
            <label>Tags:</label>
            <input type="text" id="note-tags" placeholder="Add tags (comma separated)" 
              value="${note.tags ? note.tags.join(', ') : ''}">
          </div>
        </div>
        <div class="editor-footer">
          <button id="save-note" class="btn-primary" data-id="${noteId || ''}">Save Note</button>
          <button id="cancel-edit" class="btn-secondary">Cancel</button>
        </div>
      </div>
    `;
    
    // Show editor
    editorContainer.classList.add('active');
    
    // Focus title input
    document.getElementById('note-title').focus();
    
    // Setup editor event listeners
    setupEditorEventListeners(noteId);
  }
  
  // Other note functions (save, delete, search, etc.)
  // ...
  
  // Helper functions
  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  function getPreviewText(content) {
    if (!content) return '';
    // Strip HTML tags and get first 100 characters
    return content.replace(/<[^>]*>/g, '').substring(0, 100) + 
    (content.length > 100 ? '...' : '');
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today at ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], {weekday: 'long'});
  } else {
    return date.toLocaleDateString();
  }
}

function debounce(func, delay) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

function setupEditorEventListeners(noteId) {
  // Close button
  document.getElementById('close-editor').addEventListener('click', closeNoteEditor);
  document.getElementById('cancel-edit').addEventListener('click', closeNoteEditor);
  
  // Save button
  document.getElementById('save-note').addEventListener('click', () => saveNote(noteId));
  
  // Formatting buttons
  document.querySelectorAll('.editor-toolbar button').forEach(button => {
    button.addEventListener('click', () => {
      const format = button.getAttribute('data-format');
      document.execCommand(format, false, null);
      document.getElementById('note-content').focus();
    });
  });
  
  // Auto-save timer
  let autoSaveTimer;
  const contentElement = document.getElementById('note-content');
  
  contentElement.addEventListener('input', () => {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      // Only auto-save if it's an existing note
      if (noteId) {
        saveNote(noteId, true);
      }
    }, 3000); // Auto-save after 3 seconds of inactivity
  });
  
  // Close on overlay click
  document.querySelector('.editor-overlay').addEventListener('click', closeNoteEditor);
  
  // Prevent closing when clicking inside the editor panel
  document.querySelector('.editor-panel').addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

async function saveNote(noteId, isAutoSave = false) {
  const titleElement = document.getElementById('note-title');
  const contentElement = document.getElementById('note-content');
  const tagsElement = document.getElementById('note-tags');
  
  if (!titleElement || !contentElement) {
    console.error('Editor elements not found');
    return;
  }
  
  const title = titleElement.value.trim() || 'Untitled';
  const content = contentElement.innerHTML;
  const tags = tagsElement.value.split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
  
  try {
    if (noteId) {
      // Update existing note
      await window.MindPalDB.notes.update(noteId, {
        title,
        content,
        tags,
        lastModified: new Date().toISOString()
      });
    } else {
      // Create new note
      noteId = await window.MindPalDB.notes.add({
        title,
        content,
        tags,
        dateCreated: new Date().toISOString(),
        lastModified: new Date().toISOString()
      });
    }
    
    if (!isAutoSave) {
      closeNoteEditor();
      loadNotes(); // Refresh the notes list
      showMessage('Note saved successfully');
    } else {
      // Show subtle auto-save indicator
      const saveIndicator = document.createElement('div');
      saveIndicator.className = 'auto-save-indicator';
      saveIndicator.textContent = 'Auto-saved';
      document.querySelector('.editor-footer').prepend(saveIndicator);
      
      // Remove the indicator after a short time
      setTimeout(() => {
        saveIndicator.remove();
      }, 2000);
    }
  } catch (error) {
    console.error('Failed to save note:', error);
    showErrorMessage('Failed to save note. Please try again.');
  }
}

function closeNoteEditor() {
  const editorContainer = document.getElementById('note-editor-container');
  if (editorContainer) {
    editorContainer.classList.remove('active');
  }
}

function confirmDeleteNote(noteId) {
  if (confirm('Are you sure you want to delete this note? This cannot be undone.')) {
    deleteNote(noteId);
  }
}

async function deleteNote(noteId) {
  try {
    await window.MindPalDB.notes.delete(noteId);
    loadNotes(); // Refresh the notes list
    showMessage('Note deleted successfully');
  } catch (error) {
    console.error('Failed to delete note:', error);
    showErrorMessage('Failed to delete note. Please try again.');
  }
}

async function searchNotes(event) {
  const searchTerm = event.target.value.toLowerCase();
  
  try {
    const allNotes = await window.MindPalDB.notes.getAll();
    
    if (searchTerm === '') {
      renderNotesList(allNotes);
      return;
    }
    
    const filteredNotes = allNotes.filter(note => {
      const titleMatch = note.title.toLowerCase().includes(searchTerm);
      const contentMatch = note.content.toLowerCase().includes(searchTerm);
      const tagMatch = note.tags && note.tags.some(tag => 
        tag.toLowerCase().includes(searchTerm)
      );
      
      return titleMatch || contentMatch || tagMatch;
    });
    
    renderNotesList(filteredNotes);
  } catch (error) {
    console.error('Search failed:', error);
  }
}

// Show notification messages
function showMessage(message) {
  const notification = document.createElement('div');
  notification.className = 'notification success';
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 2000);
  }, 10);
}

function showErrorMessage(message) {
  const notification = document.createElement('div');
  notification.className = 'notification error';
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }, 10);
}

// Export functions for use in other modules
window.NotesModule = {
  init: initNotesView,
  load: loadNotes,
  create: openNoteEditor,
  getRecentNotes: async function(limit = 3) {
    try {
      const notes = await window.MindPalDB.notes.getAll();
      return notes
        .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get recent notes:', error);
      return [];
    }
  }
};