import requests
import datetime as dt
import pandas as pd
import arrow
import numpy as np


def get_quote_data(symbol, data_range="10d", data_interval="5m"):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range={data_range}&interval={data_interval}"

    res = requests.get(url)
    if res.status_code != 200:
        print(f"Failed to fetch data for {symbol}")
        return pd.DataFrame()

    data = res.json()
    try:
        body = data["chart"]["result"][0]
    except (KeyError, IndexError):
        print(f"Unexpected response structure: {data}")
        return pd.DataFrame()

    timestamps = body.get("timestamp", [])
    if not timestamps:
        print("No timestamps in data")
        return pd.DataFrame()

    # Convert timestamps to datetime in IST
    dt_series = pd.Series(
        map(
            lambda x: arrow.get(x).to("Asia/Calcutta").datetime.replace(tzinfo=None),
            timestamps,
        ),
        name="Datetime",
    )

    # Extract OHLCV data
    indicators = body["indicators"]["quote"][0]
    df = pd.DataFrame(indicators, index=dt_series)
    df = df[["open", "high", "low", "close", "volume"]]
    df.dropna(inplace=True)
    df.columns = ["Open", "High", "Low", "Close", "Volume"]

    return df


# Dictionary to hold data
signal_data = {}

# Fetch and store SBIN intraday data
symbol = "SBIN.NS"
signal_data["SBIN"] = get_quote_data(symbol, "10d", "5m")

# Display the data
print(signal_data["SBIN"])
