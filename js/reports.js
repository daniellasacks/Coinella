(function() {
    'use strict';
    
    let selectedCurrenciesData = new Map();
    let priceHistory = new Map();
    let realtimeChart = null; 
    const UPDATE_INTERVAL = 1000;
    const HISTORY_LENGTH = 60; 

    const reportsContainer = document.getElementById('reportsContainer'); 
    const chartContainer = document.querySelector('.chart-main-container'); 
    const reportsContent = document.querySelector('.reports-content'); 

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
            setupScrollAnimation(); 
        }
    }

    function loadSelectedCurrenciesData() {
        const savedCurrencies = localStorage.getItem('selectedCurrencies');
        
        if (savedCurrencies) {
            try {
                const savedArray = JSON.parse(savedCurrencies);
                selectedCurrenciesData = new Map(savedArray.map(item => [
                    item.id, 
                    { 
                        id: item.id, 
                        symbol: item.symbol,
                        name: item.name || item.id 
                    }
                ]));
            } catch (e) {
                localStorage.removeItem('selectedCurrencies');
                selectedCurrenciesData = new Map();
            }
        }
    }

    function showNoCurrenciesMessage() {
        if (reportsContent) reportsContent.innerHTML = '';

        const messageElement = document.createElement('div');
        messageElement.className = 'no-currencies card animate-on-scroll'; 
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

        if (realtimeChart) {
            realtimeChart.destroy();
            realtimeChart = null;
        }
    }

    function initializeChart() {
         if (reportsContent) reportsContent.innerHTML = '';

        const canvasContainer = document.createElement('div');
        canvasContainer.className = 'chart-main-container card animate-on-scroll'; 
        canvasContainer.innerHTML = '<canvas id="realtimeChart"></canvas>';
         if (reportsContent) reportsContent.appendChild(canvasContainer);

        const canvas = document.getElementById('realtimeChart');
        if (!canvas) {
             return;
        }

        const ctx = canvas.getContext('2d');
        realtimeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(HISTORY_LENGTH).fill(''), 
                datasets: Array.from(selectedCurrenciesData.values()).map(currency => ({
                    label: currency.symbol, 
                    data: [],
                    borderColor: getRandomColor(), 
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4
                }))
            },
            options: createChartOptions()
        });
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
                 showNoCurrenciesMessage();
                 return;
             }

            const data = await fetchPriceData(symbols);
            updateChartData(data);

        } catch (error) {
            showError(); 
        }
    }

    function getCurrencySymbols() {
        const symbols = Array.from(selectedCurrenciesData.values())
             .map(item => item.symbol)
             .join(',').toUpperCase();
         return symbols;
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
        if (!realtimeChart) {
             return;
        }

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
                 const lastPrice = history.length > 0 ? history[history.length - 1] : null;
                 history.push(lastPrice);
             }

             if (history.length > HISTORY_LENGTH) {
                 history.shift();
             }

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
                    display: true,
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
                     display: true, 
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
                duration: 0 
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

    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    function showError(message = 'An error occurred while fetching real-time data. Please try again later.') {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <h3>Real-time Data Error</h3>
            <p>${message}</p>
            <button onclick="location.reload()">Try Again</button>
        `;
        
        if (reportsContent) {
             reportsContent.innerHTML = '';
             reportsContent.appendChild(errorDiv);
         }

        if (realtimeChart) {
            realtimeChart.destroy();
            realtimeChart = null;
        }
    }

    function setupScrollAnimation() {
        const animateElements = document.querySelectorAll('.animate-on-scroll');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                } else {
                }
            });
        }, { threshold: 0.1 }); 
        animateElements.forEach(element => {
            observer.observe(element);
        });
    }

    document.addEventListener('DOMContentLoaded', init);

     window.addEventListener('beforeunload', () => {
         if (realtimeChart) {
             realtimeChart.destroy();
             realtimeChart = null;
         }
     });

})(); 