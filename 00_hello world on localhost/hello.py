from flask import Flask

app = Flask(__name__)

@app.route("/")
def hello():
    return "<h1>Hello, World!</h1>"

if __name__ == "__main__":
    # debug=True will auto‑reload on code changes
    app.run(host="127.0.0.1", port=5000, debug=True)