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

function calculateATR(data, period) {
  const trList = [];
  for (let i = 0; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const closePrev = i > 0 ? data[i - 1].close : high;

    const hl = high - low;
    const hc = Math.abs(high - closePrev);
    const lc = Math.abs(low - closePrev);

    trList.push(Math.max(hl, hc, lc));
  }

  const atr = [];
  let sum = 0;
  for (let i = 0; i < trList.length; i++) {
    sum += trList[i];
    if (i >= period - 1) {
      if (i === period - 1) {
        atr.push(sum / period);
      } else {
        const prevATR = atr[atr.length - 1];
        atr.push((prevATR * (period - 1) + trList[i]) / period);
      }
    } else {
      atr.push(null);
    }
  }
  return atr;
}

function exponentialMovingAverage(data, period) {
  const ema = [];
  let k = 2 / (period + 1);
  let prev = null;
  for (let i = 0; i < data.length; i++) {
    if (data[i] === null) {
      ema.push(null);
    } else if (prev === null) {
      prev = data[i];
      ema.push(prev);
    } else {
      const val = data[i] * k + prev * (1 - k);
      ema.push(val);
      prev = val;
    }
  }
  return ema;
}

function calculateADX(data, period = 14) {
  const upMove = [];
  const downMove = [];
  const plusDM = [];
  const minusDM = [];

  for (let i = 0; i < data.length; i++) {
    const currHigh = data[i].high;
    const currLow = data[i].low;
    const prevHigh = i > 0 ? data[i - 1].high : currHigh;
    const prevLow = i > 0 ? data[i - 1].low : currLow;

    const up = currHigh - prevHigh;
    const down = prevLow - currLow;

    upMove.push(up > down && up > 0 ? up : 0);
    downMove.push(down > up && down > 0 ? down : 0);
  }

  const atr = calculateATR(data, period);
  const plusDI = exponentialMovingAverage(
    (plusDM = upMove.map((val, i) => (atr[i] ? (100 * val) / atr[i] : null))),
    period
  );
  const minusDI = exponentialMovingAverage(
    (minusDM = downMove.map((val, i) =>
      atr[i] ? (100 * val) / atr[i] : null
    )),
    period
  );

  const dx = plusDI.map((pdi, i) => {
    const mdi = minusDI[i];
    if (pdi === null || mdi === null || pdi + mdi === 0) return null;
    return (100 * Math.abs(pdi - mdi)) / (pdi + mdi);
  });

  const adx = exponentialMovingAverage(dx, period);

  // Combine into final JSON
  return data.map((row, i) => ({
    datetime: row.datetime,
    "+DI": plusDI[i],
    "-DI": minusDI[i],
    ADX: adx[i],
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
    const adxResult = calculateADX(formattedData, 14);

    return adxResult;
  } catch (err) {
    console.error(
      "Failed to fetch candle data:",
      err.response?.data || err.message
    );
    return [];
  }
}

async function main() {
  const data = await getCandles("NIFTY", "2025-06-09", "2025-06-11", "5m");
  console.log("Data:", data);
}

main();
