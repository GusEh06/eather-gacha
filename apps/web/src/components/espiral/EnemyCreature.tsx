/**
 * Bestiario procedural de La Espiral — criaturas SVG animadas, cero assets
 * externos. Cada nombre de enemigo/jefe (shared/espiral.ts) tiene su propia
 * silueta con vida: parpadeos, mandíbulas, flotación, colas, halos.
 * Si el snapshot trae imageUrl (arte subido desde el admin), esa imagen
 * tiene prioridad sobre la criatura procedural.
 */

interface CreatureProps {
  size: number
  attacking?: boolean
}

type CreatureRenderer = (p: CreatureProps) => React.ReactElement

// ─── Enemigos normales ───────────────────────────────────────────────────────

/** Remanente Hueco — cascarón humanoide agrietado con el pecho vacío. */
function RemanenteHueco({ size }: CreatureProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" width={size} height={size} className="ec-float-slow">
      <defs>
        <radialGradient id="ec-rh-body" cx="50%" cy="35%">
          <stop offset="0%" stopColor="#4a4258" />
          <stop offset="100%" stopColor="#17131f" />
        </radialGradient>
        <radialGradient id="ec-rh-void" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#0a0510" />
          <stop offset="70%" stopColor="#1d0f2e" />
          <stop offset="100%" stopColor="#3d2860" />
        </radialGradient>
      </defs>
      {/* cabeza desprendida, flota por su cuenta */}
      <g className="ec-bob-offset">
        <path d="M38 22 Q50 8 62 22 Q64 32 50 34 Q36 32 38 22Z" fill="url(#ec-rh-body)" stroke="#5d5470" strokeWidth="1" />
        <g className="ec-blink">
          <ellipse cx="44" cy="24" rx="3" ry="4" fill="#9f8fd0" opacity="0.9" />
          <ellipse cx="56" cy="24" rx="3" ry="4" fill="#9f8fd0" opacity="0.9" />
        </g>
      </g>
      {/* torso con agujero de vacío */}
      <path d="M30 44 Q50 36 70 44 L66 88 Q50 96 34 88 Z" fill="url(#ec-rh-body)" stroke="#5d5470" strokeWidth="1.2" />
      <ellipse cx="50" cy="62" rx="13" ry="16" fill="url(#ec-rh-void)" className="ec-pulse-soft" />
      {/* grietas */}
      <path d="M36 50 L42 58 M64 48 L59 57 M40 82 L46 74 M62 80 L57 72" stroke="#6f649033" strokeWidth="1.5" fill="none" />
      {/* fragmentos orbitando el hueco */}
      <g className="ec-orbit">
        <rect x="48" y="42" width="4" height="4" fill="#7d6fa8" transform="rotate(20 50 62)" />
        <rect x="63" y="60" width="3" height="3" fill="#7d6fa8" transform="rotate(-15 50 62)" />
        <rect x="36" y="66" width="3.5" height="3.5" fill="#7d6fa8" transform="rotate(40 50 62)" />
      </g>
    </svg>
  )
}

/** Devorador de Ecos — masa flotante que es casi toda boca. */
function DevoradorDeEcos({ size, attacking }: CreatureProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" width={size} height={size} className="ec-float">
      <defs>
        <radialGradient id="ec-de-body" cx="50%" cy="30%">
          <stop offset="0%" stopColor="#5a2a4a" />
          <stop offset="100%" stopColor="#1f0a1a" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="52" rx="34" ry="32" fill="url(#ec-de-body)" stroke="#8a4a6a" strokeWidth="1.4" />
      {/* ojitos desiguales arriba */}
      <g className="ec-blink">
        <circle cx="38" cy="32" r="4.5" fill="#ffd76b" />
        <circle cx="38" cy="32" r="2" fill="#1a0a10" />
        <circle cx="58" cy="28" r="3" fill="#ffd76b" />
        <circle cx="58" cy="28" r="1.4" fill="#1a0a10" />
      </g>
      {/* mandíbula gigante */}
      <g className={attacking ? "ec-jaw-fast" : "ec-jaw"}>
        <path d="M20 52 Q50 44 80 52 L76 72 Q50 88 24 72 Z" fill="#12060e" />
        {/* dientes superiores */}
        <path d="M24 52 L29 60 L34 52 L39 61 L44 52 L50 62 L56 52 L61 61 L66 52 L71 60 L76 52" fill="none" stroke="#e8d8dc" strokeWidth="3" strokeLinejoin="round" />
        {/* dientes inferiores */}
        <path d="M30 73 L35 66 L41 74 L47 66 L53 74 L59 66 L65 73" fill="none" stroke="#c9b6bc" strokeWidth="2.6" strokeLinejoin="round" />
        {/* lengua-eco: ondas concéntricas dentro de la boca */}
        <circle cx="50" cy="64" r="5" fill="none" stroke="#c74b8a" strokeWidth="1.2" className="ec-ripple" />
      </g>
      {/* aletas laterales */}
      <path d="M16 48 Q6 42 10 32 Q18 38 20 44Z" fill="#5a2a4a" className="ec-fin-l" />
      <path d="M84 48 Q94 42 90 32 Q82 38 80 44Z" fill="#5a2a4a" className="ec-fin-r" />
    </svg>
  )
}

/** Sombra del Umbral — espectro encapuchado de bordes andrajosos. */
function SombraDelUmbral({ size }: CreatureProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" width={size} height={size} className="ec-sway">
      <defs>
        <linearGradient id="ec-su-cloak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2c2440" />
          <stop offset="100%" stopColor="#0c0916" />
        </linearGradient>
      </defs>
      {/* manto con jirones */}
      <path
        d="M50 8 Q74 18 72 48 Q71 66 76 78 L68 72 L64 84 L57 74 L50 90 L43 74 L36 84 L32 72 L24 78 Q29 66 28 48 Q26 18 50 8Z"
        fill="url(#ec-su-cloak)"
        stroke="#4a3d6a"
        strokeWidth="1"
      />
      {/* vacío de la capucha */}
      <path d="M38 26 Q50 18 62 26 Q64 40 50 44 Q36 40 38 26Z" fill="#05030a" />
      {/* ojos que se estrechan */}
      <g className="ec-eye-narrow">
        <path d="M42 30 L48 32 L42 34Z" fill="#8ee3ff" />
        <path d="M58 30 L52 32 L58 34Z" fill="#8ee3ff" />
      </g>
      {/* manos espectrales asomando */}
      <path d="M30 52 Q24 54 22 60 M70 52 Q76 54 78 60" stroke="#4a3d6a" strokeWidth="2.4" fill="none" strokeLinecap="round" className="ec-bob-offset" />
    </svg>
  )
}

/** Centinela Fracturado — monolito de piedra con núcleo expuesto. */
function CentinelaFracturado({ size }: CreatureProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" width={size} height={size} className="ec-float-slow">
      <defs>
        <linearGradient id="ec-cf-stone" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3d4452" />
          <stop offset="100%" stopColor="#171c26" />
        </linearGradient>
      </defs>
      {/* cabeza-visor */}
      <path d="M34 14 L66 14 L70 34 L30 34 Z" fill="url(#ec-cf-stone)" stroke="#525a6e" strokeWidth="1.2" />
      <rect x="36" y="22" width="28" height="5" rx="2.5" fill="#0a0d14" />
      <rect x="38" y="23" width="10" height="3" rx="1.5" fill="#ff9d4a" className="ec-scan" />
      {/* hombros flotantes, separados del cuerpo */}
      <path d="M14 40 L30 38 L28 52 L16 50Z" fill="url(#ec-cf-stone)" className="ec-bob-offset" />
      <path d="M86 40 L70 38 L72 52 L84 50Z" fill="url(#ec-cf-stone)" className="ec-bob-offset2" />
      {/* torso partido en dos, núcleo visible entre las mitades */}
      <path d="M32 40 L68 40 L64 58 L36 58Z" fill="url(#ec-cf-stone)" stroke="#525a6e" strokeWidth="1" />
      <circle cx="50" cy="64" r="7" fill="#ff9d4a" className="ec-core" />
      <path d="M38 70 L62 70 L58 90 L42 90Z" fill="url(#ec-cf-stone)" stroke="#525a6e" strokeWidth="1" />
      {/* grietas con brillo del núcleo */}
      <path d="M44 46 L48 54 M58 44 L54 52 M46 76 L50 82 M56 74 L53 80" stroke="#ff9d4a55" strokeWidth="1.4" fill="none" />
    </svg>
  )
}

/** Aullido del Vacío — cabeza lobuna espectral de fauces abiertas. */
function AullidoDelVacio({ size, attacking }: CreatureProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" width={size} height={size} className="ec-float">
      <defs>
        <linearGradient id="ec-av-fur" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a3350" />
          <stop offset="100%" stopColor="#120e1e" />
        </linearGradient>
      </defs>
      {/* orejas */}
      <path d="M28 26 L34 8 L44 22Z" fill="url(#ec-av-fur)" className="ec-ear-l" />
      <path d="M72 26 L66 8 L56 22Z" fill="url(#ec-av-fur)" className="ec-ear-r" />
      {/* cráneo y hocico */}
      <path d="M26 30 Q50 16 74 30 L70 48 Q68 54 60 56 L52 68 L44 56 Q32 54 30 48Z" fill="url(#ec-av-fur)" stroke="#564a78" strokeWidth="1.2" />
      {/* ojos rasgados */}
      <g className="ec-blink">
        <path d="M36 36 L46 38 L37 41Z" fill="#c94bff" />
        <path d="M64 36 L54 38 L63 41Z" fill="#c94bff" />
      </g>
      {/* fauces abiertas — mandíbula inferior aullando */}
      <g className={attacking ? "ec-jaw-fast" : "ec-howl"}>
        <path d="M40 58 L50 84 L60 58 Q50 66 40 58Z" fill="#0c0614" stroke="#564a78" strokeWidth="1" />
        <path d="M43 60 L46 66 M57 60 L54 66" stroke="#e8d8dc" strokeWidth="2" strokeLinecap="round" />
      </g>
      {/* colmillos superiores */}
      <path d="M44 56 L46 62 L48 56 M52 56 L54 62 L56 56" fill="none" stroke="#e8d8dc" strokeWidth="2" strokeLinejoin="round" />
      {/* partículas del aullido */}
      <g className="ec-rise">
        <circle cx="50" cy="76" r="1.6" fill="#c94bff" opacity="0.7" />
        <circle cx="45" cy="82" r="1.2" fill="#c94bff" opacity="0.5" />
        <circle cx="56" cy="80" r="1.4" fill="#c94bff" opacity="0.6" />
      </g>
    </svg>
  )
}

/** Espectro de Ceniza — fantasma humeante con brasas que suben. */
function EspectroDeCeniza({ size }: CreatureProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" width={size} height={size} className="ec-sway">
      <defs>
        <linearGradient id="ec-ec-smoke" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#57504e" />
          <stop offset="100%" stopColor="#1c1614" />
        </linearGradient>
      </defs>
      {/* cuerpo de humo con cola ondulante */}
      <path
        d="M50 12 Q70 20 68 44 Q67 60 74 70 Q62 68 58 76 Q54 86 46 78 Q40 70 30 74 Q36 62 32 46 Q30 20 50 12Z"
        fill="url(#ec-ec-smoke)"
        stroke="#6e625c"
        strokeWidth="1"
        className="ec-smoke-shift"
      />
      {/* rostro hundido */}
      <g className="ec-blink">
        <ellipse cx="42" cy="32" rx="3.4" ry="4.6" fill="#ffb46b" />
        <ellipse cx="58" cy="32" rx="3.4" ry="4.6" fill="#ffb46b" />
      </g>
      <ellipse cx="50" cy="46" rx="4" ry="6" fill="#12080a" className="ec-mouth-moan" />
      {/* brasas ascendiendo */}
      <g className="ec-rise">
        <circle cx="36" cy="58" r="1.8" fill="#ff8a3d" />
        <circle cx="62" cy="52" r="1.4" fill="#ffb46b" />
        <circle cx="48" cy="64" r="1.2" fill="#ff8a3d" />
      </g>
      <g className="ec-rise2">
        <circle cx="56" cy="66" r="1.5" fill="#ff8a3d" />
        <circle cx="42" cy="48" r="1.1" fill="#ffd76b" />
      </g>
    </svg>
  )
}

/** Guardián Olvidado — estatua-caballero con runas musgosas. */
function GuardianOlvidado({ size }: CreatureProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" width={size} height={size} className="ec-breathe">
      <defs>
        <linearGradient id="ec-go-armor" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#46524a" />
          <stop offset="100%" stopColor="#1a211c" />
        </linearGradient>
      </defs>
      {/* yelmo con penacho roto */}
      <path d="M40 10 L46 4 L48 12Z" fill="#2c3a30" />
      <path d="M36 14 L64 14 L66 32 L34 32Z" fill="url(#ec-go-armor)" stroke="#5c6e60" strokeWidth="1.2" />
      <rect x="40" y="21" width="20" height="4" rx="2" fill="#060a08" />
      <rect x="42" y="22" width="6" height="2.4" rx="1.2" fill="#7dffb0" className="ec-scan" />
      {/* torso blindado */}
      <path d="M32 36 L68 36 L64 74 L36 74Z" fill="url(#ec-go-armor)" stroke="#5c6e60" strokeWidth="1.2" />
      {/* runa central que respira */}
      <path d="M50 44 L56 54 L50 64 L44 54Z" fill="none" stroke="#7dffb0" strokeWidth="1.6" className="ec-core" />
      {/* musgo colgando */}
      <path d="M34 40 Q31 46 34 50 M66 42 Q69 48 66 52 M38 74 Q37 80 40 82 M62 74 Q63 80 60 82" stroke="#3f6e4a" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* escudo al frente */}
      <g className="ec-bob-offset">
        <path d="M18 44 L34 40 L34 64 Q26 72 18 64Z" fill="#2c3a30" stroke="#5c6e60" strokeWidth="1.2" />
        <circle cx="26" cy="52" r="3" fill="#7dffb0" opacity="0.5" className="ec-pulse-soft" />
      </g>
      {/* base flotante de escombros */}
      <path d="M40 80 L60 80 L56 90 L44 90Z" fill="#1a211c" className="ec-bob-offset2" />
    </svg>
  )
}

/** Larva Estelar — gusano segmentado con pecas de estrellas. */
function LarvaEstelar({ size, attacking }: CreatureProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" width={size} height={size} className="ec-float">
      <defs>
        <radialGradient id="ec-le-seg" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#3d5a7a" />
          <stop offset="100%" stopColor="#101c2c" />
        </radialGradient>
      </defs>
      {/* cuerpo segmentado en S — cada segmento ondula desfasado */}
      <g className="ec-und3"><circle cx="72" cy="72" r="10" fill="url(#ec-le-seg)" stroke="#4d6e94" strokeWidth="1" /></g>
      <g className="ec-und2"><circle cx="62" cy="60" r="12" fill="url(#ec-le-seg)" stroke="#4d6e94" strokeWidth="1" /></g>
      <g className="ec-und1"><circle cx="50" cy="48" r="13.5" fill="url(#ec-le-seg)" stroke="#4d6e94" strokeWidth="1" /></g>
      {/* cabeza */}
      <g className="ec-und0">
        <circle cx="38" cy="34" r="15" fill="url(#ec-le-seg)" stroke="#4d6e94" strokeWidth="1.2" />
        {/* mandíbulas pequeñas */}
        <g className={attacking ? "ec-jaw-fast" : "ec-mandible"}>
          <path d="M26 40 Q22 44 25 48" stroke="#8fc3ff" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M34 46 Q32 51 36 53" stroke="#8fc3ff" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
        {/* ojos compuestos */}
        <g className="ec-blink">
          <circle cx="33" cy="28" r="3.2" fill="#aee3ff" />
          <circle cx="42" cy="26" r="2.4" fill="#aee3ff" />
        </g>
      </g>
      {/* pecas-estrella titilando sobre los segmentos */}
      <g className="ec-twinkle">
        <circle cx="52" cy="44" r="1.3" fill="#fff" />
        <circle cx="64" cy="58" r="1.1" fill="#cfe9ff" />
        <circle cx="74" cy="70" r="1" fill="#fff" />
        <circle cx="44" cy="52" r="0.9" fill="#cfe9ff" />
      </g>
    </svg>
  )
}

// ─── Jefes ───────────────────────────────────────────────────────────────────

/** El Corazón del Abismo — corazón colosal con venas y un ojo central. */
function CorazonDelAbismo({ size }: CreatureProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" width={size} height={size}>
      <defs>
        <radialGradient id="ec-ca-flesh" cx="45%" cy="35%">
          <stop offset="0%" stopColor="#7a1e35" />
          <stop offset="100%" stopColor="#26060f" />
        </radialGradient>
      </defs>
      <g className="ec-heartbeat">
        {/* masa cardíaca asimétrica */}
        <path
          d="M50 16 Q68 8 78 24 Q88 42 72 62 Q62 76 52 88 Q40 78 28 64 Q12 46 24 26 Q34 10 50 16Z"
          fill="url(#ec-ca-flesh)"
          stroke="#a03a52"
          strokeWidth="1.6"
        />
        {/* arterias superiores cortadas */}
        <path d="M44 14 L42 4 L50 10 L54 2 L58 12" fill="none" stroke="#a03a52" strokeWidth="4" strokeLinecap="round" />
        {/* venas pulsantes */}
        <g className="ec-vein">
          <path d="M34 34 Q44 42 40 56 M66 30 Q58 44 64 58 M48 70 Q52 62 60 66" fill="none" stroke="#ff5a7a" strokeWidth="1.6" opacity="0.7" />
        </g>
        {/* ojo central que vigila */}
        <ellipse cx="50" cy="46" rx="12" ry="9" fill="#0d0208" />
        <g className="ec-eye-look">
          <circle cx="50" cy="46" r="5" fill="#ffd76b" />
          <circle cx="50" cy="46" r="2.2" fill="#26060f" />
        </g>
      </g>
      {/* goteo */}
      <g className="ec-drip">
        <circle cx="52" cy="92" r="1.8" fill="#a03a52" />
      </g>
    </svg>
  )
}

/** Arconte de la Espiral — figura coronada con halo espiral giratorio. */
function ArconteDeLaEspiral({ size }: CreatureProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" width={size} height={size} className="ec-float-slow">
      <defs>
        <linearGradient id="ec-ae-robe" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a2a5e" />
          <stop offset="100%" stopColor="#120a24" />
        </linearGradient>
      </defs>
      {/* halo espiral giratorio */}
      <g className="ec-spin">
        <circle cx="50" cy="34" r="26" fill="none" stroke="#b08aff" strokeWidth="1" strokeDasharray="6 10" opacity="0.7" />
        <circle cx="50" cy="34" r="19" fill="none" stroke="#b08aff" strokeWidth="0.8" strokeDasharray="3 7" opacity="0.5" />
      </g>
      {/* corona de tres puntas */}
      <path d="M40 18 L43 8 L48 16 L52 6 L56 16 L61 8 L64 18Z" fill="#c9a94a" stroke="#f0d78a" strokeWidth="0.8" />
      {/* rostro-máscara sin rasgos salvo tres ojos */}
      <path d="M38 20 Q50 14 62 20 L60 38 Q50 44 40 38Z" fill="#1a1030" stroke="#6a4aa0" strokeWidth="1.2" />
      <g className="ec-blink">
        <circle cx="44" cy="27" r="2.4" fill="#e3c9ff" />
        <circle cx="56" cy="27" r="2.4" fill="#e3c9ff" />
        <circle cx="50" cy="33" r="2" fill="#ffd76b" />
      </g>
      {/* túnica que se disuelve en jirones */}
      <path
        d="M36 42 Q50 38 64 42 L70 70 L62 66 L60 84 L52 76 L50 92 L48 76 L40 84 L38 66 L30 70Z"
        fill="url(#ec-ae-robe)"
        stroke="#6a4aa0"
        strokeWidth="1"
        className="ec-smoke-shift"
      />
      {/* manos en levitación */}
      <circle cx="26" cy="52" r="4" fill="#b08aff" opacity="0.8" className="ec-bob-offset" />
      <circle cx="74" cy="52" r="4" fill="#b08aff" opacity="0.8" className="ec-bob-offset2" />
    </svg>
  )
}

/** La Boca que Consume — anillos de dientes en torno a un vacío. */
function BocaQueConsume({ size, attacking }: CreatureProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" width={size} height={size}>
      <defs>
        <radialGradient id="ec-bc-void" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#000" />
          <stop offset="60%" stopColor="#14040c" />
          <stop offset="100%" stopColor="#3d0a1e" />
        </radialGradient>
      </defs>
      {/* carne exterior */}
      <circle cx="50" cy="50" r="44" fill="#3d0a1e" stroke="#6e1e3a" strokeWidth="2" className="ec-pulse-soft" />
      {/* anillo de dientes externo — gira lento */}
      <g className={attacking ? "ec-spin-fast" : "ec-spin"}>
        {Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2
          const x1 = 50 + Math.cos(a) * 40
          const y1 = 50 + Math.sin(a) * 40
          const x2 = 50 + Math.cos(a + 0.1) * 30
          const y2 = 50 + Math.sin(a + 0.1) * 30
          return <path key={`d${x1.toFixed(1)}-${y1.toFixed(1)}`} d={`M${x1} ${y1} L${x2} ${y2}`} stroke="#e8d8dc" strokeWidth="3.4" strokeLinecap="round" />
        })}
      </g>
      {/* anillo interno — gira al revés */}
      <g className="ec-spin-rev">
        {Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2
          const x1 = 50 + Math.cos(a) * 26
          const y1 = 50 + Math.sin(a) * 26
          const x2 = 50 + Math.cos(a - 0.14) * 17
          const y2 = 50 + Math.sin(a - 0.14) * 17
          return <path key={`d${x1.toFixed(1)}-${y1.toFixed(1)}`} d={`M${x1} ${y1} L${x2} ${y2}`} stroke="#c9b6bc" strokeWidth="2.6" strokeLinecap="round" />
        })}
      </g>
      {/* el vacío que traga */}
      <circle cx="50" cy="50" r="15" fill="url(#ec-bc-void)" className="ec-swallow" />
      {/* ojos satélite alrededor */}
      <g className="ec-blink">
        <circle cx="20" cy="24" r="3" fill="#ff5a7a" />
        <circle cx="82" cy="30" r="2.4" fill="#ff5a7a" />
        <circle cx="76" cy="80" r="2.8" fill="#ff5a7a" />
      </g>
    </svg>
  )
}

/** Señor del Piso Roto — rey-gólem de losas flotantes con corona. */
function SenorDelPisoRoto({ size }: CreatureProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" width={size} height={size} className="ec-float-slow">
      <defs>
        <linearGradient id="ec-sp-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4a4438" />
          <stop offset="100%" stopColor="#1c1912" />
        </linearGradient>
      </defs>
      {/* corona de esquirlas */}
      <path d="M38 12 L42 2 L47 10 L53 2 L58 10 L62 2 L64 14Z" fill="#8a7442" stroke="#c9ae6a" strokeWidth="0.8" />
      {/* cabeza: losa agrietada */}
      <path d="M36 14 L64 14 L62 32 L38 32Z" fill="url(#ec-sp-tile)" stroke="#6e6450" strokeWidth="1.2" />
      <g className="ec-blink">
        <rect x="42" y="21" width="6" height="3.4" fill="#ffcf5a" />
        <rect x="53" y="21" width="6" height="3.4" fill="#ffcf5a" />
      </g>
      {/* torso: mosaico de losas separadas que respiran */}
      <g className="ec-bob-offset"><path d="M30 38 L48 36 L47 52 L31 54Z" fill="url(#ec-sp-tile)" stroke="#6e6450" strokeWidth="1" /></g>
      <g className="ec-bob-offset2"><path d="M52 36 L70 38 L69 54 L53 52Z" fill="url(#ec-sp-tile)" stroke="#6e6450" strokeWidth="1" /></g>
      <g className="ec-bob-offset"><path d="M34 58 L66 58 L62 76 L38 76Z" fill="url(#ec-sp-tile)" stroke="#6e6450" strokeWidth="1" /></g>
      {/* núcleo dorado entre losas */}
      <circle cx="50" cy="50" r="5" fill="#ffcf5a" className="ec-core" />
      {/* puños de escombro */}
      <g className="ec-fist-l"><path d="M14 46 L28 42 L30 56 L18 58Z" fill="url(#ec-sp-tile)" stroke="#6e6450" strokeWidth="1" /></g>
      <g className="ec-fist-r"><path d="M86 46 L72 42 L70 56 L82 58Z" fill="url(#ec-sp-tile)" stroke="#6e6450" strokeWidth="1" /></g>
      {/* escombros orbitando la base */}
      <g className="ec-orbit">
        <rect x="40" y="82" width="5" height="5" fill="#4a4438" transform="rotate(15 50 84)" />
        <rect x="56" y="84" width="4" height="4" fill="#4a4438" transform="rotate(-20 50 84)" />
        <rect x="48" y="88" width="3" height="3" fill="#6e6450" />
      </g>
    </svg>
  )
}

/** Eco Primordial — entidad de anillos resonantes con muchos ojos. */
function EcoPrimordial({ size }: CreatureProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" width={size} height={size}>
      <defs>
        <radialGradient id="ec-ep-core" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#e3fff9" />
          <stop offset="40%" stopColor="#3ddcb0" />
          <stop offset="100%" stopColor="#0a2e24" />
        </radialGradient>
      </defs>
      {/* anillos de resonancia expandiéndose */}
      <circle cx="50" cy="50" r="20" fill="none" stroke="#3ddcb0" strokeWidth="1.4" className="ec-ring1" />
      <circle cx="50" cy="50" r="30" fill="none" stroke="#3ddcb0" strokeWidth="1" className="ec-ring2" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="#3ddcb0" strokeWidth="0.7" className="ec-ring3" />
      {/* núcleo */}
      <circle cx="50" cy="50" r="12" fill="url(#ec-ep-core)" className="ec-pulse-soft" />
      {/* ojos orbitando en distintos radios, parpadeo desfasado */}
      <g className="ec-spin">
        <g className="ec-blink"><circle cx="50" cy="28" r="3" fill="#eafff8" /><circle cx="50" cy="28" r="1.3" fill="#0a2e24" /></g>
        <g className="ec-blink2"><circle cx="72" cy="56" r="2.6" fill="#eafff8" /><circle cx="72" cy="56" r="1.1" fill="#0a2e24" /></g>
        <g className="ec-blink"><circle cx="30" cy="62" r="2.2" fill="#eafff8" /><circle cx="30" cy="62" r="1" fill="#0a2e24" /></g>
      </g>
      <g className="ec-spin-rev">
        <g className="ec-blink2"><circle cx="50" cy="14" r="2" fill="#bfffe9" /><circle cx="50" cy="14" r="0.9" fill="#0a2e24" /></g>
        <g className="ec-blink"><circle cx="84" cy="50" r="1.8" fill="#bfffe9" /><circle cx="84" cy="50" r="0.8" fill="#0a2e24" /></g>
        <g className="ec-blink2"><circle cx="20" cy="44" r="2.2" fill="#bfffe9" /><circle cx="20" cy="44" r="1" fill="#0a2e24" /></g>
      </g>
    </svg>
  )
}

// ─── Registro nombre → criatura ──────────────────────────────────────────────

const CREATURES: Record<string, CreatureRenderer> = {
  "Remanente Hueco": RemanenteHueco,
  "Devorador de Ecos": DevoradorDeEcos,
  "Sombra del Umbral": SombraDelUmbral,
  "Centinela Fracturado": CentinelaFracturado,
  "Aullido del Vacío": AullidoDelVacio,
  "Espectro de Ceniza": EspectroDeCeniza,
  "Guardián Olvidado": GuardianOlvidado,
  "Larva Estelar": LarvaEstelar,
  "El Corazón del Abismo": CorazonDelAbismo,
  "Arconte de la Espiral": ArconteDeLaEspiral,
  "La Boca que Consume": BocaQueConsume,
  "Señor del Piso Roto": SenorDelPisoRoto,
  "Eco Primordial": EcoPrimordial,
}

/** Color de acento por criatura — alimenta aura, partículas y HP bar. */
export const CREATURE_ACCENT: Record<string, string> = {
  "Remanente Hueco": "#7d6fa8",
  "Devorador de Ecos": "#c74b8a",
  "Sombra del Umbral": "#8ee3ff",
  "Centinela Fracturado": "#ff9d4a",
  "Aullido del Vacío": "#c94bff",
  "Espectro de Ceniza": "#ff8a3d",
  "Guardián Olvidado": "#7dffb0",
  "Larva Estelar": "#8fc3ff",
  "El Corazón del Abismo": "#ff5a7a",
  "Arconte de la Espiral": "#b08aff",
  "La Boca que Consume": "#ff5a7a",
  "Señor del Piso Roto": "#ffcf5a",
  "Eco Primordial": "#3ddcb0",
}

export function creatureAccent(name: string, fallback = "#c74b4b"): string {
  return CREATURE_ACCENT[name] ?? fallback
}

interface EnemyCreatureProps {
  nombre: string
  size: number
  attacking?: boolean
  /** Arte subido desde el admin — tiene prioridad sobre la criatura procedural. */
  imageUrl?: string
}

export function EnemyCreature({ nombre, size, attacking, imageUrl }: EnemyCreatureProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={nombre}
        width={size}
        height={size}
        style={{ objectFit: "contain", filter: "drop-shadow(0 0 18px #c74b4b66)" }}
      />
    )
  }
  const Creature = CREATURES[nombre] ?? SombraDelUmbral
  return (
    <div style={{ width: size, height: size, filter: `drop-shadow(0 0 ${size / 9}px ${creatureAccent(nombre)}55)` }}>
      <Creature size={size} attacking={attacking} />
      <CreatureKeyframes />
    </div>
  )
}

// ─── Animaciones compartidas (una sola vez en el DOM) ────────────────────────

let stylesInjected = false
function CreatureKeyframes() {
  if (stylesInjected) return null
  stylesInjected = true
  return (
    <style>{`
      .ec-float { animation: ec-float 3.2s ease-in-out infinite; }
      .ec-float-slow { animation: ec-float 4.6s ease-in-out infinite; }
      .ec-sway { animation: ec-sway 4s ease-in-out infinite; transform-origin: 50% 20%; }
      .ec-breathe { animation: ec-breathe 3.6s ease-in-out infinite; transform-origin: 50% 80%; }
      .ec-bob-offset { animation: ec-bob 2.8s ease-in-out infinite; }
      .ec-bob-offset2 { animation: ec-bob 2.8s ease-in-out -1.4s infinite; }
      .ec-blink { animation: ec-blink 4.2s infinite; transform-box: fill-box; transform-origin: center; }
      .ec-blink2 { animation: ec-blink 4.2s -2.1s infinite; transform-box: fill-box; transform-origin: center; }
      .ec-eye-narrow { animation: ec-eye-narrow 5s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
      .ec-eye-look { animation: ec-eye-look 5.5s ease-in-out infinite; }
      .ec-jaw { animation: ec-jaw 2.6s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 20%; }
      .ec-jaw-fast { animation: ec-jaw 0.5s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 20%; }
      .ec-howl { animation: ec-howl 3.4s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 10%; }
      .ec-mandible { animation: ec-jaw 1.8s ease-in-out infinite; transform-box: fill-box; transform-origin: 60% 30%; }
      .ec-pulse-soft { animation: ec-pulse 2.6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
      .ec-core { animation: ec-core 2s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
      .ec-scan { animation: ec-scan 3s ease-in-out infinite; }
      .ec-orbit { animation: ec-orbit 7s linear infinite; transform-box: fill-box; transform-origin: center; }
      .ec-spin { animation: ec-orbit 14s linear infinite; transform-box: fill-box; transform-origin: center; }
      .ec-spin-fast { animation: ec-orbit 2.5s linear infinite; transform-box: fill-box; transform-origin: center; }
      .ec-spin-rev { animation: ec-orbit 10s linear infinite reverse; transform-box: fill-box; transform-origin: center; }
      .ec-ripple { animation: ec-ripple 1.8s ease-out infinite; transform-box: fill-box; transform-origin: center; }
      .ec-fin-l { animation: ec-fin 2.2s ease-in-out infinite; transform-box: fill-box; transform-origin: 100% 100%; }
      .ec-fin-r { animation: ec-fin 2.2s ease-in-out -1.1s infinite; transform-box: fill-box; transform-origin: 0% 100%; }
      .ec-ear-l { animation: ec-ear 3.8s ease-in-out infinite; transform-box: fill-box; transform-origin: 80% 100%; }
      .ec-ear-r { animation: ec-ear 3.8s ease-in-out -1.9s infinite; transform-box: fill-box; transform-origin: 20% 100%; }
      .ec-rise { animation: ec-rise 2.4s ease-out infinite; }
      .ec-rise2 { animation: ec-rise 2.4s ease-out -1.2s infinite; }
      .ec-twinkle { animation: ec-twinkle 2.2s ease-in-out infinite; }
      .ec-smoke-shift { animation: ec-smoke 5s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 0%; }
      .ec-mouth-moan { animation: ec-moan 4.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
      .ec-und0 { animation: ec-und 2.4s ease-in-out infinite; }
      .ec-und1 { animation: ec-und 2.4s ease-in-out -0.3s infinite; }
      .ec-und2 { animation: ec-und 2.4s ease-in-out -0.6s infinite; }
      .ec-und3 { animation: ec-und 2.4s ease-in-out -0.9s infinite; }
      .ec-heartbeat { animation: ec-heartbeat 1.5s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
      .ec-vein { animation: ec-vein 1.5s ease-in-out infinite; }
      .ec-drip { animation: ec-drip 2.6s ease-in infinite; }
      .ec-swallow { animation: ec-swallow 3.2s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
      .ec-ring1 { animation: ec-ring 3s ease-out infinite; transform-box: fill-box; transform-origin: center; }
      .ec-ring2 { animation: ec-ring 3s ease-out -1s infinite; transform-box: fill-box; transform-origin: center; }
      .ec-ring3 { animation: ec-ring 3s ease-out -2s infinite; transform-box: fill-box; transform-origin: center; }
      .ec-fist-l { animation: ec-fist 3s ease-in-out infinite; }
      .ec-fist-r { animation: ec-fist 3s ease-in-out -1.5s infinite; }

      @keyframes ec-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
      @keyframes ec-sway { 0%,100% { transform: rotate(-2.5deg) translateY(0); } 50% { transform: rotate(2.5deg) translateY(-4px); } }
      @keyframes ec-breathe { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(1.025); } }
      @keyframes ec-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3.5px); } }
      @keyframes ec-blink { 0%, 90%, 100% { transform: scaleY(1); } 93%, 96% { transform: scaleY(0.08); } }
      @keyframes ec-eye-narrow { 0%,100% { transform: scaleY(1); } 45% { transform: scaleY(0.55); } 55% { transform: scaleY(0.55); } }
      @keyframes ec-eye-look { 0%,100% { transform: translate(0,0); } 30% { transform: translate(2.5px,0.5px); } 60% { transform: translate(-2px,-0.5px); } }
      @keyframes ec-jaw { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(1.18) translateY(1px); } }
      @keyframes ec-howl { 0%,100% { transform: scaleY(0.9); } 40% { transform: scaleY(1.25) translateY(2px); } 60% { transform: scaleY(1.25) translateY(2px); } }
      @keyframes ec-pulse { 0%,100% { transform: scale(1); opacity: 0.85; } 50% { transform: scale(1.08); opacity: 1; } }
      @keyframes ec-core { 0%,100% { transform: scale(1); filter: brightness(1); } 50% { transform: scale(1.25); filter: brightness(1.6); } }
      @keyframes ec-scan { 0%,100% { transform: translateX(0); } 50% { transform: translateX(12px); } }
      @keyframes ec-orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes ec-ripple { 0% { transform: scale(0.4); opacity: 1; } 100% { transform: scale(2.4); opacity: 0; } }
      @keyframes ec-fin { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(-14deg); } }
      @keyframes ec-ear { 0%,92%,100% { transform: rotate(0deg); } 95% { transform: rotate(-8deg); } }
      @keyframes ec-rise { 0% { transform: translateY(4px); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateY(-16px); opacity: 0; } }
      @keyframes ec-twinkle { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
      @keyframes ec-smoke { 0%,100% { transform: skewX(0deg); } 33% { transform: skewX(2.4deg); } 66% { transform: skewX(-2deg); } }
      @keyframes ec-moan { 0%,100% { transform: scaleY(0.5); } 50% { transform: scaleY(1.15); } }
      @keyframes ec-und { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      @keyframes ec-heartbeat { 0%,100% { transform: scale(1); } 12% { transform: scale(1.055); } 24% { transform: scale(0.99); } 36% { transform: scale(1.03); } 48% { transform: scale(1); } }
      @keyframes ec-vein { 0%,100% { opacity: 0.45; } 15% { opacity: 1; } }
      @keyframes ec-drip { 0% { transform: translateY(-6px); opacity: 0; } 25% { opacity: 1; } 100% { transform: translateY(8px); opacity: 0; } }
      @keyframes ec-swallow { 0%,100% { transform: scale(1); } 50% { transform: scale(1.3); } }
      @keyframes ec-ring { 0% { transform: scale(0.55); opacity: 0.9; } 100% { transform: scale(1.15); opacity: 0; } }
      @keyframes ec-fist { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-5px) rotate(-3deg); } }
    `}</style>
  )
}
