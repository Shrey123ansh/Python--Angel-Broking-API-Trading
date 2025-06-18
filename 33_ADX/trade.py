from smartapi import SmartConnect
import time as tt
import requests
import pandas as pd
import login as l
import pyotp
from datetime import datetime, date, time
import warnings

# Suppress warnings
warnings.filterwarnings("ignore")

# Initialize SmartConnect with API key
obj = SmartConnect(api_key=l.api_key)

# Generate TOTP token
token = pyotp.TOTP(l.totp).now()

# Generate session using credentials and TOTP token
data = obj.generateSession(l.user_name, l.password, token)

# Extract refreshToken safely
refreshToken = data["data"]["refreshToken"]
print("Refresh Token: " + refreshToken)

# Fetch the feed token
feedToken = obj.getfeedToken()
l.feed_token = feedToken
print("Feed Token: " + feedToken)


# === Historical OHLC Fetch Function ===
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


def ATR(df, n):
    df = df.copy()
    df["H-L"] = abs(df["high"] - df["low"])
    df["H-PC"] = abs(df["high"] - df["close"].shift(1))
    df["L-PC"] = abs(df["low"] - df["close"].shift(1))
    df["TR"] = df[["H-L", "H-PC", "L-PC"]].max(axis=1, skipna=False)
    df["ATR"] = df["TR"].ewm(span=n, adjust=False, min_periods=n).mean()
    df = df.drop(["H-L", "H-PC", "L-PC", "TR"], axis=1)
    return df


def ADX(df_dict, n=14):
    df = df_dict.copy()

    df["ATR"] = ATR(df, n)
    df["upmove"] = df["high"] - df["high"].shift(1)
    df["downmove"] = df["low"].shift(1) - df["low"]

    df["+dm"] = np.where(
        (df["upmove"] > df["downmove"]) & (df["upmove"] > 0), df["upmove"], 0
    )
    df["-dm"] = np.where(
        (df["downmove"] > df["upmove"]) & (df["downmove"] > 0), df["downmove"], 0
    )

    df["+di"] = 100 * (df["+dm"].ewm(alpha=1 / n, min_periods=n).mean() / df["ATR"])
    df["-di"] = 100 * (df["-dm"].ewm(alpha=1 / n, min_periods=n).mean() / df["ATR"])

    df["ADX"] = 100 * abs(df["+di"] - df["-di"]) / (df["+di"] + df["-di"])
    df["ADX"] = df["ADX"].ewm(alpha=1 / n, min_periods=n).mean()

    return df


# === Fetch and Analyze Data ===
minute5data = OHLCHistory(
    "SBIN-EQ", "3045", "FIVE_MINUTE", "2021-01-06 09:15", "2021-06-05 15:30"
)
adx_data = ADX(minute5data)

# Print the relevant columns
print(adx_data[["+di", "-di", "ADX"]].tail())
