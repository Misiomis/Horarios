/**
 * data.js — Horarios reales de colectivos
 * Comandante Andresito, Misiones, Argentina
 * Para añadir un servicio: agregar un objeto al array "servicios".
 * Para editar horarios: modificar "salida" y/o "llegada" del servicio correspondiente.
 */

const APP_DATA = {
  version: '2.1.0',
  ultimaActualizacion: '2026-06-09',

  /* ─── Empresas operadoras ─── */
  empresas: {
    kruse: {
      id: 'kruse',
      nombre: 'Kruse',
      color: '#A78BFA',
      colorAlpha: 'rgba(167,139,250,.18)',
      icono: '🟣',
      restriccion: 'No opera desde Andresito los domingos'
    },
    expresoSelva: {
      id: 'expresoSelva',
      nombre: 'Expreso de la Selva',
      color: '#38BDF8',
      colorAlpha: 'rgba(56,189,248,.18)',
      icono: '🔵',
      restriccion: null
    },
    solDelNorte: {
      id: 'solDelNorte',
      nombre: 'Sol del Norte',
      color: '#FCD34D',
      colorAlpha: 'rgba(252,211,77,.18)',
      icono: '🟡',
      restriccion: null
    },
    kenia: {
      id: 'kenia',
      nombre: 'Kenya',
      color: '#F87171',
      colorAlpha: 'rgba(248,113,113,.18)',
      icono: '🔴',
      restriccion: null
    },
    pinalitoNorte: {
      id: 'pinalitoNorte',
      nombre: 'Empresa Piñalito Norte',
      color: '#34D399',
      colorAlpha: 'rgba(52,211,153,.18)',
      icono: '🟢',
      restriccion: null
    },
    itati: {
      id: 'itati',
      nombre: 'Empresa Itatí',
      color: '#FB923C',
      colorAlpha: 'rgba(251,146,60,.18)',
      icono: '🟠',
      restriccion: null
    }
  },

  /* ─── Destinos para los filtros rápidos ─── */
  destinos: [
    { id: 'todos',       label: 'Todos',            emoji: '🗺️' },
    { id: 'posadas',     label: 'Posadas',           emoji: '🏙️' },
    { id: 'obera',       label: 'Oberá',             emoji: '🌆' },
    { id: 'iguazu',      label: 'Pto. Iguazú',       emoji: '🌊' },
    { id: 'eldorado',    label: 'Eldorado',          emoji: '🌿' },
    { id: 'bernardo',    label: 'Bdo. de Irigoyen',  emoji: '⛰️' },
    { id: 'apostoles',   label: 'Apóstoles',         emoji: '📍' },
    { id: 'sanantonio',  label: 'San Antonio',       emoji: '🏘️' },
    { id: 'sanpedro',    label: 'San Pedro',         emoji: '🏔️' },
    { id: 'sanvicente',  label: 'San Vicente',       emoji: '🌳' },
    { id: 'integracion', label: 'Integración',       emoji: '🔗' }
  ],

  /* ─── Alias de paradas para normalización en el buscador O/D ─── */
  aliases: {
    'Irigoyen':       'Bdo. de Irigoyen',
    'A. del Valle':   'Aristóbulo del Valle',
    'Alcázar':        'El Alcázar',
    'Piñalito':       'Piñalito Norte',
    'Iguazú':         'Puerto Iguazú',
    'Andresito':      'Cdte. Andresito'
  },

  /* ─── Feriados nacionales 2025–2026 ─── */
  feriados: [
    '2025-01-01', '2025-04-02', '2025-04-17', '2025-04-18',
    '2025-05-01', '2025-05-25', '2025-06-16', '2025-06-20',
    '2025-07-09', '2025-08-18', '2025-10-13', '2025-11-20',
    '2025-12-08', '2025-12-25',
    '2026-01-01', '2026-04-02', '2026-05-01', '2026-05-25',
    '2026-06-20', '2026-07-09', '2026-12-08', '2026-12-25'
  ],

  /* ─────────────────────────────────────────────────────────
     SERVICIOS
     Campos:
       tipo      → 'salida'  = parte desde Andresito (se muestra en Próximo)
                   'llegada' = llega a Andresito (hora mostrada = llegada)
                   'area'    = ruta cercana que no pasa por Andresito
       dias      → array con los tipos de día en que opera:
                   'lv' (lunes-viernes), 'sabado', 'domingo'
       paradas   → lista de paradas intermedias en orden de recorrido
       numero    → número de línea (solo Kruse)
       categoria → tipo de servicio (Cama, SemiCama, Interurbano, etc.)
       servicio  → código de ruta (ej: DP = Directo Posadas)
     ───────────────────────────────────────────────────────── */
  servicios: [

    // ════════════════════════════════════════════
    //  KRUSE  —  Lunes a Sábado (no opera domingos)
    // ════════════════════════════════════════════
    {
      id: 1,
      empresa:    'kruse',
      numero:     '53',
      categoria:  'Cama y SemiCama',
      servicio:   'DP',
      tipo:       'salida',
      origen:     'Cdte. Andresito',
      destino:    'Posadas',
      destinoId:  'posadas',
      salida:     '01:45',
      llegada:    '07:00',
      paradas:    [],
      dias:       ['lv', 'sabado'],
      notas:      ''
    },
    {
      id: 2,
      empresa:    'kruse',
      numero:     '46',
      categoria:  'SemiCama',
      servicio:   'DP',
      tipo:       'salida',
      origen:     'Cdte. Andresito',
      destino:    'Posadas',
      destinoId:  'posadas',
      salida:     '01:45',
      llegada:    '07:00',
      paradas:    [],
      dias:       ['lv', 'sabado'],
      notas:      ''
    },
    {
      id: 3,
      empresa:    'kruse',
      numero:     '59',
      categoria:  'Cama y SemiCama',
      servicio:   'DP',
      tipo:       'salida',
      origen:     'Cdte. Andresito',
      destino:    'Posadas',
      destinoId:  'posadas',
      salida:     '13:30',
      llegada:    '19:50',
      paradas:    [],
      dias:       ['lv', 'sabado'],
      notas:      ''
    },

    // ════════════════════════════════════════════
    //  EXPRESO DE LA SELVA
    // ════════════════════════════════════════════

    // IDA: Andresito → Oberá
    {
      id: 4,
      empresa:    'expresoSelva',
      numero:     null,
      categoria:  'Servicio regular',
      servicio:   null,
      tipo:       'salida',
      origen:     'Cdte. Andresito',
      destino:    'Oberá',
      destinoId:  'obera',
      salida:     '03:40',
      llegada:    '09:30',
      paradas:    [],
      dias:       ['lv', 'sabado'],
      notas:      'No opera los domingos'
    },

    // VUELTA: Oberá → Andresito  (la hora mostrada es la de llegada a Andresito)
    {
      id: 5,
      empresa:    'expresoSelva',
      numero:     null,
      categoria:  'Servicio regular',
      servicio:   null,
      tipo:       'llegada',
      origen:     'Oberá',
      destino:    'Cdte. Andresito',
      destinoId:  'obera',
      salida:     '15:20',
      llegada:    '21:30',
      paradas:    [],
      dias:       ['lv', 'sabado', 'domingo'],
      notas:      ''
    },

    // ÁREA: Bdo. de Irigoyen → Puerto Iguazú
    {
      id: 6,
      empresa:    'expresoSelva',
      numero:     null,
      categoria:  'Servicio regular',
      servicio:   null,
      tipo:       'area',
      origen:     'Bdo. de Irigoyen',
      destino:    'Puerto Iguazú',
      destinoId:  'iguazu',
      salida:     '05:00',
      llegada:    '09:30',
      paradas:    ['Bdo. de Irigoyen', 'Puerto Iguazú'],
      dias:       ['lv', 'sabado', 'domingo'],
      notas:      ''
    },

    // ÁREA: Puerto Iguazú → Bdo. de Irigoyen
    {
      id: 7,
      empresa:    'expresoSelva',
      numero:     null,
      categoria:  'Servicio regular',
      servicio:   null,
      tipo:       'area',
      origen:     'Puerto Iguazú',
      destino:    'Bdo. de Irigoyen',
      destinoId:  'bernardo',
      salida:     '15:20',
      llegada:    '19:40',
      paradas:    ['Puerto Iguazú', 'Bdo. de Irigoyen'],
      dias:       ['lv', 'sabado', 'domingo'],
      notas:      ''
    },

    // ÁREA: San Antonio → Puerto Iguazú
    {
      id: 8,
      empresa:    'expresoSelva',
      numero:     null,
      categoria:  'Servicio regular',
      servicio:   null,
      tipo:       'area',
      origen:     'San Antonio',
      destino:    'Puerto Iguazú',
      destinoId:  'iguazu',
      salida:     '05:10',
      llegada:    '08:40',
      paradas:    ['San Antonio', 'Puerto Iguazú'],
      dias:       ['lv', 'sabado', 'domingo'],
      notas:      ''
    },

    // ÁREA: Puerto Iguazú → San Antonio
    {
      id: 9,
      empresa:    'expresoSelva',
      numero:     null,
      categoria:  'Servicio regular',
      servicio:   null,
      tipo:       'area',
      origen:     'Puerto Iguazú',
      destino:    'San Antonio',
      destinoId:  'sanantonio',
      salida:     '12:20',
      llegada:    '16:00',
      paradas:    ['Puerto Iguazú', 'San Antonio'],
      dias:       ['lv', 'sabado', 'domingo'],
      notas:      ''
    },

    // Andresito → Oberá (07:30) — todos los días
    {
      id: 26,
      empresa:    'expresoSelva',
      numero:     null,
      categoria:  'Servicio regular',
      servicio:   null,
      tipo:       'salida',
      origen:     'Cdte. Andresito',
      destino:    'Oberá',
      destinoId:  'obera',
      salida:     '07:30',
      llegada:    null,
      paradas:    [],
      dias:       ['lv', 'sabado', 'domingo'],
      notas:      ''
    },

    // Andresito → San Vicente (17:10) — Sol del Norte
    {
      id: 10,
      empresa:    'solDelNorte',
      numero:     null,
      categoria:  'Servicio regular',
      servicio:   null,
      tipo:       'salida',
      origen:     'Cdte. Andresito',
      destino:    'San Vicente',
      destinoId:  'sanvicente',
      salida:     '17:10',
      llegada:    null,
      paradas:    ['Wanda', 'Esperanza', 'Eldorado', 'Santiago Liniers', 'Pozo Azul', 'San Pedro', 'San Vicente'],
      dias:       ['lv', 'sabado', 'domingo'],
      notas:      ''
    },

    // ════════════════════════════════════════════
    //  SOL DEL NORTE
    // ════════════════════════════════════════════

    // 07:10 → Oberá
    {
      id: 11,
      empresa:    'solDelNorte',
      numero:     null,
      categoria:  'Servicio regular',
      servicio:   null,
      tipo:       'salida',
      origen:     'Cdte. Andresito',
      destino:    'Oberá',
      destinoId:  'obera',
      salida:     '07:10',
      llegada:    null,
      paradas:    ['Wanda', 'Esperanza', 'Eldorado', 'Alcázar', '2 de Mayo', 'Aristóbulo del Valle', 'Campo Viera', 'Campo Grande', 'Oberá'],
      dias:       ['lv', 'sabado', 'domingo'],
      notas:      ''
    },

    // 14:15 → Apóstoles
    {
      id: 12,
      empresa:    'solDelNorte',
      numero:     null,
      categoria:  'Servicio regular',
      servicio:   null,
      tipo:       'salida',
      origen:     'Cdte. Andresito',
      destino:    'Apóstoles',
      destinoId:  'apostoles',
      salida:     '14:00',
      llegada:    null,
      paradas:    ['Piñalito Norte', 'San Antonio', 'Irigoyen', 'San Pedro', 'San Vicente', '2 de Mayo', 'Aristóbulo del Valle', 'Campo Viera', 'Campo Grande', 'Oberá', 'Alem', 'Apóstoles'],
      dias:       ['lv', 'sabado', 'domingo'],
      notas:      ''
    },

    // ════════════════════════════════════════════
    //  KENIA
    // ════════════════════════════════════════════

    // 05:00 → Eldorado (sale desde Andresito)
    {
      id: 13,
      empresa:    'kenia',
      numero:     null,
      categoria:  'Servicio regular',
      servicio:   null,
      tipo:       'salida',
      origen:     'Cdte. Andresito',
      destino:    'Eldorado',
      destinoId:  'eldorado',
      salida:     '05:00',
      llegada:    null,
      paradas:    ['Piñalito Norte', 'San Antonio', 'Irigoyen', 'Dos Hermanas', 'Pozo Azul', 'Eldorado'],
      dias:       ['lv'],
      notas:      'Solo lunes a viernes'
    },

    // 10:30 → San Vicente (sale desde Piñalito Norte, ruta de área)
    {
      id: 14,
      empresa:    'kenia',
      numero:     null,
      categoria:  'Servicio regular',
      servicio:   null,
      tipo:       'area',
      origen:     'Piñalito Norte',
      destino:    'San Vicente',
      destinoId:  'bernardo',
      salida:     '10:30',
      llegada:    null,
      paradas:    ['Piñalito Norte', 'San Antonio', 'Irigoyen', 'San Pedro', 'San Vicente'],
      dias:       ['lv', 'sabado', 'domingo'],
      notas:      ''
    },

    // ════════════════════════════════════════════
    //  EMPRESA PIÑALITO NORTE
    // ════════════════════════════════════════════

    // 07:30 → San Antonio
    {
      id: 15,
      empresa:    'pinalitoNorte',
      numero:     null,
      categoria:  'Interurbano',
      servicio:   null,
      tipo:       'salida',
      origen:     'Cdte. Andresito',
      destino:    'San Antonio',
      destinoId:  'sanantonio',
      salida:     '07:30',
      llegada:    null,
      paradas:    ['Piñalito Norte', 'San Antonio'],
      dias:       ['lv', 'sabado'],
      notas:      'Sábado: viene desde Puerto Iguazú, circula solo hasta San Antonio'
    },

    // 13:30 → Bdo. de Irigoyen
    {
      id: 16,
      empresa:    'pinalitoNorte',
      numero:     null,
      categoria:  'Interurbano',
      servicio:   null,
      tipo:       'salida',
      origen:     'Cdte. Andresito',
      destino:    'Bdo. de Irigoyen',
      destinoId:  'bernardo',
      salida:     '13:30',
      llegada:    null,
      paradas:    ['San Antonio', 'Irigoyen'],
      dias:       ['lv'],
      notas:      'Solo lunes a viernes'
    },

    // 18:00 → Puerto Iguazú
    {
      id: 17,
      empresa:    'pinalitoNorte',
      numero:     null,
      categoria:  'Interurbano',
      servicio:   null,
      tipo:       'salida',
      origen:     'Cdte. Andresito',
      destino:    'Puerto Iguazú',
      destinoId:  'iguazu',
      salida:     '18:00',
      llegada:    null,
      paradas:    ['Wanda', 'Puerto Iguazú'],
      dias:       ['lv', 'domingo'],
      notas:      'No opera los sábados. Domingo: retoma hacia Puerto Iguazú'
    },

    // ════════════════════════════════════════════
    //  EMPRESA ITATÍ
    // ════════════════════════════════════════════

    // Ruta 24 — IDA: Andresito → San Pedro  (con horarios en paradas intermedias)
    {
      id: 18,
      empresa:    'itati',
      numero:     null,
      categoria:  'Servicio regular',
      servicio:   'Ruta 24',
      tipo:       'salida',
      origen:     'Cdte. Andresito',
      destino:    'San Pedro',
      destinoId:  'sanpedro',
      salida:     '06:15',
      llegada:    '09:45',
      paradas:    ['San Antonio', 'Bdo. de Irigoyen'],
      tiempos: {
        'Cdte. Andresito':  '06:15',
        'San Antonio':      '07:35',
        'Bdo. de Irigoyen': '08:25',
        'San Pedro':        '09:45'
      },
      dias:       ['lv', 'sabado', 'domingo'],
      notas:      'Ruta 24'
    },

    // Ruta 24 — VUELTA: San Pedro → Andresito
    {
      id: 19,
      empresa:    'itati',
      numero:     null,
      categoria:  'Servicio regular',
      servicio:   'Ruta 24',
      tipo:       'llegada',
      origen:     'San Pedro',
      destino:    'Cdte. Andresito',
      destinoId:  'sanpedro',
      salida:     '12:15',
      llegada:    '15:45',
      paradas:    ['Bdo. de Irigoyen', 'San Antonio'],
      tiempos: {
        'San Pedro':        '12:15',
        'Bdo. de Irigoyen': '13:30',
        'San Antonio':      '14:30',
        'Cdte. Andresito':  '15:45'
      },
      dias:       ['lv', 'sabado', 'domingo'],
      notas:      'Ruta 24'
    },

    // Línea Integración — Sale Integración 06:00 → Andresito 07:15
    {
      id: 20,
      empresa:    'itati',
      numero:     null,
      categoria:  'Línea Integración',
      servicio:   null,
      tipo:       'llegada',
      origen:     'Integración',
      destino:    'Cdte. Andresito',
      destinoId:  'integracion',
      salida:     '06:00',
      llegada:    '07:15',
      paradas:    [],
      tiempos:    { 'Integración': '06:00', 'Cdte. Andresito': '07:15' },
      dias:       ['lv', 'sabado', 'domingo'],
      notas:      ''
    },

    // Línea Integración — Sale Andresito 11:30 → Integración 12:45
    {
      id: 21,
      empresa:    'itati',
      numero:     null,
      categoria:  'Línea Integración',
      servicio:   null,
      tipo:       'salida',
      origen:     'Cdte. Andresito',
      destino:    'Integración',
      destinoId:  'integracion',
      salida:     '11:30',
      llegada:    '12:45',
      paradas:    [],
      tiempos:    { 'Cdte. Andresito': '11:30', 'Integración': '12:45' },
      dias:       ['lv', 'sabado', 'domingo'],
      notas:      ''
    },

    // Línea Integración — Sale Integración 15:00 → Andresito 16:15
    {
      id: 22,
      empresa:    'itati',
      numero:     null,
      categoria:  'Línea Integración',
      servicio:   null,
      tipo:       'llegada',
      origen:     'Integración',
      destino:    'Cdte. Andresito',
      destinoId:  'integracion',
      salida:     '15:00',
      llegada:    '16:15',
      paradas:    [],
      tiempos:    { 'Integración': '15:00', 'Cdte. Andresito': '16:15' },
      dias:       ['lv', 'sabado', 'domingo'],
      notas:      ''
    },

    // Línea Integración — Sale Andresito 17:30 → Integración 18:45
    {
      id: 23,
      empresa:    'itati',
      numero:     null,
      categoria:  'Línea Integración',
      servicio:   null,
      tipo:       'salida',
      origen:     'Cdte. Andresito',
      destino:    'Integración',
      destinoId:  'integracion',
      salida:     '17:30',
      llegada:    '18:45',
      paradas:    [],
      tiempos:    { 'Cdte. Andresito': '17:30', 'Integración': '18:45' },
      dias:       ['lv', 'sabado', 'domingo'],
      notas:      ''
    },

    // Línea San Vicente — IDA: Andresito 05:00 → San Vicente 11:05
    {
      id: 24,
      empresa:    'itati',
      numero:     null,
      categoria:  'Línea San Vicente',
      servicio:   null,
      tipo:       'salida',
      origen:     'Cdte. Andresito',
      destino:    'San Vicente',
      destinoId:  'sanvicente',
      salida:     '05:00',
      llegada:    '11:05',
      paradas:    [],
      tiempos:    { 'Cdte. Andresito': '05:00', 'San Vicente': '11:05' },
      dias:       ['lv', 'sabado', 'domingo'],
      notas:      ''
    },

    // Línea San Vicente — VUELTA: San Vicente 11:10 → Andresito 17:15
    {
      id: 25,
      empresa:    'itati',
      numero:     null,
      categoria:  'Línea San Vicente',
      servicio:   null,
      tipo:       'llegada',
      origen:     'San Vicente',
      destino:    'Cdte. Andresito',
      destinoId:  'sanvicente',
      salida:     '11:10',
      llegada:    '17:15',
      paradas:    [],
      tiempos:    { 'San Vicente': '11:10', 'Cdte. Andresito': '17:15' },
      dias:       ['lv', 'sabado', 'domingo'],
      notas:      ''
    }

  ]
};
