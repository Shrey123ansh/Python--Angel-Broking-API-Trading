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

// Camarilla Level Calculator using daily OHLC candles
async function calculateCamarillaLevels(symbol, fromDate, toDate) {
  const dailyData = await getCandles(symbol, fromDate, toDate, "day");

  if (dailyData.length < 2) {
    console.error("Not enough data to calculate Camarilla levels.");
    return;
  }

  const prevDay = dailyData[dailyData.length - 2]; // second last daily candle
  const dphigh = parseFloat(prevDay.high.toFixed(2));
  const dplow = parseFloat(prevDay.low.toFixed(2));
  const dpclose = parseFloat(prevDay.close.toFixed(2));
  const dprange = dphigh - dplow;

  const pivot = (dphigh + dplow + dpclose) / 3.0;
  const bc = (dphigh + dplow) / 2.0;
  const tc = 2 * pivot - bc;

  const h1 = dpclose + dprange * (1.1 / 12);
  const h2 = dpclose + dprange * (1.1 / 6);
  const h3 = dpclose + dprange * (1.1 / 4);
  const h4 = dpclose + dprange * (1.1 / 2);
  const h5 = (dphigh / dplow) * dpclose;

  const l1 = dpclose - dprange * (1.1 / 12);
  const l2 = dpclose - dprange * (1.1 / 6);
  const l3 = dpclose - dprange * (1.1 / 4);
  const l4 = dpclose - dprange * (1.1 / 2);
  const l5 = dpclose - (h5 - dpclose);

  console.log(`Camarilla Levels for ${symbol} on ${prevDay.datetime}:`);
  console.log(
    "Pivot:",
    pivot.toFixed(2),
    "| BC:",
    bc.toFixed(2),
    "| TC:",
    tc.toFixed(2)
  );
  console.log(
    "H1:",
    h1.toFixed(2),
    "H2:",
    h2.toFixed(2),
    "H3:",
    h3.toFixed(2),
    "H4:",
    h4.toFixed(2),
    "H5:",
    h5.toFixed(2)
  );
  console.log(
    "L1:",
    l1.toFixed(2),
    "L2:",
    l2.toFixed(2),
    "L3:",
    l3.toFixed(2),
    "L4:",
    l4.toFixed(2),
    "L5:",
    l5.toFixed(2)
  );

  return {
    date: prevDay.datetime,
    pivot,
    bc,
    tc,
    h1,
    h2,
    h3,
    h4,
    h5,
    l1,
    l2,
    l3,
    l4,
    l5,
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
  const intradayData = await getCandles("BANKNIFTY", fromDate, toDate, "5m");

  if (intradayData.length > 0) {
    console.log("Intraday 5m Data Retrieved:", intradayData.length);
  } else {
    console.log("No intraday data.");
  }

  // === New: Calculate Camarilla levels using daily candles ===
  const camarilla = await calculateCamarillaLevels(
    "BANKNIFTY",
    fromDate,
    toDate
  );
  console.log("Camarilla Output:", camarilla);

  console.log("Over");
})();
