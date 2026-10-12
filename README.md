# Nó va · Gestión de turnos clínicos

Aplicación web para gestionar turnos de un laboratorio de análisis clínicos. Incluye tótem de autoservicio, cuatro ventanillas con asignación automática FIFO, panel de operación y pantalla pública de turnos. Interfaz en Angular y backend Python orientado a objetos.

## Funciones

- Emisión de turnos para pacientes recurrentes (tarjeta/afiliación), pacientes de primera vez y aclaraciones.
- Asignación automática a una mesa libre en orden de llegada; al llamar el siguiente turno desde una mesa, el turno atendido se cierra y la siguiente persona en espera se asigna automáticamente.
- Panel con ocupación, fila, actividad y estimado de espera configurable a 8 minutos por turno.
- Vista de tótem con comprobante de turno y vista de pantalla pública.
- API JSON en Python con `GestorTurnos`, dataclasses, enums y bloqueo para operaciones concurrentes dentro del proceso.

## Ejecutar localmente

Requiere Node.js 20+ y Python 3.12+.

```bash
cd lab-turnos
npm install
```

En una terminal, inicia la API:

```bash
python api/local_server.py
```

En otra terminal, inicia Angular:

```bash
npm start -- --proxy-config proxy.conf.json
```

Abre `http://localhost:4200`. La API queda en `http://localhost:8000/api/state`. Los datos locales viven en memoria y se reinician al reiniciar el servidor.

## API

- `GET /api/state` — mesas, fila, actividad y contadores.
- `POST /api/tickets` con `{ "tipo": "recurrente" | "primera_vez" | "aclaracion" }` — emite y asigna un turno.
- `POST /api/desks/{mesa}` con `{ "action": "next" }` — concluye el turno actual y llama al siguiente.
- `POST /api/desks/{mesa}` con `{ "action": "finish" }` — concluye el turno actual y libera la mesa.

## Desplegar en Vercel

1. Sube el directorio `lab-turnos` a un repositorio de GitHub.
2. En Vercel, importa el repositorio y conserva la configuración detectada por `vercel.json`.
3. Configuración incluida: `npm run vercel-build`, artefactos de Angular en `dist/lab-turnos/browser`, función Python en `api/index.py` y rutas `/api/*` a la API.

### Persistencia al escalar

La versión incluida usa memoria del proceso, por lo que funciona como demo y para una sola instancia, pero las funciones serverless pueden reiniciarse y atender peticiones en instancias distintas. Para una operación de producción con varios dispositivos, reemplaza el estado en memoria de `api/queue_core.py` por Redis o una base de datos compartida y configura sus credenciales como variables de entorno de Vercel. La interfaz y el contrato de API ya están desacoplados para ese cambio.

## Estructura

```text
lab-turnos/
├── api/
│   ├── index.py          # Función Python para Vercel
│   ├── local_server.py   # Servidor local para desarrollo
│   └── queue_core.py     # Lógica de negocio orientada a objetos
├── src/
│   ├── app/              # Reservado para componentes Angular
│   ├── main.ts           # Vistas de operación, tótem y tablero
│   └── styles.css
├── angular.json
├── vercel.json
└── package.json
```
