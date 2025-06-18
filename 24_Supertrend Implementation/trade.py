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


def ATR(df, n):
    df = df.copy()
    df["H-L"] = abs(df["high"] - df["low"])
    df["H-PC"] = abs(df["high"] - df["close"].shift(1))
    df["L-PC"] = abs(df["low"] - df["close"].shift(1))
    df["TR"] = df[["H-L", "H-PC", "L-PC"]].max(axis=1, skipna=False)
    df["ATR"] = df["TR"].ewm(span=n, adjust=False, min_periods=n).mean()
    df = df.drop(["H-L", "H-PC", "L-PC", "TR"], axis=1)
    return df


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


# Supertrend implementation
def supertrend(DF, n=7, m=3):
    """
    Function to calculate Supertrend.
    n : ATR period (default 7)
    m : Multiplier (default 3)
    """
    df = DF.copy()
    df["ATR"] = ATR(df, n)

    hl2 = (df["high"] + df["low"]) / 2
    df["UpperBand"] = hl2 + m * df["ATR"]
    df["LowerBand"] = hl2 - m * df["ATR"]
    df["Supertrend"] = np.nan
    df["in_uptrend"] = True  # boolean flag for trend

    for current in range(n, len(df)):
        previous = current - 1

        if df["close"][current] > df["UpperBand"][previous]:
            df.at[current, "in_uptrend"] = True
        elif df["close"][current] < df["LowerBand"][previous]:
            df.at[current, "in_uptrend"] = False
        else:
            df.at[current, "in_uptrend"] = df.at[previous, "in_uptrend"]
            if (
                df["in_uptrend"][current]
                and df["LowerBand"][current] < df["LowerBand"][previous]
            ):
                df.at[current, "LowerBand"] = df["LowerBand"][previous]
            if (
                not df["in_uptrend"][current]
                and df["UpperBand"][current] > df["UpperBand"][previous]
            ):
                df.at[current, "UpperBand"] = df["UpperBand"][previous]

        # Set final supertrend value
        if df["in_uptrend"][current]:
            df.at[current, "Supertrend"] = df["LowerBand"][current]
        else:
            df.at[current, "Supertrend"] = df["UpperBand"][current]

    return df[["close", "Supertrend", "in_uptrend"]]


banknifty_token = getTokenInfo("CSDL", "NSE").iloc[0]
symbol = banknifty_token["symbol"]
token = banknifty_token["token"]

data = OHLCHistory(symbol, token, "FIVE_MINUTE", "2021-01-06 09:15", "2021-06-05 15:30")
result = supertrend(data, n=7, m=3)
print(result.tail(40))
