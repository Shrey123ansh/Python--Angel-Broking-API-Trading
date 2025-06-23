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
  "enctoken 1NtaCcYZsgMBnefNkBmCsalEycLLFUEDfeP4f1at31dz4OA6bNGjxkTfLOxUOfGqs+TM5N6rUnGdhUnLpk91Fj3yJwp0jUfqF2NoXnUo89qf0Ru/O1BJjA=="; // Replace securely

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

    // Add hammer pattern
    const calculateStoch = calculateStochRSI(formattedData, 14, 3, 3);
    const lastFive = result.slice(-5).map((row) => ({
      close: row.close,
      K: row.K,
      D: row.D,
      SRSI: row.SRSI,
    }));

    return calculateStoch;
  } catch (err) {
    console.error(
      "Failed to fetch candle data:",
      err.response?.data || err.message
    );
    return [];
  }
}

function calculateStochRSI(data, period = 14, smoothK = 3, smoothD = 3) {
  const rsi = [];
  const gains = [];
  const losses = [];

  const stochRSI = [];
  const K = [];
  const D = [];

  const close = data.map((item) => item.close);
  const result = data.map((item, index) => ({ ...item }));

  // Calculate gain/loss
  for (let i = 1; i < close.length; i++) {
    const delta = close[i] - close[i - 1];
    gains.push(delta > 0 ? delta : 0);
    losses.push(delta < 0 ? -delta : 0);
  }

  // Compute RSI
  for (let i = 0; i < close.length; i++) {
    if (i < period) {
      rsi.push(null);
    } else {
      const avgGain =
        gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      const avgLoss =
        losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi.push(100 - 100 / (1 + rs));
    }
  }

  // Compute StochRSI
  for (let i = 0; i < rsi.length; i++) {
    if (i < period * 2) {
      stochRSI.push(null);
    } else {
      const rsiSlice = rsi.slice(i - period + 1, i + 1);
      const minRSI = Math.min(...rsiSlice);
      const maxRSI = Math.max(...rsiSlice);
      const currentRSI = rsi[i];
      const value = (currentRSI - minRSI) / (maxRSI - minRSI);
      stochRSI.push(value);
    }
  }

  // Smooth K
  for (let i = 0; i < stochRSI.length; i++) {
    if (i < period * 2 + smoothK - 1) {
      K.push(null);
    } else {
      const slice = stochRSI.slice(i - smoothK + 1, i + 1);
      const avg = slice.reduce((a, b) => a + b, 0) / smoothK;
      K.push(avg);
    }
  }

  // Smooth D
  for (let i = 0; i < K.length; i++) {
    if (i < period * 2 + smoothK + smoothD - 2) {
      D.push(null);
    } else {
      const slice = K.slice(i - smoothD + 1, i + 1);
      const avg = slice.reduce((a, b) => a + b, 0) / smoothD;
      D.push(avg);
    }
  }

  // Combine with input data
  for (let i = 0; i < data.length; i++) {
    result[i]["SRSI"] = stochRSI[i] ?? null;
    result[i]["K"] = K[i] ?? null;
    result[i]["D"] = D[i] ?? null;
  }

  return result;
}

// === Example Usage ===
(async () => {
  console.log("Start");

  const data = await getCandles("NIFTY", "2025-06-09", "2025-06-11", "15m");

  if (data.length > 0) {
    console.log("OHLC + Hammer Pattern Data:");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log("No data retrieved.");
  }

  console.log("Over");
})();
