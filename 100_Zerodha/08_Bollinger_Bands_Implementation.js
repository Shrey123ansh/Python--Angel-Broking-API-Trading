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
    const bbData = calculateBollingerBands(formattedData, 20, 2);
    return bbData;
  } catch (err) {
    console.error(
      "Failed to fetch candle data:",
      err.response?.data || err.message
    );
    return [];
  }
}

function calculateBollingerBands(data, n, stdMultiplier) {
  const result = [];

  for (let i = 0; i < data.length; i++) {
    if (i < n - 1) {
      result.push({ ...data[i] });
      continue;
    }

    const windowSlice = data.slice(i - n + 1, i + 1);
    const closes = windowSlice.map((d) => d.close);

    const mean = closes.reduce((sum, c) => sum + c, 0) / n;

    const variance = closes.reduce((sum, c) => sum + (c - mean) ** 2, 0) / n;

    const std = Math.sqrt(variance);

    result.push({
      ...data[i],
      MA: parseFloat(mean.toFixed(2)),
      BB_up: parseFloat((mean + stdMultiplier * std).toFixed(2)),
      BB_dn: parseFloat((mean - stdMultiplier * std).toFixed(2)),
      BB_width: parseFloat((2 * stdMultiplier * std).toFixed(2)),
    });
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
