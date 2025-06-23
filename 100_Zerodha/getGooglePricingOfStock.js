const axios = require("axios");
const cheerio = require("cheerio");

async function getStockPrice(ticker) {
  const url = `https://www.google.com/finance/quote/${ticker}:NSE`;

  try {
    const response = await axios.get(url, {
      headers: {
        // Set a user-agent to avoid 403 Forbidden from Google
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    });

    const $ = cheerio.load(response.data);

    // Class name to extract price
    const className = "YM1Kec fxKbKc";
    const price = $(`.${className.split(" ").join(".")}`)
      .first()
      .text();

    console.log(`Current price of ${ticker}: ₹${price}`);
    return price;
  } catch (error) {
    console.error("Failed to fetch price:", error.message);
    return null;
  }
}

// Example usage
getStockPrice("INFY");
