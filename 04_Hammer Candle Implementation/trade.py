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
def hammer(ohlc_df):
    df = ohlc_df.copy()
    df["hammer"] = (
        ((df["high"] - df["low"]) > 3 * (df["open"] - df["close"]).abs())
        & ((df["close"] - df["low"]) / (0.001 + df["high"] - df["low"]) > 0.6)
        & ((df["open"] - df["low"]) / (0.001 + df["high"] - df["low"]) > 0.6)
        & (abs(df["close"] - df["open"]) > 0.1 * (df["high"] - df["low"]))
    )
    return df


# === Fetch and Analyze Data ===
minute5data = OHLCHistory(
    "SBIN-EQ", "3045", "FIVE_MINUTE", "2021-01-06 09:15", "2021-06-05 15:30"
)
if not minute5data.empty:
    hammer_df = hammer(minute5data)
    print(hammer_df[hammer_df["hammer"] == True])
else:
    print("No OHLC data available.")
