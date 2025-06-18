from smartapi.smartConnect import SmartConnect
import pandas as pd
import requests
import login as l
import datetime
import math
import numpy as np
import pandas as pd

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


def getTokenInfo(
    symbol, exch_seg="NSE", instrumenttype="", strike_price=0.0, pe_ce="CE"
):
    global token_df
    df = token_df.copy()
    strike_price = strike_price * 100  # Convert to correct strike format if needed

    if exch_seg == "NSE":
        eq_df = df[(df["exch_seg"] == "NSE") & (df["symbol"].str.contains("EQ"))]
        return eq_df[eq_df["name"] == symbol]

    elif exch_seg == "NFO" and instrumenttype in ["FUTSTK", "FUTIDX"]:
        return df[
            (df["exch_seg"] == "NFO")
            & (df["instrumenttype"] == instrumenttype)
            & (df["name"] == symbol)
        ].sort_values("expiry")

    elif exch_seg == "NFO" and instrumenttype in ["OPTSTK", "OPTIDX"]:
        return df[
            (df["exch_seg"] == "NFO")
            & (df["instrumenttype"] == instrumenttype)
            & (df["name"] == symbol)
            & (df["strike"] == strike_price)
            & (df["symbol"].str.endswith(pe_ce))
        ].sort_values("expiry")

    else:
        return pd.DataFrame()  # return empty DataFrame if no match


def rsi(df, n=14):
    """Function to calculate RSI (Relative Strength Index)"""
    delta = df["close"].diff()
    gain = delta.where(delta > 0, 0)
    loss = -delta.where(delta < 0, 0)

    avg_gain = gain.rolling(window=n, min_periods=n).mean()
    avg_loss = loss.rolling(window=n, min_periods=n).mean()

    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))

    return rsi


def OHLCHistory(symbol, token, interval, fdate, todate):
    try:
        historicParam = {
            "exchange": "NSE",
            "tradingsymbol": symbol,
            "symboltoken": token,
            "interval": interval,
            "fromdate": fdate,
            "todate": todate,
        }
        history = obj.getCandleData(historicParam)["data"]
        df = pd.DataFrame(history)
        df = df.rename(
            columns={
                0: "Datetime",
                1: "open",
                2: "high",
                3: "low",
                4: "close",
                5: "volume",
            }
        )
        df["Datetime"] = pd.to_datetime(df["Datetime"])
        df.set_index("Datetime", inplace=True)
        return df
    except Exception as e:
        print("Historic API failed:", e)
        return pd.DataFrame()


# Run logic
initializeSymbolTokenMap()


banknifty_token = getTokenInfo("BANKNIFTY", "NFO").iloc[0]
symbol = banknifty_token["symbol"]
token = banknifty_token["token"]

data = OHLCHistory(symbol, token, "FIVE_MINUTE", "2021-01-06 09:15", "2021-06-05 15:30")
rsi = rsi(data, n=14)
print(rsi)
