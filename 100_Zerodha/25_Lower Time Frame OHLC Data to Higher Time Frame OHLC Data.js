const axios = require("axios");
const moment = require("moment");

// Zerodha setup
const tickerData = { NIFTY: { id: 256265 } /* ... */ };
const KI = { "3m": "3minute", day: "day", "15m": "15minute" };
const ENC_TOKEN =
  "enctoken g9acyh1fMIoZ1ReGSFrvvEZqdcAiHJIu/ztIa2fslJ6nz5aIK6Sb4k28+NnYo9D2DhGQPQ5MuUMXRvOzGjblEPraXLFQTw3t6o0fBkV2PMVntSL0OfW4ng==";
const axiosInstance = axios.create({
  baseURL: "https://kite.zerodha.com",
  headers: { authorization: ENC_TOKEN },
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

// Fetch historical candles
async function getCandles(symbol, fromDate, toDate, timeframe) {
  const token = tickerData[symbol].id;
  const interval = KI[timeframe];
  const url = buildHistoricalUrl({
    instrumentToken: token,
    interval,
    userId: "HHS112",
    fromDate,
    toDate,
  });
  const res = await axiosInstance.get(url);
  return res.data.data.candles.map((c) => ({
    datetime: moment(c[0]).toISOString(),
    open: c[1],
    high: c[2],
    low: c[3],
    close: c[4],
    volume: c[5],
  }));
}

// Resample 3-min data to 15-min
function resampleTo15Min(data) {
  // Filter by time window
  const filtered = data.filter((d) => {
    const t = moment(d.datetime);
    const h = t.hour(),
      m = t.minute();
    return (h > 9 || (h === 9 && m >= 15)) && (h < 15 || (h === 15 && m <= 30));
  });

  // Bucket data by day + 15-min slot
  const buckets = {};
  filtered.forEach((d) => {
    const t = moment(d.datetime);
    const day = t.format("YYYY-MM-DD");
    const minuteSlot = Math.floor(t.minute() / 15) * 15;
    const slotKey = `${day}T${String(t.hour()).padStart(2, "0")}:${String(
      minuteSlot
    ).padStart(2, "0")}:00`;
    buckets[slotKey] = buckets[slotKey] || [];
    buckets[slotKey].push(d);
  });

  return Object.entries(buckets)
    .sort()
    .map(([slotStart, arr]) => {
      const opens = arr.map((x) => x.open);
      const highs = arr.map((x) => x.high);
      const lows = arr.map((x) => x.low);
      const closes = arr.map((x) => x.close);
      return {
        datetime: slotStart,
        open: opens[0],
        high: Math.max(...highs),
        low: Math.min(...lows),
        close: closes[closes.length - 1],
        volume: arr.reduce((sum, x) => sum + (x.volume || 0), 0),
      };
    });
}

// Main function to fetch and resample
async function get15mOHLC(symbol, fromDate, toDate) {
  const historicData = await getCandles(symbol, fromDate, toDate, "3m");
  const resampled = resampleTo15Min(historicData);
  return { historicData, resampled };
}

// Example usage
(async () => {
  const { historicData, resampled } = await get15mOHLC(
    "NIFTY",
    "2025-06-20",
    "2025-06-24"
  );
  console.log("Raw 3-min data points:", historicData.length);
  console.log("Resampled 15-min intervals:", resampled.length);
  console.log(JSON.stringify(resampled, null, 2));
})();
