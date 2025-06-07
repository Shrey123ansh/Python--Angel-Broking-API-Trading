import yfinance as yf
import datetime as dt
import pandas as pd

# Prepare date range
end_date = dt.datetime.today() - dt.timedelta(days=1)
start_date = end_date - dt.timedelta(days=40)

# Ticker list
stocks = ["SBIN", "UPL", "INFY"]

# Dictionary to store downloaded data
signal_data = {}

# Download data and save to CSV
for ticker in stocks:
    print(f"Downloading data for {ticker}...")
    data = yf.download(ticker + ".NS", start=start_date, end=end_date, interval="1d")
    signal_data[ticker] = data
    if not data.empty:
        data.to_csv(f"{ticker}.csv", index=True, mode="w", header=True)
        print(f"Saved {ticker}.csv")
    else:
        print(f"No data found for {ticker}.")

print("All downloads complete.")
