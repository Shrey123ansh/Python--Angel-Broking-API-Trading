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

function calculateATR(data, period) {
  const trList = [];
  const atr = [];
  for (let i = 0; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = i > 0 ? data[i - 1].close : data[i].close;

    const hl = high - low;
    const hc = Math.abs(high - prevClose);
    const lc = Math.abs(low - prevClose);

    const tr = Math.max(hl, hc, lc);
    trList.push(tr);

    if (i === period - 1) {
      const initialATR = trList.slice(0, period).reduce((a, b) => a + b, 0) / period;
      atr.push(initialATR);
    } else if (i >= period) {
      const prevATR = atr[atr.length - 1];
      const currentATR = (prevATR * (period - 1) + trList[i]) / period;
      atr.push(currentATR);
    } else {
      atr.push(null); // Not enough data yet
    }
  }
  return atr;
}

function calculateADX(data, period = 14) {
  const atr = calculateATR(data, period);
  const result = [];

  let plusDM_EMA = null;
  let minusDM_EMA = null;
  let adxEMA = null;

  const alpha = 1 / period;

  for (let i = 0; i < data.length; i++) {
    const current = data[i];
    const prev = data[i - 1];

    if (!prev || atr[i] === null) {
      result.push({
        time: current.datetime || current.time,
        plusDI: undefined,
        minusDI: undefined,
        ADX: undefined,
      });
      continue;
    }

    const upMove = current.high - prev.high;
    const downMove = prev.low - current.low;

    const plusDM = upMove > downMove && upMove > 0 ? upMove : 0;
    const minusDM = downMove > upMove && downMove > 0 ? downMove : 0;

    if (plusDM_EMA === null) {
      plusDM_EMA = plusDM;
      minusDM_EMA = minusDM;
    } else {
      plusDM_EMA = alpha * plusDM + (1 - alpha) * plusDM_EMA;
      minusDM_EMA = alpha * minusDM + (1 - alpha) * minusDM_EMA;
    }

    const plusDI = (100 * plusDM_EMA) / atr[i];
    const minusDI = (100 * minusDM_EMA) / atr[i];
    const dx = (100 * Math.abs(plusDI - minusDI)) / (plusDI + minusDI || 1);

    if (adxEMA === null) {
      adxEMA = dx;
    } else {
      adxEMA = alpha * dx + (1 - alpha) * adxEMA;
    }

    result.push({
      time: current.datetime || current.time,
      plusDI: parseFloat(plusDI.toFixed(2)),
      minusDI: parseFloat(minusDI.toFixed(2)),
      ADX: parseFloat(adxEMA.toFixed(2)),
    });
  }

  return result;
}

// Function to get historical candles and return as JSON
async function getCandles(symbol, fromDate, toDate, timeframe) {
  try {
    const period = 14; // ✅ FIX: define the period here

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

    // 🔧 Use the declared period
    const adxResult = calculateADX(formattedData, period);

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
  const data = await getCandles("NIFTY", "2025-06-23", "2025-06-23", "5m");
  console.log("Data:", data);
}

main();
