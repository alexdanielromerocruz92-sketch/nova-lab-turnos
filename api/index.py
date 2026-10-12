from http.server import BaseHTTPRequestHandler
import json
from queue_core import GestorTurnos

# Instancia por proceso de función. Para operación multi-instancia conecta Redis/Postgres.
gestor = GestorTurnos(mesas=4)

class handler(BaseHTTPRequestHandler):
    def _send(self, status, payload):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self): self._send(200, {"ok": True})

    def do_GET(self):
        if self.path.rstrip("/") in ("", "/api", "/api/state"):
            return self._send(200, gestor.estado())
        return self._send(404, {"error": "Ruta no encontrada"})

    def do_POST(self):
        try:
            body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
            path = self.path.rstrip("/")
            if path == "/api/tickets":
                turno = gestor.crear_turno(body.get("tipo", ""))
                return self._send(201, {"turno": turno.serializar(), "estado": gestor.estado()})
            if path.startswith("/api/desks/"):
                mesa = int(path.split("/")[3])
                action = body.get("action", "next")
                turno = gestor.llamar_siguiente(mesa) if action == "next" else gestor.finalizar(mesa)
                return self._send(200, {"turno": turno.serializar() if turno else None, "estado": gestor.estado()})
            return self._send(404, {"error": "Ruta no encontrada"})
        except (ValueError, IndexError, json.JSONDecodeError) as exc:
            return self._send(400, {"error": str(exc)})
