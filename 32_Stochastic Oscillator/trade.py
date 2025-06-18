from smartapi.smartConnect import SmartConnect
import pandas as pd
import login as l  # Ensure this file contains api_key, user_name, password

# Create SmartConnect object and login
obj = SmartConnect(api_key=l.api_key)
data = obj.generateSession(l.user_name, l.password)
refreshToken = data["data"]["refreshToken"]
feedToken = obj.getfeedToken()
l.feed_token = feedToken

# Fetch user profile
userProfile = obj.getProfile(refreshToken)
print("User Profile:", userProfile)


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


# === Hammer Candlestick Pattern Detector ===
def stochastic(df_dict, lookback=14, k=3, d=3):
    """
    Function to calculate the Stochastic Oscillator.
    %K = (Close - Lowest Low) / (Highest High - Lowest Low) * 100
    %D = SMA of %K
    """
    df = df_dict.copy()

    df["HH"] = df["high"].rolling(lookback).max()
    df["LL"] = df["low"].rolling(lookback).min()

    df["%K"] = 100 * (df["close"] - df["LL"]) / (df["HH"] - df["LL"])
    df["%K"] = df["%K"].rolling(k).mean()
    df["%D"] = df["%K"].rolling(d).mean()

    df.drop(["HH", "LL"], axis=1, inplace=True)
    return df


# === Fetch and Analyze Data ===
minute5data = OHLCHistory(
    "SBIN-EQ", "3045", "FIVE_MINUTE", "2021-01-06 09:15", "2021-06-05 15:30"
)
if not minute5data.empty:
    hammer_df = stochastic(minute5data)
    print(hammer_df[hammer_df["hammer"] == True])
else:
    print("No OHLC data available.")
