// public/js/utilities.js - QR Scanner section
function initUtilitiesView() {
    // Initialize the utilities view
    setupUtilitiesTabs();
    
    // Load the default utility (QR scanner)
    showUtilityTab('qr-scanner');
  }
  
  function setupUtilitiesTabs() {
    const tabsContainer = document.querySelector('.utilities-tabs');
    
    if (!tabsContainer) return;
    
    // Set up tab navigation
    tabsContainer.querySelectorAll('.tab-link').forEach(tabLink => {
      tabLink.addEventListener('click', (e) => {
        e.preventDefault();
        
        const tabId = tabLink.getAttribute('data-tab');
        showUtilityTab(tabId);
      });
    });
  }
  
  function showUtilityTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.utility-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    
    // Deactivate all tab links
    document.querySelectorAll('.tab-link').forEach(link => {
      link.classList.remove('active');
    });
    
    // Show the selected tab
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
      selectedTab.classList.add('active');
    }
    
    // Activate the tab link
    const selectedLink = document.querySelector(`.tab-link[data-tab="${tabId}"]`);
  if (selectedLink) {
    selectedLink.classList.add('active');
  }
  
  // Initialize the tab content
  switch (tabId) {
    case 'qr-scanner':
      initQRScanner();
      break;
    case 'currency-converter':
      initCurrencyConverter();
      break;
    case 'password-generator':
      initPasswordGenerator();
      break;
  }
}

function initQRScanner() {
  const qrContainer = document.getElementById('qr-scanner');
  
  if (!qrContainer) return;
  
  // Check if camera is available
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    qrContainer.innerHTML = `
      <div class="utility-content">
        <div class="error-message">
          <h3>Camera Not Available</h3>
          <p>Your browser doesn't support camera access, or permission was denied.</p>
        </div>
        <div class="qr-manual-entry">
          <h3>Manual QR Code Entry</h3>
          <textarea id="qr-manual-input" placeholder="Paste QR code content here"></textarea>
          <button id="qr-manual-decode" class="btn-primary">Decode</button>
        </div>
      </div>
    `;
    
    document.getElementById('qr-manual-decode').addEventListener('click', () => {
      const input = document.getElementById('qr-manual-input').value.trim();
      if (input) {
        handleQRResult(input);
      } else {
        showErrorMessage('Please enter QR code content');
      }
    });
    
    return;
  }
  
  // Set up QR scanner UI
  qrContainer.innerHTML = `
    <div class="utility-content">
      <div class="qr-scanner-container">
        <div class="qr-scanner-header">
          <h3>QR Code Scanner</h3>
          <div class="scanner-controls">
            <button id="toggle-flash" class="btn-icon" title="Toggle Flash">
              <i class="icon-flash"></i>
            </button>
            <button id="switch-camera" class="btn-icon" title="Switch Camera">
              <i class="icon-switch-camera"></i>
            </button>
          </div>
        </div>
        <div class="qr-viewfinder">
          <video id="qr-video" playsinline></video>
          <div class="scan-region-highlight"></div>
          <div class="scan-region-highlight-svg"></div>
        </div>
        <div class="qr-scanner-footer">
          <button id="stop-scanner" class="btn-secondary">Cancel</button>
        </div>
      </div>
      
      <div class="qr-result-container" style="display: none;">
        <h3>Scan Result</h3>
        <div id="qr-result-content" class="qr-result-content"></div>
        <div class="qr-result-actions">
          <button id="qr-copy" class="btn-primary">Copy</button>
          <button id="qr-open" class="btn-secondary">Open</button>
          <button id="qr-scan-new" class="btn-secondary">Scan Again</button>
        </div>
      </div>
      
      <div class="qr-history-container">
        <h3>Recent Scans</h3>
        <div id="qr-history" class="qr-history"></div>
      </div>
    </div>
  `;
  
  // Load QR scanner script if not already loaded
  if (typeof QrScanner === 'undefined') {
    loadScript('/js/qr-scanner.min.js')
      .then(() => {
        startQRScanner();
      })
      .catch(error => {
        console.error('Failed to load QR scanner script:', error);
        qrContainer.querySelector('.qr-scanner-container').innerHTML = `
          <div class="error-message">
            <h3>Failed to Load Scanner</h3>
            <p>Could not load the QR scanner component. Please try again later.</p>
          </div>
        `;
      });
  } else {
    startQRScanner();
  }
  
  // Load scan history
  loadQRHistory();
}

let qrScanner = null;

function startQRScanner() {
  const video = document.getElementById('qr-video');
  
  if (!video) return;
  
  // Create QR scanner instance
  qrScanner = new QrScanner(
    video,
    result => {
      handleQRResult(result);
      qrScanner.stop();
    },
    {
      highlightScanRegion: true,
      highlightCodeOutline: true,
    }
  );
  
  // Start scanner
  qrScanner.start()
    .catch(error => {
      console.error('QR Scanner error:', error);
      showErrorMessage('Failed to start camera. Please check permissions.');
    });
  
  // Setup controls
  setupQRScannerControls();
}

function setupQRScannerControls() {
  // Stop scanner
  document.getElementById('stop-scanner').addEventListener('click', () => {
    if (qrScanner) {
      qrScanner.stop();
      qrScanner.destroy();
      qrScanner = null;
    }
    
    // Go back to dashboard or previous view
    loadView('dashboard');
  });
  
  // Toggle flash
  const flashButton = document.getElementById('toggle-flash');
  if (flashButton) {
    flashButton.addEventListener('click', async () => {
      try {
        await qrScanner.toggleFlash();
        flashButton.classList.toggle('active');
      } catch (error) {
        console.error('Flash error:', error);
        showErrorMessage('Flash not available on this device');
      }
    });
  }
  
  // Switch camera
  const switchButton = document.getElementById('switch-camera');
  if (switchButton) {
    switchButton.addEventListener('click', async () => {
      try {
        await qrScanner.setCamera(qrScanner.currentCamera.id === 'environment' ? 'user' : 'environment');
      } catch (error) {
        console.error('Camera switch error:', error);
        showErrorMessage('Failed to switch camera');
      }
    });
  }
  
  // Scan new QR code
  document.getElementById('qr-scan-new').addEventListener('click', () => {
    document.querySelector('.qr-result-container').style.display = 'none';
    document.querySelector('.qr-scanner-container').style.display = 'block';
    
    if (qrScanner) {
      qrScanner.start();
    } else {
      startQRScanner();
    }
  });
  
  // Copy result
  document.getElementById('qr-copy').addEventListener('click', () => {
    const resultContent = document.getElementById('qr-result-content').textContent;
    navigator.clipboard.writeText(resultContent)
      .then(() => {
        showMessage('Copied to clipboard');
      })
      .catch(err => {
        console.error('Copy failed:', err);
        showErrorMessage('Failed to copy to clipboard');
      });
  });
  
  // Open result (if URL)
  document.getElementById('qr-open').addEventListener('click', () => {
    const resultContent = document.getElementById('qr-result-content').textContent;
    
    // Check if it's a valid URL
    if (resultContent.match(/^https?:\/\//i)) {
      window.open(resultContent, '_blank');
    } else {
      showErrorMessage('Cannot open: Not a valid URL');
    }
  });
}

async function handleQRResult(result) {
  // Stop the scanner
  if (qrScanner) {
    qrScanner.stop();
  }

  // Get the result text
  const resultText = typeof result === 'string' ? result : result.data;
  
  // Show the result container
  document.querySelector('.qr-scanner-container').style.display = 'none';
  const resultContainer = document.querySelector('.qr-result-container');
  resultContainer.style.display = 'block';
  
  // Update the result content
  const resultContentElement = document.getElementById('qr-result-content');
  resultContentElement.textContent = resultText;
  
  // Enable/disable open button based on whether it's a URL
  const openButton = document.getElementById('qr-open');
  if (resultText.match(/^https?:\/\//i)) {
    openButton.disabled = false;
    openButton.classList.remove('disabled');
  } else {
    openButton.disabled = true;
    openButton.classList.add('disabled');
  }
  
  // Save to history
  saveToQRHistory(resultText);
  
  // Refresh history display
  loadQRHistory();
}

async function saveToQRHistory(content) {
  try {
    // Get existing history
    let history = await window.MindPalDB.settings.get('qr_history') || [];
    
    // Add new entry at the beginning
    history.unshift({
      content,
      timestamp: new Date().toISOString()
    });
    
    // Keep only the last 10 entries
    if (history.length > 10) {
      history = history.slice(0, 10);
    }
    
    // Save back to database
    await window.MindPalDB.settings.set('qr_history', history);
  } catch (error) {
    console.error('Failed to save QR history:', error);
  }
}

async function loadQRHistory() {
  try {
    const historyContainer = document.getElementById('qr-history');
    
    if (!historyContainer) return;
    
    // Get history from database
    const history = await window.MindPalDB.settings.get('qr_history') || [];
    
    if (history.length === 0) {
      historyContainer.innerHTML = '<p class="empty-list">No scan history</p>';
      return;
    }
    
    // Create HTML for history items
    const historyHTML = history.map((item, index) => `
      <div class="qr-history-item" data-index="${index}">
        <div class="qr-history-content">${escapeHTML(truncateText(item.content, 40))}</div>
        <div class="qr-history-meta">${formatDateRelative(item.timestamp)}</div>
      </div>
    `).join('');
    
    historyContainer.innerHTML = historyHTML;
    
    // Add event listeners
    historyContainer.querySelectorAll('.qr-history-item').forEach(item => {
      item.addEventListener('click', async () => {
        const index = parseInt(item.getAttribute('data-index'));
        const history = await window.MindPalDB.settings.get('qr_history') || [];
        
        if (history[index]) {
          handleQRResult(history[index].content);
        }
      });
    });
  } catch (error) {
    console.error('Failed to load QR history:', error);
    const historyContainer = document.getElementById('qr-history');
    if (historyContainer) {
      historyContainer.innerHTML = '<p class="error-message">Failed to load history</p>';
    }
  }
}

function openQRScanner() {
  // Show the utilities view with QR scanner tab active
  const utilitiesContainer = document.getElementById('utilities-container');
  
  if (!utilitiesContainer) {
    loadView('utilities');
    // Wait for view to load then initialize QR scanner
    setTimeout(() => {
      showUtilityTab('qr-scanner');
    }, 300);
    return;
  }
  
  showUtilityTab('qr-scanner');
}

// Helper functions
function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function formatDateRelative(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) {
    return 'Just now';
  } else if (diffMin < 60) {
    return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  } else if (diffDay < 7) {
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}




// public/js/utilities.js - Currency Converter section
function initCurrencyConverter() {
    const converterContainer = document.getElementById('currency-converter');
    
    if (!converterContainer) return;
    
    converterContainer.innerHTML = `
      <div class="utility-content">
        <div class="converter-container">
          <div class="converter-header">
            <h3>Currency Converter</h3>
            <button id="refresh-rates" class="btn-icon" title="Refresh Rates">
              <i class="icon-refresh"></i>
            </button>
          </div>
          
          <div class="converter-form">
            <div class="form-group">
              <label for="amount">Amount</label>
              <input type="number" id="amount" value="1" min="0" step="0.01">
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="from-currency">From</label>
                <select id="from-currency"></select>
              </div>
              
              <button id="swap-currencies" class="btn-icon" title="Swap Currencies">
                <i class="icon-swap"></i>
              </button>
              
              <div class="form-group">
                <label for="to-currency">To</label>
                <select id="to-currency"></select>
              </div>
            </div>
            
            <div class="converter-result">
              <div id="conversion-result">1.00 USD = 0.85 EUR</div>
              <div id="last-updated">Last updated: Just now</div>
            </div>
            
            <button id="convert-currency" class="btn-primary">Convert</button>
          </div>
        </div>
        
        <div class="common-conversions">
          <h3>Common Conversions</h3>
          <div id="common-conversions-list"></div>
        </div>
      </div>
    `;
    
    // Load currency data
    loadCurrencyData();
    
    // Set up event listeners
    document.getElementById('convert-currency').addEventListener('click', convertCurrency);
    document.getElementById('refresh-rates').addEventListener('click', refreshRates);
    document.getElementById('swap-currencies').addEventListener('click', swapCurrencies);
    document.getElementById('amount').addEventListener('input', updateConversion);
    document.getElementById('from-currency').addEventListener('change', updateConversion);
    document.getElementById('to-currency').addEventListener('change', updateConversion);
  }
  
  async function loadCurrencyData() {
    try {
      // Get currencies from database or fetch from API
      let currencyData = await window.MindPalDB.settings.get('currency_data');
      let lastUpdated = await window.MindPalDB.settings.get('currency_last_updated');
    
    const now = new Date();
    const needsUpdate = !currencyData || !lastUpdated || 
      (now - new Date(lastUpdated)) > 24 * 60 * 60 * 1000; // 24 hours
    
    if (needsUpdate && navigator.onLine) {
      await refreshRates(true);
      
      // Get the updated data
      currencyData = await window.MindPalDB.settings.get('currency_data');
      lastUpdated = await window.MindPalDB.settings.get('currency_last_updated');
    }
    
    if (!currencyData) {
      throw new Error('No currency data available');
    }
    
    // Populate currency dropdowns
    populateCurrencyDropdowns(currencyData);
    
    // Update last updated timestamp
    updateLastUpdated(lastUpdated);
    
    // Populate common conversions
    populateCommonConversions(currencyData);
    
    // Perform initial conversion
    convertCurrency();
  } catch (error) {
    console.error('Failed to load currency data:', error);
    showErrorMessage('Failed to load currency data. Please try again.');
    
    // Show offline message
    document.getElementById('last-updated').textContent = 'Offline mode: Using stored rates';
    document.getElementById('last-updated').classList.add('offline');
    
    // Try to use fallback data
    const fallbackData = getFallbackCurrencyData();
    populateCurrencyDropdowns(fallbackData);
    populateCommonConversions(fallbackData);
  }
}

function populateCurrencyDropdowns(currencyData) {
  const fromCurrencySelect = document.getElementById('from-currency');
  const toCurrencySelect = document.getElementById('to-currency');
  
  if (!fromCurrencySelect || !toCurrencySelect) return;
  
  // Clear existing options
  fromCurrencySelect.innerHTML = '';
  toCurrencySelect.innerHTML = '';
  
  // Get user's locale for default currency
  const userLocale = navigator.language || 'en-US';
  const userCurrency = getLocaleCurrency(userLocale);
  
  // Add options for each currency
  Object.entries(currencyData.rates).forEach(([code, rate]) => {
    const fromOption = document.createElement('option');
    fromOption.value = code;
    fromOption.textContent = `${code} - ${getCurrencyName(code)}`;
    fromCurrencySelect.appendChild(fromOption);
    
    const toOption = document.createElement('option');
    toOption.value = code;
    toOption.textContent = `${code} - ${getCurrencyName(code)}`;
    toCurrencySelect.appendChild(toOption);
  });
  
  // Set default selections
  fromCurrencySelect.value = 'USD';
  toCurrencySelect.value = userCurrency || 'EUR';
  
  // If user currency is USD, set "to" currency as EUR
  if (userCurrency === 'USD') {
    toCurrencySelect.value = 'EUR';
  }
}

function getLocaleCurrency(locale) {
  try {
    // This is a simplified approach
    const currency = new Intl.NumberFormat(locale, { 
      style: 'currency', 
      currency: 'USD' 
    }).formatToParts().find(part => part.type === 'currency').value;
    
    return currency;
  } catch (error) {
    console.error('Failed to get locale currency:', error);
    return null;
  }
}

function getCurrencyName(code) {
  const currencyNames = {
    'USD': 'US Dollar',
    'EUR': 'Euro',
    'GBP': 'British Pound',
    'JPY': 'Japanese Yen',
    'AUD': 'Australian Dollar',
    'CAD': 'Canadian Dollar',
    'CHF': 'Swiss Franc',
    'CNY': 'Chinese Yuan',
    'INR': 'Indian Rupee',
    'MXN': 'Mexican Peso',
    'BRL': 'Brazilian Real',
    'RUB': 'Russian Ruble',
    'KRW': 'South Korean Won',
    'SGD': 'Singapore Dollar',
    'NZD': 'New Zealand Dollar',
    'HKD': 'Hong Kong Dollar',
    // Add more as needed
  };
  
  return currencyNames[code] || code;
}

async function refreshRates(silent = false) {
  if (!navigator.onLine) {
    if (!silent) {
      showErrorMessage('Cannot update rates while offline');
    }
    return;
  }
  
  try {
    if (!silent) {
      showMessage('Updating currency rates...');
    }
    
    // Fetch latest rates from API
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    
    if (!response.ok) {
      throw new Error('Failed to fetch currency rates');
    }
    
    const data = await response.json();
    
    // Save to database
    await window.MindPalDB.settings.set('currency_data', data);
    await window.MindPalDB.settings.set('currency_last_updated', new Date().toISOString());
    
    // Reload currency data
    loadCurrencyData();
    
    if (!silent) {
      showMessage('Currency rates updated successfully');
    }
  } catch (error) {
    console.error('Failed to refresh rates:', error);
    if (!silent) {
      showErrorMessage('Failed to update currency rates');
    }
  }
}

function updateLastUpdated(lastUpdated) {
  const lastUpdatedElement = document.getElementById('last-updated');
  
  if (!lastUpdatedElement) return;
  
  if (!lastUpdated) {
    lastUpdatedElement.textContent = 'Last updated: Unknown';
    return;
  }
  
  const date = new Date(lastUpdated);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  let updatedText;
  
  if (diffMin < 1) {
    updatedText = 'Last updated: Just now';
  } else if (diffMin < 60) {
    updatedText = `Last updated: ${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  } else if (diffHour < 24) {
    updatedText = `Last updated: ${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  } else {
    updatedText = `Last updated: ${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  }
  
  lastUpdatedElement.textContent = updatedText;
  
  // Add warning class if rates are more than 3 days old
  if (diffDay > 3) {
    lastUpdatedElement.classList.add('outdated');
  } else {
    lastUpdatedElement.classList.remove('outdated');
  }
}

function populateCommonConversions(currencyData) {
  const commonList = document.getElementById('common-conversions-list');
  
  if (!commonList) return;
  
  // Get user's locale for default currency
  const userLocale = navigator.language || 'en-US';
  const userCurrency = getLocaleCurrency(userLocale) || 'USD';
  
  // Define common currency pairs
  const commonPairs = [
    { from: userCurrency, to: userCurrency === 'USD' ? 'EUR' : 'USD' },
    { from: 'EUR', to: 'GBP' },
    { from: 'USD', to: 'JPY' },
    { from: userCurrency, to: userCurrency === 'CAD' ? 'AUD' : 'CAD' }
  ];
  
  // Remove duplicate pairs
  const uniquePairs = commonPairs.filter((pair, index, self) => 
    index === self.findIndex(p => p.from === pair.from && p.to === pair.to)
  );
  
  // Create HTML for common conversions
  const conversionsHTML = uniquePairs.map(pair => {
    const rate = convertCurrencyRate(1, pair.from, pair.to, currencyData);
    return `
      <div class="common-conversion-item" data-from="${pair.from}" data-to="${pair.to}">
        <div class="conversion-pair">
          <span class="from-currency">${pair.from}</span>
          <span class="to-currency">${pair.to}</span>
        </div>
        <div class="conversion-rate">
          1 ${pair.from} = ${rate.toFixed(4)} ${pair.to}
        </div>
      </div>
    `;
  }).join('');
  
  commonList.innerHTML = conversionsHTML;
  
  // Add event listeners
  commonList.querySelectorAll('.common-conversion-item').forEach(item => {
    item.addEventListener('click', () => {
      const fromCurrency = item.getAttribute('data-from');
      const toCurrency = item.getAttribute('data-to');
      
      // Update converter form
      document.getElementById('from-currency').value = fromCurrency;
      document.getElementById('to-currency').value = toCurrency;
      
      // Perform conversion
      convertCurrency();
    });
  });
}

async function convertCurrency() {
  try {
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const fromCurrency = document.getElementById('from-currency').value;
    const toCurrency = document.getElementById('to-currency').value;
    
    // Get currency data from database
    const currencyData = await window.MindPalDB.settings.get('currency_data');
    
    if (!currencyData) {
      throw new Error('No currency data available');
    }
    
    // Perform conversion
    const result = convertCurrencyRate(amount, fromCurrency, toCurrency, currencyData);
    
    // Update result display
    const resultElement = document.getElementById('conversion-result');
    resultElement.textContent = `${amount.toFixed(2)} ${fromCurrency} = ${result.toFixed(2)} ${toCurrency}`;
    
    // Save recent conversion to history
    saveConversionToHistory(amount, fromCurrency, toCurrency, result);
  } catch (error) {
    console.error('Conversion failed:', error);
    showErrorMessage('Failed to convert currency');
  }
}

function convertCurrencyRate(amount, fromCurrency, toCurrency, currencyData) {
  // Get rates from data
  const rates = currencyData.rates;
  
  // Convert to base currency (USD) first
  let inUSD;
  if (fromCurrency === 'USD') {
    inUSD = amount;
  } else {
    inUSD = amount / rates[fromCurrency];
  }
  
  // Convert from USD to target currency
  let result;
  if (toCurrency === 'USD') {
    result = inUSD;
  } else {
    result = inUSD * rates[toCurrency];
  }
  
  return result;
}

async function saveConversionToHistory(amount, fromCurrency, toCurrency, result) {
  try {
    // Get existing history
    let history = await window.MindPalDB.settings.get('conversion_history') || [];
    
    // Add new entry at the beginning
    history.unshift({
      amount,
      fromCurrency,
      toCurrency,
      result,
      timestamp: new Date().toISOString()
    });
    
    // Keep only the last 10 entries
    if (history.length > 10) {
      history = history.slice(0, 10);
    }
    
    // Save back to database
    await window.MindPalDB.settings.set('conversion_history', history);
  } catch (error) {
    console.error('Failed to save conversion history:', error);
  }
}

function updateConversion() {
  // Throttle updates to avoid excessive calculations
  clearTimeout(window.conversionTimer);
  window.conversionTimer = setTimeout(() => {
    convertCurrency();
  }, 300);
}

function swapCurrencies() {
  const fromCurrencySelect = document.getElementById('from-currency');
  const toCurrencySelect = document.getElementById('to-currency');
  
  // Swap values
  const temp = fromCurrencySelect.value;
  fromCurrencySelect.value = toCurrencySelect.value;
  toCurrencySelect.value = temp;
  
  // Update conversion
  convertCurrency();
}

function getFallbackCurrencyData() {
  // Fallback currency data to use when offline and no cached data available
  return {
    base: 'USD',
    date: new Date().toISOString().split('T')[0],
    rates: {
      'USD': 1,
      'EUR': 0.85,
      'GBP': 0.75,
      'JPY': 110.0,
      'AUD': 1.35,
      'CAD': 1.25,
      'CHF': 0.92,
      'CNY': 6.45,
      'INR': 74.5,
      'MXN': 20.0,
      'BRL': 5.2,
      'RUB': 73.5,
      'KRW': 1150,
      'SGD': 1.35,
      'NZD': 1.45,
      'HKD': 7.78
    }
  };
}

function openCurrencyConverter() {
  // Show the utilities view with currency converter tab active
  const utilitiesContainer = document.getElementById('utilities-container');
  
  if (!utilitiesContainer) {
    loadView('utilities');
    // Wait for view to load then initialize currency converter
    setTimeout(() => {
      showUtilityTab('currency-converter');
    }, 300);
    return;
  }
  
  showUtilityTab('currency-converter');
}



// public/js/utilities.js - Password Generator section
function initPasswordGenerator() {
    const passwordContainer = document.getElementById('password-generator');
    
    if (!passwordContainer) return;
    
    passwordContainer.innerHTML = `
      <div class="utility-content">
        <div class="password-generator-container">
          <div class="password-header">
            <h3>Password Generator</h3>
          </div>
          
          <div class="password-result">
            <input type="text" id="password-output" readonly>
            <div class="password-actions">
              <button id="copy-password" class="btn-icon" title="Copy Password">
                <i class="icon-copy"></i>
              </button>
              <button id="regenerate-password" class="btn-icon" title="Generate New Password">
                <i class="icon-refresh"></i>
              </button>
            </div>
          </div>
          
          <div class="password-strength">
            <div class="strength-meter">
              <div id="strength-bar" class="strength-bar"></div>
            </div>
            <div id="strength-text" class="strength-text">Medium Strength</div>
          </div>
          
          <div class="password-options">
            <div class="form-group">
              <label for="password-length">Length</label>
              <div class="range-container">
                <input type="range" id="password-length" min="8" max="32" value="16">
              <span id="length-value">16</span>
            </div>
          </div>
          
          <div class="form-group">
            <label class="checkbox-container">
              <input type="checkbox" id="include-uppercase" checked>
              <span class="checkmark"></span>
              Include Uppercase Letters
            </label>
          </div>
          
          <div class="form-group">
            <label class="checkbox-container">
              <input type="checkbox" id="include-lowercase" checked>
              <span class="checkmark"></span>
              Include Lowercase Letters
            </label>
          </div>
          
          <div class="form-group">
            <label class="checkbox-container">
              <input type="checkbox" id="include-numbers" checked>
              <span class="checkmark"></span>
              Include Numbers
            </label>
          </div>
          
          <div class="form-group">
            <label class="checkbox-container">
              <input type="checkbox" id="include-symbols" checked>
              <span class="checkmark"></span>
              Include Symbols
            </label>
          </div>
          
          <div class="form-group">
            <label class="checkbox-container">
              <input type="checkbox" id="exclude-similar">
              <span class="checkmark"></span>
              Exclude Similar Characters (i, l, 1, I, 0, O, etc.)
            </label>
          </div>
          
          <button id="generate-password" class="btn-primary">Generate Password</button>
        </div>
        
        <div class="password-history">
          <h3>Recent Passwords</h3>
          <div id="password-history-list" class="password-history-list"></div>
          <p class="security-note">
            <i class="icon-lock"></i> Passwords are stored locally on your device and never sent to any server.
          </p>
        </div>
      </div>
    </div>
  `;
  
  // Set up event listeners
  setupPasswordGeneratorEvents();
  
  // Load password history
  loadPasswordHistory();
  
  // Generate initial password
  generatePassword();
}

function setupPasswordGeneratorEvents() {
  // Generate password button
  document.getElementById('generate-password').addEventListener('click', generatePassword);
  
  // Regenerate button
  document.getElementById('regenerate-password').addEventListener('click', generatePassword);
  
  // Copy password button
  document.getElementById('copy-password').addEventListener('click', copyPassword);
  
  // Update length value when slider changes
  const lengthSlider = document.getElementById('password-length');
  const lengthValue = document.getElementById('length-value');
  
  lengthSlider.addEventListener('input', () => {
    lengthValue.textContent = lengthSlider.value;
  });
  
  // Validation: ensure at least one character type is selected
  document.querySelectorAll('#include-uppercase, #include-lowercase, #include-numbers, #include-symbols')
    .forEach(checkbox => {
      checkbox.addEventListener('change', validateOptions);
    });
}

function validateOptions() {
  const uppercase = document.getElementById('include-uppercase').checked;
  const lowercase = document.getElementById('include-lowercase').checked;
  const numbers = document.getElementById('include-numbers').checked;
  const symbols = document.getElementById('include-symbols').checked;
  
  // If all are unchecked, force at least one to be checked
  if (!uppercase && !lowercase && !numbers && !symbols) {
    // Default to lowercase if nothing is selected
    document.getElementById('include-lowercase').checked = true;
    showMessage('At least one character type must be selected');
  }
}

function generatePassword() {
  // Get options
  const length = parseInt(document.getElementById('password-length').value);
  const includeUppercase = document.getElementById('include-uppercase').checked;
  const includeLowercase = document.getElementById('include-lowercase').checked;
  const includeNumbers = document.getElementById('include-numbers').checked;
  const includeSymbols = document.getElementById('include-symbols').checked;
  const excludeSimilar = document.getElementById('exclude-similar').checked;
  
  // Validate options
  if (!includeUppercase && !includeLowercase && !includeNumbers && !includeSymbols) {
    document.getElementById('include-lowercase').checked = true;
    showMessage('At least one character type must be selected');
  }
  
  // Define character sets
  let uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  let numberChars = '0123456789';
  let symbolChars = '!@#$%^&*()_-+={}[]|:;<>,.?/~';
  
  // Remove similar characters if option is selected
  if (excludeSimilar) {
    uppercaseChars = uppercaseChars.replace(/[IO]/g, '');
    lowercaseChars = lowercaseChars.replace(/[il]/g, '');
    numberChars = numberChars.replace(/[01]/g, '');
    symbolChars = symbolChars.replace(/[|Il!10O]/g, '');
  }
  
  // Build character pool based on options
  let charPool = '';
  if (includeUppercase) charPool += uppercaseChars;
  if (includeLowercase) charPool += lowercaseChars;
  if (includeNumbers) charPool += numberChars;
  if (includeSymbols) charPool += symbolChars;
  
  // Generate password
  let password = '';
  let hasRequiredChars = false;
  
  // Keep generating until we have a password with at least one of each selected character type
  while (!hasRequiredChars) {
    password = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charPool.length);
      password += charPool[randomIndex];
    }
    
    // Check if password contains at least one of each selected character type
    const hasUppercase = !includeUppercase || /[A-Z]/.test(password);
    const hasLowercase = !includeLowercase || /[a-z]/.test(password);
    const hasNumber = !includeNumbers || /[0-9]/.test(password);
    const hasSymbol = !includeSymbols || /[^A-Za-z0-9]/.test(password);
    
    hasRequiredChars = hasUppercase && hasLowercase && hasNumber && hasSymbol;
  }
  
  // Display the generated password
  document.getElementById('password-output').value = password;
  
  // Update password strength
  updatePasswordStrength(password);
  
  // Save to history
  savePasswordToHistory(password);
}

function updatePasswordStrength(password) {
  // Calculate password strength
  const strength = calculatePasswordStrength(password);
  
  // Update strength bar
  const strengthBar = document.getElementById('strength-bar');
  strengthBar.style.width = `${strength.score * 25}%`;
  strengthBar.className = 'strength-bar ' + strength.level;
  
  // Update strength text
  document.getElementById('strength-text').textContent = strength.message;
}

function calculatePasswordStrength(password) {
  // Basic password strength calculation
  let score = 0;
  
  // Length check
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  
  // Character variety check
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  
  // Complexity check
  const uniqueChars = new Set(password).size;
  const uniqueRatio = uniqueChars / password.length;
  
  if (uniqueRatio >= 0.5) score += 1;
  if (uniqueRatio >= 0.7) score += 1;
  
  // Penalize patterns
  if (/(.)\1{2,}/.test(password)) score -= 1; // Repeated characters
  if (/^[A-Za-z]+$/.test(password)) score -= 1; // Letters only
  if (/^[0-9]+$/.test(password)) score -= 1; // Numbers only
  
  // Normalize score to 0-4 range
  score = Math.max(0, Math.min(4, score));
  
  // Map score to strength level
  let level, message;
  
  switch (score) {
    case 0:
      level = 'very-weak';
      message = 'Very Weak';
      break;
    case 1:
      level = 'weak';
      message = 'Weak';
      break;
    case 2:
      level = 'medium';
      message = 'Medium';
      break;
    case 3:
      level = 'strong';
      message = 'Strong';
      break;
    case 4:
      level = 'very-strong';
      message = 'Very Strong';
      break;
  }
  
  return { score, level, message };
}

function copyPassword() {
  const passwordOutput = document.getElementById('password-output');
  passwordOutput.select();
  
  try {
    // Copy to clipboard
    document.execCommand('copy');
    // Or use modern API if available
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(passwordOutput.value);
    }
    
    showMessage('Password copied to clipboard');
  } catch (err) {
    console.error('Failed to copy password:', err);
    showErrorMessage('Failed to copy password');
  }
  
  // Deselect
  window.getSelection().removeAllRanges();
}

async function savePasswordToHistory(password) {
  try {
    // Get existing history
    let history = await window.MindPalDB.settings.get('password_history') || [];
    
    // Create a masked version for history
    const maskedPassword = password.substring(0, 3) + 
      '*'.repeat(password.length - 6) + 
      password.substring(password.length - 3);
    
    // Add new entry at the beginning
    history.unshift({
      password: maskedPassword, // Store masked version for safety
      length: password.length,
      strength: calculatePasswordStrength(password).message,
      timestamp: new Date().toISOString()
    });
    
    // Keep only the last 10 entries
    if (history.length > 10) {
      history = history.slice(0, 10);
    }
    
    // Save back to database
    await window.MindPalDB.settings.set('password_history', history);
    
    // Refresh history display
    loadPasswordHistory();
  } catch (error) {
    console.error('Failed to save password history:', error);
  }
}

async function loadPasswordHistory() {
  try {
    const historyContainer = document.getElementById('password-history-list');
    
    if (!historyContainer) return;
    
    // Get history from database
    const history = await window.MindPalDB.settings.get('password_history') || [];
    
    if (history.length === 0) {
      historyContainer.innerHTML = '<p class="empty-list">No password history</p>';
      return;
    }
    
    // Create HTML for history items
    const historyHTML = history.map((item, index) => `
      <div class="password-history-item">
        <div class="password-history-text">${item.password}</div>
        <div class="password-history-meta">
          <span class="password-length">${item.length} chars</span>
          <span class="password-strength strength-${item.strength.toLowerCase().replace(' ', '-')}">${item.strength}</span>
          <span class="password-time">${formatDateRelative(item.timestamp)}</span>
        </div>
      </div>
    `).join('');
    
    historyContainer.innerHTML = historyHTML;
  } catch (error) {
    console.error('Failed to load password history:', error);
    const historyContainer = document.getElementById('password-history-list');
    if (historyContainer) {
      historyContainer.innerHTML = '<p class="error-message">Failed to load history</p>';
    }
  }
}

function openPasswordGenerator() {
  // Show the utilities view with password generator tab active
  const utilitiesContainer = document.getElementById('utilities-container');
  
  if (!utilitiesContainer) {
    loadView('utilities');
    // Wait for view to load then initialize password generator
    setTimeout(() => {
      showUtilityTab('password-generator');
    }, 300);
    return;
  }
  
  showUtilityTab('password-generator');
}

// Export utilities functions
window.UtilitiesModule = {
  init: initUtilitiesView,
  openQRScanner,
  openCurrencyConverter,
  openPasswordGenerator
};