(function() {
    'use strict';
    
    let selectedCurrenciesData = new Map();
    let priceHistory = new Map();
    let realtimeChart = null; // Use a single chart instance
    const UPDATE_INTERVAL = 1000;
    const HISTORY_LENGTH = 60; // Store up to 60 data points (1 minute at 1s interval)

    const reportsContainer = document.getElementById('reportsContainer'); // Keep for now, might need a placeholder
    const chartContainer = document.querySelector('.chart-main-container'); // New container for the single chart
    const reportsContent = document.querySelector('.reports-content'); // Container for reports and message

    function init() {
        if (!reportsContent) {
            return;
        }
        loadSelectedCurrenciesData();

        if (selectedCurrenciesData.size === 0) {
            showNoCurrenciesMessage();
        } else {
            initializeChart();
            startRealTimeUpdates();
            setupScrollAnimation(); // Keep if other elements animate
        }
    }

    function loadSelectedCurrenciesData() {
        const savedCurrencies = localStorage.getItem('selectedCurrencies');
        
        if (savedCurrencies) {
            try {
                const savedArray = JSON.parse(savedCurrencies);
                // Ensure selectedCurrenciesData map is populated with necessary info (id, symbol, name)
                selectedCurrenciesData = new Map(savedArray.map(item => [
                    item.id, 
                    { 
                        id: item.id, 
                        symbol: item.symbol,
                        name: item.name || item.id // Use id as fallback name
                    }
                ]));
            } catch (e) {
                localStorage.removeItem('selectedCurrencies');
                selectedCurrenciesData = new Map();
            }
        }
    }

    function showNoCurrenciesMessage() {
        // Clear previous content
        if (reportsContent) reportsContent.innerHTML = '';

        const messageElement = document.createElement('div');
        messageElement.className = 'no-currencies card animate-on-scroll'; // Use card styling
        messageElement.innerHTML = `
            <div class="section-icon">
                <i class="fas fa-coins"></i>
            </div>
            <h2>No Currencies Selected</h2>
            <p>Please select up to 5 currencies on the home page to view their real-time data here.</p>
            <a href="index.html" class="btn-primary">
                <i class="fas fa-arrow-left"></i> Go to Home
            </a>
        `;
         if (reportsContent) reportsContent.appendChild(messageElement);

        // Destroy chart if it exists
        if (realtimeChart) {
            realtimeChart.destroy();
            realtimeChart = null;
        }
    }

    function initializeChart() {
        // Clear previous content
         if (reportsContent) reportsContent.innerHTML = '';

        const canvasContainer = document.createElement('div');
        canvasContainer.className = 'chart-main-container card animate-on-scroll'; // Use card styling
        canvasContainer.innerHTML = '<canvas id="realtimeChart"></canvas>';
         if (reportsContent) reportsContent.appendChild(canvasContainer);

        const canvas = document.getElementById('realtimeChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        realtimeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(HISTORY_LENGTH).fill(''), // Initialize with empty labels
                datasets: Array.from(selectedCurrenciesData.values()).map(currency => ({
                    label: currency.symbol, // Use symbol as label
                    data: [],
                    borderColor: getRandomColor(), // Assign a random color
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4
                }))
            },
            options: createChartOptions()
        });
         // Initialize priceHistory for each selected currency
        selectedCurrenciesData.forEach(currency => {
            priceHistory.set(currency.id, []);
        });
    }

    function startRealTimeUpdates() {
        fetchCurrencyData();
        setInterval(fetchCurrencyData, UPDATE_INTERVAL);
    }

    async function fetchCurrencyData() {
        try {
            const symbols = getCurrencySymbols();
            
            if (!symbols) {
                 // This should ideally not happen if startRealTimeUpdates is only called when size > 0
                 // but as a safeguard:
                 showNoCurrenciesMessage();
                 return;
             }

            const data = await fetchPriceData(symbols);
            updateChartData(data);

        } catch (error) {
            showError(); // Use the enhanced showError
        }
    }

    function getCurrencySymbols() {
         return Array.from(selectedCurrenciesData.values())
             .map(item => item.symbol)
             .join(',').toUpperCase(); // Ensure symbols are uppercase for API
    }

    async function fetchPriceData(symbols) {
        try {
            const apiUrl = `https://min-api.cryptocompare.com/data/pricemulti?tsyms=usd&fsyms=${symbols}`;
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.Response === 'Error') {
                throw new Error(data.Message || 'API returned an error');
            }
            
            // Check if data contains expected currency symbols
             const fetchedSymbols = Object.keys(data).filter(key => key !== 'Response' && key !== 'Message');
             if (fetchedSymbols.length === 0) {
                 throw new Error('No price data received for selected currencies');
             }

            return data;
        } catch (error) {
            showError(error.message || 'Failed to fetch real-time price data. Please check your internet connection and try again.');
            throw error;
        }
    }

    function updateChartData(data) {
        if (!realtimeChart) return;

         // Add a new timestamp label (optional, but good for tracking)
         const now = new Date();
         const timeLabel = `${now.getMinutes()}:${now.getSeconds().toString().padStart(2, '0')}`;
         realtimeChart.data.labels.push(timeLabel);
         if (realtimeChart.data.labels.length > HISTORY_LENGTH) {
             realtimeChart.data.labels.shift();
         }

        realtimeChart.data.datasets.forEach(dataset => {
            const symbol = dataset.label;
            const currencyData = Array.from(selectedCurrenciesData.values()).find(c => c.symbol === symbol);
             const priceInfo = (currencyData && data[symbol]) ? data[symbol].USD : undefined;

             const history = priceHistory.get(currencyData.id);

            if (priceInfo !== undefined && priceInfo !== null) {
                 history.push(priceInfo);
             } else {
                 // Push the last known price or null/undefined if no history
                 history.push(history.length > 0 ? history[history.length - 1] : null);
                 showError(`Could not fetch data for ${symbol}. Displaying last known price.`);
             }

             if (history.length > HISTORY_LENGTH) {
                 history.shift();
             }

            // Update the dataset with the latest history slice
            dataset.data = history;
        });

        realtimeChart.update();
    }

    function createChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true, // Show legend for multiple datasets
                    position: 'top',
                    labels: {
                         color: '#333'
                    }
                },
                 title: {
                     display: true,
                     text: 'Real-time Price Data (USD)',
                     color: '#333',
                     font: {
                         size: 16
                     }
                 }
            },
            scales: {
                x: {
                     display: true, // Show X-axis labels
                     title: {
                         display: true,
                         text: 'Time',
                         color: '#333'
                     },
                     ticks: {
                         color: '#666'
                     },
                     grid: {
                         color: 'rgba(0, 0, 0, 0.05)'
                     }
                },
                y: {
                    beginAtZero: false,
                     title: {
                         display: true,
                         text: 'Price (USD)',
                         color: '#333'
                     },
                     ticks: {
                         color: '#666'
                     },
                     grid: {
                         color: 'rgba(0, 0, 0, 0.05)'
                     }
                }
            },
            animation: {
                duration: 0 // Disable animation for real-time updates
            },
             hover: {
                 mode: 'nearest',
                 intersect: false
             },
             tooltips: {
                 mode: 'index',
                 intersect: false
             }
        };
    }

    // Helper function to generate random colors for chart lines
    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    // Use the existing showError function from previous step
    function showError(message = 'An error occurred while fetching real-time data. Please try again later.') {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <h3>Real-time Data Error</h3>
            <p>${message}</p>
            <button onclick="location.reload()">Try Again</button>
        `;
        
        // Clear existing content and append error message
        if (reportsContent) {
             reportsContent.innerHTML = '';
             reportsContent.appendChild(errorDiv);
         }

        // Destroy chart if it exists
        if (realtimeChart) {
            realtimeChart.destroy();
            realtimeChart = null;
        }
    }

    // Keep if there are other elements that need scroll animation
    function setupScrollAnimation() {
        const animateElements = document.querySelectorAll('.animate-on-scroll');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                } else {
                     // Optional: remove 'visible' class when out of view
                     // entry.target.classList.remove('visible');
                }
            });
        }, { threshold: 0.1 }); // Trigger when 10% of the element is visible

        animateElements.forEach(element => {
            observer.observe(element);
        });
    }

    document.addEventListener('DOMContentLoaded', init);

    // Optional: Cleanup chart on page unload
     window.addEventListener('beforeunload', () => {
         if (realtimeChart) {
             realtimeChart.destroy();
             realtimeChart = null;
         }
     });

})(); 