const axios = require("axios");
const moment = require("moment-timezone");

async function getExpiryData() {
  const url =
    "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json";

  try {
    const { data } = await axios.get(url);
    const symbol = "NIFTY";

    // Filter FUTIDX (Futures Index) for Monthly Expiry
    const fut = data.filter(
      (item) =>
        item.exch_seg === "NFO" &&
        item.instrumenttype === "FUTIDX" &&
        item.name === symbol &&
        item.expiry
    );

    const futExpiryDates = [...new Set(fut.map((item) => item.expiry))].sort();
    const monthExpiry = moment.tz(
      futExpiryDates[0],
      "DDMMMYYYY",
      "Asia/Kolkata"
    );

    // Filter all FNO for Weekly Expiry
    const fno = data.filter(
      (item) => item.exch_seg === "NFO" && item.name === symbol && item.expiry
    );

    const fnoExpiryDates = [...new Set(fno.map((item) => item.expiry))].sort();
    const weekExpiry = moment.tz(
      fnoExpiryDates[0],
      "DDMMMYYYY",
      "Asia/Kolkata"
    );

    // Return result as JSON
    return {
      monthly_expiry: monthExpiry.format("YYYY-MM-DD"),
      weekly_expiry: weekExpiry.format("YYYY-MM-DD"),
    };
  } catch (error) {
    console.error("Error fetching or processing data:", error.message);
    return null;
  }
}

// Example usage:
getExpiryData().then((result) => {
  console.log(JSON.stringify(result, null, 2));
});
