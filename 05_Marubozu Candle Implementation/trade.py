from smartapi.smartConnect import SmartConnect
import pandas as pd
import numpy as np
import login as l

# Initialize API connection
obj = SmartConnect(api_key=l.api_key)
data = obj.generateSession(l.user_name, l.password)
refreshToken = data["data"]["refreshToken"]

# Fetch the feed token and user profile
feedToken = obj.getfeedToken()
l.feed_token = feedToken
userProfile = obj.getProfile(refreshToken)
print("User Profile:", userProfile)


# Historical OHLC fetch
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


# Marubozu pattern detector
def maru_bozu(ohlc_df):
    """Returns dataframe with marubozu candle pattern label"""
    df = ohlc_df.copy()
    avg_candle_size = abs(df["close"] - df["open"]).median()

    # Upper and lower wicks
    df["h-c"] = df["high"] - df["close"]
    df["l-o"] = df["low"] - df["open"]
    df["h-o"] = df["high"] - df["open"]
    df["l-c"] = df["low"] - df["close"]

    # Green Marubozu
    condition_green = (df["close"] - df["open"] > 2 * avg_candle_size) & (
        df[["h-c", "l-o"]].abs().max(axis=1) < 0.003 * avg_candle_size
    )

    # Red Marubozu
    condition_red = (df["open"] - df["close"] > 2 * avg_candle_size) & (
        df[["h-o", "l-c"]].abs().max(axis=1) < 0.003 * avg_candle_size
    )

    df["maru_bozu"] = np.where(
        condition_green,
        "maru_bozu_green",
        np.where(condition_red, "maru_bozu_red", False),
    )

    df.drop(["h-c", "l-o", "h-o", "l-c"], axis=1, inplace=True)
    return df


# Example: Fetch 5-minute data and detect Marubozu patterns
minute5data = OHLCHistory(
    "SBIN-EQ", "3045", "FIVE_MINUTE", "2021-01-06 09:15", "2021-06-05 15:30"
)
if not minute5data.empty:
    ma_df = maru_bozu(minute5data)
    print(ma_df[ma_df["maru_bozu"] != False])
else:
    print("No OHLC data available.")
