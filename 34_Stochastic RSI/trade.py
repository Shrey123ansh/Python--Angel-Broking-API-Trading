from smartapi import SmartConnect
import time as tt
import requests
import pandas as pd
import login as l
import pyotp
from datetime import datetime, date, time
import warnings

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


def StochRSI(df, series, period=14, smoothK=3, smoothD=3):
    delta = series.diff()
    ups = delta.clip(lower=0)
    downs = -delta.clip(upper=0)

    avg_gain = ups.rolling(window=period).mean()
    avg_loss = downs.rolling(window=period).mean()

    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))

    # Calculate StochRSI
    min_rsi = rsi.rolling(window=period).min()
    max_rsi = rsi.rolling(window=period).max()
    stochrsi = (rsi - min_rsi) / (max_rsi - min_rsi)

    stochrsi_K = stochrsi.rolling(window=smoothK).mean()
    stochrsi_D = stochrsi_K.rolling(window=smoothD).mean()

    df = df.copy()
    df["SRSI"] = stochrsi
    df["K"] = stochrsi_K
    df["D"] = stochrsi_D

    return df


while True:
    minute5data = OHLCHistory(
        "SBIN-EQ", "3045", "ONE_MINUTE", "2022-12-22 00:00", "2022-12-23 15:30"
    )

    if not minute5data.empty:
        sc = StochRSI(minute5data, minute5data["close"])
        print(sc[["close", "K", "D", "SRSI"]].tail(5))
    else:
        print("No data returned.")

    time.sleep(60)
