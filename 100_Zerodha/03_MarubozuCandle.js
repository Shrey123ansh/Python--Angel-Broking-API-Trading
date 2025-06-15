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
    const ma_df = detectMarubozuPattern(formattedData);
    const data = ma_df.filter((candle) => candle.maru_bozu !== false);
    return data;
  } catch (err) {
    console.error(
      "Failed to fetch candle data:",
      err.response?.data || err.message
    );
    return [];
  }
}

function detectMarubozuPattern(data) {
  const candleSizes = data.map((c) => Math.abs(c.close - c.open));
  const sorted = [...candleSizes].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianCandleSize =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  return data.map((candle) => {
    const { open, high, low, close } = candle;
    const h_c = high - close;
    const l_o = low - open;
    const h_o = high - open;
    const l_c = low - close;

    const body = Math.abs(close - open);
    const maxWickGreen = Math.max(Math.abs(h_c), Math.abs(l_o));
    const maxWickRed = Math.max(Math.abs(h_o), Math.abs(l_c));

    let maru_bozu = false;
    if (
      close > open &&
      body > 2 * medianCandleSize &&
      maxWickGreen < 0.003 * medianCandleSize
    ) {
      maru_bozu = "maru_bozu_green";
    } else if (
      open > close &&
      body > 2 * medianCandleSize &&
      maxWickRed < 0.003 * medianCandleSize
    ) {
      maru_bozu = "maru_bozu_red";
    }

    return { ...candle, maru_bozu };
  });
}

// === Example Usage ===
(async () => {
  console.log("Start");

  const data = await getCandles("NIFTY", "2021-01-06", "2021-06-05", "15m");

  if (data.length > 0) {
    console.log("OHLC + Hammer Pattern Data:");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log("No data retrieved.");
  }

  console.log("Over");
})();
