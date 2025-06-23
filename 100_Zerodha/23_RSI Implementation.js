const axios = require("axios");

let token_df = [];

const tickerData = {
  NIFTY: { id: 256265 },
  BANKNIFTY: { id: 260105 },
  SBIN: { id: 779521 },
  SRF: { id: 837889 },
  KTKBANK: { id: 2061825 },
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

// Interval mapping
const KI = {
  "3m": "3minute",
  "5m": "5minute",
  "15m": "15minute",
  "60m": "60minute",
  day: "day",
};

function calculateRSI(data, period = 14) {
  const rsi = [];
  let gains = 0;
  let losses = 0;

  // Step 1: Calculate initial average gain/loss over the first `period`
  for (let i = 1; i <= period; i++) {
    const delta = data[i].close - data[i - 1].close;
    if (delta >= 0) {
      gains += delta;
    } else {
      losses -= delta; // loss is negative delta
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  let rs = avgGain / avgLoss;
  let rsiVal = 100 - 100 / (1 + rs);
  rsi[period] = { ...data[period], rsi: rsiVal };

  // Step 2: Continue using Wilder’s smoothing method
  for (let i = period + 1; i < data.length; i++) {
    const delta = data[i].close - data[i - 1].close;
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? -delta : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsiVal = 100 - 100 / (1 + rs);

    rsi[i] = { ...data[i], rsi: rsiVal };
  }

  // Fill in the earlier indices with null
  for (let i = 0; i < period; i++) {
    rsi[i] = { ...data[i], rsi: null };
  }

  return rsi;
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
    const calculate = calculateRSI(formattedData, 14);
    return calculate;
  } catch (err) {
    console.error(
      "Failed to fetch candle data:",
      err.response?.data || err.message
    );
    return [];
  }
}

// Zerodha

async function initializeSymbolTokenMap() {
  const url =
    "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json";
  const response = await axios.get(url);
  token_df = response.data;

  console.log("Symbol Token Map Initialized");
}

function getTokenInfo(exch_seg, symbol, strike_price, pe_ce_eq) {
  return token_df.filter((item) => {
    const peceMatch = item.symbol && item.symbol.endsWith(pe_ce_eq);

    return item.exch_seg === exch_seg && item.name === symbol && peceMatch;
  });
}

async function main() {
  await initializeSymbolTokenMap();
  console.log("Start");
  stocks = ["SBIN", "SRF", "KTKBANK"];

  const optionToken = getTokenInfo("NSE", "SBIN", null, "")[0];
  console.log("SBINToken:", optionToken);

  const data = await getCandles(
    optionToken.name,
    "2025-06-20",
    "2025-06-23",
    "5m"
  );
  console.log("Data:", data);
}

main();
