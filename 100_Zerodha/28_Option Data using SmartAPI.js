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
  "enctoken 1NtaCcYZsgMBnefNkBmCsalEycLLFUEDfeP4f1at31dz4OA6bNGjxkTfLOxUOfGqs+TM5N6rUnGdhUnLpk91Fj3yJwp0jUfqF2NoXnUo89qf0Ru/O1BJjA=="; // Replace securely

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

// Zerodha

async function initializeSymbolTokenMap() {
  const url =
    "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json";
  const response = await axios.get(url);
  token_df = response.data;

  console.log("Symbol Token Map Initialized");
}

function getTokenInfo(
  exch_seg,
  instrumenttype,
  symbol,
  strike_price,
  pe_ce_eq
) {
  return token_df.filter((item) => {
    const expiry = item.expiry ? new Date(item.expiry) : null;
    const strike = parseFloat(item.strike);
    const peceMatch = item.symbol && item.symbol.endsWith(pe_ce_eq);

    return (
      item.exch_seg === exch_seg &&
      item.instrumenttype === instrumenttype &&
      item.name === symbol &&
      (strike_price ? strike === strike_price : true) &&
      peceMatch
    );
  });
}

async function main() {
  await initializeSymbolTokenMap();
  console.log("Start");
  stocks = ["SBIN", "SRF", "KTKBANK"];
  const optionToken = getTokenInfo(
    "NFO",
    "OPTIDX",
    "BANKNIFTY",
    6070000,
    "CE"
  )[0];
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
