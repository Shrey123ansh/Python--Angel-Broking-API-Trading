const axios = require("axios");

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
    const atrData = calculateATR(formattedData, 14);
    return atrData;
  } catch (err) {
    console.error(
      "Failed to fetch candle data:",
      err.response?.data || err.message
    );
    return [];
  }
}

function calculateATR(data, n) {
  const result = [];
  let prevClose = null;
  let trList = [];
  let atr = null;

  for (let i = 0; i < data.length; i++) {
    const { high, low, close } = data[i];

    const hl = Math.abs(high - low);
    const hpc = prevClose !== null ? Math.abs(high - prevClose) : 0;
    const lpc = prevClose !== null ? Math.abs(low - prevClose) : 0;

    const tr = Math.max(hl, hpc, lpc);
    trList.push(tr);

    // Calculate ATR using EMA formula after n periods
    if (trList.length === n) {
      atr = trList.reduce((sum, val) => sum + val, 0) / n;
    } else if (trList.length > n) {
      const alpha = 2 / (n + 1);
      atr = alpha * tr + (1 - alpha) * atr;
    }

    result.push({
      ...data[i],
      ATR: atr !== null ? parseFloat(atr.toFixed(2)) : undefined,
    });

    prevClose = close;
  }

  return result;
}

// === Example Usage ===
(async () => {
  console.log("Start");

  const data = await getCandles("SBIN", "2025-06-20", "2025-06-23", "5m");

  if (data.length > 0) {
    console.log("OHLC + Hammer Pattern Data:");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log("No data retrieved.");
  }

  console.log("Over");
})();
