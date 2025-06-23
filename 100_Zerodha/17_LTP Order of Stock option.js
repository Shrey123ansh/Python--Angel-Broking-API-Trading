const axios = require("axios");

let token_df = [];

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
  await initializeSymbolTokenMap();

  const optionToken = getTokenInfo("NFO", "OPTSTK", "SBIN", null, "CE");
  console.log("BANKNIFTYoptionToken:", optionToken);
}

main();
