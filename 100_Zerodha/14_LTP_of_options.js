const axios = require("axios");

let token_df = [];

const API_KEY = "vcaa0y84pydefqc5"; // Replace with your actual API key
const ENC_TOKEN = "j0dhwy2drftqftl9p2r3wcg51bg4aysr"; // Replace securely

// Axios instance with enctoken cookie
const axiosInstance = axios.create({
  baseURL: "https://api.kite.trade",
  headers: {
    "X-Kite-Version": "3",
    Authorization: `token ${API_KEY}:${ENC_TOKEN}`,
  },
});

async function fetchLTP() {
  try {
    const response = await axiosInstance.get("/quote/ltp", {
      params: {
        i: ["NSE:INFY", "BSE:SENSEX", "NSE:NIFTY 50"],
      },
    });
    console.log(JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error("Error fetching LTP:", err.response?.data || err.message);
  }
}

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
  await fetchLTP();
  // await initializeSymbolTokenMap();

  // const bankniftyToken = getTokenInfo("NSE", "", "BANKNIFTY1", null, "EQ");
  // console.log("BANKNIFTY:", bankniftyToken);
  // const relianceToken = getTokenInfo("NSE", "", "RELIANCE", null, "EQ");
  // console.log("relianceToken:", relianceToken);

  // const optionToken = getTokenInfo("NFO", "OPTIDX", "BANKNIFTY", 6070000, "CE");
  // console.log("BANKNIFTYoptionToken:", optionToken);
}

main();

//   if (
//     bankniftyToken.length === 0 ||
//     relianceToken.length === 0 ||
//     optionToken.length === 0
//   ) {
//     console.log("⚠️ One or more tokens not found.");
//     return;
//   }

//   const tokenMap = {
//     NSE: [bankniftyToken[0].token, relianceToken[0].token],
//     NFO: [optionToken[0].token],
//   };

//   await getLTPQuotes(tokenMap);

// Build and fetch LTP using quote API
// async function getLTPQuotes(tokenMap) {
//   const data = {
//     mode: "LTP",
//     exchangeTokens: tokenMap,
//   };

//   const config = {
//     method: "post",
//     url: "https://apiconnect.angelone.in/rest/secure/angelbroking/market/v1/quote/",
//     headers: {
//       "X-PrivateKey": "3rmBFBxx",
//       Accept: "application/json",
//       "X-SourceID": "WEB",
//       "X-ClientLocalIP": "10.109.193.177",
//       "X-ClientPublicIP": "119.82.125.154",
//       "X-MACAddress": "38-22-E2-BD-46-5A",
//       "X-UserType": "USER",
//       Authorization: `Bearer CC3SDMVGWGKPF2NXLALOPN2RJQ`,
//       "Content-Type": "application/json",
//     },
//     data: JSON.stringify(data),
//   };

//   try {
//     const response = await axios(config);
//     const quoteData = response.data.data;
//     console.log("📈 LTP Quotes:");
//     console.log("Total Exchanges:", quoteData);
//     for (const exch in quoteData) {
//       for (const token in quoteData[exch]) {
//         const info = quoteData[exch][token];
//         console.log(`${info.tradingsymbol} (${exch}) → LTP: ${info.ltp}`);
//       }
//     }
//   } catch (error) {
//     console.error("❌ Error fetching quote:", error.message);
//   }
// }
