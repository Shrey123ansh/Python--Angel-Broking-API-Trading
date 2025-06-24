from smartapi.smartConnect import SmartConnect
import pandas as pd
import requests
import login as l
import datetime
import math

# Initialize the SmartConnect object
obj = SmartConnect(api_key=l.api_key)
data = obj.generateSession(l.user_name, l.password)
refreshToken = data["data"]["refreshToken"]

# Fetch the feed token
feedToken = obj.getfeedToken()
l.feed_token = feedToken

# Fetch user profile
userProfile = obj.getProfile(refreshToken)

# Global token map
token_df = pd.DataFrame()


def initializeSymbolTokenMap():
    global token_df
    url = "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json"
    d = requests.get(url).json()
    token_df = pd.DataFrame.from_dict(d)
    token_df["expiry"] = pd.to_datetime(token_df["expiry"], errors="coerce")
    token_df["strike"] = pd.to_numeric(token_df["strike"], errors="coerce")
    print("Symbol Token Map Initialized")


def getStrike(symbol, expiry, ltp, pe_ce, dist):
    # Filter the token_df for the specific symbol, expiry, and type
    optiondf = token_df[
        (token_df.name == symbol)
        & (token_df.expiry == expiry)
        & (token_df.instrumenttype == "OPTSTK")
    ].copy()

    # Sort by strike price
    optiondf.sort_values(by="strike", inplace=True)
    optiondf.reset_index(inplace=True, drop=True)

    # Calculate the difference from LTP (nearest ATM)
    optiondf["diff"] = abs(optiondf["strike"] - (ltp // 100 * 100))

    # Get the 8th nearest strike to ATM
    locIndex = optiondf.sort_values(by="diff").iloc[8].name

    # Adjust index for call or put and distance
    if pe_ce == "CE":
        stockstrike = optiondf.loc[locIndex + dist]["strike"]
    else:
        stockstrike = optiondf.loc[locIndex - dist]["strike"]

    # Return all option rows for that strike price
    return optiondf[optiondf.strike == stockstrike]


print(getStrike("AXISBANK", "2021-01-06", 770, "CE", 6))
print(getStrike("AXISBANK", "2021-01-06", 770, "CE", -6))
print(getStrike("SBIN", "2021-01-06", 770, "PE", 2))
print(getStrike("SBIN", "2021-01-06", 770, "PE", -2))
