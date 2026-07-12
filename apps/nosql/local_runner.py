import json
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from handler import handler

app = Flask(__name__)
CORS(app)

@app.route("/health", methods=["GET"])
@app.route("/<path:path>", methods=["GET", "POST", "PUT", "DELETE"])
def proxy(path="health"):
    event = {
        "path": f"/{path}",
        "httpMethod": request.method,
        "body": request.get_data(as_text=True) or None,
        "pathParameters": extract_path_params(path),
        "queryStringParameters": dict(request.args) or None,
    }
    result = handler(event, None)
    body = json.loads(result["body"])
    return jsonify(body), result["statusCode"]


def extract_path_params(path: str) -> dict:
    parts = path.split("/")
    params = {}
    if len(parts) >= 2 and parts[0] == "events":
        params["event_id"] = parts[1]
    if len(parts) >= 2 and parts[0] == "bookings":
        params["booking_id"] = parts[1]
    if len(parts) >= 2 and parts[0] == "users":
        params["user_id"] = parts[1]
    return params


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)