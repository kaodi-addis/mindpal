// public/js/tasks.js
function initTasksView() {
    // Load tasks from IndexedDB
    loadTasks();
    
    /// Setup event listeners
  setupTaskEventListeners();
}

async function loadTasks() {
  try {
    const tasks = await window.MindPalDB.tasks.getAll();
    renderTasksList(tasks);
  } catch (error) {
    console.error('Failed to load tasks:', error);
    showErrorMessage('Failed to load tasks. Please try again.');
  }
}

function renderTasksList(tasks) {
  const tasksContainer = document.getElementById('tasks-list');
  
  if (!tasksContainer) return;
  
  if (tasks.length === 0) {
    tasksContainer.innerHTML = `
      <div class="empty-state">
        <h3>No tasks yet</h3>
        <p>Create your first task to get started.</p>
        <button id="create-first-task" class="btn-primary">Create Task</button>
      </div>
    `;
    
    // Add event listener for the create button
    const createButton = document.getElementById('create-first-task');
    if (createButton) {
      createButton.addEventListener('click', openTaskEditor);
    }
    
    return;
  }
  
  // Group tasks by completion status
  const pendingTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);
  
  // Sort pending tasks by due date (closest first)
  pendingTasks.sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });
  
  // Sort completed tasks by completion date (most recent first)
  completedTasks.sort((a, b) => {
    if (!a.completedDate) return 1;
    if (!b.completedDate) return -1;
    return new Date(b.completedDate) - new Date(a.completedDate);
  });
  
  // Create HTML for tasks lists
  const pendingTasksHTML = pendingTasks.map(task => createTaskHTML(task)).join('');
  const completedTasksHTML = completedTasks.map(task => createTaskHTML(task)).join('');
  
  tasksContainer.innerHTML = `
    <div class="tasks-header">
      <h2>My Tasks</h2>
      <button id="new-task" class="btn-primary">New Task</button>
    </div>
    
    <div class="tasks-sections">
      <div class="tasks-section pending-tasks">
        <h3>Pending Tasks (${pendingTasks.length})</h3>
        <div class="tasks-grid">
          ${pendingTasksHTML || '<p class="empty-list">No pending tasks</p>'}
        </div>
      </div>
      
      <div class="tasks-section completed-tasks">
        <h3>Completed Tasks (${completedTasks.length})</h3>
        <div class="tasks-grid">
          ${completedTasksHTML || '<p class="empty-list">No completed tasks</p>'}
        </div>
      </div>
    </div>
  `;
  
  // Add event listeners
  setupTaskCardEventListeners();
}

function createTaskHTML(task) {
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isPastDue = dueDate && !task.completed && dueDate < new Date();
  
  return `
    <div class="task-card ${task.completed ? 'completed' : ''} ${isPastDue ? 'past-due' : ''}" 
         data-id="${task.id}">
      <div class="task-checkbox">
        <input type="checkbox" id="task-${task.id}" ${task.completed ? 'checked' : ''}>
        <label for="task-${task.id}"></label>
      </div>
      <div class="task-content">
        <h3 class="task-title">${escapeHTML(task.title)}</h3>
        ${task.description ? `<p class="task-description">${escapeHTML(task.description)}</p>` : ''}
        <div class="task-meta">
          ${dueDate ? `
            <span class="task-due-date ${isPastDue ? 'past-due' : ''}">
              ${isPastDue ? 'Overdue: ' : 'Due: '}${formatDate(task.dueDate)}
            </span>
          ` : ''}
          ${task.priority ? `<span class="task-priority priority-${task.priority.toLowerCase()}">${task.priority}</span>` : ''}
          ${task.syncStatus === 'pending' ? '<span class="sync-pending">Not synced</span>' : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="btn-edit" data-id="${task.id}">Edit</button>
        <button class="btn-delete" data-id="${task.id}">Delete</button>
      </div>
    </div>
  `;
}

function setupTaskEventListeners() {
  // New task button
  document.addEventListener('click', event => {
    if (event.target.id === 'new-task') {
      openTaskEditor();
    }
  });
  
  // Filter functionality
  const filterSelect = document.getElementById('filter-tasks');
  if (filterSelect) {
    filterSelect.addEventListener('change', filterTasks);
  }
}

function setupTaskCardEventListeners() {
  // Task completion toggle
  document.querySelectorAll('.task-checkbox input').forEach(checkbox => {
    checkbox.addEventListener('change', event => {
      const taskId = parseInt(event.target.closest('.task-card').getAttribute('data-id'));
      toggleTaskCompletion(taskId, event.target.checked);
    });
  });
  
  // Edit task
  document.querySelectorAll('.btn-edit').forEach(button => {
    button.addEventListener('click', event => {
      const taskId = parseInt(event.target.getAttribute('data-id'));
      openTaskEditor(taskId);
    });
  });
  
  // Delete task
  document.querySelectorAll('.btn-delete').forEach(button => {
    button.addEventListener('click', event => {
      const taskId = parseInt(event.target.getAttribute('data-id'));
      confirmDeleteTask(taskId);
    });
  });
  
  // Task card click (open task)
  document.querySelectorAll('.task-card').forEach(card => {
    card.addEventListener('click', event => {
      // Only trigger if not clicking on a button or checkbox
      if (!event.target.classList.contains('btn-edit') && 
          !event.target.classList.contains('btn-delete') &&
          !event.target.closest('.task-checkbox')) {
        const taskId = parseInt(card.getAttribute('data-id'));
        openTaskEditor(taskId);
      }
    });
  });
  
  // Enable drag and drop for tasks (if not on mobile)
  if (window.innerWidth > 768) {
    enableDragAndDrop();
  }
}

function enableDragAndDrop() {
  const taskCards = document.querySelectorAll('.task-card');
  
  taskCards.forEach(card => {
    card.setAttribute('draggable', 'true');
    
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', card.getAttribute('data-id'));
      card.classList.add('dragging');
    });
    
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });
  });
  
  const dropZones = document.querySelectorAll('.tasks-grid');
  
  dropZones.forEach(zone => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });
    
    zone.addEventListener('dragleave', () => {
        zone.classList.remove('drag-over');
    });
    
    zone.addEventListener('drop', async (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      
      const taskId = parseInt(e.dataTransfer.getData('text/plain'));
      const targetSection = zone.closest('.tasks-section');
      const isCompletedSection = targetSection.classList.contains('completed-tasks');
      
      // Update task completion status
      await toggleTaskCompletion(taskId, isCompletedSection);
    });
  });
}

async function toggleTaskCompletion(taskId, completed) {
  try {
    const task = await window.MindPalDB.tasks.getById(taskId);
    
    const updatedTask = {
      ...task,
      completed,
      completedDate: completed ? new Date().toISOString() : null,
      syncStatus: navigator.onLine ? 'synced' : 'pending'
    };
    
    await window.MindPalDB.tasks.update(taskId, updatedTask);
    
    // Sync with server if online
    if (navigator.onLine) {
      fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(updatedTask)
      })
      .catch(err => {
        console.error('Failed to sync task:', err);
        // Mark for future sync
        window.MindPalDB.tasks.update(taskId, {
          ...updatedTask,
          syncStatus: 'pending'
        });
      });
    } else if ('serviceWorker' in navigator && 'SyncManager' in window) {
      // Register for background sync when back online
      navigator.serviceWorker.ready
        .then(registration => registration.sync.register('sync-tasks'));
    }
    
    // Refresh the tasks list
    loadTasks();
  } catch (error) {
    console.error('Failed to update task:', error);
    showErrorMessage('Failed to update task. Please try again.');
  }
}

async function openTaskEditor(taskId = null) {
  const editorContainer = document.getElementById('task-editor-container');
  
  if (!editorContainer) {
    console.error('Editor container not found');
    return;
  }
  
  let task = { title: '', description: '', dueDate: '', priority: 'Medium' };
  
  if (taskId) {
    try {
      task = await window.MindPalDB.tasks.getById(taskId);
    } catch (error) {
      console.error('Failed to load task:', error);
      showErrorMessage('Failed to load task. Please try again.');
      return;
    }
  }
  
  // Format due date for input field
  const dueDateFormatted = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';
  
  // Create editor HTML
  editorContainer.innerHTML = `
    <div class="editor-overlay"></div>
    <div class="editor-panel">
      <div class="editor-header">
        <h2>${taskId ? 'Edit Task' : 'New Task'}</h2>
        <button id="close-editor" class="btn-close">&times;</button>
      </div>
      <div class="editor-body">
        <div class="form-group">
          <label for="task-title">Title</label>
          <input type="text" id="task-title" placeholder="Task title" value="${escapeHTML(task.title)}">
        </div>
        
        <div class="form-group">
          <label for="task-description">Description (optional)</label>
          <textarea id="task-description" placeholder="Task description">${escapeHTML(task.description || '')}</textarea>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="task-due-date">Due Date (optional)</label>
            <input type="date" id="task-due-date" value="${dueDateFormatted}">
          </div>
          
          <div class="form-group">
            <label for="task-priority">Priority</label>
            <select id="task-priority">
              <option value="Low" ${task.priority === 'Low' ? 'selected' : ''}>Low</option>
              <option value="Medium" ${task.priority === 'Medium' || !task.priority ? 'selected' : ''}>Medium</option>
              <option value="High" ${task.priority === 'High' ? 'selected' : ''}>High</option>
            </select>
          </div>
        </div>
        
        ${taskId ? `
          <div class="form-group">
            <label class="checkbox-container">
              <input type="checkbox" id="task-completed" ${task.completed ? 'checked' : ''}>
              <span class="checkmark"></span>
              Mark as completed
            </label>
          </div>
        ` : ''}
      </div>
      <div class="editor-footer">
        <button id="save-task" class="btn-primary" data-id="${taskId || ''}">Save Task</button>
        <button id="cancel-edit" class="btn-secondary">Cancel</button>
      </div>
    </div>
  `;
  
  // Show editor
  editorContainer.classList.add('active');
  
  // Focus title input
  document.getElementById('task-title').focus();
  
  // Setup editor event listeners
  setupTaskEditorEventListeners(taskId);
}

function setupTaskEditorEventListeners(taskId) {
  // Close button
  document.getElementById('close-editor').addEventListener('click', closeTaskEditor);
  document.getElementById('cancel-edit').addEventListener('click', closeTaskEditor);
  
  // Save button
  document.getElementById('save-task').addEventListener('click', () => saveTask(taskId));
  
  // Close on overlay click
  document.querySelector('.editor-overlay').addEventListener('click', closeTaskEditor);
  
  // Prevent closing when clicking inside the editor panel
  document.querySelector('.editor-panel').addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

async function saveTask(taskId = null) {
  const titleElement = document.getElementById('task-title');
  const descriptionElement = document.getElementById('task-description');
  const dueDateElement = document.getElementById('task-due-date');
  const priorityElement = document.getElementById('task-priority');
  const completedElement = document.getElementById('task-completed');
  
  if (!titleElement) {
    console.error('Editor elements not found');
    return;
  }
  
  const title = titleElement.value.trim();
  if (!title) {
    showErrorMessage('Task title is required');
    titleElement.focus();
    return;
  }
  
  const taskData = {
    title,
    description: descriptionElement.value.trim(),
    dueDate: dueDateElement.value ? new Date(dueDateElement.value).toISOString() : null,
    priority: priorityElement.value
  };
  
  // Add completion status if editing an existing task
  if (taskId && completedElement) {
    taskData.completed = completedElement.checked;
    if (completedElement.checked) {
      taskData.completedDate = new Date().toISOString();
    } else {
      taskData.completedDate = null;
    }
  }
  
  try {
    if (taskId) {
      // Update existing task
      await window.MindPalDB.tasks.update(taskId, {
        ...taskData,
        lastModified: new Date().toISOString()
      });
    } else {
      // Create new task
      taskId = await window.MindPalDB.tasks.add({
        ...taskData,
        completed: false,
        dateCreated: new Date().toISOString(),
        lastModified: new Date().toISOString()
      });
    }
    
    closeTaskEditor();
    loadTasks(); // Refresh the tasks list

    showMessage('Task saved successfully');
    
    // Schedule notification if due date is set
    if (taskData.dueDate && !taskData.completed) {
      scheduleTaskReminder(taskId, title, taskData.dueDate);
    }
  } catch (error) {
    console.error('Failed to save task:', error);
    showErrorMessage('Failed to save task. Please try again.');
  }
}

function closeTaskEditor() {
  const editorContainer = document.getElementById('task-editor-container');
  if (editorContainer) {
    editorContainer.classList.remove('active');
  }
}

function confirmDeleteTask(taskId) {
  if (confirm('Are you sure you want to delete this task? This cannot be undone.')) {
    deleteTask(taskId);
  }
}

async function deleteTask(taskId) {
  try {
    await window.MindPalDB.tasks.delete(taskId);
    loadTasks(); // Refresh the tasks list
    showMessage('Task deleted successfully');
  } catch (error) {
    console.error('Failed to delete task:', error);
    showErrorMessage('Failed to delete task. Please try again.');
  }
}

async function filterTasks(event) {
  const filterValue = event.target.value;
  
  try {
    const allTasks = await window.MindPalDB.tasks.getAll();
    
    let filteredTasks;
    
    switch (filterValue) {
      case 'all':
        filteredTasks = allTasks;
        break;
      case 'pending':
        filteredTasks = allTasks.filter(task => !task.completed);
        break;
      case 'completed':
        filteredTasks = allTasks.filter(task => task.completed);
        break;
      case 'today':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        filteredTasks = allTasks.filter(task => {
          if (!task.dueDate) return false;
          const dueDate = new Date(task.dueDate);
          return dueDate >= today && dueDate < tomorrow;
        });
        break;
      case 'week':
        const startOfWeek = new Date();
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 7);
        
        filteredTasks = allTasks.filter(task => {
          if (!task.dueDate) return false;
          const dueDate = new Date(task.dueDate);
          return dueDate >= startOfWeek && dueDate < endOfWeek;
        });
        break;
      case 'high-priority':
        filteredTasks = allTasks.filter(task => task.priority === 'High');
        break;
      default:
        filteredTasks = allTasks;
    }
    
    renderTasksList(filteredTasks);
  } catch (error) {
    console.error('Filter failed:', error);
  }
}

// Schedule task reminder notification
function scheduleTaskReminder(taskId, title, dueDate) {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return;
  }
  
  // Request notification permission if not granted
  if (Notification.permission !== 'granted') {
    Notification.requestPermission();
    return;
  }
  
  const dueDateTime = new Date(dueDate);
  const now = new Date();
  
  // If due date is in the past, don't schedule
  if (dueDateTime <= now) {
    return;
  }
  
  // Schedule notification 1 hour before due date
  const reminderTime = new Date(dueDateTime);
  reminderTime.setHours(reminderTime.getHours() - 1);
  
  // If reminder time is in the past, don't schedule
  if (reminderTime <= now) {
    return;
  }
  
  const delay = reminderTime.getTime() - now.getTime();
  
  // Store the reminder in IndexedDB
  window.MindPalDB.settings.set('reminder_' + taskId, {
    taskId,
    title,
    dueDate,
    reminderTime: reminderTime.toISOString()
  });
  
  // Schedule the notification
  setTimeout(() => {
    showTaskNotification(taskId, title, dueDateTime);
  }, delay);
}

function showTaskNotification(taskId, title, dueDate) {
  if (Notification.permission !== 'granted') {
    return;
  }
  
  navigator.serviceWorker.ready.then(registration => {
    const formattedTime = dueDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    registration.showNotification('Task Reminder', {
      body: `"${title}" is due at ${formattedTime}`,
      icon: '/icons/logo.svg',
      vibrate: [100, 50, 100],
      data: {
        taskId,
        dateOfArrival: Date.now(),
        primaryKey: taskId
      },
      actions: [
        {
          action: 'complete',
          title: 'Mark Complete',
          icon: '/icons/check.svg'
        },
        {
          action: 'view',
          title: 'View Task',
          icon: '/icons/eye.svg'
        }
      ]
    });
  });
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

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date < today) {
    return 'Yesterday';
  } else if (date.getTime() === today.getTime()) {
    return 'Today';
  } else if (date.getTime() === tomorrow.getTime()) {
    return 'Tomorrow';
  } else {
    return date.toLocaleDateString();
  }
}

// Export functions for use in other modules
window.TasksModule = {
  init: initTasksView,
  load: loadTasks,
  create: openTaskEditor,
  getUpcomingTasks: async function(limit = 3) {
    try {
      const tasks = await window.MindPalDB.tasks.getAll();
      return tasks
      .filter(task => !task.completed && task.dueDate)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, limit);
  } catch (error) {
    console.error('Failed to get upcoming tasks:', error);
    return [];
  }
}
};