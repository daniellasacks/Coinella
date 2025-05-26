# Coinella - Cryptocurrency Tracking Platform

Coinella is a modern web application that provides real-time information and tracking for various cryptocurrencies. The platform allows users to monitor their favorite cryptocurrencies, view detailed price information, and track real-time market changes.

## Features

- Real-time cryptocurrency price tracking
- Interactive price charts
- Multi-currency support (up to 5 currencies)
- Responsive design for all devices
- Search functionality
- Price alerts and notifications
- Persistent currency selection using localStorage

## Technologies Used

- HTML5
- CSS3
- JavaScript (ES6+)
- Chart.js for data visualization
- Font Awesome for icons
- CoinGecko API for cryptocurrency data
- CryptoCompare API for real-time price updates

## Project Structure

```
coinella/
├── index.html          # Home page
├── reports.html        # Real-time reports page
├── about.html          # About page
├── css/
│   ├── styles.css      # Main styles
│   ├── reports.css     # Reports page styles
│   └── about.css       # About page styles
├── js/
│   ├── main.js         # Main application logic
│   └── reports.js      # Reports page logic
└── images/             # Project images
```

## Setup and Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/coinella.git
   ```

2. Navigate to the project directory:
   ```bash
   cd coinella
   ```

3. Open `index.html` in your web browser or use a local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve
   ```

## API Usage

The project uses two main APIs:

1. CoinGecko API:
   - List of currencies: `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd`
   - Currency details: `https://api.coingecko.com/api/v3/coins/{coin-id}`

2. CryptoCompare API:
   - Real-time prices: `https://min-api.cryptocompare.com/data/pricemulti?tsyms=usd&fsyms={symbols}`

## Features Implementation

### Home Page
- Displays currency cards with basic information
- Search functionality for filtering currencies
- "More Info" button to show detailed price information
- Switch to select currencies for real-time tracking

### Real-time Reports
- Displays real-time price updates for selected currencies
- Interactive price charts
- Price change indicators
- Updates every second

### About Page
- Project description
- Developer information
- Technologies used

## Browser Support

The application is compatible with:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Developer

- **Daniella Sacks** - Full Stack Developer

## Acknowledgments

- CoinGecko for providing the cryptocurrency data API
- CryptoCompare for real-time price updates
- Chart.js for the charting library
- Font Awesome for the icons 