const axios = require("axios");

// Instrument tokens
const tickerData = {
  NIFTY: { id: 256265 },
  BANKNIFTY: { id: 260105 },
};

// Interval mapping
const KI = {
  "3m": "3minute",
  "5m": "5minute",
  "15m": "15minute",
  "60m": "60minute",
  day: "day",
};

// Zerodha Kite `enctoken` — must be updated daily
const ENC_TOKEN =
  "enctoken FQexk56bfeUXwp/HY4aAEUF8J/QQ3gyuukUEUNNY3ATvLEPXDOX7goFA2+nZXK5Og6CLll6oHhYCt7DYTdcDurljG0c3tVA6zUPcq+63L4HdWMuu+Nrz+A=="; // Replace securely

// Axios instance with enctoken cookie
const axiosInstance = axios.create({
  baseURL: "https://kite.zerodha.com",
  headers: {
    authorization: ENC_TOKEN,
  },
});

function buildHistoricalUrl({
  instrumentToken,
  interval,
  userId,
  fromDate,
  toDate,
}) {
  return `/oms/instruments/historical/${instrumentToken}/${interval}?user_id=${userId}&oi=1&from=${fromDate}&to=${toDate}`;
}

function detectShootingStarPattern(data) {
  return data.map((candle) => {
    const { open, high, low, close } = candle;

    const body = Math.abs(close - open);
    const candleRange = high - low;
    const upperShadow = high - Math.max(close, open);
    const lowerShadow = Math.min(close, open) - low;

    const isShootingStar =
      candleRange > 3 * body &&
      upperShadow / (0.001 + candleRange) > 0.6 &&
      lowerShadow / (0.001 + candleRange) < 0.2;

    return { ...candle, star: isShootingStar };
  });
}

// Function to get historical candles and return as JSON
async function getCandles(symbol, fromDate, toDate, timeframe) {
  try {
    const token = tickerData[symbol].id;
    const interval = KI[timeframe];

    const url = buildHistoricalUrl({
      instrumentToken: token,
      interval: interval,
      userId: "HHS112", // Replace with your actual user ID
      fromDate: fromDate,
      toDate: toDate,
    });
    console.log("Requesting:", url);

    const response = await axiosInstance.get(url);

    const candles = response.data.data.candles;

    const formattedData = candles.map((c) => ({
      datetime: c[0],
      open: c[1],
      high: c[2],
      low: c[3],
      close: c[4],
      volume: c[5],
    }));
    const dataWithHammer = detectShootingStarPattern(formattedData);
    const data = dataWithHammer.filter((candle) => candle.star === true);
    return data;
  } catch (err) {
    console.error(
      "Failed to fetch candle data:",
      err.response?.data || err.message
    );
    return [];
  }
}

// === Example Usage ===
(async () => {
  console.log("Start");

  const data = await getCandles("NIFTY", "2025-06-09", "2025-06-11", "5m");

  if (data.length > 0) {
    console.log("OHLC Data (JSON):");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log("No data retrieved.");
  }

  console.log("Over");
})();
