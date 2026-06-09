/**
 * app.js — Lógica principal de Horarios de Colectivo Andresito
 * Incluye: reloj en tiempo real, filtros, buscador Origen/Destino y soporte PWA
 */

/* ─── Estado global ─── */
const estado = {
  filtroDestino:   'todos',
  filtroEmpresa:   'todas',
  tipoDia:         'lv',      // 'lv' | 'sabado' | 'domingo'
  buscadorOrigen:  '',        // parada normalizada seleccionada como origen
  buscadorDestino: '',        // parada normalizada seleccionada como destino
  horaActual:      null,
  deferredPrompt:  null
};

/* ════════════════════════════════════════════
   INICIALIZACIÓN
   ════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  aplicarFiltroDesdeURL();
  inicializarReloj();
  inicializarDia();
  inicializarFiltros();
  inicializarBuscadorOD();
  registrarServiceWorker();
  inicializarPWA();
  detectarEstadoRed();

  setTimeout(() => {
    renderizarApp();
    document.getElementById('skeletons').classList.add('hidden');
    document.getElementById('horarios-container').classList.remove('hidden');
  }, 700);
});

/* ════════════════════════════════════════════
   DEEP LINKING — URL params del manifest
   ════════════════════════════════════════════ */
function aplicarFiltroDesdeURL() {
  const params  = new URLSearchParams(window.location.search);
  const destino = params.get('destino');
  const empresa = params.get('empresa');

  if (destino && APP_DATA.destinos.some(d => d.id === destino)) estado.filtroDestino = destino;
  if (empresa && APP_DATA.empresas[empresa])                     estado.filtroEmpresa = empresa;
}

/* ════════════════════════════════════════════
   RELOJ EN TIEMPO REAL
   ════════════════════════════════════════════ */
function inicializarReloj() {
  function tick() {
    const ahora = new Date();
    estado.horaActual = ahora;
    const hh = String(ahora.getHours()).padStart(2, '0');
    const mm = String(ahora.getMinutes()).padStart(2, '0');
    document.getElementById('reloj').textContent = `${hh}:${mm}`;
    const opts = { weekday: 'short', day: 'numeric', month: 'short' };
    document.getElementById('reloj-fecha').textContent = ahora.toLocaleDateString('es-AR', opts);
  }
  tick();
  setInterval(tick, 20000);
}

/* ════════════════════════════════════════════
   DETECCIÓN DEL TIPO DE DÍA
   ════════════════════════════════════════════ */
function inicializarDia() {
  const ahora     = new Date();
  const fechaISO  = ahora.toISOString().split('T')[0];
  const diaSemana = ahora.getDay();
  const esFeriado = APP_DATA.feriados.includes(fechaISO);

  if (esFeriado || diaSemana === 0) {
    estado.tipoDia = 'domingo';
  } else if (diaSemana === 6) {
    estado.tipoDia = 'sabado';
  } else {
    estado.tipoDia = 'lv';
  }

  const conf = {
    lv:      { texto: 'Lunes a Viernes',                   icono: '💼', clase: 'text-emerald-400', desc: 'Horario completo' },
    sabado:  { texto: 'Sábado',                            icono: '🌤️', clase: 'text-amber-400',  desc: 'Horario reducido' },
    domingo: { texto: esFeriado ? 'Feriado' : 'Domingo',   icono: esFeriado ? '🎌' : '☀️', clase: 'text-orange-400', desc: 'Horario especial' }
  }[estado.tipoDia];

  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('tipo-dia-texto').textContent = conf.texto;
  document.getElementById('tipo-dia-texto').className   = `text-2xl font-black ${conf.clase}`;
  document.getElementById('tipo-dia-desc').textContent  = conf.desc;
  document.getElementById('fecha-completa').textContent = ahora.toLocaleDateString('es-AR', opts);
  document.getElementById('icono-dia').textContent      = conf.icono;
}

/* ════════════════════════════════════════════
   FILTROS DE DESTINO Y EMPRESA
   ════════════════════════════════════════════ */
function inicializarFiltros() {
  construirFiltrosDestino();
  construirFiltrosEmpresa();
}

function construirFiltrosDestino() {
  const c = document.getElementById('filtros-destino');
  c.innerHTML = '';
  APP_DATA.destinos.forEach(dest => {
    const btn = document.createElement('button');
    btn.className   = `filter-pill flex-shrink-0 px-4 py-2 rounded-2xl text-sm font-medium text-white/70 whitespace-nowrap ${dest.id === estado.filtroDestino ? 'active' : ''}`;
    btn.innerHTML   = `${dest.emoji} ${dest.label}`;
    btn.dataset.val = dest.id;
    btn.addEventListener('click', () => {
      estado.filtroDestino = dest.id;
      c.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      renderizarHorarios();
      renderizarProximoServicio();
    });
    c.appendChild(btn);
  });
}

function construirFiltrosEmpresa() {
  const c = document.getElementById('filtros-empresa');
  c.innerHTML = '';
  const todas = crearPillEmpresa('todas', '🏢 Todas', estado.filtroEmpresa === 'todas');
  todas.addEventListener('click', () => cambiarFiltroEmpresa('todas', c));
  c.appendChild(todas);
  Object.values(APP_DATA.empresas).forEach(emp => {
    const pill = crearPillEmpresa(emp.id, `${emp.icono} ${emp.nombre}`, estado.filtroEmpresa === emp.id);
    pill.addEventListener('click', () => cambiarFiltroEmpresa(emp.id, c));
    c.appendChild(pill);
  });
}

function crearPillEmpresa(id, label, activo) {
  const btn = document.createElement('button');
  btn.className   = `filter-pill flex-shrink-0 px-4 py-2 rounded-2xl text-sm font-medium text-white/70 whitespace-nowrap ${activo ? 'active' : ''}`;
  btn.textContent = label;
  btn.dataset.val = id;
  return btn;
}

function cambiarFiltroEmpresa(id, c) {
  estado.filtroEmpresa = id;
  c.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  c.querySelector(`[data-val="${id}"]`).classList.add('active');
  renderizarHorarios();
  renderizarProximoServicio();
}

/* ════════════════════════════════════════════
   BUSCADOR ORIGEN / DESTINO
   ════════════════════════════════════════════ */

/* ─── Normalizar nombre de parada usando el mapa de alias ─── */
function normalizarParada(nombre) {
  if (!nombre) return '';
  return APP_DATA.aliases[nombre] ?? nombre;
}

/* ─── Ruta completa normalizada de un servicio [origen, ...paradas, destino] ─── */
function getRutaCompleta(s) {
  return [
    normalizarParada(s.origen),
    ...s.paradas.map(normalizarParada),
    normalizarParada(s.destino)
  ];
}

/* ─── Hora en una parada específica (usa tiempos si disponible) ─── */
function getTiempoEnParada(s, paradaNorm) {
  if (!s.tiempos) {
    if (paradaNorm === normalizarParada(s.origen))  return s.salida;
    if (paradaNorm === normalizarParada(s.destino)) return s.llegada ?? '—';
    return '—';
  }
  /* Buscar en el objeto tiempos por nombre normalizado o directo */
  const directo = s.tiempos[paradaNorm];
  if (directo) return directo;
  const entrada = Object.entries(s.tiempos).find(([k]) => normalizarParada(k) === paradaNorm);
  return entrada ? entrada[1] : '—';
}

/* ─── Extraer todas las paradas únicas (normalizadas, ordenadas) ─── */
function extraerTodasLasParadas() {
  const stops = new Set();
  APP_DATA.servicios.forEach(s => {
    stops.add(normalizarParada(s.origen));
    s.paradas.forEach(p => stops.add(normalizarParada(p)));
    stops.add(normalizarParada(s.destino));
  });
  return [...stops].filter(Boolean).sort((a, b) => a.localeCompare(b, 'es'));
}

/* ─── Poblar selects y conectar eventos ─── */
function inicializarBuscadorOD() {
  const stops      = extraerTodasLasParadas();
  const selOrigen  = document.getElementById('select-origen');
  const selDestino = document.getElementById('select-destino');
  if (!selOrigen || !selDestino) return;

  const llenar = (sel, placeholder) => {
    sel.innerHTML = `<option value="">${placeholder}</option>`;
    stops.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s; opt.textContent = s;
      sel.appendChild(opt);
    });
  };

  llenar(selOrigen,  'Seleccionar origen…');
  llenar(selDestino, 'Seleccionar destino…');

  /* Restaurar valores si vienen de URL */
  if (estado.buscadorOrigen)  selOrigen.value  = estado.buscadorOrigen;
  if (estado.buscadorDestino) selDestino.value = estado.buscadorDestino;

  selOrigen.addEventListener('change', () => {
    estado.buscadorOrigen = selOrigen.value;
    renderizarApp();
  });
  selDestino.addEventListener('change', () => {
    estado.buscadorDestino = selDestino.value;
    renderizarApp();
  });

  /* Botón intercambiar origen ↔ destino */
  document.getElementById('btn-swap-od')?.addEventListener('click', () => {
    [estado.buscadorOrigen, estado.buscadorDestino] =
      [estado.buscadorDestino, estado.buscadorOrigen];
    selOrigen.value  = estado.buscadorOrigen;
    selDestino.value = estado.buscadorDestino;
    renderizarApp();
  });

  /* Botón limpiar */
  document.getElementById('btn-limpiar-od')?.addEventListener('click', () => {
    estado.buscadorOrigen  = '';
    estado.buscadorDestino = '';
    selOrigen.value  = '';
    selDestino.value = '';
    renderizarApp();
  });
}

/* ─── Core: buscar servicios por Origen / Destino ─── */
function buscarPorOrigenDestino() {
  const normO = estado.buscadorOrigen  ? normalizarParada(estado.buscadorOrigen)  : null;
  const normD = estado.buscadorDestino ? normalizarParada(estado.buscadorDestino) : null;

  const resultados = [];

  APP_DATA.servicios.forEach(s => {
    if (!s.dias.includes(estado.tipoDia)) return;

    const ruta = getRutaCompleta(s);
    const idxO = normO ? ruta.indexOf(normO) : 0;
    const idxD = normD ? ruta.lastIndexOf(normD) : ruta.length - 1;

    if (normO && idxO === -1) return;              // origen no está en la ruta
    if (normD && idxD === -1) return;              // destino no está en la ruta
    if (normO && normD && idxO >= idxD) return;    // origen no precede al destino

    const horaO = getTiempoEnParada(s, ruta[idxO]);
    const horaD = getTiempoEnParada(s, ruta[idxD]);
    const tramo = ruta.slice(idxO, idxD + 1);

    resultados.push({ servicio: s, horaOrigen: horaO, horaDestino: horaD, tramo });
  });

  return resultados.sort((a, b) => {
    const hA = a.horaOrigen !== '—' ? horaAMinutos(a.horaOrigen) : Infinity;
    const hB = b.horaOrigen !== '—' ? horaAMinutos(b.horaOrigen) : Infinity;
    return hA - hB;
  });
}

/* ─── Actualizar el badge de búsqueda activa ─── */
function actualizarBadgeOD(odActivo) {
  const badge  = document.getElementById('od-badge');
  const texto  = document.getElementById('od-badge-texto');
  if (!badge) return;

  if (odActivo) {
    const partes = [];
    if (estado.buscadorOrigen)  partes.push(estado.buscadorOrigen);
    if (estado.buscadorDestino) partes.push(estado.buscadorDestino);
    texto.textContent = partes.join(' → ');
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

/* ════════════════════════════════════════════
   RENDERIZADO PRINCIPAL
   ════════════════════════════════════════════ */
function renderizarApp() {
  const odActivo = !!(estado.buscadorOrigen || estado.buscadorDestino);

  /* Próximo servicio: visible solo cuando O/D no está activo */
  const secProximo = document.getElementById('seccion-proximo');
  if (odActivo) {
    secProximo?.classList.add('hidden');
  } else {
    renderizarProximoServicio();
  }

  /* Filtros: atenuados cuando O/D está activo */
  ['seccion-filtros-destino', 'seccion-filtros-empresa'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    odActivo
      ? el.classList.add('opacity-40', 'pointer-events-none')
      : el.classList.remove('opacity-40', 'pointer-events-none');
  });

  actualizarBadgeOD(odActivo);
  renderizarHorarios(odActivo);
}

/* ─── PRÓXIMO SERVICIO (solo 'salida' desde Andresito) ─── */
function renderizarProximoServicio() {
  const seccion   = document.getElementById('seccion-proximo');
  const card      = document.getElementById('proximo-card');
  const ahora     = new Date();
  const minActual = ahora.getHours() * 60 + ahora.getMinutes();

  let proximoItem = null, menorDif = Infinity;

  APP_DATA.servicios.forEach(s => {
    if (!s.dias.includes(estado.tipoDia) || s.tipo !== 'salida') return;
    const diff = horaAMinutos(s.salida) - minActual;
    if (diff > 0 && diff < menorDif) { menorDif = diff; proximoItem = { servicio: s, hora: s.salida }; }
  });

  if (!proximoItem) { seccion.classList.add('hidden'); return; }
  seccion.classList.remove('hidden');

  const s       = proximoItem.servicio;
  const empresa = APP_DATA.empresas[s.empresa];
  const hR = Math.floor(menorDif / 60), mR = menorDif % 60;
  const tiempoRestante = menorDif <= 1 ? '¡Sale ahora!' : menorDif < 60 ? `en ${mR} min` : `en ${hR}h ${mR}min`;

  let durStr = '';
  if (s.salida && s.llegada) {
    let d = horaAMinutos(s.llegada) - horaAMinutos(s.salida);
    if (d < 0) d += 1440;
    const h = Math.floor(d / 60), m = d % 60;
    durStr = h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m}min`;
  }

  const paradasStr = s.paradas.length > 0
    ? s.paradas.slice(0, 4).join(' · ') + (s.paradas.length > 4 ? ` +${s.paradas.length - 4}` : '')
    : '';

  card.innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap mb-3">
          <span class="text-sm font-semibold" style="color:${empresa.color}">${empresa.icono} ${empresa.nombre}</span>
          ${s.numero ? `<span class="text-xs px-2 py-0.5 rounded-full font-bold" style="background:${empresa.color}22;color:${empresa.color};border:1px solid ${empresa.color}44">N° ${s.numero}</span>` : ''}
          ${s.servicio ? `<span class="text-xs px-2 py-0.5 rounded-full" style="background:rgba(255,255,255,.07);color:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.1)">${s.servicio}</span>` : ''}
          <span class="badge-proximo text-xs px-3 py-1 rounded-full font-bold border" style="background:rgba(232,70,37,.20);color:#FF7050;border-color:rgba(232,70,37,.45)">⚡ ${tiempoRestante}</span>
        </div>
        <div class="flex items-center gap-3 mb-1">
          <span class="text-5xl font-black tracking-tight leading-none">${proximoItem.hora}</span>
          <div class="min-w-0">
            <p class="font-bold text-lg leading-tight truncate">${s.destino}</p>
            ${s.llegada ? `<p class="text-xs text-white/50 mt-0.5">→ llega ${s.llegada}${durStr ? ' · ' + durStr : ''}</p>` : ''}
            ${s.categoria !== 'Servicio regular' ? `<p class="text-xs mt-0.5" style="color:${empresa.color}aa">${s.categoria}</p>` : ''}
          </div>
        </div>
        ${paradasStr ? `<p class="text-xs text-white/35 mt-2 flex items-center gap-1.5"><svg class="w-3 h-3 flex-shrink-0 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>${paradasStr}</p>` : ''}
      </div>
      <div class="flex-shrink-0 flex flex-col items-end gap-2">
        <div class="flex items-center gap-1.5">
          <span class="pulse-dot w-2 h-2 rounded-full inline-block" style="background:#E84625"></span>
          <span class="text-xs text-white/35">En vivo</span>
        </div>
        ${!s.dias.includes('domingo') ? `<span class="text-[10px] text-amber-400/60 text-right">No opera<br>domingos</span>` : ''}
      </div>
    </div>`;
}

/* ─── LISTA DE HORARIOS (normal o modo O/D) ─── */
function renderizarHorarios(odActivo = false) {
  const container   = document.getElementById('horarios-container');
  const estadoVacio = document.getElementById('estado-vacio');
  const contador    = document.getElementById('contador-resultados');

  /* ── MODO BUSCADOR O/D ── */
  if (odActivo) {
    const resultados = buscarPorOrigenDestino();
    contador.textContent = `${resultados.length} resultado${resultados.length !== 1 ? 's' : ''}`;
    if (resultados.length === 0) {
      container.classList.add('hidden');
      estadoVacio.classList.remove('hidden');
      document.getElementById('vacio-mensaje').textContent = 'No hay servicios para esa ruta hoy.';
    } else {
      container.classList.remove('hidden');
      estadoVacio.classList.add('hidden');
      container.innerHTML = '';
      resultados.forEach((res, i) => container.appendChild(crearTarjetaOD(res, i)));
    }
    return;
  }

  /* ── MODO NORMAL ── */
  const items = obtenerItemsFiltrados();
  contador.textContent = `${items.length} servicio${items.length !== 1 ? 's' : ''}`;
  if (items.length === 0) {
    container.classList.add('hidden');
    estadoVacio.classList.remove('hidden');
    document.getElementById('vacio-mensaje').textContent = 'Probá con otro filtro o destino.';
  } else {
    container.classList.remove('hidden');
    estadoVacio.classList.add('hidden');
    container.innerHTML = '';
    items.forEach((item, i) => container.appendChild(crearTarjeta(item.servicio, item.hora, i)));
  }
}

/* ─── Filtrar y ordenar en modo normal ─── */
function obtenerItemsFiltrados() {
  return APP_DATA.servicios
    .filter(s => {
      const okDia  = s.dias.includes(estado.tipoDia);
      const okDest = estado.filtroDestino === 'todos' || s.destinoId === estado.filtroDestino;
      const okEmp  = estado.filtroEmpresa === 'todas' || s.empresa   === estado.filtroEmpresa;
      return okDia && okDest && okEmp;
    })
    .map(s => ({ servicio: s, hora: s.tipo === 'llegada' ? (s.llegada ?? s.salida) : s.salida }))
    .sort((a, b) => horaAMinutos(a.hora) - horaAMinutos(b.hora));
}

function horaAMinutos(hora) {
  if (!hora || hora === '—') return 0;
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

/* ════════════════════════════════════════════
   TARJETAS
   ════════════════════════════════════════════ */

/* ─── Tarjeta normal ─── */
function crearTarjeta(servicio, hora, index) {
  const empresa   = APP_DATA.empresas[servicio.empresa];
  const minActual = new Date().getHours() * 60 + new Date().getMinutes();
  const diff      = horaAMinutos(hora) - minActual;

  const esPasado    = diff < 0;
  const esInminente = diff >= 0 && diff <= 10;
  const esCercano   = diff >  10 && diff <= 45;
  const esLlegada   = servicio.tipo === 'llegada';
  const esArea      = servicio.tipo === 'area';
  const noDomingo   = !servicio.dias.includes('domingo');

  let badgeEstado = '';
  if (!esArea) {
    if (esPasado)     badgeEstado = `<span style="background:rgba(255,255,255,.05);color:rgba(255,255,255,.3)" class="text-[10px] px-2 py-0.5 rounded-full">${esLlegada ? 'Ya llegó' : 'Partió'}</span>`;
    else if (esInminente) badgeEstado = `<span style="background:rgba(239,68,68,.2);color:#FCA5A5;border:1px solid rgba(239,68,68,.3)" class="text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">${esLlegada ? '¡Llega ya!' : '¡Sale ya!'}</span>`;
    else if (esCercano)   badgeEstado = `<span style="background:rgba(232,70,37,.15);color:#FF7050;border:1px solid rgba(232,70,37,.32)" class="text-[10px] px-2 py-0.5 rounded-full">${esLlegada ? `llega en ${diff} min` : `en ${diff} min`}</span>`;
  }

  let duracion = '';
  if (servicio.salida && servicio.llegada) {
    let d = horaAMinutos(servicio.llegada) - horaAMinutos(servicio.salida);
    if (d < 0) d += 1440;
    const h = Math.floor(d / 60), m = d % 60;
    duracion = h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m}min`;
  }

  const MAX = 6;
  const paradasText = servicio.paradas.length > 0
    ? servicio.paradas.slice(0, MAX).join(' · ') + (servicio.paradas.length > MAX ? ` +${servicio.paradas.length - MAX} más` : '')
    : '';

  let subtitulo = '';
  if (esArea)        subtitulo = `${servicio.origen} → ${servicio.destino}${duracion ? ' · ' + duracion : ''}`;
  else if (esLlegada) subtitulo = `Sale de ${servicio.origen} a las ${servicio.salida}${duracion ? ' · viaje ' + duracion : ''}`;
  else if (servicio.origen !== 'Cdte. Andresito') subtitulo = `Desde: ${servicio.origen}${duracion ? ' · ' + duracion : ''}`;
  else if (duracion) subtitulo = duracion;

  const div = document.createElement('div');
  div.className = `glass rounded-3xl p-4 card-enter touch-feedback transition-smooth ${esPasado ? 'opacity-40' : ''}`;
  div.style.animationDelay = `${Math.min(index * 45, 600)}ms`;

  div.innerHTML = `
    <div class="flex items-center justify-between gap-2 mb-3">
      <span class="text-sm font-semibold" style="color:${empresa.color}">${empresa.icono} ${empresa.nombre}</span>
      <div class="flex items-center gap-1.5 flex-wrap justify-end">
        ${servicio.numero ? `<span class="text-[10px] px-2 py-0.5 rounded-full font-bold" style="background:${empresa.color}22;color:${empresa.color};border:1px solid ${empresa.color}44">N° ${servicio.numero}</span>` : ''}
        ${servicio.servicio ? `<span class="text-[10px] px-2 py-0.5 rounded-full" style="background:rgba(255,255,255,.07);color:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.1)">${servicio.servicio}</span>` : ''}
        ${esLlegada ? `<span class="text-[10px] px-2 py-0.5 rounded-full" style="background:rgba(56,189,248,.15);color:#38BDF8;border:1px solid rgba(56,189,248,.3)">🏠 Llega a Andresito</span>` : ''}
        ${esArea    ? `<span class="text-[10px] px-2 py-0.5 rounded-full" style="background:rgba(255,255,255,.05);color:rgba(255,255,255,.35);border:1px solid rgba(255,255,255,.08)">🗺️ Ruta de área</span>` : ''}
      </div>
    </div>

    <div class="flex items-center gap-3">
      <div class="flex-shrink-0 min-w-[64px]">
        <span class="text-3xl font-black leading-none ${esPasado ? 'text-white/25' : 'text-white'}">${hora}</span>
        ${!esLlegada && servicio.llegada ? `<p class="text-[11px] text-white/35 mt-1 font-mono">→ ${servicio.llegada}</p>` : ''}
        ${esLlegada  ? `<p class="text-[11px] text-white/35 mt-1">sale ${servicio.salida}</p>` : ''}
      </div>
      <div class="w-px h-10 rounded-full flex-shrink-0" style="background:${empresa.color}44"></div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <p class="font-bold ${esPasado ? 'text-white/30' : 'text-white'}">${esLlegada ? servicio.origen : servicio.destino}</p>
          ${badgeEstado}
        </div>
        ${subtitulo ? `<p class="text-xs text-white/40 mt-0.5 leading-tight">${subtitulo}</p>` : ''}
        ${servicio.categoria !== 'Servicio regular' ? `<p class="text-[11px] mt-0.5" style="color:${empresa.color}99">${servicio.categoria}</p>` : ''}
      </div>
    </div>

    ${paradasText ? `
      <div class="mt-3 pt-3 border-t border-white/[0.06]">
        <p class="text-[11px] text-white/30 flex items-start gap-1.5 leading-relaxed">
          <svg class="w-3 h-3 mt-0.5 flex-shrink-0 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
          </svg>
          <span>${paradasText}</span>
        </p>
      </div>` : ''}

    ${noDomingo ? `
      <div class="mt-2 pt-2 border-t" style="border-color:rgba(252,211,77,.1)">
        <p class="text-[11px] flex items-center gap-1.5" style="color:rgba(252,211,77,.7)">
          <svg class="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          No opera los domingos desde Andresito
        </p>
      </div>` : ''}

    ${servicio.notas ? `
      <div class="mt-2 pt-2 border-t border-white/[0.05]">
        <p class="text-[11px] flex items-center gap-1.5" style="color:rgba(232,70,37,.75)">
          <svg class="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          ${servicio.notas}
        </p>
      </div>` : ''}`;

  return div;
}

/* ─── Tarjeta O/D (resultado del buscador) ─── */
function crearTarjetaOD(resultado, index) {
  const { servicio: s, horaOrigen, horaDestino, tramo } = resultado;
  const empresa   = APP_DATA.empresas[s.empresa];
  const minActual = new Date().getHours() * 60 + new Date().getMinutes();
  const horaRef   = (horaOrigen && horaOrigen !== '—') ? horaOrigen : s.salida;
  const diff      = horaRef ? horaAMinutos(horaRef) - minActual : Infinity;

  const esPasado    = diff < 0;
  const esInminente = diff >= 0 && diff <= 10;
  const esCercano   = diff >  10 && diff <= 45;
  const noDomingo   = !s.dias.includes('domingo');

  let badge = '';
  if (esPasado)     badge = `<span style="background:rgba(255,255,255,.05);color:rgba(255,255,255,.3)" class="text-[10px] px-2 py-0.5 rounded-full">Partió</span>`;
  else if (esInminente) badge = `<span style="background:rgba(239,68,68,.2);color:#FCA5A5;border:1px solid rgba(239,68,68,.3)" class="text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">¡Sale ya!</span>`;
  else if (esCercano)   badge = `<span style="background:rgba(232,70,37,.15);color:#FF7050;border:1px solid rgba(232,70,37,.32)" class="text-[10px] px-2 py-0.5 rounded-full">en ${diff} min</span>`;

  /* Duración del tramo */
  let durTramo = '';
  if (horaOrigen && horaDestino && horaOrigen !== '—' && horaDestino !== '—') {
    let d = horaAMinutos(horaDestino) - horaAMinutos(horaOrigen);
    if (d < 0) d += 1440;
    const h = Math.floor(d / 60), m = d % 60;
    durTramo = h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m}min`;
  }

  /* Paradas intermedias del tramo (excluir primera y última) */
  const intermediate = tramo.slice(1, -1);

  const div = document.createElement('div');
  div.className = `glass rounded-3xl p-4 card-enter touch-feedback transition-smooth ${esPasado ? 'opacity-40' : ''}`;
  div.style.animationDelay = `${Math.min(index * 45, 600)}ms`;

  div.innerHTML = `
    <!-- Empresa + badges -->
    <div class="flex items-center justify-between gap-2 mb-4">
      <span class="text-sm font-semibold" style="color:${empresa.color}">${empresa.icono} ${empresa.nombre}</span>
      <div class="flex gap-1.5 flex-wrap justify-end">
        ${s.numero  ? `<span class="text-[10px] px-2 py-0.5 rounded-full font-bold" style="background:${empresa.color}22;color:${empresa.color};border:1px solid ${empresa.color}44">N° ${s.numero}</span>` : ''}
        ${s.servicio ? `<span class="text-[10px] px-2 py-0.5 rounded-full" style="background:rgba(255,255,255,.07);color:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.1)">${s.servicio}</span>` : ''}
        ${s.categoria !== 'Servicio regular' ? `<span class="text-[10px] px-2 py-0.5 rounded-full" style="background:${empresa.color}15;color:${empresa.color}cc;border:1px solid ${empresa.color}33">${s.categoria}</span>` : ''}
        ${badge}
      </div>
    </div>

    <!-- Visualización del tramo: Hora origen ──── Hora destino -->
    <div class="flex items-end gap-3">
      <div class="text-center flex-shrink-0">
        <p class="text-3xl font-black leading-none ${esPasado ? 'text-white/25' : 'text-white'}">${(horaOrigen !== '—' ? horaOrigen : s.salida) ?? '—'}</p>
        <p class="text-[11px] text-white/40 mt-1 max-w-[80px] truncate">${tramo[0]}</p>
      </div>

      <div class="flex-1 flex flex-col items-center gap-0.5 pb-1.5">
        ${durTramo ? `<span class="text-[10px] text-white/30">${durTramo}</span>` : ''}
        <div class="w-full flex items-center gap-1">
          <div class="flex-1 border-t border-dashed" style="border-color:${empresa.color}55"></div>
          <svg class="w-3 h-3 flex-shrink-0" style="color:${empresa.color}88" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
          </svg>
        </div>
      </div>

      <div class="text-center flex-shrink-0">
        <p class="text-3xl font-black leading-none ${esPasado ? 'text-white/25' : 'text-white'}">${(horaDestino !== '—' ? horaDestino : s.llegada) ?? '—'}</p>
        <p class="text-[11px] text-white/40 mt-1 max-w-[80px] truncate">${tramo[tramo.length - 1]}</p>
      </div>
    </div>

    <!-- Paradas intermedias del tramo -->
    ${intermediate.length > 0 ? `
      <div class="mt-3 pt-3 border-t border-white/[0.06]">
        <p class="text-[11px] text-white/30 flex items-start gap-1.5 leading-relaxed">
          <svg class="w-3 h-3 mt-0.5 flex-shrink-0 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
          </svg>
          <span>${intermediate.join(' · ')}</span>
        </p>
      </div>` : ''}

    <!-- Aviso días Kruse -->
    ${noDomingo ? `
      <div class="mt-2 pt-2 border-t" style="border-color:rgba(252,211,77,.1)">
        <p class="text-[11px] flex items-center gap-1.5" style="color:rgba(252,211,77,.7)">
          <svg class="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          No opera los domingos desde Andresito
        </p>
      </div>` : ''}`;

  return div;
}

/* ════════════════════════════════════════════
   SERVICE WORKER
   ════════════════════════════════════════════ */
function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('[PWA] SW registrado:', reg.scope);
        reg.addEventListener('updatefound', () => {
          reg.installing?.addEventListener('statechange', () => {
            if (reg.installing?.state === 'installed' && navigator.serviceWorker.controller)
              mostrarToastActualizacion();
          });
        });
      })
      .catch(err => console.warn('[PWA] Error SW:', err));
  });
}

function mostrarToastActualizacion() {
  const toast = document.createElement('div');
  toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 z-50 glass rounded-2xl px-5 py-3 text-sm text-white/90 shadow-2xl flex items-center gap-3';
  toast.innerHTML = `<span>🔄 Hay una nueva versión disponible</span><button onclick="window.location.reload()" class="text-amber-400 font-semibold text-xs underline">Actualizar</button>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 8000);
}

/* ════════════════════════════════════════════
   PWA — BANNER DE INSTALACIÓN
   ════════════════════════════════════════════ */
function inicializarPWA() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    estado.deferredPrompt = e;
    setTimeout(() => document.getElementById('install-banner')?.classList.remove('hidden'), 4000);
  });
  document.getElementById('btn-instalar')?.addEventListener('click', async () => {
    if (!estado.deferredPrompt) return;
    estado.deferredPrompt.prompt();
    const { outcome } = await estado.deferredPrompt.userChoice;
    if (outcome === 'accepted') document.getElementById('install-banner').classList.add('hidden');
    estado.deferredPrompt = null;
  });
  document.getElementById('btn-cerrar-banner')?.addEventListener('click', () => {
    document.getElementById('install-banner').classList.add('hidden');
  });
  window.addEventListener('appinstalled', () => {
    document.getElementById('install-banner')?.classList.add('hidden');
  });
}

/* ════════════════════════════════════════════
   ESTADO DE RED
   ════════════════════════════════════════════ */
function detectarEstadoRed() {
  const aviso = document.getElementById('aviso-offline');
  if (!aviso) return;
  const actualizar = () => navigator.onLine ? aviso.classList.add('hidden') : aviso.classList.remove('hidden');
  window.addEventListener('online',  actualizar);
  window.addEventListener('offline', actualizar);
  actualizar();
}
