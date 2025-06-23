const axios = require("axios");

// Instrument tokens
// Instrument tokens
const tickerData = {
  NIFTY: { id: 256265 },
  BANKNIFTY: { id: 260105 },
  SBIN: { id: 779521 },
  SRF: { id: 837889 },
  KTKBANK: { id: 2061825 },
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

function calculateMovingAverages(candles, len1, len2) {
  const result = [...candles];

  // Simple Moving Average
  for (let i = 0; i < candles.length; i++) {
    if (i + 1 >= len1) {
      const sum = candles
        .slice(i + 1 - len1, i + 1)
        .reduce((acc, val) => acc + val.close, 0);
      result[i].MA_Simple = sum / len1;
    } else {
      result[i].MA_Simple = null;
    }
  }

  // Exponential Moving Average
  let emaPrev = null;
  const k = 2 / (len2 + 1);

  for (let i = 0; i < candles.length; i++) {
    const close = candles[i].close;

    if (i + 1 < len2) {
      result[i].MA_Exponential = null;
    } else if (i + 1 === len2) {
      // First EMA is just SMA
      const sma =
        candles
          .slice(i + 1 - len2, i + 1)
          .reduce((acc, val) => acc + val.close, 0) / len2;
      result[i].MA_Exponential = sma;
      emaPrev = sma;
    } else {
      emaPrev = close * k + emaPrev * (1 - k);
      result[i].MA_Exponential = emaPrev;
    }
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
    const data = calculateMovingAverages(formattedData, 8, 10);
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

  const data = await getCandles("SBIN", "2025-06-20", "2025-06-23", "5m");

  if (data.length > 0) {
    console.log("OHLC Data (JSON):");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log("No data retrieved.");
  }

  console.log("Over");
})();
