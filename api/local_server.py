import locale
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).parent))
from queue_core import GestorTurnos

gestor = GestorTurnos()
class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, payload):
        raw = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status); self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Access-Control-Allow-Origin','*'); self.send_header('Access-Control-Allow-Headers','Content-Type'); self.send_header('Access-Control-Allow-Methods','GET, POST, OPTIONS'); self.end_headers(); self.wfile.write(raw)
    def do_OPTIONS(self): self.send_json(200, {'ok': True})
    def do_GET(self): self.send_json(200, gestor.estado()) if self.path in ('/api/state','/api/state/') else self.send_json(404, {'error':'Ruta no encontrada'})
    def do_POST(self):
        try:
            body=json.loads(self.rfile.read(int(self.headers.get('Content-Length',0))) or b'{}')
            if self.path == '/api/tickets':
                turno=gestor.crear_turno(body.get('tipo','')); return self.send_json(201, {'turno':turno.serializar(),'estado':gestor.estado()})
            if self.path.startswith('/api/desks/'):
                mesa=int(self.path.rstrip('/').split('/')[-1]); turno=gestor.llamar_siguiente(mesa) if body.get('action','next')=='next' else gestor.finalizar(mesa)
                return self.send_json(200, {'turno':turno.serializar() if turno else None,'estado':gestor.estado()})
            self.send_json(404, {'error':'Ruta no encontrada'})
        except (ValueError, json.JSONDecodeError) as exc: self.send_json(400, {'error':str(exc)})
    def log_message(self, fmt, *args): print(fmt % args)

if __name__ == '__main__':
    print('API disponible en http://localhost:8000/api/state')
    HTTPServer(('127.0.0.1',8000), Handler).serve_forever()
