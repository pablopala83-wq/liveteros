# V2 — Live Teros

- Doble reloj: reloj oficial visible (pausa/reanuda) + reloj continuo oculto por tiempo.
- Cada evento/secuencia guarda matchSeconds y realSeconds para futura sincronización con video/XML.
- Layout iPad horizontal sin scroll; botones compactos y últimas 2 secuencias visibles.
- + ENTRÓ 22 y + PASÓ Y40 como acciones excepcionales sobre datos recientes.
- Try cierra posesión; muestra posesión vacía y deja próximo reinicio para el rival.
- Recepción kick enlaza el kick previo y cambia posesión sin cortar secuencia.
- Motor de valoración de kicks según reglas acordadas; CASUAL no evaluado.
- Valoración automática de secuencia con reglas de territorio/posesión/penal.
- Penal revertido/doble penal posible mediante penales standalone cuando no hay secuencia abierta.
- Tarjetas URU/rival.
- Penalty try y drop goal.
- Cierres: dead in-goal, held-up, mark, 22 dropout, try-line dropout, free kick, etc.
- Inicio de nueva secuencia auto-cierra una anterior incompleta como POR REVISAR.
- Service worker cache actualizado para evitar versión vieja.
