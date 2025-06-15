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
    const macdData = calculateMACD(formattedData, 12, 26, 9);
    return macdData;
  } catch (err) {
    console.error(
      "Failed to fetch candle data:",
      err.response?.data || err.message
    );
    return [];
  }
}

function calculateMACD(data, len1, len2, len3) {
  const result = [];
  let emaFastPrev = null;
  let emaSlowPrev = null;
  let signalPrev = null;

  const alphaFast = 2 / (len1 + 1);
  const alphaSlow = 2 / (len2 + 1);
  const alphaSignal = 2 / (len3 + 1);

  for (let i = 0; i < data.length; i++) {
    const close = data[i].close;

    // Calculate EMA Fast
    if (i === len1 - 1) {
      const seedFast = data.slice(i - len1 + 1, i + 1);
      emaFastPrev = seedFast.reduce((sum, d) => sum + d.close, 0) / len1;
    } else if (i > len1 - 1) {
      emaFastPrev = close * alphaFast + emaFastPrev * (1 - alphaFast);
    }

    // Calculate EMA Slow
    if (i === len2 - 1) {
      const seedSlow = data.slice(i - len2 + 1, i + 1);
      emaSlowPrev = seedSlow.reduce((sum, d) => sum + d.close, 0) / len2;
    } else if (i > len2 - 1) {
      emaSlowPrev = close * alphaSlow + emaSlowPrev * (1 - alphaSlow);
    }

    let macd = null;
    if (emaFastPrev !== null && emaSlowPrev !== null) {
      macd = emaFastPrev - emaSlowPrev;

      // Signal line
      if (signalPrev === null && i >= len2 + len3 - 2) {
        const seedMACD = result.slice(i - len3 + 1, i + 1).map((d) => d.MACD);
        signalPrev = seedMACD.reduce((sum, m) => sum + m, 0) / len3;
      } else if (signalPrev !== null) {
        signalPrev = macd * alphaSignal + signalPrev * (1 - alphaSignal);
      }
    }

    const row = {
      ...data[i],
    };
    if (macd !== null) row.MACD = parseFloat(macd.toFixed(4));
    if (signalPrev !== null) row.Signal = parseFloat(signalPrev.toFixed(4));

    result.push(row);
  }

  return result;
}

// === Example Usage ===
(async () => {
  console.log("Start");

  const data = await getCandles("NIFTY", "2025-06-09", "2025-06-11", "5m");

  if (data.length > 0) {
    console.log("OHLC + Hammer Pattern Data:");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log("No data retrieved.");
  }

  console.log("Over");
})();
