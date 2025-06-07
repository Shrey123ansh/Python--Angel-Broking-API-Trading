import requests
import pandas as pd
from datetime import date

# URL template (corrected)
url = "https://kite.zerodha.com/oms/instruments/historical/{0}/{1}?user_id=RM4997&oi=1&from={2}&to={3}"

# Instrument tokens
tickerData = {"NIFTY": {"id": 256265}, "BANKNIFTY": {"id": 260105}}

# Interval mapping
KI = {
    "3m": "3minute",
    "5m": "5minute",
    "15m": "15minute",
    "60m": "60minute",
    "day": "day",
}


# Function to get candle data
def getCandles(symbol, fromDate, toDate, timeframe):
    headers = {
        "authorization": "enctoken zy6wJ727PpbghvRAZdYyw1UTeujts/2EwCm4c2ceev7jRaABZpVJAo7Etj5vF"
        # Replace this with your actual token securely
    }
    curUrl = url.format(tickerData[symbol]["id"], timeframe, fromDate, toDate)
    print("Requesting:", curUrl)

    try:
        session = requests.session()
        response = session.get(curUrl, headers=headers)
        r = response.json()
    except Exception as error:
        print("API request failed:", error)
        return pd.DataFrame()

    try:
        history = r["data"]["candles"]
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
    except Exception as error:
        print("Data processing failed:", error)
        return pd.DataFrame()


# === Example Execution ===
print("Start")
symbol_data = getCandles("NIFTY", "2021-01-01", "2021-03-31", KI["15m"])

if not symbol_data.empty:
    print(symbol_data)
    symbol_data.to_csv("Kite_NIFTY_15minute.csv", mode="w", index=True, header=True)
else:
    print("No data retrieved.")

print("Over")
