const { NseIndia } = require("stock-nse-india");
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const nseIndia = new NseIndia();

let result = [];
let marketCapEligibleArray = [];

function toCSV(data) {
    const headers = ['symbol'];
    const rows = data.map(item => {
        return [
            item.symbol
        ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
}

function Exec() {
    console.log('Fetching all stock symbols...');

    nseIndia.getAllStockSymbols().then(symbols => {
        console.log(`Total symbols fetched: ${symbols.length}`);

        const promises = symbols.map(symbol => {
            // Validate that the symbol is a non-empty string
            if (typeof symbol === 'string' && symbol.trim() !== '') {
                console.log(`Working on: ${symbol}`);
                return nseIndia.getEquityDetails(symbol).then(details => {
                    if (details.priceInfo.lastPrice >= 1000 && details.priceInfo.lastPrice <= 4000) {
                        result.push(details);
                        console.log(`Work on ${symbol} is completed.`);
                    }
                }).catch(error => {
                    console.error(`Error fetching details for symbol ${symbol}:`, error);
                });
            } else {
                console.warn(`Invalid symbol encountered: ${symbol}`);
                return Promise.resolve(); // Resolve to avoid breaking the promise chain
            }
        });

        return Promise.all(promises);
    }).then(() => {
        console.log(`Total eligible equities fetched: ${result.length}`);

        const tradeInfoPromises = result.map(equity => {
            // Validate that the symbol is a non-empty string
            console.log(`Initiating: ${equity.info.symbol}`)
            if (typeof equity.info.symbol === 'string' && equity.info.symbol.trim() !== '') {
                console.log(`getEquityTradeInfo on: ${equity.info.symbol}`);
                return nseIndia.getEquityTradeInfo(equity.info.symbol).then(tradeInfo => {
                    const ffmc = tradeInfo.marketDeptOrderBook.tradeInfo.ffmc;
                    const totalMarketCap = tradeInfo.marketDeptOrderBook.tradeInfo.totalMarketCap;

                    if (totalMarketCap >= 10000 && (((ffmc * 100) / totalMarketCap) >= 50 && ((ffmc * 100) / totalMarketCap) <= 75)) {
                        marketCapEligibleArray.push({
                            symbol: equity.info.symbol,
                            tradeInfo: tradeInfo
                        });
                        console.log(`getEquityTradeInfo on: ${equity.info.symbol} is done`);
                    }
                }).catch(error => {
                    console.error(`Error fetching trade info for symbol ${equity.info.symbol}:`, error);
                });
            } else {
                console.warn(`Invalid symbol encountered in trade info request: ${equity.info.symbol}`);
                return Promise.resolve(); // Resolve to avoid breaking the promise chain
            }
        });

        return Promise.all(tradeInfoPromises);
    })
        .then(() => {
            console.log(`Total market cap eligible equities: ${marketCapEligibleArray.length}`);

            // Convert marketCapEligibleArray to CSV and save to file
            const csvData = toCSV(marketCapEligibleArray);
            const filePath = path.join(__dirname, 'marketCapEligibleEquities.csv');

            fs.writeFileSync(filePath, csvData);
            console.log(`CSV file saved to ${filePath}`);
        }).catch(error => {
            console.error('Error:', error);
        });
}

function processCSV(filePath) {
    fs.createReadStream(filePath)
        .pipe(csv({ headers: false }))  // Set headers to false since there's no header in the CSV
        .on('data', (row) => {
            // Assuming each row is a single column, row will be an object with a single key-value pair
            const rowData = Object.values(row)[0]; // Extract the value
            GetFinalData(rowData); // Call your function
        })
        .on('end', () => {
            console.log('CSV file successfully processed');
        })
        .on('error', (error) => {
            console.error(`Error processing CSV file: ${error.message}`);
        });
}

function GetFinalData(symbol) {
    const range = {
        start: new Date("2024-06-02"),
        end: new Date("2024-09-02")
    };

    const highLowRange = {
        start: new Date("2024-08-20"),
        end: new Date("2024-09-03")
    };

    nseIndia.getEquityHistoricalData(symbol, highLowRange)
        .then(historicalData => {
            if (historicalData.length === 0) {
                console.warn(`No historical data found for ${symbol}`);
                return; // Early exit if no data found
            }

            const allHighs = historicalData.flatMap(splitObj => splitObj.data.map(obj => obj["CH_TRADE_HIGH_PRICE"]));
            const maxHigh = Math.max(...allHighs); // Efficiently find max using spread operator

            const allLows = historicalData.flatMap(splitObj => splitObj.data.map(obj => obj["CH_TRADE_LOW_PRICE"]));
            const minLow = Math.min(...allLows); // Efficiently find min using spread operator

            const priceDifference = maxHigh - minLow;

            if (priceDifference >= 300) {
                nseIndia.getEquityHistoricalData(symbol, highLowRange).then(historicalData => {
                    historicalData.forEach(splitObj => {
                        splitObj.data.forEach(obj => {
                            let processedData = [];
                            historicalData.forEach(splitObj => {
                                splitObj.data.forEach(obj => {
                                    let difference = Math.ceil(obj["CH_CLOSING_PRICE"] - obj["CH_PREVIOUS_CLS_PRICE"]).toFixed(2);
                                    processedData.push(difference)
                                });
                            });
                            analyzeData(processedData, symbol);
                        });
                    });
                }).catch(error => {
                    console.error(`Error fetching historical data for ${symbol}:`, error);
                });
            } else {
                console.log(`${symbol} price difference (${priceDifference}) below threshold (300), skipping further analysis.`);
            }
        })
        .catch(error => console.error(`Error fetching initial historical data for ${symbol}:`, error));
}

function analyzeData(netStockPriceArray, symbol) {
    const MIN_FLUCTUATION = 20; // Minimum fluctuation to consider
    let fluctuationCount = 0;
    let neutralCount = 0;

    for (let i = 1; i < netStockPriceArray.length; i++) {
        const diff = Math.abs(netStockPriceArray[i] - netStockPriceArray[i - 1]);

        if (diff > MIN_FLUCTUATION) {
            fluctuationCount++;
        } else {
            neutralCount++;
        }
    }

    // Print stock if it has more fluctuations than neutral values
    if (fluctuationCount >= neutralCount) {
        console.log(`Stock with ${symbol} significant fluctuations:`, netStockPriceArray);
        saveNetStockPricesToCSV(netStockPriceArray, symbol);
    }
}

function saveNetStockPricesToCSV(netStockPriceArray, symbol) {
    const folderPath = path.join(__dirname, 'stock_data'); // Folder to save the CSV files
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath); // Create the folder if it doesn't exist
    }

    const filePath = path.join(folderPath, `${symbol}.csv`);
    const csvData = netStockPriceArray.join('\n');

    fs.writeFileSync(filePath, csvData);
    console.log(`CSV file saved for ${symbol} to ${filePath}`);
}


// Specify the path to your CSV file
// const filePath = "/Users/vasanthkorada/Desktop/NSE/nse_test/marketCapEligibleEquities.csv";
// processCSV(filePath);

Exec();