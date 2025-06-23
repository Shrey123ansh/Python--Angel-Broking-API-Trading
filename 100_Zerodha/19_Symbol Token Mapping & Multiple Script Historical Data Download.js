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
  "enctoken 9826iOT2t0y9LOxSwRszlzBeUay667iuQ7zS7nnkw9F16Z+nmj34D6nQO/8d1NxMSOQAutuJCCSSjkT/PSrF83A6Nmox8sQGtTqdRc54/7QJVnyC+wvC3g=="; // Replace securely

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

// === Hammer Candlestick Pattern Detector ===
function detectHammerPattern(data) {
  return data.map((candle) => {
    const { open, high, low, close } = candle;
    const bodyLength = Math.abs(close - open);
    const totalRange = high - low;
    const lowerShadowClose = (close - low) / (0.001 + totalRange);
    const lowerShadowOpen = (open - low) / (0.001 + totalRange);

    const isHammer =
      totalRange > 3 * bodyLength &&
      lowerShadowClose > 0.6 &&
      lowerShadowOpen > 0.6 &&
      bodyLength > 0.1 * totalRange;

    return { ...candle, hammer: isHammer };
  });
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
    const dataWithHammer = detectHammerPattern(formattedData);
    const onlyHammers = dataWithHammer.filter(
      (candle) => candle.hammer === true
    );
    return onlyHammers;
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

  const optionToken = getTokenInfo("NSE", "SBIN", null, "EQ")[0];
  console.log("SBINToken:", optionToken);

  const data = await getCandles(
    optionToken.name,
    "2025-06-09",
    "2025-06-11",
    "5m"
  );
  console.log("Data:", data);
}

main();
