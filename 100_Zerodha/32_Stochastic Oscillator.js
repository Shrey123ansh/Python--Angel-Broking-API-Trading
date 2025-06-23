const axios = require("axios");

let token_df = [];

const tickerData = {
  NIFTY: { id: 256265 },
  BANKNIFTY: { id: 260105 },
  SBIN: { id: 779521 },
  SRF: { id: 837889 },
  KTKBANK: { id: 2061825 },
  SBIN: { id: 6278145 },
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

function rollingMax(arr, period) {
  return arr.map((_, i) =>
    i < period - 1 ? null : Math.max(...arr.slice(i - period + 1, i + 1))
  );
}

function rollingMin(arr, period) {
  return arr.map((_, i) =>
    i < period - 1 ? null : Math.min(...arr.slice(i - period + 1, i + 1))
  );
}

function sma(arr, period) {
  return arr.map((_, i) =>
    i < period - 1
      ? null
      : arr.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
  );
}

function stochasticOscillator(df, lookback = 14, k = 3, d = 3) {
  const highs = df.map((row) => row.high);
  const lows = df.map((row) => row.low);
  const closes = df.map((row) => row.close);

  const HH = rollingMax(highs, lookback);
  const LL = rollingMin(lows, lookback);

  // Calculate raw %K
  const rawK = closes.map((close, i) => {
    if (HH[i] === null || LL[i] === null || HH[i] === LL[i]) return null;
    return (100 * (close - LL[i])) / (HH[i] - LL[i]);
  });

  const smoothK = sma(rawK, k);
  const smoothD = sma(smoothK, d);

  return df.map((row, i) => ({
    ...row,
    "%K": smoothK[i],
    "%D": smoothD[i],
  }));
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
    const hammer_df = stochasticOscillator(formattedData, 14, 3, 3);
    // const hammerCandles = hammer_df.filter((row) => row.hammer === true);

    return hammer_df;
  } catch (err) {
    console.error(
      "Failed to fetch candle data:",
      err.response?.data || err.message
    );
    return [];
  }
}

async function main() {
  const data = await getCandles("SBIN", "2025-06-09", "2025-06-11", "5m");
  console.log("Data:", data);
}

main();
