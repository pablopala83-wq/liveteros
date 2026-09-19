# Los Teros Live V4 Online

Esta versión usa Supabase para login, partidos online, permisos y actualización del dashboard en tiempo real. Mantiene cache local para seguir taggeando si se corta la conexión una vez que el partido fue abierto online.

## 1. Ejecutar el patch SQL
En Supabase > SQL Editor, pegar y ejecutar `supabase-v4-patch.sql` una sola vez.

El patch agrega:
- `matches.live_state` para sincronizar el estado del partido en vivo.
- perfiles básicos de usuarios.
- compartir un partido por email.
- listar y quitar accesos.

## 2. Publicar en Netlify
Subir esta carpeta completa al mismo sitio de Netlify (Deploys > drag & drop).

## 3. Primer usuario
Abrir la app, elegir CREAR CUENTA y registrarse con email/contraseña. Si Supabase exige confirmación de email, confirmar desde el correo y luego ingresar.

## 4. Crear partido
El usuario que crea el partido queda como ADMIN automáticamente.

## 5. Compartir con entrenadores
El entrenador primero debe crear su cuenta en la app. Luego el ADMIN abre el partido > ACCESO > ingresa el email y elige:
- Solo dashboard (viewer)
- Puede taggear (editor)
- Administrador (admin)

Los viewers entran directamente en modo Dashboard y no pueden modificar el partido.

## 6. Offline
Abrir el partido al menos una vez con conexión. Durante un corte, el estado se guarda en el dispositivo. Cuando vuelve internet, la app intenta sincronizar el estado pendiente.

## Configuración Supabase embebida
Project URL: https://lrkywcgsxcbvzusgmlrh.supabase.co
Publishable key: incluida en `app.js` (es una key pública de frontend).


## V5 — Deducciones y tagging simplificado
- TRY no pregunta zona final; se guarda como INGOAL.
- LINE pregunta zona, cantidad de hombres, destino del tiro y MAUL / NO MAUL.
- Se elimina el botón manual ENTRADA 22.
- Entradas URU a 22 se detectan automáticamente al llegar/iniciar una secuencia en Z4.
- Entradas del rival a 22 se detectan automáticamente al llegar/iniciar una secuencia en Z1.
- Cada entrada se cuenta una sola vez por secuencia.
- El dashboard muestra cuántas de esas entradas terminaron con valoración positiva.


## V6 - Tanteador
- TRY suma 5 puntos automáticamente al equipo de la secuencia.
- Botón +3 para registrar penal a palos/drop convertido.
- Botón +2 para registrar conversiones.
- +3 y +2 preguntan a qué equipo corresponden.
- Los puntos quedan guardados en el estado online y sincronizados en realtime.
- Un penal cobrado no suma puntos automáticamente; solo el botón +3 lo hace.


## V7
- LINE y SCRUM: OBTENIDO / NO OBTENIDO. La no obtención cierra y cambia posesión automáticamente.
- LINE: MAUL se pregunta solo si hubo obtención.
- PENAL: motivo obligatorio. Si el penal es contra URU, se pregunta Nº de camiseta 1-23.
- Dashboard: motivos de disciplina y camisetas URU agrupadas.


## V8
- Penal breakdown separado en DE CABEZA y DE COSTADO.
- Tackle separado en NO RELEASE y NO SALE TACKLEADOR.


## V9
- Eliminados los botones manuales +2 y +3 del tagging.
- TRY suma 5 y pregunta inmediatamente CONVERTIDA +2 / ERRADA.
- PENAL URU en Z3/Z4 pregunta si va a palos: CONVERTIDO +3 / ERRADO / NO PATEA.
- PENAL RIVAL en Z1/Z2 hace la misma pregunta.
- El penal concedido no suma puntos por sí solo.


## V10
- Entrada a 22 cuenta aunque un line/scrum propio en la zona objetivo termine NO OBTENIDO.
- LINE URU en Z4 no obtenido = entrada a 22 negativa; espejo rival en Z1.
- Se mantiene máximo una entrada a 22 por secuencia.


## V11 · Dashboard táctico
- GENERAL: entradas a 22 y efectividad de ambos equipos, line por zona, scrum total, disciplina ataque/defensa de ambos y mapas de quiebres por zona/carril.
- ATAQUE: line por cantidad de hombres, detalle de no obtenidos y valoración positiva de utilización de line/scrum por zona.
- DEFENSA: espejo del ataque rival.
- FORMACIONES FIJAS: consolidado de ataque y defensa.
- Los cálculos se derivan de las secuencias/lanzamientos guardados, por lo que funcionan con partidos existentes.


## V12
- Penal rival a favor: sin motivo ni camiseta; detalle solo para infracciones URU.
- Pregunta de palos solo en campo rival: URU Z3/Z4; rival Z1/Z2.
- LINE/SCRUM no obtenido pregunta TURNOVER, PENAL, FREE KICK u OTRO.
- Nuevo mapa de quiebres sobre cancha con ingoales, zonas, carriles y burbujas por equipo.
- Botón para crear un partido ficticio URU vs GALES con volumen verosímil de datos para probar el dashboard.


## V13
- SCRUM no obtenido: solo PENAL/FREE KICK para URU o rival; penal de scrum no pide motivo, camiseta ni valoración adicional.
- Utilización de LINE/SCRUM: solo formaciones obtenidas y excluye secuencias cuyo resultado es TURNOVER.
- Rediseño completo del mapa de quiebres como cancha horizontal protagonista, con ingoales, zonas, carriles y burbujas por equipo.


## V14
- Partido ficticio URU vs NUEVA ZELANDA (24-36), con dataset amplio y verosímil para probar todas las vistas del dashboard.
- Incluye lineouts, scrums, obtención, utilización, quiebres por zona/carril, entradas a 22, disciplina y puntos por origen.

## V15
- Nuevo diseño limpio de cancha de quiebres, con ingoales, zonas, carriles y burbujas por equipo.
- FORMACIONES FIJAS ya no muestra utilización; queda centrada en obtención de LINE/SCRUM.
- ATAQUE/DEFENSA ya no muestran obtención.
- ATAQUE/DEFENSA ahora listan todas las secuencias de LINE y SCRUM con zona/hora de inicio, zona/hora final, resultado y valoración.

## V16
- Corregido bug del dashboard que dejaba ATAQUE, DEFENSA y FORMACIONES FIJAS sin datos.
- QUIEBRES vuelve a una tabla clara por Z1-Z4 y carril Izquierda/Centro/Derecha, comparando URU y rival en cada celda.
- ATAQUE/DEFENSA: utilización + listado de secuencias LINE/SCRUM con inicio y fin.
- FORMACIONES FIJAS: solo obtención de LINE/SCRUM, sin utilización.

## V17
- QUIEBRES: dos tablas separadas, una para URU y otra para el rival.
- Listado de secuencias: reemplaza OTRO por resultados más específicos deducidos desde origen, eventos y zona final.
- Eliminada la sección SUGERENCIAS.

## V18
- QUIEBRE ya no pregunta si continúa ni cómo termina: solo carril + zona.
- La posesión continúa por defecto hasta FIN SECUENCIA.
- Partido ficticio URU vs Nueva Zelanda regenerado con el nuevo criterio.
- Tablas de quiebres muestran siempre Z1, Z2, Z3 y Z4, incluso con valor 0.

## V19
- Revisión integral: colores de equipo aplicados a datos y paneles.
- Entradas a 22: total y efectividad ahora salen de la misma lista de secuencias; no se mezcla un contador manual con otro denominador.
- Quiebres: Z1-Z4 forzadas visibles incluso con 0.
- ATAQUE/DEFENSA: LINE y SCRUM en paralelo y más compactos.
- SUGERENCIAS eliminada totalmente del HTML y del render.

## V20
- FORMACIONES FIJAS: encabezado rival simplificado a DEFENSA.
- Nuevo sistema visual de colores: fondos blancos, colores de equipo usados solo como acentos, números, bordes y títulos.
- URU: celeste + azul; rival: color configurado + neutros.
- Eliminados bloques oscuros que reducían la legibilidad.

## V20 Penalty Fix
- PENAL URU = infracción cometida por Uruguay.
- PENAL RIVAL = infracción cometida por el rival.
- Solo PENAL URU pide motivo y dorsal URU.
- La posesión y el eventual tiro a palos quedan para el equipo beneficiado.
- GENERAL incorpora una tabla de detalle de penales URU: minuto, jugador y motivo, junto al bloque de quiebres.

## V22
- Base: V20 con corrección definitiva de PENAL URU / PENAL RIVAL.
- INICIO DE SECUENCIA agrega PENAL y FREE KICK.
- PENAL pregunta a favor de quién, zona y, si la infracción fue URU, motivo + dorsal URU.
- La posesión queda automáticamente para el equipo beneficiado.
- FREE KICK pregunta a favor de quién y zona, y abre la secuencia con esa posesión.
- Los penales que inician una secuencia también alimentan el conteo y la tabla de disciplina de GENERAL.
- TRY mantiene la posesión del equipo que anotó, porque ese equipo recibe el reinicio.

## V23
- Al crear partido se puede cargar plantel URU: `número nombre`.
- PENAL URU guarda dorsal + nombre del jugador y GENERAL muestra el nombre.
- Tagging: LINE muestra cantidad de hombres en ORIGEN (`LINE · 5H`).
- Penal a palos convertido/errado queda explícito en EVENTOS.
- ATAQUE/DEFENSA: se agrega CONSECUENCIA entre resultado y valoración.
- CONSECUENCIA no encadena TRY; penal a palos muestra su propio desenlace. Para penal/touch/KO/FPass/FK/kick entregado puede mirar la siguiente secuencia.
- FORMACIONES FIJAS · DEFENSA usa el color del rival en los números.
- QUIEBRES se simplifica a Z1-Z4 con total grande y detalle IZQ/CEN/DER.
- Partidos guardados incorporan ELIMINAR. Requiere ejecutar `supabase-v23-patch.sql` una vez.

## V24
- SCRUM no obtenido + PENAL URU ahora pide dorsal/jugador; motivo queda SCRUM.
- ATAQUE y DEFENSA incluyen siempre RECEPCIÓN KICK.
- PENAL, FREE KICK, TURNOVER y otros orígenes aparecen dinámicamente si existen.
- INICIO de secuencia muestra zona + origen; LINE agrega hombres y SCRUM agrega IZQ/CENTRAL/DER.
- GENERAL · QUIEBRES explicita Z1, Z2, Z3 y Z4.

## V25
- Corrige duplicación de LINE y SCRUM en ATAQUE/DEFENSA.
- Orden visual definitivo de secuencias:
  1. LINE izquierda / SCRUM derecha.
  2. RECEPCIÓN KICK debajo, ancho completo.
  3. PENAL, FREE KICK, TURNOVER y otros orígenes debajo, solo si existen.

## V26
- ATAQUE y DEFENSA pasan a una única lista cronológica de todas las secuencias.
- Se mantienen arriba los KPI de utilización de LINE y SCRUM.
- Filtros combinables: origen, zona inicio, zona fin, valoración y resultado.
- Si ORIGEN=LINE aparecen filtros de hombres, salto, maul y obtención.
- Si ORIGEN=SCRUM aparecen lado y obtención.
- Botón LIMPIAR restaura la lista completa.

## V27
- GENERAL · QUIEBRES: dos boxes simples, por ZONA y por CARRIL.
- GENERAL · PENAL URU: agrega CONSECUENCIA usando la misma lógica de ATAQUE/DEFENSA.
- KICK pasa a ser evento dentro de una secuencia: CAJÓN 9, A DISPUTAR, TERRITORIO, TOUCH, PASS KICK y CASUAL.
- Permite varios kicks dentro de la misma secuencia para registrar PING PONG.
- KICK A DISPUTAR y PASS KICK registran resultado inmediato sin cerrar automáticamente la secuencia.
- TOUCH distingue kick directo de jugador que sale al touch.
- Partido ficticio reemplazado por URU vs ENG (23-31), con datos para probar filtros, set piece, penales, consecuencias, entradas a 22, quiebres y juego con el pie.

## V28
- Todas las listas de secuencias del dashboard quedan con la última secuencia arriba.
- ATAQUE y DEFENSA suman utilización de RECEPCIÓN KICK por Z1-Z4.
- ATAQUE y DEFENSA suman utilización de TURNOVER por Z1-Z4 en un box compacto.
- Nueva solapa KICKING GAME.
- KICKING GAME muestra cantidad, positivos y % positivo por tipo: Cajón 9, A disputar, Territorio, Touch, Pass Kick y Casual.
- PASS KICK positivo = mantiene posesión. A DISPUTAR positivo = recuperación URU, knock-on rival o penal rival. Resto toma valoración final de la secuencia.
- PING PONG se detecta automáticamente cuando una misma secuencia tiene múltiples kicks y un evento OTRO KICK / PING PONG.
- Ping pong: positivo si termina en una zona territorial superior para URU, neutro si termina en la misma zona y negativo si pierde zona.

## V29
- Disciplina: jugador compacto (nombre si existe; si no, dorsal).
- Disciplina comparada: agrega TOTAL para URU y rival.
- Quiebres: rediseño limpio en dos tablas simples, POR ZONA y POR CARRIL.
- Detalle de penales ordenado con el último arriba.

## V30
- KICK cambia automáticamente la posesión sin cerrar la secuencia:
  - RECIBE/RECUPERA URU -> posesión URU.
  - RECIBE/RECUPERA rival -> posesión rival.
  - PASS KICK CAMBIA POSESIÓN -> pasa al otro equipo.
  - MANTIENE POSESIÓN -> queda en el equipo que pateó.
  - OTRO KICK / PING PONG -> pasa al otro equipo y la misma secuencia sigue abierta.
- TOUCH no fuerza posesión: se resuelve al cierre según el line posterior.
- Nueva vista compacta específica para iPad landscape (aprox. 1024x768 a 1180x820):
  header, reloj, posesión, botones, paneles y estado actual reducidos para mantener los controles principales visibles.

## V31
- KICK ya no pregunta quién patea: usa automáticamente la posesión actual.
- PING PONG se detecta automáticamente con 2+ kicks y alternancia entre equipos.
- Ya no requiere marcar `OTRO KICK / PING PONG`.
- El dashboard incluye ping pong de la secuencia abierta y lo marca EN VIVO.
- Evaluación territorial desde el primer kick real del intercambio, siempre desde perspectiva URU.

## V32
- QUIEBRES eliminado y reconstruido desde cero.
- El bloque ocupa ancho completo en GENERAL.
- Dos tablas independientes: QUIEBRES POR ZONA y QUIEBRES POR CARRIL.
- Se usan tablas HTML reales con columnas de ancho estable, bordes entre números y separación amplia.
- El listado detallado de penales pasa debajo para no comprimir el bloque de quiebres.

## V33
- PING PONG abierto: se muestra EN CURSO y no se evalúa.
- Se eliminó por completo el uso de la zona del último kick como final provisional.
- PING PONG cerrado: evaluación estricta desde la zona del primer kick del intercambio hasta `zEnd`, la zona final real de la secuencia.
- Si una secuencia cerrada no tiene `zEnd`, queda SIN EVALUAR.
- Porcentaje y totales positivos/neutros/negativos excluyen los ping pong EN CURSO y SIN EVALUAR.

## V34
- Corrige la orientación territorial del PING PONG.
- Z1-Z4 son siempre coordenadas absolutas desde la perspectiva de URU, independientemente de quién tenga posesión o quién haga el primer kick.
- Z1→Z2/Z3/Z4 = avance territorial positivo para URU.
- Z4→Z3/Z2/Z1 = avance territorial negativo para URU.
- Se eliminó la inversión de signo cuando el primer kick era del rival.

## V35
- Valoración POSITIVA/NEGATIVA editable con un toque desde SECUENCIAS CERRADAS.
- KICK incorpora TAPPING; luego pregunta quién mantiene posesión.
- Se elimina la opción manual PING PONG: sigue detectándose automáticamente por kicks alternados.
- KICK -> TOUCH cierra automáticamente como KICK AL TOUCH.
- KICK A DISPUTAR -> KNOCK ON cierra automáticamente y deja posesión al otro equipo.
- KICK A DISPUTAR -> PENAL cierra automáticamente y ejecuta la lógica completa del penal.
- TURNOVER usa la posesión viva para determinar quién recupera; ya no usa el equipo que abrió la secuencia.
- QUIEBRE se adjudica al equipo que tiene posesión en ese momento.
- VENTAJA: botón activo dentro de la secuencia. Registra PENAL/KNOCK ON, beneficiario y zona.
- Si hay ventaja activa al producirse un cierre, permite mantener el resultado o volver a la ventaja.
- Tocar VENTAJA otra vez la da por terminada.
- DESHACER revierte la última acción no terminal de la secuencia, incluyendo posesión, eventos, quiebres y entradas a 22.

## V36
- LINE incorpora configuración NORMAL / +1 después de elegir cantidad base.
- Se guardan por separado `men`, `plusOne` y `lineStructure` (ej. 5 + true + 5+1).
- Dashboard y filtros distinguen 5 de 5+1, 6 de 6+1, etc.
- KICK guarda zona de origen (`zFrom`) y zona destino/recepción (`zTo`).
- La zona solicitada al taggear KICK queda explícita como `zona destino / recepción`.
- PING PONG se evalúa desde la zona de origen del PRIMER kick hasta la zona destino/recepción del ÚLTIMO kick del intercambio.
- Acciones posteriores al último kick (por ejemplo un penal) pueden hacer negativa la secuencia completa, pero no modifican la valoración territorial del ping pong.

## V37
- Motivo de PENAL URU: agrega PESCA.
- El botón PENAL de reinicio pasa a TAP PENAL: inicia una secuencia, no registra/categoriza una infracción.
- FREE KICK sigue siendo un reinicio independiente.
- Zonas mantienen internamente Z1-Z4 pero se presentan como Extrema Defensa, Gestación DEF, Gestación OF y Zona Garra.
- Selector de zonas: rojo, naranja, verde y celeste respectivamente.
- Botones de valoración POSITIVA verdes y NEGATIVA rojos.
- Secuencias cerradas: botón EDITAR para corregir zona inicial/final, valoración y kicks (tipo, origen y destino).
- DESHACER conserva snapshots más completos y revierte una acción de tagging por pulsación, incluyendo sus efectos derivados.

- KICK TERRITORIO URU se valora por desplazamiento territorial origen→destino; corregir Z2 a Z3 en EDITAR recalcula inmediatamente su resultado en KICKING GAME.

## V38
- DEFENSA: LINE/SCRUM/RECEPCIÓN KICK/TURNOVER muestran % OBJETIVO DEFENSIVO CUMPLIDO (secuencia rival negativa = éxito defensivo).
- Entradas a 22: TRY implica entrada automáticamente aunque nunca se haya marcado la zona de 22.
- Efectividad de entrada: TRY y penal a favor del atacante son efectivos automáticamente; el resto conserva valoración positiva/negativa.
- LINE NO OBTENIDO agrega KNOCK ON y TIRADA TORCIDA.
- KICK agrega KNOCK ON como resultado general y luego pregunta quién hizo el KO.
- Nuevos botones CAMBIO y TARJETA; registran minuto/jugadores sin cerrar secuencia ni cambiar posesión.
- TARJETA permite AMARILLA o ROJA.
- EDITAR SECUENCIA ampliado: inicio, detalle LINE, detalle SCRUM, kicks, quiebres, ventajas, borrar eventos y final.

## V39
- Corrige adjudicación del score cuando la posesión cambia dentro de una secuencia.
- TRY: los 5 puntos se asignan al equipo con posesión viva (`st.team`) en el instante del try.
- Conversión: se asigna al mismo equipo que hizo el try.
- La secuencia cerrada guarda `terminalTeam`, para distinguir quién terminó la jugada del equipo que la inició.
- Entradas a 22 por TRY también usan `terminalTeam`, evitando adjudicar el try al equipo que inició una secuencia con posesión posteriormente perdida.

## V40
- MVP de etiquetado por voz.
- Botón VOZ en tagging; usa SpeechRecognition/webkitSpeechRecognition del navegador.
- Flujo seguro: escucha -> transcribe -> interpreta -> muestra preview -> APLICAR.
- Reconoce inicialmente LINE, SCRUM, RECEPCIÓN KICK, TAP PENAL, FREE KICK, KICK, QUIEBRE, TURNOVER, TRY y PENAL.
- Entiende nombres nuevos de zonas, equipo, line 5+1/6+1, salto, obtención, maul, scrum lado, tipos de kick, receptor/recuperador, tapping, KO, carril, motivo PESCA y dorsal.
- Si falta un dato obligatorio, reutiliza los botones manuales para completar solo lo faltante.
- La voz no sustituye el tagging manual: ambos modos pueden usarse juntos.
- Si el navegador no soporta reconocimiento de voz, la app lo informa y sigue funcionando normalmente.

## V41
- DESHACER reconstruido como historial real de estados.
- Cada acción principal de tagging guarda el estado completo antes de modificarlo.
- Puede deshacer incluso después de cerrar una secuencia, un TRY, un turnover o un cambio de posesión.
- Se pueden encadenar hasta 60 deshacer consecutivos.
- El historial ya no se borra al abrir/cerrar secuencias.
- Cambio manual de posesión, voz, cambios/tarjetas y eventos principales quedan cubiertos.


V2.6 White Base: fondo general claro con identidad navy/celeste.
