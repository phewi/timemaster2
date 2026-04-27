import http.server
import socketserver
import json
import os

# Asetukset
PORT = 8000
MUSIC_DIR = "musiikki"

class TimeMasterHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Tarkistetaan, pyytääkö selain musiikkilistaa
        if self.path == '/api/music':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            # Luodaan lista mp3-tiedostoista
            music_files = []
            if os.path.exists(MUSIC_DIR):
                music_files = [f for f in os.listdir(MUSIC_DIR) if f.lower().endswith('.mp3')]
                music_files.sort() # Aakkosjärjestys
            
            # Lähetetään lista JSON-muodossa
            self.wfile.write(json.dumps(music_files).encode())
        else:
            # Muissa tapauksissa toimitaan kuten normaali tiedostopalvelin
            return http.server.SimpleHTTPRequestHandler.do_GET(self)

# Käynnistetään palvelin
if __name__ == "__main__":
    # Varmistetaan, että musiikkikansio on olemassa
    if not os.path.exists(MUSIC_DIR):
        os.makedirs(MUSIC_DIR)
        print(f"Luotu kansio: {MUSIC_DIR}")

    with socketserver.TCPServer(("", PORT), TimeMasterHandler) as httpd:
        print(f"--- TimeMaster2 Palvelin Käynnissä ---")
        print(f"Osoite: http://localhost:{PORT}")
        print(f"Laita HTML-tiedosto nimellä 'index.html' tai avaa se suoraan listasta.")
        print(f"Laita musiikit '{MUSIC_DIR}'-kansioon.")
        print("Sulje palvelin painamalla Ctrl+C")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nPalvelin suljetaan.")
            httpd.shutdown()