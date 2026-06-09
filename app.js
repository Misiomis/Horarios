/**
 * app.js — Lógica principal de Horarios de Colectivo Andresito
 * Incluye: reloj en tiempo real, filtros, buscador Origen/Destino,
 *          custom dropdowns, config remota, avisos y soporte PWA
 */

/* ─── Estado global ─── */
const estado = {
  filtroDestino:   'todos',
  filtroEmpresa:   'todas',
  tipoDia:         'lv',      // 'lv' | 'sabado' | 'domingo'
  buscadorOrigen:  '',
  buscadorDestino: '',
  horaActual:      null,
  deferredPrompt:  null,
  dropdownOrigen:  null,      // CustomDropdown instance
  dropdownDestino: null,      // CustomDropdown instance
  dropdownMotivo:  null       // CustomDropdown instance
};

/* ════════════════════════════════════════════
   CUSTOM DROPDOWN CLASS
   ════════════════════════════════════════════ */
class CustomDropdown {
  /**
   * @param {string} containerId — ID of the .csd div
   * @param {{ placeholder?: string, searchable?: boolean }} options
   */
  constructor(containerId, options = {}) {
    this._container  = document.getElementById(containerId);
    this._placeholder = options.placeholder || 'Seleccioná una opción…';
    this._searchable  = options.searchable !== false;
    this._value       = '';
    this._label       = '';
    this._options     = [];
    this._listeners   = { change: [] };
    this._isOpen      = false;
    this._focusedIdx  = -1;
    this._backdrop    = null;

    if (!this._container) {
      console.warn('[CSD] Container not found:', containerId);
      return;
    }
    this._build();
  }

  /* ── Build DOM ── */
  _build() {
    // Trigger button
    this._trigger = document.createElement('button');
    this._trigger.type = 'button';
    this._trigger.className = 'csd-trigger';
    this._trigger.setAttribute('aria-haspopup', 'listbox');
    this._trigger.setAttribute('aria-expanded', 'false');

    this._valueEl = document.createElement('span');
    this._valueEl.className = 'csd-value placeholder';
    this._valueEl.textContent = this._placeholder;

    const arrow = document.createElement('span');
    arrow.className = 'csd-arrow';
    arrow.innerHTML = `<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>`;

    this._trigger.appendChild(this._valueEl);
    this._trigger.appendChild(arrow);

    // Panel
    this._panel = document.createElement('div');
    this._panel.className = 'csd-panel';
    this._panel.setAttribute('role', 'listbox');

    // Search input
    if (this._searchable) {
      const searchWrap = document.createElement('div');
      searchWrap.className = 'csd-search';
      this._searchInput = document.createElement('input');
      this._searchInput.type = 'text';
      this._searchInput.placeholder = 'Buscar parada…';
      this._searchInput.autocomplete = 'off';
      searchWrap.appendChild(this._searchInput);
      this._panel.appendChild(searchWrap);
    }

    // List
    this._list = document.createElement('div');
    this._list.className = 'csd-list';
    this._panel.appendChild(this._list);

    this._container.appendChild(this._trigger);
    this._container.appendChild(this._panel);

    // Backdrop for mobile
    this._backdrop = document.createElement('div');
    this._backdrop.className = 'csd-backdrop';
    document.body.appendChild(this._backdrop);

    this._bindEvents();
  }

  /* ── Bind events ── */
  _bindEvents() {
    // Open/close on trigger
    this._trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this._isOpen ? this._close() : this._open();
    });

    // Close on backdrop
    this._backdrop.addEventListener('click', () => this._close());

    // Search filtering
    if (this._searchable && this._searchInput) {
      this._searchInput.addEventListener('input', () => {
        const q = this._searchInput.value.trim().toLowerCase();
        this._list.querySelectorAll('.csd-opt').forEach(opt => {
          const matches = opt.textContent.toLowerCase().includes(q);
          opt.classList.toggle('hidden', !matches);
        });
        this._focusedIdx = -1;
      });

      this._searchInput.addEventListener('keydown', (e) => this._handleKey(e));
    }

    // Keyboard on trigger
    this._trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (!this._isOpen) this._open();
      } else if (e.key === 'Escape') {
        this._close();
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (this._isOpen && !this._container.contains(e.target)) {
        this._close();
      }
    });
  }

  _handleKey(e) {
    const visibleOpts = [...this._list.querySelectorAll('.csd-opt:not(.hidden)')];
    if (!visibleOpts.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this._focusedIdx = Math.min(this._focusedIdx + 1, visibleOpts.length - 1);
      this._highlightFocused(visibleOpts);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this._focusedIdx = Math.max(this._focusedIdx - 1, 0);
      this._highlightFocused(visibleOpts);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this._focusedIdx >= 0 && visibleOpts[this._focusedIdx]) {
        visibleOpts[this._focusedIdx].click();
      }
    } else if (e.key === 'Escape') {
      this._close();
    }
  }

  _highlightFocused(visibleOpts) {
    visibleOpts.forEach((o, i) => o.classList.toggle('focused', i === this._focusedIdx));
    if (this._focusedIdx >= 0) {
      visibleOpts[this._focusedIdx].scrollIntoView({ block: 'nearest' });
    }
  }

  /* ── Open / Close ── */
  _open() {
    this._isOpen = true;
    this._panel.classList.add('open');
    this._trigger.classList.add('open');
    this._trigger.setAttribute('aria-expanded', 'true');
    this._backdrop.classList.add('open');
    this._focusedIdx = -1;
    if (this._searchable && this._searchInput) {
      this._searchInput.value = '';
      this._list.querySelectorAll('.csd-opt').forEach(o => o.classList.remove('hidden'));
      setTimeout(() => this._searchInput.focus(), 60);
    }
    // Scroll selected option into view
    const sel = this._list.querySelector('.csd-opt.selected');
    if (sel) setTimeout(() => sel.scrollIntoView({ block: 'nearest' }), 80);
  }

  _close() {
    this._isOpen = false;
    this._panel.classList.remove('open');
    this._trigger.classList.remove('open');
    this._trigger.setAttribute('aria-expanded', 'false');
    this._backdrop.classList.remove('open');
    this._list.querySelectorAll('.csd-opt').forEach(o => o.classList.remove('focused'));
    this._focusedIdx = -1;
  }

  /* ── Public: set options ── */
  setOptions(arr) {
    this._options = arr;
    this._list.innerHTML = '';
    arr.forEach(item => {
      const opt = document.createElement('div');
      opt.className = 'csd-opt';
      opt.setAttribute('role', 'option');
      opt.textContent = item.label;
      opt.dataset.value = item.value;
      if (item.value === this._value) opt.classList.add('selected');
      opt.addEventListener('click', () => {
        this._select(item.value, item.label);
        this._close();
      });
      this._list.appendChild(opt);
    });
  }

  /* ── Internal select ── */
  _select(val, label) {
    const prev = this._value;
    this._value = val;
    this._label = label;

    // Update display
    if (val) {
      this._valueEl.textContent = label;
      this._valueEl.classList.remove('placeholder');
    } else {
      this._valueEl.textContent = this._placeholder;
      this._valueEl.classList.add('placeholder');
    }

    // Update selected state in list
    this._list.querySelectorAll('.csd-opt').forEach(o => {
      o.classList.toggle('selected', o.dataset.value === val);
    });

    if (val !== prev) {
      this._listeners.change.forEach(cb => cb({ value: val, label }));
    }
  }

  /* ── Public API ── */
  get value()   { return this._value; }
  set value(v)  {
    const opt = this._options.find(o => o.value === v);
    this._select(v, opt ? opt.label : v);
  }

  addEventListener(event, cb) {
    if (this._listeners[event]) this._listeners[event].push(cb);
  }

  reset() { this._select('', ''); }

  destroy() {
    if (this._backdrop && this._backdrop.parentNode) {
      this._backdrop.parentNode.removeChild(this._backdrop);
    }
  }
}

/* ════════════════════════════════════════════
   INICIALIZACIÓN
   ════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  cargarConfig();
  trackVisit();
  aplicarFiltroDesdeURL();
  inicializarReloj();
  inicializarDia();
  inicializarFiltros();
  inicializarBuscadorOD();
  inicializarSelectMotivo();
  inicializarComentarios();
  inicializarCompartir();
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
   CONFIG REMOTA
   ════════════════════════════════════════════ */
async function cargarConfig() {
  try {
    const res = await fetch('./config.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Config no disponible');
    const cfg = await res.json();
    window.APP_CONFIG = cfg;

    // Aplicar overrides de servicios
    if (cfg.serviciosOverrides && typeof cfg.serviciosOverrides === 'object') {
      APP_DATA.servicios = APP_DATA.servicios.map(s => {
        const ov = cfg.serviciosOverrides[String(s.id)];
        return ov ? { ...s, ...ov } : s;
      });
    }

    // Deshabilitar servicios
    if (Array.isArray(cfg.serviciosDeshabilitados) && cfg.serviciosDeshabilitados.length > 0) {
      APP_DATA.servicios = APP_DATA.servicios.filter(
        s => !cfg.serviciosDeshabilitados.includes(s.id)
      );
    }

    // Mostrar avisos
    if (Array.isArray(cfg.avisos) && cfg.avisos.length > 0) {
      renderAvisos(cfg.avisos);
    }
  } catch (err) {
    // Silently degrade — app works without remote config
    window.APP_CONFIG = { version: '1.0', avisos: [], serviciosDeshabilitados: [], serviciosOverrides: {} };
  }
}

/* ════════════════════════════════════════════
   AVISOS BANNER
   ════════════════════════════════════════════ */
function renderAvisos(avisos) {
  const hoy = new Date().toISOString().split('T')[0];
  const activos = avisos.filter(a => {
    if (!a.activo) return false;
    if (a.fechaInicio && hoy < a.fechaInicio) return false;
    if (a.fechaFin   && hoy > a.fechaFin)    return false;
    return true;
  });

  if (activos.length === 0) return;

  const banner = document.getElementById('aviso-banner');
  if (!banner) return;

  const tipoIcono = { paro: '🚫', info: 'ℹ️', warning: '⚠️', success: '✅' };

  banner.innerHTML = activos.map(a => `
    <div class="aviso-banner tipo-${a.tipo || 'info'}">
      <div class="aviso-icon">${tipoIcono[a.tipo] || 'ℹ️'}</div>
      <div class="aviso-body">
        <p class="aviso-title">${escHTML(a.titulo || '')}</p>
        ${a.mensaje ? `<p class="aviso-msg">${escHTML(a.mensaje)}</p>` : ''}
      </div>
    </div>
  `).join('');

  banner.classList.remove('hidden');
  banner.style.display = 'block';
}

/* ════════════════════════════════════════════
   TRACK VISIT (CountAPI)
   ════════════════════════════════════════════ */
async function trackVisit() {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    const storageKey = `andresito_visit_${hoy}`;
    // Only count once per day
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, '1');

    const res = await fetch(`https://api.countapi.xyz/hit/andresito-bus-misiones/${hoy}`);
    if (!res.ok) return;
    const data = await res.json();
    try { localStorage.setItem('andresito_visitas_hoy', JSON.stringify({ fecha: hoy, count: data.value })); } catch(_) {}
  } catch(_) {
    // Non-critical — ignore failures
  }
}

function escHTML(str) {
  return String(str || '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])
  );
}

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
    lv:      { texto: 'Lunes a Viernes',                 icono: '💼', clase: 'text-emerald-700', desc: 'Horario completo' },
    sabado:  { texto: 'Sábado',                          icono: '🌤️', clase: 'text-amber-600',  desc: 'Horario reducido' },
    domingo: { texto: esFeriado ? 'Feriado' : 'Domingo', icono: esFeriado ? '🎌' : '☀️', clase: 'text-orange-600', desc: 'Horario especial' }
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
    btn.className   = `filter-pill flex-shrink-0 px-4 py-2 rounded-2xl text-sm font-medium whitespace-nowrap ${dest.id === estado.filtroDestino ? 'active' : ''}`;
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
  btn.className   = `filter-pill flex-shrink-0 px-4 py-2 rounded-2xl text-sm font-medium whitespace-nowrap ${activo ? 'active' : ''}`;
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
   BUSCADOR ORIGEN / DESTINO — Custom Dropdowns
   ════════════════════════════════════════════ */

function normalizarParada(nombre) {
  if (!nombre) return '';
  return APP_DATA.aliases[nombre] ?? nombre;
}

function getRutaCompleta(s) {
  return [
    normalizarParada(s.origen),
    ...s.paradas.map(normalizarParada),
    normalizarParada(s.destino)
  ];
}

function getTiempoEnParada(s, paradaNorm) {
  if (!s.tiempos) {
    if (paradaNorm === normalizarParada(s.origen))  return s.salida;
    if (paradaNorm === normalizarParada(s.destino)) return s.llegada ?? '—';
    return '—';
  }
  const directo = s.tiempos[paradaNorm];
  if (directo) return directo;
  const entrada = Object.entries(s.tiempos).find(([k]) => normalizarParada(k) === paradaNorm);
  return entrada ? entrada[1] : '—';
}

function extraerTodasLasParadas() {
  const stops = new Set();
  APP_DATA.servicios.forEach(s => {
    stops.add(normalizarParada(s.origen));
    s.paradas.forEach(p => stops.add(normalizarParada(p)));
    stops.add(normalizarParada(s.destino));
  });
  return [...stops].filter(Boolean).sort((a, b) => a.localeCompare(b, 'es'));
}

/* Updated buscador using CustomDropdown instances */
function inicializarBuscadorOD() {
  const origenContainer  = document.getElementById('select-origen');
  const destinoContainer = document.getElementById('select-destino');
  if (!origenContainer || !destinoContainer) return;

  const stops = extraerTodasLasParadas();
  const optsArr = stops.map(s => ({ value: s, label: s }));

  // Create instances
  estado.dropdownOrigen  = new CustomDropdown('select-origen',  { placeholder: 'Seleccionar origen…',  searchable: true });
  estado.dropdownDestino = new CustomDropdown('select-destino', { placeholder: 'Seleccionar destino…', searchable: true });

  estado.dropdownOrigen.setOptions(optsArr);
  estado.dropdownDestino.setOptions(optsArr);

  // Restore from estado if available
  if (estado.buscadorOrigen)  estado.dropdownOrigen.value  = estado.buscadorOrigen;
  if (estado.buscadorDestino) estado.dropdownDestino.value = estado.buscadorDestino;

  estado.dropdownOrigen.addEventListener('change', ({ value }) => {
    estado.buscadorOrigen = value;
    actualizarBtnLimpiar();
    renderizarApp();
  });
  estado.dropdownDestino.addEventListener('change', ({ value }) => {
    estado.buscadorDestino = value;
    actualizarBtnLimpiar();
    renderizarApp();
  });

  // Swap button
  document.getElementById('btn-swap-od')?.addEventListener('click', () => {
    const tmpO = estado.buscadorOrigen;
    const tmpD = estado.buscadorDestino;
    estado.buscadorOrigen  = tmpD;
    estado.buscadorDestino = tmpO;
    estado.dropdownOrigen.value  = estado.buscadorOrigen;
    estado.dropdownDestino.value = estado.buscadorDestino;
    actualizarBtnLimpiar();
    renderizarApp();
  });

  // Clear button
  document.getElementById('btn-limpiar-od')?.addEventListener('click', () => {
    estado.buscadorOrigen  = '';
    estado.buscadorDestino = '';
    estado.dropdownOrigen.reset();
    estado.dropdownDestino.reset();
    actualizarBtnLimpiar();
    renderizarApp();
  });
}

function actualizarBtnLimpiar() {
  const btn = document.getElementById('btn-limpiar-od');
  if (!btn) return;
  const activo = !!(estado.buscadorOrigen || estado.buscadorDestino);
  activo ? btn.classList.remove('hidden') : btn.classList.add('hidden');
}

/* ── Inicializar select motivo (form comentarios) ── */
function inicializarSelectMotivo() {
  const container = document.getElementById('select-motivo');
  if (!container) return;

  estado.dropdownMotivo = new CustomDropdown('select-motivo', {
    placeholder: 'Seleccioná el motivo…',
    searchable:  false
  });

  estado.dropdownMotivo.setOptions([
    { value: 'Horario incorrecto',      label: 'Horario incorrecto' },
    { value: 'Servicio no disponible',  label: 'Servicio no disponible' },
    { value: 'Nuevo horario',           label: 'Sugerir nuevo horario' },
    { value: 'Error en la app',         label: 'Error en la app' },
    { value: 'Otro',                    label: 'Otro' }
  ]);
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
    if (normO && idxO === -1) return;
    if (normD && idxD === -1) return;
    if (normO && normD && idxO >= idxD) return;
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
  const badge = document.getElementById('od-badge');
  const texto = document.getElementById('od-badge-texto');
  if (!badge) return;
  if (odActivo) {
    const partes = [];
    if (estado.buscadorOrigen)  partes.push(estado.buscadorOrigen);
    if (estado.buscadorDestino) partes.push(estado.buscadorDestino);
    if (texto) texto.textContent = partes.join(' → ');
    badge.classList.remove('hidden');
    badge.style.display = 'flex';
  } else {
    badge.classList.add('hidden');
    badge.style.display = '';
  }
}

/* ════════════════════════════════════════════
   RENDERIZADO PRINCIPAL
   ════════════════════════════════════════════ */
function renderizarApp() {
  const odActivo = !!(estado.buscadorOrigen || estado.buscadorDestino);

  const secProximo = document.getElementById('seccion-proximo');
  if (odActivo) {
    secProximo?.classList.add('hidden');
  } else {
    renderizarProximoServicio();
  }

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

/* ─── PRÓXIMO SERVICIO ─── */
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
          ${s.numero ? `<span class="text-xs px-2 py-0.5 rounded-full font-bold" style="background:${empresa.color}18;color:${empresa.color};border:1px solid ${empresa.color}40">N° ${s.numero}</span>` : ''}
          ${s.servicio ? `<span class="text-xs px-2 py-0.5 rounded-full" style="background:#F5F4F1;color:var(--text-2);border:1px solid var(--border)">${s.servicio}</span>` : ''}
          <span class="badge-proximo text-xs px-3 py-1 rounded-full font-bold" style="background:rgba(255,76,26,.12);color:#FF4C1A;border:1px solid rgba(255,76,26,.30)">⚡ ${tiempoRestante}</span>
        </div>
        <div class="flex items-center gap-3 mb-1">
          <span class="text-5xl font-black tracking-tight leading-none" style="font-family:'Outfit',sans-serif;color:var(--text)">${proximoItem.hora}</span>
          <div class="min-w-0">
            <p class="font-bold text-lg leading-tight truncate" style="color:var(--text)">${s.destino}</p>
            ${s.llegada ? `<p class="text-xs mt-0.5" style="color:var(--text-2)">→ llega ${s.llegada}${durStr ? ' · ' + durStr : ''}</p>` : ''}
            ${s.categoria !== 'Servicio regular' ? `<p class="text-xs mt-0.5 font-semibold" style="color:${empresa.color}">${s.categoria}</p>` : ''}
          </div>
        </div>
        ${paradasStr ? `<p class="text-xs mt-2 flex items-center gap-1.5" style="color:var(--text-3)"><svg class="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>${paradasStr}</p>` : ''}
      </div>
      <div class="flex-shrink-0 flex flex-col items-end gap-2">
        <div class="flex items-center gap-1.5">
          <span class="pulse-dot w-2 h-2 rounded-full inline-block" style="background:#FF4C1A"></span>
          <span class="text-xs" style="color:var(--text-3)">En vivo</span>
        </div>
        ${!s.dias.includes('domingo') ? `<span class="text-[10px] text-right" style="color:#D97706">No opera<br>domingos</span>` : ''}
      </div>
    </div>`;
}

/* ─── LISTA DE HORARIOS ─── */
function renderizarHorarios(odActivo = false) {
  const container   = document.getElementById('horarios-container');
  const estadoVacio = document.getElementById('estado-vacio');
  const contador    = document.getElementById('contador-resultados');

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
    if (esPasado)         badgeEstado = `<span style="background:rgba(0,0,0,.05);color:var(--text-3)" class="text-[10px] px-2 py-0.5 rounded-full">${esLlegada ? 'Ya llegó' : 'Partió'}</span>`;
    else if (esInminente) badgeEstado = `<span style="background:rgba(239,68,68,.2);color:#DC2626;border:1px solid rgba(239,68,68,.3)" class="text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">${esLlegada ? '¡Llega ya!' : '¡Sale ya!'}</span>`;
    else if (esCercano)   badgeEstado = `<span style="background:rgba(255,76,26,.14);color:#FF4C1A;border:1px solid rgba(255,76,26,.30)" class="text-[10px] px-2 py-0.5 rounded-full">${esLlegada ? `llega en ${diff} min` : `en ${diff} min`}</span>`;
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
  if (esArea)         subtitulo = `${servicio.origen} → ${servicio.destino}${duracion ? ' · ' + duracion : ''}`;
  else if (esLlegada) subtitulo = `Sale de ${servicio.origen} a las ${servicio.salida}${duracion ? ' · viaje ' + duracion : ''}`;
  else if (servicio.origen !== 'Cdte. Andresito') subtitulo = `Desde: ${servicio.origen}${duracion ? ' · ' + duracion : ''}`;
  else if (duracion)  subtitulo = duracion;

  const div = document.createElement('div');
  div.className = `card p-4 card-enter touch-feedback transition-smooth${esPasado ? ' opacity-40' : ''}`;
  div.style.animationDelay = `${Math.min(index * 45, 600)}ms`;

  div.innerHTML = `
    <div class="flex items-center justify-between gap-2 mb-3">
      <span class="text-sm font-semibold" style="color:${empresa.color}">${empresa.icono} ${empresa.nombre}</span>
      <div class="flex items-center gap-1.5 flex-wrap justify-end">
        ${servicio.numero ? `<span class="text-[10px] px-2 py-0.5 rounded-full font-bold" style="background:${empresa.color}14;color:${empresa.color};border:1px solid ${empresa.color}38">N° ${servicio.numero}</span>` : ''}
        ${servicio.servicio ? `<span class="text-[10px] px-2 py-0.5 rounded-full" style="background:#F5F4F1;color:var(--text-2);border:1px solid var(--border)">${servicio.servicio}</span>` : ''}
        ${esLlegada ? `<span class="text-[10px] px-2 py-0.5 rounded-full" style="background:#EFF6FF;color:#2563EB;border:1px solid #BFDBFE">🏠 Llega a Andresito</span>` : ''}
        ${esArea    ? `<span class="text-[10px] px-2 py-0.5 rounded-full" style="background:#F5F4F1;color:var(--text-3);border:1px solid var(--border)">🗺️ Ruta de área</span>` : ''}
      </div>
    </div>

    <div class="flex items-center gap-3">
      <div class="flex-shrink-0 min-w-[64px]">
        <span class="text-3xl font-black leading-none" style="font-family:'Outfit',sans-serif;color:${esPasado ? 'var(--text-3)' : 'var(--text)'}">${hora}</span>
        ${!esLlegada && servicio.llegada ? `<p class="text-[11px] mt-1 font-mono" style="color:var(--text-3)">→ ${servicio.llegada}</p>` : ''}
        ${esLlegada  ? `<p class="text-[11px] mt-1" style="color:var(--text-3)">sale ${servicio.salida}</p>` : ''}
      </div>
      <div class="w-px h-10 rounded-full flex-shrink-0" style="background:${empresa.color}50"></div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <p class="font-bold" style="color:${esPasado ? 'var(--text-3)' : 'var(--text)'}">${esLlegada ? servicio.origen : servicio.destino}</p>
          ${badgeEstado}
        </div>
        ${subtitulo ? `<p class="text-xs mt-0.5 leading-tight" style="color:var(--text-2)">${subtitulo}</p>` : ''}
        ${servicio.categoria !== 'Servicio regular' ? `<p class="text-[11px] mt-0.5 font-semibold" style="color:${empresa.color}">${servicio.categoria}</p>` : ''}
      </div>
    </div>

    ${paradasText ? `
      <div class="mt-3 pt-3" style="border-top:1px solid var(--border)">
        <p class="text-[11px] flex items-start gap-1.5 leading-relaxed" style="color:var(--text-3)">
          <svg class="w-3 h-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
          </svg>
          <span>${paradasText}</span>
        </p>
      </div>` : ''}

    ${noDomingo ? `
      <div class="mt-2 pt-2" style="border-top:1px solid #FEF3C7">
        <p class="text-[11px] flex items-center gap-1.5" style="color:#D97706">
          <svg class="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          No opera los domingos desde Andresito
        </p>
      </div>` : ''}

    ${servicio.notas ? `
      <div class="mt-2 pt-2" style="border-top:1px solid #FEE2E2">
        <p class="text-[11px] flex items-center gap-1.5" style="color:var(--accent)">
          <svg class="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          ${servicio.notas}
        </p>
      </div>` : ''}`;

  return div;
}

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
  if (esPasado)         badge = `<span style="background:rgba(0,0,0,.05);color:var(--text-3)" class="text-[10px] px-2 py-0.5 rounded-full">Partió</span>`;
  else if (esInminente) badge = `<span style="background:rgba(239,68,68,.2);color:#DC2626;border:1px solid rgba(239,68,68,.3)" class="text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">¡Sale ya!</span>`;
  else if (esCercano)   badge = `<span style="background:rgba(255,76,26,.14);color:#FF4C1A;border:1px solid rgba(255,76,26,.30)" class="text-[10px] px-2 py-0.5 rounded-full">en ${diff} min</span>`;

  let durTramo = '';
  if (horaOrigen && horaDestino && horaOrigen !== '—' && horaDestino !== '—') {
    let d = horaAMinutos(horaDestino) - horaAMinutos(horaOrigen);
    if (d < 0) d += 1440;
    const h = Math.floor(d / 60), m = d % 60;
    durTramo = h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m}min`;
  }

  const intermediate = tramo.slice(1, -1);

  const div = document.createElement('div');
  div.className = `card p-4 card-enter touch-feedback transition-smooth${esPasado ? ' opacity-40' : ''}`;
  div.style.animationDelay = `${Math.min(index * 45, 600)}ms`;

  div.innerHTML = `
    <div class="flex items-center justify-between gap-2 mb-4">
      <span class="text-sm font-semibold" style="color:${empresa.color}">${empresa.icono} ${empresa.nombre}</span>
      <div class="flex gap-1.5 flex-wrap justify-end">
        ${s.numero   ? `<span class="text-[10px] px-2 py-0.5 rounded-full font-bold" style="background:${empresa.color}14;color:${empresa.color};border:1px solid ${empresa.color}38">N° ${s.numero}</span>` : ''}
        ${s.servicio ? `<span class="text-[10px] px-2 py-0.5 rounded-full" style="background:#F5F4F1;color:var(--text-2);border:1px solid var(--border)">${s.servicio}</span>` : ''}
        ${s.categoria !== 'Servicio regular' ? `<span class="text-[10px] px-2 py-0.5 rounded-full" style="background:${empresa.color}12;color:${empresa.color};border:1px solid ${empresa.color}30">${s.categoria}</span>` : ''}
        ${badge}
      </div>
    </div>

    <div class="flex items-end gap-3">
      <div class="text-center flex-shrink-0">
        <p class="text-3xl font-black leading-none" style="font-family:'Outfit',sans-serif;color:${esPasado ? 'var(--text-3)' : 'var(--text)'}">${(horaOrigen !== '—' ? horaOrigen : s.salida) ?? '—'}</p>
        <p class="text-[11px] mt-1 max-w-[80px] truncate" style="color:var(--text-3)">${tramo[0]}</p>
      </div>
      <div class="flex-1 flex flex-col items-center gap-0.5 pb-1.5">
        ${durTramo ? `<span class="text-[10px]" style="color:var(--text-3)">${durTramo}</span>` : ''}
        <div class="w-full flex items-center gap-1">
          <div class="flex-1 border-t border-dashed" style="border-color:${empresa.color}50"></div>
          <svg class="w-3 h-3 flex-shrink-0" style="color:${empresa.color}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
          </svg>
        </div>
      </div>
      <div class="text-center flex-shrink-0">
        <p class="text-3xl font-black leading-none" style="font-family:'Outfit',sans-serif;color:${esPasado ? 'var(--text-3)' : 'var(--text)'}">${(horaDestino !== '—' ? horaDestino : s.llegada) ?? '—'}</p>
        <p class="text-[11px] mt-1 max-w-[80px] truncate" style="color:var(--text-3)">${tramo[tramo.length - 1]}</p>
      </div>
    </div>

    ${intermediate.length > 0 ? `
      <div class="mt-3 pt-3" style="border-top:1px solid var(--border)">
        <p class="text-[11px] flex items-start gap-1.5 leading-relaxed" style="color:var(--text-3)">
          <svg class="w-3 h-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
          </svg>
          <span>${intermediate.join(' · ')}</span>
        </p>
      </div>` : ''}

    ${noDomingo ? `
      <div class="mt-2 pt-2" style="border-top:1px solid #FEF3C7">
        <p class="text-[11px] flex items-center gap-1.5" style="color:#D97706">
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
  toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 z-50 card rounded-2xl px-5 py-3 text-sm shadow-xl flex items-center gap-3';
  toast.style.cssText = 'color:var(--text);white-space:nowrap';
  toast.innerHTML = `<span>🔄 Hay una nueva versión disponible</span><button onclick="window.location.reload()" style="color:var(--accent);font-weight:700;font-size:12px;text-decoration:underline;background:none;border:none;cursor:pointer">Actualizar</button>`;
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

/* ════════════════════════════════════════════
   COMENTARIOS Y RECLAMOS
   ════════════════════════════════════════════ */
function inicializarComentarios() {
  const form    = document.getElementById('form-comentario');
  const errEl   = document.getElementById('form-error');
  const exitoEl = document.getElementById('form-exito');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = document.getElementById('comentario-nombre').value.trim();
    const motivo = estado.dropdownMotivo ? estado.dropdownMotivo.value : '';
    const texto  = document.getElementById('comentario-texto').value.trim();

    if (!nombre || !motivo || !texto) {
      errEl.textContent = 'Por favor completá todos los campos obligatorios.';
      errEl.classList.remove('hidden');
      return;
    }
    errEl.classList.add('hidden');

    const comentario = {
      id:     Date.now(),
      nombre,
      motivo,
      texto,
      fecha:  new Date().toLocaleString('es-AR'),
      visto:  false
    };

    try {
      const guardados = JSON.parse(localStorage.getItem('andresito_comentarios') || '[]');
      guardados.push(comentario);
      localStorage.setItem('andresito_comentarios', JSON.stringify(guardados));
    } catch (_) {}

    form.classList.add('hidden');
    exitoEl.classList.remove('hidden');

    setTimeout(() => {
      form.reset();
      if (estado.dropdownMotivo) estado.dropdownMotivo.reset();
      form.classList.remove('hidden');
      exitoEl.classList.add('hidden');
    }, 4500);
  });
}

/* ════════════════════════════════════════════
   COMPARTIR
   ════════════════════════════════════════════ */
function inicializarCompartir() {
  document.getElementById('btn-compartir')?.addEventListener('click', async () => {
    const data = {
      title: 'Horarios de Colectivos — Andresito',
      text:  'Consultá los horarios de colectivos de Cdte. Andresito desde el celular 🚌',
      url:   window.location.href
    };
    if (navigator.share) {
      try { await navigator.share(data); } catch (_) {}
    } else {
      try { await navigator.clipboard.writeText(window.location.href); } catch (_) {}
      const t = document.createElement('div');
      t.className = 'card fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 text-sm shadow-xl flex items-center gap-2';
      t.style.cssText = 'color:var(--text);white-space:nowrap';
      t.innerHTML = `<span>🔗</span><span>¡Enlace copiado al portapapeles!</span>`;
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 3000);
    }
  });
}
