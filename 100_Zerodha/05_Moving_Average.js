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

function movingAverage(data, len1, len2) {
  const result = [];

  let emaPrev = null;

  for (let i = 0; i < data.length; i++) {
    const candle = { ...data[i] };

    // === SMA Calculation ===
    if (i >= len1 - 1) {
      const smaSlice = data.slice(i - len1 + 1, i + 1);
      const sma = smaSlice.reduce((sum, c) => sum + c.close, 0) / len1;
      candle.MA_Simple = parseFloat(sma.toFixed(2));
    }

    // === EMA Calculation ===
    if (i >= len2 - 1) {
      const alpha = 2 / (len2 + 1);
      if (emaPrev === null) {
        // Seed EMA using SMA of the first len2 candles
        const seedSlice = data.slice(i - len2 + 1, i + 1);
        emaPrev = seedSlice.reduce((sum, c) => sum + c.close, 0) / len2;
      } else {
        emaPrev = data[i].close * alpha + emaPrev * (1 - alpha);
      }
      candle.MA_Exponential = parseFloat(emaPrev.toFixed(2));
    }

    result.push(candle);
  }

  return result;
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
    const data = movingAverage(formattedData, 8, 10);
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
