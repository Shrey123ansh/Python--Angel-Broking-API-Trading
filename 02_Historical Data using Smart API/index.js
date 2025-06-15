const { SmartAPI } = require("smartapi-javascript");
const fs = require("fs");
const path = require("path");

// Replace with your own credentials or import from config
const api_key = "1G97i6X4";
// const client_code = "your_client_code";
// const password = "your_password";
// const totp = "your_6_digit_totp";

const smart_api = new SmartAPI({ api_key });

// Set session expiry hook (optional)
smart_api.setSessionExpiryHook(() => {
  console.log("Session expired. Please re-login.");
});

// Convert array to CSV string
function convertToCSV(dataArray) {
  const headers = ["Datetime", "Open", "High", "Low", "Close", "Volume"];
  const csvRows = dataArray.map((row) => row.join(","));
  return [headers.join(","), ...csvRows].join("\n");
}

// Save CSV data to a file
function saveToCSV(data, filename) {
  const csvString = convertToCSV(data);
  fs.writeFileSync(path.join(__dirname, filename), csvString, "utf8");
  console.log(`Saved to ${filename}`);
}

// Fetch OHLC history
async function getHistoricalData(
  symbol,
  token,
  interval,
  fromdate,
  todate,
  filename
) {
  try {
    const response = await smart_api.getCandleData({
      exchange: "NSE",
      symboltoken: token,
      interval: interval,
      fromdate: fromdate,
      todate: todate,
    });

    const data = response.data;
    if (!data || data.length === 0) {
      console.log(`No data for ${symbol} in ${interval}`);
      return;
    }

    saveToCSV(data, filename);
    console.log(`Fetched ${interval} data for ${symbol}`);
  } catch (err) {
    console.error(`Error fetching ${interval} data:`, err.message);
  }
}

// Main async function
(async () => {
  try {
    // Authenticate session
    // const session = await smart_api.generateSession(
    //   client_code,
    //   password,
    //   totp
    // );
    // const profile = await smart_api.getProfile();
    // console.log("Login Success. Profile:", profile.data);

    // === Daily Data ===
    await getHistoricalData(
      "SBIN-EQ",
      "3045",
      "ONE_DAY",
      "2020-02-08 00:00",
      "2021-02-08 15:30",
      "SBIN_oneday.csv"
    );

    // === 5 Minute Data ===
    await getHistoricalData(
      "SBIN-EQ",
      "3045",
      "FIVE_MINUTE",
      "2021-01-06 09:15",
      "2021-01-06 15:30",
      "SBIN_5minute.csv"
    );

    console.log("End Program");
  } catch (error) {
    console.error("Session setup or fetch failed:", error.message);
  }
})();
