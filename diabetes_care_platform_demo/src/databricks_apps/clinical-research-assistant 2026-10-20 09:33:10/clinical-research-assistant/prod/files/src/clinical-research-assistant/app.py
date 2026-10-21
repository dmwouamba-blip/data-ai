import os
from flask import Flask, send_from_directory

app = Flask(__name__, static_folder="dist", static_url_path="")


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path: str):
    requested_path = os.path.join(app.static_folder, path)
    if path and os.path.exists(requested_path):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "3000"))
    app.run(host="0.0.0.0", port=port)



