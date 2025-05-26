(function() {
    'use strict';
    
    let selectedCurrenciesData = new Map();
    let priceHistory = new Map();
    let charts = new Map();
    const UPDATE_INTERVAL = 1000;

    const reportsContainer = document.getElementById('reportsContainer');

    function init() {
        console.log('reports.js: init() called');
        if (!reportsContainer) {
             console.error('reports.js: reportsContainer element not found!');
             return;
        }
        loadSelectedCurrenciesData();
        console.log(`reports.js: selectedCurrenciesData size: ${selectedCurrenciesData.size}`);

        if (selectedCurrenciesData.size === 0) {
            console.log('reports.js: No currencies selected, showing message.');
            showNoCurrenciesMessage();
        } else {
            console.log('reports.js: Currencies selected, starting real-time updates.');
            startRealTimeUpdates();
            setupScrollAnimation();
        }
    }

    function loadSelectedCurrenciesData() {
        const savedCurrencies = localStorage.getItem('selectedCurrencies');
        
        if (savedCurrencies) {
            try {
                const savedArray = JSON.parse(savedCurrencies);
                selectedCurrenciesData = new Map(savedArray.map(item => [item.id, item]));
            } catch (e) {
                localStorage.removeItem('selectedCurrencies');
                selectedCurrenciesData = new Map();
            }
        }
    }

    function showNoCurrenciesMessage() {
        reportsContainer.innerHTML = `
            <div class="no-currencies">
                <i class="fas fa-coins"></i>
                <h2>No Currencies Selected</h2>
                <p>Please select up to 5 currencies on the home page to view their real-time data here.</p>
                <a href="index.html">Go to Home Page</a>
            </div>
        `;
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
            console.log('reports.js: Data received from API:', data);
            updateReports(data);

        } catch (error) {
            console.error('reports.js: Error fetching currency data:', error);
            showError();
        }
    }

    function getCurrencySymbols() {
        return Array.from(selectedCurrenciesData.values())
            .map(item => item.symbol)
            .join(',');
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
            
            if (!data || Object.keys(data).length === 0) {
                throw new Error('No price data received from the API');
            }

            return data;
        } catch (error) {
            console.error('Error fetching price data:', error);
            showError(error.message || 'Failed to fetch real-time price data. Please check your internet connection and try again.');
            throw error;
        }
    }

    function updateReports(data) {
        updateCurrencyReports(data);
        cleanupRemovedReports();
    }

    function updateCurrencyReports(data) {
        Array.from(selectedCurrenciesData.keys()).forEach(currencyId => {
            const currencyData = selectedCurrenciesData.get(currencyId);
            const symbol = currencyData?.symbol;
            const priceInfo = (symbol && data[symbol]) ? data[symbol].USD : undefined;

            if (priceInfo !== undefined && priceInfo !== null) {
                updatePriceHistory(currencyId, priceInfo);
                updateOrCreateReport(currencyId, priceInfo);
            } else {
                updateOrCreateReport(currencyId, undefined);
            }
        });
    }

    function cleanupRemovedReports() {
        Array.from(reportsContainer.children).forEach(reportElement => {
            const id = reportElement.id.replace('report-', '');
            if (!selectedCurrenciesData.has(id)) {
                removeReport(id, reportElement);
            }
        });
    }

    function removeReport(id, reportElement) {
        reportElement.remove();
        priceHistory.delete(id);
        if (charts.has(id)) {
            charts.get(id).destroy();
            charts.delete(id);
        }
    }

    function updatePriceHistory(currencyId, price) {
        if (!priceHistory.has(currencyId)) {
            priceHistory.set(currencyId, []);
        }
        
        const history = priceHistory.get(currencyId);
        if (price !== undefined && price !== null) {
            history.push(price);
        }
        
        if (history.length > 30) {
            history.shift();
        }
    }

    function updateOrCreateReport(currencyId, price) {
        let reportElement = document.getElementById(`report-${currencyId}`);
        
        if (!reportElement && selectedCurrenciesData.has(currencyId)) {
            reportElement = createReportElement(currencyId);
            reportsContainer.appendChild(reportElement);
            reportElement = document.getElementById(`report-${currencyId}`);
        }
        
        if (reportElement) {
            updateReportContent(reportElement, currencyId, price);
            updateChart(currencyId);
        }
    }

    function createReportElement(currencyId) {
        const div = document.createElement('div');
        div.id = `report-${currencyId}`;
        div.className = 'currency-report';
        
        const currencyData = selectedCurrenciesData.get(currencyId);
        const currencyName = currencyData?.name || 'Unknown';
        const currencySymbol = currencyData?.symbol || 'N/A';
        const currencyImage = currencyData?.image || '';

        div.innerHTML = `
            <div class="currency-report-header">
                <img src="${currencyImage}" alt="${currencyName}" class="currency-icon">
                <div>
                    <h2>${currencyName} (${currencySymbol})</h2>
                    <p class="loading-text">Loading...</p>
                </div>
            </div>
            <div class="price-info">
                <span class="current-price">$0.00</span>
                <span class="price-change">0.00%</span>
                <span class="loading-placeholder"></span>
            </div>
            <div class="chart-container">
                <canvas id="chart-${currencyId}"></canvas>
            </div>
        `;
        
        return div;
    }

    function updateReportContent(reportElement, currencyId, price) {
        const currentPriceSpan = reportElement.querySelector('.current-price');
        const priceChangeSpan = reportElement.querySelector('.price-change');
        const loadingParagraph = reportElement.querySelector('.loading-text');
        const loadingPlaceholder = reportElement.querySelector('.loading-placeholder');

        updatePriceDisplay(currentPriceSpan, price, loadingParagraph, loadingPlaceholder);
        updatePriceChange(reportElement, currencyId, price, priceChangeSpan);
    }

    function updatePriceDisplay(currentPriceSpan, price, loadingParagraph, loadingPlaceholder) {
        if (price !== undefined && price !== null) {
            currentPriceSpan.textContent = formatPrice(price);
            hideLoadingElements(loadingParagraph, loadingPlaceholder);
        } else {
            currentPriceSpan.textContent = '$N/A';
            showLoadingElements(loadingParagraph, loadingPlaceholder);
        }
    }

    function formatPrice(price) {
        return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 10 })}`;
    }

    function hideLoadingElements(loadingParagraph, loadingPlaceholder) {
        if (loadingParagraph) loadingParagraph.style.display = 'none';
        if (loadingPlaceholder) loadingPlaceholder.style.display = 'none';
    }

    function showLoadingElements(loadingParagraph, loadingPlaceholder) {
        if (loadingParagraph) loadingParagraph.style.display = '';
        if (loadingPlaceholder) loadingPlaceholder.style.display = '';
    }

    function updatePriceChange(reportElement, currencyId, price, priceChangeSpan) {
        const history = priceHistory.get(currencyId);
        
        if (history && history.length > 1) {
            const previousPrice = history[history.length - 2];
            const change = calculatePriceChange(price, previousPrice);
            updatePriceChangeDisplay(priceChangeSpan, change);
        } else {
            setDefaultPriceChange(priceChangeSpan);
        }
    }

    function calculatePriceChange(currentPrice, previousPrice) {
        if (previousPrice === undefined || previousPrice === null || previousPrice === 0) {
            return null;
        }
        return ((currentPrice - previousPrice) / previousPrice) * 100;
    }

    function updatePriceChangeDisplay(priceChangeSpan, change) {
        if (change !== null) {
            const changeText = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
            priceChangeSpan.textContent = changeText;
            priceChangeSpan.className = `price-change ${change >= 0 ? 'positive' : 'negative'}`;
        } else {
            setDefaultPriceChange(priceChangeSpan);
        }
    }

    function setDefaultPriceChange(priceChangeSpan) {
        priceChangeSpan.textContent = 'N/A';
        priceChangeSpan.className = 'price-change';
    }

    function updateChart(currencyId) {
        const history = priceHistory.get(currencyId);
        const canvas = document.getElementById(`chart-${currencyId}`);
        
        if (!canvas) return;
        
        try {
            if (!charts.has(currencyId)) {
                createNewChart(currencyId, canvas, history);
            } else {
                updateExistingChart(currencyId, history);
            }
        } catch (error) {
            console.error('Chart update failed:', error);
        }
    }

    function createNewChart(currencyId, canvas, history) {
        charts.set(currencyId, new Chart(canvas, {
            type: 'line',
            data: createChartData(currencyId, history),
            options: createChartOptions()
        }));
    }

    function createChartData(currencyId, history) {
        return {
            labels: Array(history?.length || 0).fill(''),
            datasets: [{
                label: selectedCurrenciesData.get(currencyId)?.symbol || currencyId,
                data: history,
                borderColor: '#3498db',
                borderWidth: 2,
                fill: false,
                tension: 0.4
            }]
        };
    }

    function createChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    display: false
                },
                y: {
                    beginAtZero: false
                }
            },
            animation: {
                duration: 0
            }
        };
    }

    function updateExistingChart(currencyId, history) {
        const chart = charts.get(currencyId);
        chart.data.datasets[0].data = history;
        chart.update();
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
        
        if (reportsContainer) {
            reportsContainer.innerHTML = '';
            reportsContainer.appendChild(errorDiv);
        }
    }

    function setupScrollAnimation() {
        const animateElements = document.querySelectorAll('.animate-on-scroll');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        });

        animateElements.forEach(element => {
            observer.observe(element);
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})(); 