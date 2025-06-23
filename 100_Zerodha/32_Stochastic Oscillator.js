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

function calculateStochastic(data, lookback = 14, kPeriod = 3, dPeriod = 3) {
  const result = [];
  const kSmoothedList = [];

  for (let i = 0; i < data.length; i++) {
    if (i < lookback - 1) {
      result.push({
        ...data[i],
        K: undefined,
        D: undefined,
      });
      continue;
    }

    // Highest High and Lowest Low over lookback period
    const slice = data.slice(i - lookback + 1, i + 1);
    const highVals = slice.map((d) => d.high);
    const lowVals = slice.map((d) => d.low);

    const highestHigh = Math.max(...highVals);
    const lowestLow = Math.min(...lowVals);

    const close = data[i].close;

    // Raw %K
    const kRaw = (100 * (close - lowestLow)) / (highestHigh - lowestLow);

    // Smooth %K over kPeriod
    const recentKRaw = result
      .slice(Math.max(0, result.length - (kPeriod - 1)), result.length)
      .map((d) => (d.K_raw !== undefined ? d.K_raw : null))
      .filter((v) => v !== null);

    recentKRaw.push(kRaw);

    const kSmoothed =
      recentKRaw.length === kPeriod
        ? recentKRaw.reduce((a, b) => a + b, 0) / kPeriod
        : undefined;

    if (kSmoothed !== undefined) kSmoothedList.push(kSmoothed);

    // Smooth %D over dPeriod from %K smoothed values
    const recentKSmoothed = kSmoothedList.slice(-dPeriod);
    const dSmoothed =
      recentKSmoothed.length === dPeriod
        ? recentKSmoothed.reduce((a, b) => a + b, 0) / dPeriod
        : undefined;

    result.push({
      ...data[i],
      K_raw: kRaw,
      K: kSmoothed !== undefined ? parseFloat(kSmoothed.toFixed(2)) : undefined,
      D: dSmoothed !== undefined ? parseFloat(dSmoothed.toFixed(2)) : undefined,
    });
  }

  // Optionally remove K_raw if not needed
  return result.map(({ K_raw, ...rest }) => rest);
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
    const hammer_df = calculateStochastic(formattedData, 14, 3, 3);
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
  const data = await getCandles("NIFTY", "2025-06-23", "2025-06-23", "5m");
  console.log("Data:", data);
}

main();
