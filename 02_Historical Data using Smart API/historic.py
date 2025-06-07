from smartapi.smartConnect import SmartConnect
import pandas as pd
import login as l  # Ensure this contains api_key, user_name, password

# Create SmartConnect object
obj = SmartConnect(api_key=l.api_key)

# Generate session
try:
    data = obj.generateSession(l.user_name, l.password)
    refreshToken = data["data"]["refreshToken"]

    # Fetch the feed token
    feedToken = obj.getfeedToken()
    l.feed_token = feedToken  # Save in login object if needed

    # Fetch user profile
    userProfile = obj.getProfile(refreshToken)
    print("User Profile:", userProfile)

except Exception as e:
    print("Session setup failed:", e)


# Historical OHLC function
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
        history_df = pd.DataFrame(history)
        history_df = history_df.rename(
            columns={
                0: "Datetime",
                1: "Open",
                2: "High",
                3: "Low",
                4: "Close",
                5: "Volume",
            }
        )
        history_df["Datetime"] = pd.to_datetime(history_df["Datetime"])
        history_df.set_index("Datetime", inplace=True)

        return history_df

    except Exception as e:
        print("Historic API failed:", e)
        return pd.DataFrame()  # Return empty DataFrame on failure


# === Daily Data Fetch ===
print("Daily Data:")
daily_data = OHLCHistory(
    "SBIN-EQ", "3045", "ONE_DAY", "2020-02-08 00:00", "2021-02-08 15:30"
)
print(daily_data)

# Save daily data to CSV
daily_data.to_csv("NIFTY_oneday.csv", mode="a", index=True, header=not daily_data.empty)

# === 5 Minute Data Fetch ===
print("5 Minute Data:")
minute5_data = OHLCHistory(
    "SBIN-EQ", "3045", "FIVE_MINUTE", "2021-01-06 09:15", "2021-01-06 15:30"
)
print(minute5_data)

# Save 5-minute data to CSV
minute5_data.to_csv(
    "NIFTY_5minute.csv", mode="a", index=True, header=not minute5_data.empty
)

print("End Program")
