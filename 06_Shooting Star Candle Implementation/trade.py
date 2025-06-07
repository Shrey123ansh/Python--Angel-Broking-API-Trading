from smartapi.smartConnect import SmartConnect
import pandas as pd
import login as l

# Initialize SmartAPI connection
obj = SmartConnect(api_key=l.api_key)
data = obj.generateSession(l.user_name, l.password)
refreshToken = data["data"]["refreshToken"]

# Fetch feed token and user profile
feedToken = obj.getfeedToken()
l.feed_token = feedToken
userProfile = obj.getProfile(refreshToken)
print("User Profile:", userProfile)


# Historical OHLC data function
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
        data = obj.getCandleData(historicParam)["data"]
        df = pd.DataFrame(data)
        df = df.rename(
            columns={
                0: "Datetime",
                1: "open",
                2: "high",
                3: "low",
                4: "close",
                5: "Volume",
            }
        )
        df["Datetime"] = pd.to_datetime(df["Datetime"])
        df.set_index("Datetime", inplace=True)
        return df
    except Exception as e:
        print("Historic API failed: {}".format(e))
        return pd.DataFrame()


# Shooting Star detection
def shooting_star(ohlc_df):
    df = ohlc_df.copy()
    body = abs(df["close"] - df["open"])
    candle_range = df["high"] - df["low"]
    upper_shadow = df["high"] - df[["close", "open"]].max(axis=1)
    lower_shadow = df[["close", "open"]].min(axis=1) - df["low"]

    df["sstar"] = (
        (candle_range > 3 * body)
        & (upper_shadow / (0.001 + candle_range) > 0.6)
        & (lower_shadow / (0.001 + candle_range) < 0.2)
    )

    return df


# Fetch data and apply pattern detection
minute5data = OHLCHistory(
    "SBIN-EQ", "3045", "FIVE_MINUTE", "2021-01-06 09:15", "2021-06-05 15:30"
)

if not minute5data.empty:
    ss_df = shooting_star(minute5data)
    print(ss_df[ss_df["sstar"]])
else:
    print("No data fetched.")
