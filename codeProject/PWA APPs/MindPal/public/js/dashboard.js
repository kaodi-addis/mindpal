// public/js/dashboard.js
async function initDashboard() {
    try {
      // Show loading indicators
      document.getElementById('recent-notes').innerHTML = '<div class="loader"></div>';
      document.getElementById('upcoming-tasks').innerHTML = '<div class="loader"></div>';
      
      // Load recent notes
      const recentNotes = await window.NotesModule.getRecentNotes(3);
      renderRecentNotes(recentNotes);
      
      // Load upcoming tasks
      const upcomingTasks = await window.TasksModule.getUpcomingTasks(3);
      renderUpcomingTasks(upcomingTasks);
      
      // Setup quick action buttons
      setupQuickActions();
      
      // Check offline resources
      checkOfflineResources();
      
    } catch (error) {
      console.error('Failed to initialize dashboard:', error);
      showErrorMessage('Failed to load dashboard content. Please try again.');
    }
  }
  
  function renderRecentNotes(notes) {
    const container = document.getElementById('recent-notes');
    
    if (!container) return;
    
    if (notes.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No notes yet</p>
          <button id="create-note" class="btn-primary">Create Note</button>
        </div>
      `;
      return;
    }
    
    const notesHTML = notes.map(note => `
      <div class="card note-card" data-id="${note.id}">
        <h3 class="card-title">${escapeHTML(note.title || 'Untitled')}</h3>
        <p class="card-preview">${escapeHTML(getPreviewText(note.content))}</p>
        <div class="card-meta">
          <span class="card-date">${formatDate(note.lastModified)}</span>
        </div>
      </div>
    `).join('');
    
    container.innerHTML = `
      <div class="section-header">
        <h2>Recent Notes</h2>
        <a href="#" data-view="notes" class="view-all">View All</a>
      </div>
      <div class="cards-grid">
        ${notesHTML}
      </div>
    `;
    
    // Add event listeners
    container.querySelectorAll('.note-card').forEach(card => {
      card.addEventListener('click', () => {
        const noteId = parseInt(card.getAttribute('data-id'));
        window.NotesModule.create(noteId);
      });
    });
  }
  
  function renderUpcomingTasks(tasks) {
    const container = document.getElementById('upcoming-tasks');
    
    if (!container) return;
    
    if (tasks.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No upcoming tasks</p>
          <button id="create-task" class="btn-primary">Create Task</button>
        </div>
      `;
      return;
    }
    
    const tasksHTML = tasks.map(task => {
      const dueDate = task.dueDate ? new Date(task.dueDate) : null;
      const isPastDue = dueDate && dueDate < new Date();
      
      return `
        <div class="card task-card ${isPastDue ? 'past-due' : ''}" data-id="${task.id}">
          <h3 class="card-title">${escapeHTML(task.title)}</h3>
          ${task.description ? `<p class="card-preview">${escapeHTML(task.description.substring(0, 60) + (task.description.length > 60 ? '...' : ''))}</p>` : ''}
          <div class="card-meta">
            ${dueDate ? `
              <span class="card-date ${isPastDue ? 'past-due' : ''}">
                ${isPastDue ? 'Overdue: ' : 'Due: '}${formatDate(task.dueDate)}
              </span>
            ` : ''}
            ${task.priority ? `<span class="task-priority priority-${task.priority.toLowerCase()}">${task.priority}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');
    
    container.innerHTML = `
      <div class="section-header">
        <h2>Upcoming Tasks</h2>
        <a href="#" data-view="tasks" class="view-all">View All</a>
      </div>
      <div class="cards-grid">
        ${tasksHTML}
      </div>
    `;
    
    // Add event listeners
    container.querySelectorAll('.task-card').forEach(card => {
      card.addEventListener('click', () => {
        const taskId = parseInt(card.getAttribute('data-id'));
        window.TasksModule.create(taskId);
      });
    });
  }
  
  function setupQuickActions() {
    const quickActionsContainer = document.getElementById('quick-actions');
    
    if (!quickActionsContainer) return;
    
    quickActionsContainer.innerHTML = `
      <div class="section-header">
        <h2>Quick Actions</h2>
      </div>
      <div class="quick-actions-grid">
        <button id="quick-new-note" class="quick-action-btn">
          <i class="icon-note"></i>
          <span>New Note</span>
        </button>
        <button id="quick-new-task" class="quick-action-btn">
          <i class="icon-task"></i>
          <span>New Task</span>
        </button>
        <button id="quick-scan-qr" class="quick-action-btn">
          <i class="icon-qr"></i>
          <span>Scan QR</span>
        </button>
        <button id="quick-convert" class="quick-action-btn">
          <i class="icon-currency"></i>
          <span>Currency</span>
        </button>
        <button id="quick-meditate" class="quick-action-btn">
          <i class="icon-meditate"></i>
          <span>Meditate</span>
        </button>
        <button id="quick-password" class="quick-action-btn">
          <i class="icon-password"></i>
          <span>Password</span>
        </button>
      </div>
    `;
    
    // Add event listeners
    document.getElementById('quick-new-note').addEventListener('click', () => {
      window.NotesModule.create();
    });
    
    document.getElementById('quick-new-task').addEventListener('click', () => {
      window.TasksModule.create();
    });
    
    document.getElementById('quick-scan-qr').addEventListener('click', () => {
      loadView('utilities');
      // Delay to ensure view is loaded
      setTimeout(() => {
        window.UtilitiesModule.openQRScanner();
      }, 300);
    });
    
    document.getElementById('quick-convert').addEventListener('click', () => {
      loadView('utilities');
      // Delay to ensure view is loaded
      setTimeout(() => {
        window.UtilitiesModule.openCurrencyConverter();
      }, 300);
    });
    
    document.getElementById('quick-meditate').addEventListener('click', () => {
      loadView('wellness');
      // Delay to ensure view is loaded
      setTimeout(() => {
        window.WellnessModule.startMeditation();
      }, 300);
    });
    
    document.getElementById('quick-password').addEventListener('click', () => {
      loadView('utilities');
      // Delay to ensure view is loaded
      setTimeout(() => {
        window.UtilitiesModule.openPasswordGenerator();
      }, 300);
    });
  }
  
  async function checkOfflineResources() {
    const offlineResourcesContainer = document.getElementById('offline-resources');
    
    if (!offlineResourcesContainer) return;
    
    try {
      // Check if any media is available offline
      const offlineMedia = await window.MindPalDB.media.getAll();
      
      // Check if any meditation sessions are downloaded
      const offlineMeditations = offlineMedia.filter(item => item.type === 'meditation');
      
      // Check if any videos are downloaded
      const offlineVideos = offlineMedia.filter(item => item.type === 'video');
      
      if (offlineMedia.length === 0) {
        offlineResourcesContainer.innerHTML = `
          <div class="section-header">
            <h2>Offline Resources</h2>
          </div>
          <div class="empty-state">
            <p>No offline resources available</p>
            <button id="download-resources" class="btn-primary">Download Resources</button>
          </div>
        `;
        
        document.getElementById('download-resources').addEventListener('click', () => {
          loadView('media');
        });
        
        return;
      }
      
      let resourcesHTML = '';
      
      if (offlineMeditations.length > 0) {
        resourcesHTML += `
          <div class="offline-section">
            <h3>Meditation Sessions</h3>
            <div class="offline-items">
              ${offlineMeditations.map(item => `
                <div class="offline-item" data-id="${item.id}" data-type="meditation">
                  <span class="offline-item-title">${escapeHTML(item.title)}</span>
                  <span class="offline-item-meta">${formatFileSize(item.size)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
      
      if (offlineVideos.length > 0) {
        resourcesHTML += `
          <div class="offline-section">
            <h3>Videos</h3>
            <div class="offline-items">
              ${offlineVideos.map(item => `
                <div class="offline-item" data-id="${item.id}" data-type="video">
                  <span class="offline-item-title">${escapeHTML(item.title)}</span>
                  <span class="offline-item-meta">${formatFileSize(item.size)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
      
      offlineResourcesContainer.innerHTML = `
        <div class="section-header">
          <h2>Offline Resources</h2>
          <a href="#" data-view="media" class="view-all">Manage</a>
        </div>
        ${resourcesHTML}
      `;
      
      // Add event listeners for offline items
      offlineResourcesContainer.querySelectorAll('.offline-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = parseInt(item.getAttribute('data-id'));
          const type = item.getAttribute('data-type');
          
          if (type === 'meditation') {
            loadView('wellness');
            // Delay to ensure view is loaded
            setTimeout(() => {
              window.WellnessModule.playMeditation(id);
            }, 300);
          } else if (type === 'video') {
            loadView('media');
            // Delay to ensure view is loaded
            setTimeout(() => {
              window.MediaModule.playVideo(id);
            }, 300);
          }
        });
      });
    } catch (error) {
      console.error('Failed to check offline resources:', error);
      offlineResourcesContainer.innerHTML = `
        <div class="section-header">
          <h2>Offline Resources</h2>
        </div>
        <div class="error-message">
          <p>Failed to load offline resources</p>
        </div>
      `;
    }
  }
  
  // Helper function to format file size
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  // Helper functions
  function getPreviewText(content) {
    if (!content) return '';
    // Strip HTML tags and get first 100 characters
    return content.replace(/<[^>]*>/g, '').substring(0, 60) + 
      (content.length > 60 ? '...' : '');
  }
  
  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], {weekday: 'long'});
    } else {
      return date.toLocaleDateString();
    }
  }
  
  // Export functions
  window.DashboardModule = {
    init: initDashboard,
    refresh: initDashboard
  };