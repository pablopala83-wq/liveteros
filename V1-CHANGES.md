# Los Teros Live - V1 Evento / Posesion / Secuencia

Cambios principales:
- Modelo de posesiones dentro de una misma secuencia y patron ATA-DEF-ATA.
- Turnover y recepcion de kick cambian posesion sin cerrar secuencia.
- Kick pide solo tipo; el resultado se infiere por eventos posteriores.
- Line simplificado: equipo, zona, obtencion y maul. Sin hombres ni posicion del lanzamiento.
- Quiebre: zona + carril. Sin motivo ni consecuencia manual.
- Penal URU: fase + motivo + dorsal + zona final.
- Penal RIVAL: zona final.
- Reinicios: salida 50, 22 dropout, goal-line dropout.
- Pregunta "entro a 22 y salio" al cerrar secuencias que empiezan y terminan fuera de la zona objetivo.
- Boton REVISAR con timestamp.
- Mini timeline de ultimos eventos.
- Deshacer mantiene snapshot completo del estado.
- Exportacion CSV separada para SECUENCIAS y POSESIONES.
- La valoracion POSITIVA/NEGATIVA deja de pedirse al cerrar una secuencia; queda PENDIENTE para inferir/validar posteriormente.

Nota tecnica:
Esta V1 conserva el esquema actual de Supabase, guardando el estado dentro de live_state para no requerir una migracion de base antes de probar. La normalizacion en tablas PARTIDOS/SECUENCIAS/POSESIONES/EVENTOS puede hacerse despues de validar el flujo de tagging.
