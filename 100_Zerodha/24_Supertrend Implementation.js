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

function calculateSupertrend(data, atrPeriod = 7, multiplier = 3) {
  const atrData = calculateATR(data, atrPeriod);
  const result = [];

  let inUptrend = true;

  for (let i = 0; i < atrData.length; i++) {
    const current = atrData[i];
    const previous = result[i - 1] || {};

    const hl2 = (current.high + current.low) / 2;
    const atr = current.ATR;

    let upperBand = atr !== undefined ? hl2 + multiplier * atr : undefined;
    let lowerBand = atr !== undefined ? hl2 - multiplier * atr : undefined;

    if (i < atrPeriod || atr === undefined) {
      result.push({
        ...current,
        UpperBand: undefined,
        LowerBand: undefined,
        Supertrend: undefined,
        inUptrend: undefined,
      });
      continue;
    }

    // Determine trend direction
    if (current.close > previous.UpperBand) {
      inUptrend = true;
    } else if (current.close < previous.LowerBand) {
      inUptrend = false;
    } else {
      inUptrend = previous.inUptrend;

      // Adjust bands based on trend continuation
      if (inUptrend && lowerBand < previous.LowerBand) {
        lowerBand = previous.LowerBand;
      }
      if (!inUptrend && upperBand > previous.UpperBand) {
        upperBand = previous.UpperBand;
      }
    }

    const supertrend = inUptrend ? lowerBand : upperBand;

    result.push({
      ...current,
      UpperBand: parseFloat(upperBand.toFixed(2)),
      LowerBand: parseFloat(lowerBand.toFixed(2)),
      Supertrend: parseFloat(supertrend.toFixed(2)),
      inUptrend,
    });
  }

  return result.map((d) => ({
    time: d.time,
    close: d.close,
    Supertrend: d.Supertrend,
    inUptrend: d.inUptrend,
  }));
}

function calculateATR(data, n) {
  const result = [];
  let prevClose = null;
  let trList = [];
  let atr = null;

  for (let i = 0; i < data.length; i++) {
    const { high, low, close, time } = data[i]; // include time

    const hl = Math.abs(high - low);
    const hpc = prevClose !== null ? Math.abs(high - prevClose) : 0;
    const lpc = prevClose !== null ? Math.abs(low - prevClose) : 0;

    const tr = Math.max(hl, hpc, lpc);
    trList.push(tr);

    if (trList.length === n) {
      atr = trList.reduce((sum, val) => sum + val, 0) / n;
    } else if (trList.length > n) {
      const alpha = 2 / (n + 1);
      atr = alpha * tr + (1 - alpha) * atr;
    }

    result.push({
      ...data[i],
      ATR: atr !== null ? parseFloat(atr.toFixed(2)) : undefined,
      time, // make sure time is explicitly included
    });

    prevClose = close;
  }

  return result;
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
      time: c[0],
      open: c[1],
      high: c[2],
      low: c[3],
      close: c[4],
      volume: c[5],
    }));

    // Add supertrendResult pattern
    const supertrendResult = calculateSupertrend(formattedData, 7, 3);
    return supertrendResult;
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
