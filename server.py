import http.server
import socketserver
import json
import os
import sys

# Asetukset
PORT = 8000
MUSIC_DIR = "musiikki"


def syncsafe_to_int(b):
    return (b[0] << 21) | (b[1] << 14) | (b[2] << 7) | b[3]


def read_mp3_title_artist(path):
    artist = None
    title = None

    try:
        with open(path, 'rb') as f:
            header = f.read(10)
            if header[:3] == b'ID3':
                version = header[3]
                sys.stderr.write(f"[DEBUG] ID3 version: {version}\n")
                sys.stderr.flush()
                tag_size = syncsafe_to_int(header[6:10])
                sys.stderr.write(f"[DEBUG] Tag size: {tag_size}\n")
                sys.stderr.flush()
                tag_data = f.read(tag_size)
                pos = 0
                while pos + 10 <= len(tag_data):
                    frame_id = tag_data[pos:pos+4].decode('latin1')
                    if frame_id.strip('\x00') == '':
                        break
                    frame_size_bytes = tag_data[pos+4:pos+8]
                    if version >= 4:
                        frame_size = syncsafe_to_int(frame_size_bytes)
                    else:
                        frame_size = int.from_bytes(frame_size_bytes, 'big')
                    sys.stderr.write(f"[DEBUG] Frame: {repr(frame_id)}, size: {frame_size}\n")
                    sys.stderr.flush()
                    if frame_size <= 0 or frame_size > len(tag_data) - pos - 10:
                        break
                    frame_data = tag_data[pos+10:pos+10+frame_size]
                    if frame_id in ('TIT2', 'TT2'):  # v2.3/v2.4 title, v2.2 title
                        if len(frame_data) > 0:
                            encoding = frame_data[0]
                            text_data = frame_data[1:]
                            try:
                                if encoding == 0:
                                    text = text_data.split(b'\x00', 1)[0].decode('latin1', errors='replace')
                                elif encoding == 1:
                                    text = text_data.decode('utf-16', errors='replace').split('\x00', 1)[0]
                                elif encoding == 2:
                                    text = text_data.decode('utf-16be', errors='replace').split('\x00', 1)[0]
                                elif encoding == 3:
                                    text = text_data.split(b'\x00', 1)[0].decode('utf-8', errors='replace')
                                else:
                                    text = text_data.decode('latin1', errors='replace').split('\x00', 1)[0]
                            except Exception as e:
                                sys.stderr.write(f"[DEBUG] Decode error for title: {e}\n")
                                sys.stderr.flush()
                                text = text_data.decode('latin1', errors='replace').split('\x00', 1)[0]
                            text = text.strip()
                            title = text
                            sys.stderr.write(f"[DEBUG] Found title: {title}\n")
                            sys.stderr.flush()
                    elif frame_id in ('TPE1', 'TP1'):  # v2.3/v2.4 artist, v2.2 artist
                        if len(frame_data) > 0:
                            encoding = frame_data[0]
                            text_data = frame_data[1:]
                            try:
                                if encoding == 0:
                                    text = text_data.split(b'\x00', 1)[0].decode('latin1', errors='replace')
                                elif encoding == 1:
                                    text = text_data.decode('utf-16', errors='replace').split('\x00', 1)[0]
                                elif encoding == 2:
                                    text = text_data.decode('utf-16be', errors='replace').split('\x00', 1)[0]
                                elif encoding == 3:
                                    text = text_data.split(b'\x00', 1)[0].decode('utf-8', errors='replace')
                                else:
                                    text = text_data.decode('latin1', errors='replace').split('\x00', 1)[0]
                            except Exception as e:
                                sys.stderr.write(f"[DEBUG] Decode error for artist: {e}\n")
                                sys.stderr.flush()
                                text = text_data.decode('latin1', errors='replace').split('\x00', 1)[0]
                            text = text.strip()
                            artist = text
                            sys.stderr.write(f"[DEBUG] Found artist: {artist}\n")
                            sys.stderr.flush()
                    pos += 10 + frame_size
            else:
                sys.stderr.write("[DEBUG] No ID3 header found\n")
                sys.stderr.flush()

            if not (artist and title):
                f.seek(0, os.SEEK_END)
                if f.tell() >= 128:
                    f.seek(-128, os.SEEK_END)
                    tag = f.read(128)
                    if tag[:3] == b'TAG':
                        title = title or tag[3:33].rstrip(b'\x00 ').decode('latin1', errors='replace').strip()
                        artist = artist or tag[33:63].rstrip(b'\x00 ').decode('latin1', errors='replace').strip()
                        sys.stderr.write(f"[DEBUG] ID3v1 title: {title}, artist: {artist}\n")
                        sys.stderr.flush()
    except OSError as e:
        sys.stderr.write(f"[DEBUG] Error reading file {path}: {e}\n")
        sys.stderr.flush()
        return None

    sys.stderr.write(f"[DEBUG] Final result for {os.path.basename(path)}: artist={artist}, title={title}\n")
    sys.stderr.flush()
    if artist and title:
        return artist, title
    return None


def get_display_name(filename):
    sys.stderr.write(f"[DEBUG] Processing file: {filename}\n")
    sys.stderr.flush()
    tags = read_mp3_title_artist(os.path.join(MUSIC_DIR, filename))
    if tags:
        artist, title = tags
        if artist and title:
            result = f"{artist} - {title}"
            sys.stderr.write(f"[DEBUG] Using tags for {filename}: {result}\n")
            sys.stderr.flush()
            return result
    fallback = os.path.splitext(filename)[0]
    sys.stderr.write(f"[DEBUG] Falling back to filename for {filename}: {fallback}\n")
    sys.stderr.flush()
    return fallback


class TimeMasterHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Tarkistetaan, pyytääkö selain musiikkilistaa
        if self.path == '/api/music':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()

            music_files = []
            if os.path.exists(MUSIC_DIR):
                filenames = [f for f in os.listdir(MUSIC_DIR) if f.lower().endswith('.mp3')]
                filenames.sort()  # Aakkosjärjestys
                for filename in filenames:
                    music_files.append({
                        'file': filename,
                        'name': get_display_name(filename)
                    })

            self.wfile.write(json.dumps(music_files).encode())
        else:
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