const axios = require("axios");
const moment = require("moment");
const fs = require("fs");
const login = require("./login");

let feedToken = null;
let token_df = [];

async function loginToSmartAPI() {
  const payload = {
    clientcode: login.client_code,
    password: login.pwd,
    totp: login.totp,
  };

  const response = await axios.post(
    "https://apiconnect.angelbroking.com/rest/auth/angelbroking/user/v1/loginByPassword",
    payload,
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-UserType": "USER",
        "X-SourceID": "WEB",
        "X-ClientLocalIP": "10.109.193.177",
        "X-ClientPublicIP": "119.82.125.154",
        "X-MACAddress": "38-22-E2-BD-46-5A",
        "X-PrivateKey": login.api_key,
      },
    }
  );

  const data = response.data;
  if (data.status) {
    feedToken = data.data.feedToken;
    console.log("Login successful. FeedToken:", feedToken);
    return data.data.jwtToken;
  } else {
    throw new Error("Login failed: " + data.message);
  }
}

async function initializeSymbolTokenMap() {
  const url =
    "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json";
  const response = await axios.get(url);
  token_df = response.data;
  console.log("Symbol Token Map Initialized. Total tokens:", token_df.length);
}

function getTokenInfo(exch_seg, instrumenttype, symbol, strike_price, pe_ce) {
  return token_df.filter((item) => {
    const expiry = item.expiry ? new Date(item.expiry) : null;
    const strike = parseFloat(item.strike);
    return (
      item.exch_seg === exch_seg &&
      item.instrumenttype === instrumenttype &&
      item.name === symbol &&
      (strike_price ? strike === strike_price : true) &&
      (pe_ce ? item.option_type === pe_ce : true)
    );
  });
}

async function getLTP(jwtToken, exch_seg, symbol, token) {
  const response = await axios.post(
    "https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/ltpData",
    {
      exchange: exch_seg,
      tradingsymbol: symbol,
      symboltoken: token,
    },
    {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-UserType": "USER",
        "X-SourceID": "WEB",
        "X-ClientLocalIP": "10.109.193.177",
        "X-ClientPublicIP": "119.82.125.154",
        "X-MACAddress": "38-22-E2-BD-46-5A",
        "X-PrivateKey": login.api_key,
      },
    }
  );

  return response.data.data.ltp;
}

(async () => {
  try {
    // const jwtToken = await loginToSmartAPI();
    await initializeSymbolTokenMap();

    // Get BANKNIFTY token info
    const bankniftyInfos = getTokenInfo("NSE", "EQ", "BANKNIFTY", null, null);
    if (bankniftyInfos.length === 0) {
      console.log("BANKNIFTY token not found.");
      return;
    }

    const bankniftyToken = bankniftyInfos;
    console.log("BANKNIFTY Token:", bankniftyToken);
    const ltp = await getLTP(jwtToken, "NSE", "BANKNIFTY", bankniftyToken);
    const roundedStrike = Math.round(ltp / 100) * 100;
    console.log("BANKNIFTY LTP:", ltp, "Rounded to:", roundedStrike);

    // Get CE and PE token info
    const ceInfos = getTokenInfo(
      "NFO",
      "OPTIDX",
      "BANKNIFTY",
      roundedStrike,
      "CE"
    );
    const peInfos = getTokenInfo(
      "NFO",
      "OPTIDX",
      "BANKNIFTY",
      roundedStrike,
      "PE"
    );

    if (ceInfos.length > 0 && peInfos.length > 0) {
      console.log("Placing CE order for:", ceInfos[0].tradingsymbol);
      console.log("Placing PE order for:", peInfos[0].tradingsymbol);
    } else {
      console.log(
        "CE or PE option data not found for BANKNIFTY",
        roundedStrike
      );
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
})();
