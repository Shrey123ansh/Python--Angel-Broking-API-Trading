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
  "enctoken g9acyh1fMIoZ1ReGSFrvvEZqdcAiHJIu/ztIa2fslJ6nz5aIK6Sb4k28+NnYo9D2DhGQPQ5MuUMXRvOzGjblEPraXLFQTw3t6o0fBkV2PMVntSL0OfW4ng=="; // Replace securely

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

async function calculateCustomPivotLevels(symbol, fromDate, toDate) {
  const dailyData = await getCandles(symbol, fromDate, toDate, "day");

  if (dailyData.length < 2) {
    console.error("Not enough daily candles to calculate pivot levels.");
    return;
  }

  // Use the second last day for full candle
  const prevDay = dailyData[dailyData.length - 2];

  const high = parseFloat(prevDay.high.toFixed(2));
  const low = parseFloat(prevDay.low.toFixed(2));
  const close = parseFloat(prevDay.close.toFixed(2));

  const pivot = parseFloat(((high + low + close) / 3).toFixed(2));

  const r1 = parseFloat((2 * pivot - low).toFixed(2));
  const r2 = parseFloat((pivot + (high - low)).toFixed(2));
  const r3 = parseFloat((high + 2 * (pivot - low)).toFixed(2));

  const s1 = parseFloat((2 * pivot - high).toFixed(2));
  const s2 = parseFloat((pivot - (high - low)).toFixed(2));
  const s3 = parseFloat((low - 2 * (high - pivot)).toFixed(2));

  console.log(`📈 Custom Pivot Levels for ${symbol} on ${prevDay.datetime}:`);
  console.log(`Pivot: ${pivot}`);
  console.log(`R1: ${r1} | R2: ${r2} | R3: ${r3}`);
  console.log(`S1: ${s1} | S2: ${s2} | S3: ${s3}`);

  return {
    date: prevDay.datetime,
    high,
    low,
    close,
    pivot,
    r1,
    r2,
    r3,
    s1,
    s2,
    s3,
  };
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
    return formattedData;
  } catch (err) {
    console.error(
      "Failed to fetch candle data:",
      err.response?.data || err.message
    );
    return [];
  }
}

(async () => {
  console.log("Start");

  const fromDate = "2025-06-20";
  const toDate = "2025-06-24"; // Must include 1 day beyond to cover full last day

  // Fetch 5m candles (you already do this)
  const intradayData = await getCandles("SBIN", fromDate, toDate, "5m");

  if (intradayData.length > 0) {
    console.log("Intraday 5m Data Retrieved:", intradayData.length);
  } else {
    console.log("No intraday data.");
  }

  // === New: Calculate Camarilla levels using daily candles ===
  const camarilla = await calculateCustomPivotLevels("SBIN", fromDate, toDate);
  console.log("Camarilla Output:", camarilla);

  console.log("Over");
})();
