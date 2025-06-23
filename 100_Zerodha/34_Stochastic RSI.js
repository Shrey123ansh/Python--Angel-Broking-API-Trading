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
  "enctoken ax33sqPMbIUhl7cga8qG44Kx37aaAEZoY3ec4q00VohWMglM+MqvqsKo0IbTwvIEnFNhs1UWrcnFvPlFk7vKD0T+f3/vVeJXtlHdts+fPl4P2w0022Fx0w=="; // Replace securely

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
    const result = calculateStoch.slice(-5).map((row) => ({
      datetime: row.datetime,
      close: row.close,
      K: row.K,
      D: row.D,
      SRSI: row.SRSI,
    }));

    return result;
  } catch (err) {
    console.error(
      "Failed to fetch candle data:",
      err.response?.data || err.message
    );
    return [];
  }
}

function calculateStochRSI(data, period = 14, smoothK = 3, smoothD = 3) {
  const closes = data.map(d => d.close);
  const deltas = closes.map((v, i) => i === 0 ? 0 : v - closes[i - 1]);

  // Gains and losses using clipping
  const gains = deltas.map(d => Math.max(d, 0));
  const losses = deltas.map(d => Math.max(-d, 0));

  const avgGains = [];
  const avgLosses = [];
  const rsis = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      avgGains.push(null);
      avgLosses.push(null);
      rsis.push(null);
      continue;
    }

    const gainSlice = gains.slice(i - period + 1, i + 1);
    const lossSlice = losses.slice(i - period + 1, i + 1);
    const avgGain = gainSlice.reduce((a, b) => a + b, 0) / period;
    const avgLoss = lossSlice.reduce((a, b) => a + b, 0) / period;
    avgGains.push(avgGain);
    avgLosses.push(avgLoss);

    const rs = avgGain / (avgLoss || 1e-10); // avoid div by zero
    const rsi = 100 - (100 / (1 + rs));
    rsis.push(rsi);
  }

  // Calculate StochRSI
  const stochRSIs = [];
  for (let i = 0; i < rsis.length; i++) {
    if (i < period * 2 - 1 || rsis[i] == null) {
      stochRSIs.push(null);
      continue;
    }
    const rsiSlice = rsis.slice(i - period + 1, i + 1);
    const minRSI = Math.min(...rsiSlice);
    const maxRSI = Math.max(...rsiSlice);
    const stochRsi = (rsis[i] - minRSI) / (maxRSI - minRSI || 1e-10); // avoid div by 0
    stochRSIs.push(stochRsi);
  }

  // Smooth %K
  const Ks = stochRSIs.map((val, i) => {
    if (i < smoothK - 1 || val == null) return null;
    const slice = stochRSIs.slice(i - smoothK + 1, i + 1).filter(x => x != null);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });

  // Smooth %D
  const Ds = Ks.map((val, i) => {
    if (i < smoothD - 1 || val == null) return null;
    const slice = Ks.slice(i - smoothD + 1, i + 1).filter(x => x != null);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });

  // Final result
  return data.map((entry, i) => ({
    datetime: entry.datetime || entry.timestamp || entry.date,
    close: entry.close,
    SRSI: stochRSIs[i] != null ? Number((stochRSIs[i] * 100).toFixed(2)) : null,
    K: Ks[i] != null ? Number((Ks[i] * 100).toFixed(2)) : null,
    D: Ds[i] != null ? Number((Ds[i] * 100).toFixed(2)) : null
  }));
}


// === Example Usage ===
(async () => {
  console.log("Start");

  const data = await getCandles("NIFTY", "2025-06-23", "2025-06-23", "5m");

  if (data.length > 0) {
    console.log("OHLC + Hammer Pattern Data:");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log("No data retrieved.");
  }

  console.log("Over");
})();
