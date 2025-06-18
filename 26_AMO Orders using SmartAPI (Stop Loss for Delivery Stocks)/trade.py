import datetime
import time
import schedule
from SmartApi import SmartConnect  # Ensure SmartApi is installed and imported correctly
import login as l  # Your login.py should contain api_key, user_name, password
from your_module import (
    intalizeSymbolTokenMap,
    orderbookstatus,
)  # Replace with your actual function/module


def initializeSymbolTokenMap():
    global token_df
    url = "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json"
    d = requests.get(url).json()
    token_df = pd.DataFrame.from_dict(d)
    token_df["expiry"] = pd.to_datetime(token_df["expiry"], errors="coerce")
    token_df["strike"] = pd.to_numeric(token_df["strike"], errors="coerce")
    print("Symbol Token Map Initialized")


def getTokenInfo(symbol, exch_seg="NSE"):
    global token_df
    df = token_df.copy()
    strike_price = strike_price * 100  # Convert to correct strike format if needed

    if exch_seg == "NSE":
        eq_df = df[(df["exch_seg"] == "NSE") & (df["symbol"].str.contains("EQ"))]
        return eq_df[eq_df["name"] == symbol]


def place_order(token, symbol, qty, exch_seg, buy_sell, ordertype, price):
    try:
        orderparams = {
            "variety": "NORMAL",
            "tradingsymbol": symbol,
            "symboltoken": token,
            "transactiontype": buy_sell,
            "exchange": exch_seg,
            "ordertype": ordertype,
            "producttype": "INTRADAY",
            "duration": "DAY",
            "price": price,
            "squareoff": "0",
            "stoploss": "0",
            "quantity": qty,
        }
        orderId = obj.placeOrder(orderparams)
        print("The order ID is: {}".format(orderId))
    except Exception as e:
        print("Order placement failed: {}".format(e))


import http.client
import json


# Fetch holdings from Angel Broking
def get_holding():
    conn = http.client.HTTPSConnection("apiconnect.angelbroking.com")
    payload = ""  # GET request generally does not need a payload

    headers = {
        "Authorization": l.jwtToken,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-UserType": "USER",
        "X-SourceID": "WEB",
        "X-ClientLocalIP": "127.0.0.1",
        "X-ClientPublicIP": "127.0.0.1",
        "X-MACAddress": "AA:BB:CC:DD:EE:FF",
        "X-PrivateKey": l.api_key,
    }

    conn.request(
        "GET", "/rest/secure/angelbroking/portfolio/v1/getHolding", payload, headers
    )
    res = conn.getresponse()
    data = res.read()
    return data


# Order book and stop-loss order placing
def orderbookstatus():
    hdata = get_holding()
    Holdingstock = json.loads(hdata)["data"]

    print("Your Holdings:")
    for ticker in Holdingstock:
        token = ticker["symboltoken"]
        symbol = ticker["tradingsymbol"]
        hqty = int(ticker["quantity"])
        ltp = float(ticker["ltp"])

        # Example stop-loss logic: 1% below LTP
        sl_price = round(ltp * 0.99, 1)

        print(f"Stock: {symbol} | Quantity: {hqty} | LTP: {ltp} | SL Price: {sl_price}")

        # Place the order
        place_order(
            token=token,
            symbol=symbol,
            qty=hqty,
            exchange="NSE",
            transaction_type="SELL",
            order_type="LIMIT",
            price=sl_price,
            product_type="DELIVERY",
            duration="AMO",
        )


print("Start Algorithm:")

# 1. Login & Authentication
obj = SmartConnect(api_key=l.api_key)

# Generate session
data = obj.generateSession(l.user_name, l.password)
refreshToken = data["data"]["refreshToken"]
jwtToken = data["data"]["jwtToken"]
l.jwtToken = jwtToken  # store if needed elsewhere

# Get feed token
feedToken = obj.getfeedToken()
l.feed_token = feedToken

# 2. Initialize Token Map
intalizeSymbolTokenMap()

# 3. Execute orderbookstatus once at start
orderbookstatus()

# 4. Schedule it to run daily at 08:25 AM
schedule.every().day.at("08:25").do(orderbookstatus)

# 5. Loop to check time and run scheduled task

while True:
    now = datetime.datetime.now()
    current_time = now.strftime("%H:%M:%S")
    start = "08:20:00"
    end = "08:40:00"

    if current_time > start and current_time < end:
        schedule.run_pending()
        print("Waiting for schedule for Order Status:", current_time)
        time.sleep(1)

    elif current_time >= end:
        print("End of Algo")
        break
