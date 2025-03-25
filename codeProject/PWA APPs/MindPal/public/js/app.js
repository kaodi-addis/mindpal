// public/js/app.js
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the app
    initApp();
    
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }
    
    // Setup install prompt
    setupInstallPrompt();
    
    // Initialize offline detection
    initOfflineDetection();
  });
  
  // Initialize the application
  async function initApp() {
    try {
      // Initialize database
      await window.MindPalDB.init();
      
      // Setup navigation
      setupNavigation();
      
      // Load initial view (dashboard)
      loadView('dashboard');
      
      // Initialize modules
      initModules();
    } catch (error) {
      console.error('Failed to initialize app:', error);
      showErrorMessage('Failed to initialize the application. Please refresh the page.');
    }
  }
  
  // Setup PWA installation prompt
  function setupInstallPrompt() {
    let deferredPrompt;
    const installButton = document.getElementById('install-button');
    
    // Hide install button initially
    if (installButton) {
      installButton.style.display = 'none';
    }
    
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67+ from automatically showing the prompt
      e.preventDefault();
      
      // Stash the event so it can be triggered later
      deferredPrompt = e;
      
      // Show the install button
      if (installButton) {
        installButton.style.display = 'block';
        
        installButton.addEventListener('click', () => {
          // Show the install prompt
          deferredPrompt.prompt();
          
          // Wait for the user to respond to the prompt
          deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
              console.log('User accepted the install prompt');
            } else {
              console.log('User dismissed the install prompt');
            }
            
            // Clear the saved prompt
            deferredPrompt = null;
            
            // Hide the button
            installButton.style.display = 'none';
          });
        });
      }
    });
    
    // Listen for successful installation
    window.addEventListener('appinstalled', (e) => {
      console.log('App was installed', e);
      
      // Hide the button
      if (installButton) {
        installButton.style.display = 'none';
      }
    });
  }
  
  // Initialize offline detection
  function initOfflineDetection() {
    const offlineIndicator = document.getElementById('offline-indicator');
    
    function updateOfflineStatus() {
      if (navigator.onLine) {
        document.body.classList.remove('offline-mode');
        if (offlineIndicator) {
          offlineIndicator.style.display = 'none';
        }
        
        // Try to sync pending changes
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          navigator.serviceWorker.ready.then(registration => {
            registration.sync.register('sync-notes');
            registration.sync.register('sync-tasks');
          });
        }
      } else {
        document.body.classList.add('offline-mode');
        if (offlineIndicator) {
          offlineIndicator.style.display = 'block';
        }
      }
    }
    
    // Initial check
    updateOfflineStatus();
    
    // Listen for changes
    window.addEventListener('online', updateOfflineStatus);
    window.addEventListener('offline', updateOfflineStatus);
  }
  
  // Setup navigation
  function setupNavigation() {
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Get the view from the data attribute
        const view = link.getAttribute('data-view');
        
        // Load the view
        loadView(view);
        
        // Update active link
        navLinks.forEach(navLink => navLink.classList.remove('active'));
        link.classList.add('active');
      });
    });
  }
  
  // Load a view
  function loadView(viewName) {
    const mainContent = document.getElementById('main-content');
    
    // Show loading indicator
    mainContent.innerHTML = '<div class="loader"></div>';
    
    // Load the view content
    fetch(`/views/${viewName}.html`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load view');
        }
        return response.text();
      })
      .then(html => {
        mainContent.innerHTML = html;
        
        // Initialize the view
        switch (viewName) {
          case 'dashboard':
            initDashboard();
            break;
          case 'notes':
            initNotesView();
            break;
          case 'tasks':
            initTasksView();
            break;
          case 'media':
            initMediaView();
            break;
          case 'utilities':
            initUtilitiesView();
            break;
          case 'wellness':
            initWellnessView();
            break;
        }
      })
      .catch(error => {
        console.error('Error loading view:', error);
        mainContent.innerHTML = `
          <div class="error-message">
            <h2>Failed to load content</h2>
            <p>Please check your connection and try again.</p>
            <button onclick="loadView('${viewName}')">Retry</button>
          </div>
        `;
      });
  }
  
  // Initialize all modules
  function initModules() {
    // Load module scripts if not already loaded
    loadScript('/js/notes.js');
    loadScript('/js/tasks.js');
    loadScript('/js/media.js');
    loadScript('/js/utilities.js');
    loadScript('/js/wellness.js');
  }
  
  // Helper function to load scripts
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
    script.src = src;
    script.async = true;
    
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    
    document.head.appendChild(script);
  });
}