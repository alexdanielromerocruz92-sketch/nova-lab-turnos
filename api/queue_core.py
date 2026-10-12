from __future__ import annotations
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from enum import Enum
from threading import RLock
from typing import Optional

class TipoTurno(str, Enum):
    RECURRENTE = "recurrente"
    PRIMERA_VEZ = "primera_vez"
    ACLARACION = "aclaracion"

class EstadoTurno(str, Enum):
    ESPERA = "espera"
    ATENDIENDO = "atendiendo"
    COMPLETADO = "completado"

@dataclass
class Turno:
    numero: str
    tipo: TipoTurno
    estado: EstadoTurno
    creado: str
    mesa: Optional[int] = None

    def serializar(self) -> dict:
        data = asdict(self)
        data["tipo"] = self.tipo.value
        data["estado"] = self.estado.value
        return data

class GestorTurnos:
    """Controla la fila y las cuatro mesas; mantiene primero la antigüedad del turno."""
    PREFIJOS = {TipoTurno.RECURRENTE: "R", TipoTurno.PRIMERA_VEZ: "N", TipoTurno.ACLARACION: "A"}

    def __init__(self, mesas: int = 4):
        self._lock = RLock()
        self.mesas = {i: None for i in range(1, mesas + 1)}
        self.turnos: list[Turno] = []
        self._secuencia = {tipo: 0 for tipo in TipoTurno}

    def crear_turno(self, tipo: str) -> Turno:
        try:
            categoria = TipoTurno(tipo)
        except ValueError as exc:
            raise ValueError("Tipo de turno no válido") from exc
        with self._lock:
            self._secuencia[categoria] += 1
            turno = Turno(f"{self.PREFIJOS[categoria]}-{self._secuencia[categoria]:03d}", categoria, EstadoTurno.ESPERA, datetime.now(timezone.utc).isoformat())
            self.turnos.append(turno)
            self._asignar_automaticamente()
            return turno

    def _asignar_automaticamente(self) -> None:
        for mesa, actual in self.mesas.items():
            if actual is not None:
                continue
            siguiente = next((t for t in self.turnos if t.estado == EstadoTurno.ESPERA), None)
            if siguiente is None:
                break
            siguiente.estado, siguiente.mesa = EstadoTurno.ATENDIENDO, mesa
            self.mesas[mesa] = siguiente.numero

    def llamar_siguiente(self, mesa: int) -> Optional[Turno]:
        with self._lock:
            if mesa not in self.mesas:
                raise ValueError("Mesa no válida")
            self._finalizar_actual(mesa)
            self._asignar_automaticamente()
            numero = self.mesas[mesa]
            return next((t for t in self.turnos if t.numero == numero), None)

    def finalizar(self, mesa: int) -> Optional[Turno]:
        with self._lock:
            if mesa not in self.mesas:
                raise ValueError("Mesa no válida")
            actual = self._finalizar_actual(mesa)
            self._asignar_automaticamente()
            return actual

    def _finalizar_actual(self, mesa: int) -> Optional[Turno]:
        numero = self.mesas[mesa]
        turno = next((t for t in self.turnos if t.numero == numero), None)
        if turno:
            turno.estado = EstadoTurno.COMPLETADO
            self.mesas[mesa] = None
        return turno

    def estado(self) -> dict:
        with self._lock:
            return {"mesas": [{"numero": n, "turno": next((t.serializar() for t in self.turnos if t.numero == actual), None)} for n, actual in self.mesas.items()], "cola": [t.serializar() for t in self.turnos if t.estado == EstadoTurno.ESPERA], "recientes": [t.serializar() for t in reversed(self.turnos[-12:])], "totales": {"espera": sum(t.estado == EstadoTurno.ESPERA for t in self.turnos), "atendiendo": sum(t.estado == EstadoTurno.ATENDIENDO for t in self.turnos), "completados": sum(t.estado == EstadoTurno.COMPLETADO for t in self.turnos)}}
