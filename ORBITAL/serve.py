"""Serve ORBITAL/dist locally. Python only, no installs.

Plain `python -m http.server` sends .mjs files as text/plain on some Windows setups,
and browsers refuse to run them as modules. This sets the right type.
"""

import functools
import http.server
from pathlib import Path

PORT = 8000
DIST = Path(__file__).resolve().parent / "dist"

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".mjs": "text/javascript"}

    def end_headers(self):
        # Local development: always serve the latest files, so edits show up on reload.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


handler = functools.partial(Handler, directory=str(DIST))

if __name__ == "__main__":
    print(f"ORBITAL running at http://localhost:{PORT} (Ctrl+C to stop)")
    http.server.ThreadingHTTPServer(("", PORT), handler).serve_forever()
