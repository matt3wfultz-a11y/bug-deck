#!/usr/bin/env python3
"""HTTP server with no-cache headers for development."""
import http.server
import sys

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # suppress request logs

port = int(sys.argv[1]) if len(sys.argv) > 1 else 3456
with http.server.HTTPServer(('', port), NoCacheHandler) as httpd:
    httpd.serve_forever()
