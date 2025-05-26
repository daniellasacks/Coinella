(function() {
    'use strict';

    let currencies = [];
    let selectedCurrencies = new Set();
    const MAX_SELECTED_CURRENCIES = 5;
    const COINS_PER_PAGE = 8;
    let currentPage = 1;

    const currencyCardsContainer = document.getElementById('currencyCards');
    const searchInput = document.getElementById('searchInput');
    const dialogBox = document.getElementById('dialogBox');
    const selectedCurrenciesList = document.getElementById('selectedCurrencies');
    const closeDialogButton = document.getElementById('closeDialog');
    const mainContainer = document.querySelector('.container');

    function init() {
        try {
            fetchCurrencies()
                .then(() => {
                    loadSelectedCurrencies();
                    renderCurrencyCards();
                    setupEventListeners();
                    setupScrollArrows();
                    updateScrollArrows();
                })
                .catch(error => {
                    showError();
                });
        } catch (error) {
            showError();
        }
    }

    async function fetchCurrencies() {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&per_page=250&page=1&sparkline=false');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const allCoins = await response.json();
            
            if (!Array.isArray(allCoins) || allCoins.length === 0) {
                throw new Error('No currency data received');
            }
            
            currencies = filterAndMapCurrencies(allCoins);
            
            if (currencies.length === 0) {
                throw new Error('No valid currencies found in the response');
            }
        } catch (error) {
            showError(error.message || 'Failed to load currencies. Please check your internet connection and try again.');
            throw error;
        }
    }

    function filterAndMapCurrencies(allCoins) {
        return allCoins
            .filter(coin => isValidCoin(coin))
            .map(coin => addStarRating(coin));
    }

    function isValidCoin(coin) {
        return coin && 
               coin.id && 
               coin.image && 
               coin.name && 
               coin.symbol &&
               coin.market_cap_rank !== null && 
               coin.market_cap_rank !== undefined;
    }

    function addStarRating(coin) {
        const marketCapRank = coin.market_cap_rank || 999;
        let starRating = 1;
        
        if (marketCapRank <= 10) {
            starRating = 5;
        } else if (marketCapRank <= 50) {
            starRating = 4;
        } else if (marketCapRank <= 100) {
            starRating = 3;
        } else if (marketCapRank <= 200) {
            starRating = 2;
        }
        
        return { ...coin, starRating: starRating };
    }

    function loadSelectedCurrencies() {
        const savedCurrencies = localStorage.getItem('selectedCurrencies');
        if (savedCurrencies) {
            const savedArray = JSON.parse(savedCurrencies);
            selectedCurrencies = new Set(savedArray.map(item => 
                typeof item === 'string' ? 
                { id: item, symbol: currencies.find(c => c.id === item)?.symbol?.toUpperCase() || 'N/A' } : 
                item
            ));
            saveSelectedCurrencies();
        }
    }

    function saveSelectedCurrencies() {
        localStorage.setItem('selectedCurrencies', JSON.stringify(Array.from(selectedCurrencies)));
    }

    function createCurrencyCard(currency) {
        if (!isValidCurrency(currency)) {
            return null;
        }

        const container = createCardContainer();
        const card = createCardElement(currency);
        const switchLabel = createSwitchLabel(currency);
        
        setupCardEventListeners(card, currency);
        setupSwitchEventListeners(switchLabel, currency);

        container.appendChild(card);
        container.appendChild(switchLabel);

        return container;
    }

    function isValidCurrency(currency) {
        return currency && currency.id && currency.image;
    }

    function createCardContainer() {
        const container = document.createElement('div');
        container.className = 'currency-card-container';
        return container;
    }

    function createCardElement(currency) {
        const card = document.createElement('div');
        card.className = 'currency-card';
        card.dataset.id = currency.id;
        
        const cardContent = `
            <div class="currency-card-inner">
                <div class="currency-card-front" style="background-image: url('${currency.image}')">
                    <img src="${currency.image}" alt="${currency.name} logo" class="currency-logo-fallback" onerror="this.style.display='none'">
                </div>
                <div class="currency-card-back" style="background-image: url('${currency.image}')">
                    <button class="more-info-btn" data-id="${currency.id}">More Info</button>
                </div>
            </div>
        `;
        
        card.innerHTML = cardContent;
        return card;
    }

    function createSwitchLabel(currency) {
        const switchLabel = document.createElement('label');
        switchLabel.className = 'switch';
        const isSelected = Array.from(selectedCurrencies).some(item => item.id === currency.id);
        switchLabel.innerHTML = `
            <input type="checkbox" ${isSelected ? 'checked' : ''}>
            <span class="slider"></span>
        `;
        return switchLabel;
    }

    function setupCardEventListeners(card, currency) {
        const moreInfoBtn = card.querySelector('.more-info-btn');
        if (moreInfoBtn) {
            moreInfoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleMoreInfo(currency.id, card);
            });
        }
    }

    function setupSwitchEventListeners(switchLabel, currency) {
        const switchInput = switchLabel.querySelector('input');
        switchInput.addEventListener('change', () => handleSwitchChange(currency.id, switchInput));
    }

    function handleSwitchChange(currencyId, switchInput) {
        const currency = currencies.find(c => c.id === currencyId);
        if (!currency) return;

        const currencyData = { 
            id: currency.id, 
            symbol: currency.symbol.toUpperCase(), 
            name: currency.name 
        };

        if (switchInput.checked) {
            handleCurrencySelection(currencyData);
        } else {
            handleCurrencyDeselection(currencyId);
        }
    }

    function handleCurrencySelection(currencyData) {
        if (selectedCurrencies.size >= MAX_SELECTED_CURRENCIES) {
            showDialog();
            return;
        }
        
        const isAlreadySelected = Array.from(selectedCurrencies).some(item => item.id === currencyData.id);
        if (!isAlreadySelected) {
            selectedCurrencies.add(currencyData);
            saveSelectedCurrencies();
        }
    }

    function handleCurrencyDeselection(currencyId) {
        const itemToRemove = Array.from(selectedCurrencies).find(item => item.id === currencyId);
        if (itemToRemove) {
            selectedCurrencies.delete(itemToRemove);
            saveSelectedCurrencies();
        }
    }

    function renderCurrencyCards(filteredCurrencies = currencies) {
        if (!currencyCardsContainer) {
            return;
        }

        currencyCardsContainer.innerHTML = '';
        
        filteredCurrencies.forEach(currency => {
            const card = createCurrencyCard(currency);
            if (card) {
                currencyCardsContainer.appendChild(card);
            }
        });

        removeNavButtons();
        updateScrollArrows();
    }

    function removeNavButtons() {
        const navButtons = document.querySelector('.nav-buttons');
        if (navButtons) {
            navButtons.remove();
        }
    }

    function setupScrollArrows() {
        if (!mainContainer || !currencyCardsContainer) {
            return;
        }

        const leftArrow = createScrollArrow('left');
        const rightArrow = createScrollArrow('right');

        setupScrollArrowEventListeners(leftArrow, rightArrow);
        currencyCardsContainer.addEventListener('scroll', updateScrollArrows);
    }

    function createScrollArrow(direction) {
        const arrow = document.createElement('div');
        arrow.className = `scroll-arrow ${direction}`;
        arrow.innerHTML = direction === 'left' ? '&lt;' : '&gt;';
        arrow.id = `${direction}ScrollArrow`;
        mainContainer.appendChild(arrow);
        return arrow;
    }

    function setupScrollArrowEventListeners(leftArrow, rightArrow) {
        let scrollInterval;
        const SCROLL_SPEED = 15;

        const startScrolling = (direction) => {
            scrollInterval = requestAnimationFrame(function scroll() {
                const currentScroll = currencyCardsContainer.scrollLeft;
                const newScroll = direction === 'left' 
                    ? currentScroll - SCROLL_SPEED 
                    : currentScroll + SCROLL_SPEED;
                
                currencyCardsContainer.scrollLeft = newScroll;
                
                if (scrollInterval) {
                    requestAnimationFrame(scroll);
                }
            });
        };

        const stopScrolling = () => {
            if (scrollInterval) {
                cancelAnimationFrame(scrollInterval);
                scrollInterval = null;
            }
        };

        leftArrow.addEventListener('mouseenter', () => startScrolling('left'));
        leftArrow.addEventListener('mouseleave', stopScrolling);
        rightArrow.addEventListener('mouseenter', () => startScrolling('right'));
        rightArrow.addEventListener('mouseleave', stopScrolling);

        leftArrow.addEventListener('click', () => {
            const scrollAmount = currencyCardsContainer.querySelector('.currency-card-container').offsetWidth + 32;
            currencyCardsContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        });

        rightArrow.addEventListener('click', () => {
            const scrollAmount = currencyCardsContainer.querySelector('.currency-card-container').offsetWidth + 32;
            currencyCardsContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        });
    }

    function updateScrollArrows() {
        const leftArrow = document.getElementById('leftScrollArrow');
        const rightArrow = document.getElementById('rightScrollArrow');

        if (!currencyCardsContainer || !leftArrow || !rightArrow) return;

        const { scrollLeft, scrollWidth, clientWidth } = currencyCardsContainer;

        updateArrowState(leftArrow, scrollLeft === 0);
        updateArrowState(rightArrow, scrollLeft + clientWidth >= scrollWidth - 1);
    }

    function updateArrowState(arrow, isDisabled) {
        if (isDisabled) {
            arrow.classList.add('disabled');
        } else {
            arrow.classList.remove('disabled');
        }
    }

    async function toggleMoreInfo(currencyId, card) {
        document.querySelectorAll('.currency-card.expanded').forEach(expandedCard => {
            if (expandedCard !== card) {
                expandedCard.classList.remove('expanded');
            }
        });

        if (card.classList.contains('expanded')) {
            card.classList.remove('expanded');
            return;
        }

        try {
            const currency = currencies.find(c => c.id === currencyId);
            
            if (!currency) {
                showCardError(card);
                return;
            }
            
            const data = await fetchCurrencyDetails(currencyId);
            updateCardContent(card, currency, data);
            
        } catch (error) {
            showCardError(card);
        }
    }

    function showCardError(card) {
        card.querySelector('.currency-card-back').innerHTML = '<p>Error loading currency details</p>';
    }

    async function fetchCurrencyDetails(currencyId) {
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/${currencyId}`);
        return await response.json();
    }

    function updateCardContent(card, currency, data) {
        const cardBackElement = card.querySelector('.currency-card-back');
        if (!cardBackElement) return;

        card.classList.add('expanded');
        
        const displayName = data.name === 'Aave' ? 'Aave' : data.name;
        const stars = generateStarRating(currency.starRating);
        
        cardBackElement.innerHTML = `
            <div class="currency-info">
                <h3>${displayName} (${data.symbol.toUpperCase()})</h3>
                <div class="star-rating">${stars}</div>
                <div class="price-info">
                    <p>
                        $ ${data.market_data?.current_price?.usd?.toLocaleString() ?? 'N/A'}
                    </p>
                    <p>
                        € ${data.market_data?.current_price?.eur?.toLocaleString() ?? 'N/A'}
                    </p>
                    <p>
                        ₪ ${data.market_data?.current_price?.ils?.toLocaleString() ?? 'N/A'}
                    </p>
                    <p class="volume-info">
                        <i class="fas fa-chart-line"></i>
                        Trading Volume (24h): $${data.market_data?.total_volume?.usd?.toLocaleString() ?? 'N/A'}
                    </p>
                </div>
            </div>
        `;
        
        addCloseButton(cardBackElement, card);
    }

    function generateStarRating(rating) {
        let stars = '';
        for (let i = 0; i < 5; i++) {
            stars += i < rating ? '★' : '☆';
        }
        return stars;
    }

    function addCloseButton(cardBackElement, card) {
        const closeButton = document.createElement('button');
        closeButton.className = 'more-info-btn';
        closeButton.textContent = 'Close';
        closeButton.onclick = (event) => {
            event.stopPropagation();
            closeButton.closest('.currency-card').classList.remove('expanded');
        };
        cardBackElement.appendChild(closeButton);
    }

    function showDialog() {
        dialogBox.style.display = 'block';
        selectedCurrenciesList.innerHTML = '';
        
        selectedCurrencies.forEach(id => {
            const currency = currencies.find(c => c.id === id);
            if (currency) {
                addCurrencyToDialog(currency);
            }
        });
    }

    function addCurrencyToDialog(currency) {
        const div = document.createElement('div');
        div.innerHTML = `
            <label>
                <input type="checkbox" data-id="${currency.id}" ${selectedCurrencies.has(currency.id) ? 'checked' : ''}>
                ${currency.name} (${currency.symbol.toUpperCase()})
            </label>
        `;
        selectedCurrenciesList.appendChild(div);
    }

    function setupEventListeners() {
        setupSearchListener();
        setupDialogListeners();
        setupDocumentClickListener();
    }

    function setupSearchListener() {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredCurrencies = currencies.filter(currency => 
                currency.name.toLowerCase().includes(searchTerm) || 
                currency.symbol.toLowerCase().includes(searchTerm)
            );
            currentPage = 1;
            renderCurrencyCards(filteredCurrencies);
        });
    }

    function setupDialogListeners() {
        closeDialogButton.addEventListener('click', () => {
            dialogBox.style.display = 'none';
        });

        dialogBox.addEventListener('click', (e) => {
            if (e.target === dialogBox) {
                dialogBox.style.display = 'none';
            }
        });

        selectedCurrenciesList.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                handleDialogCheckboxChange(e);
            }
        });
    }

    function handleDialogCheckboxChange(e) {
        const currencyId = e.target.dataset.id;
        if (!e.target.checked) {
            selectedCurrencies.delete(currencyId);
            saveSelectedCurrencies();
            updateCardSwitch(currencyId);
        }
    }

    function updateCardSwitch(currencyId) {
        const card = document.querySelector(`.currency-card[data-id='${currencyId}']`);
        if (card) {
            const switchInput = card.closest('.currency-card-container').querySelector('.switch input');
            if(switchInput) switchInput.checked = false;
        }
    }

    function setupDocumentClickListener() {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.currency-card')) {
                document.querySelectorAll('.currency-card.expanded').forEach(card => {
                    card.classList.remove('expanded');
                });
            }
        });
    }

    function showError(message = 'An error occurred while loading the data. Please try again later.') {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <h3>Oops! Something went wrong</h3>
            <p>${message}</p>
            <button onclick="location.reload()">Try Again</button>
        `;
        
        if (currencyCardsContainer) {
            currencyCardsContainer.innerHTML = '';
            currencyCardsContainer.appendChild(errorDiv);
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})(); 