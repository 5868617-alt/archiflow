import { LiveDrawing } from '../live/Drawing';
// Procedural architectural drawings used as plan previews in the demo.
// They are illustrations generated in code, not renderings of uploaded files.
import type { PlanLayout } from '../data/types';

const INK = 'var(--plan-ink)';
const BP = 'var(--blueprint)';
const FILL = 'var(--plan-fill)';
const PAPER = 'var(--plan-paper)';

type Seg = [number, number, number, number, number?];
function Walls({ segs }: { segs: Seg[] }) {
  return <g stroke={INK} strokeLinecap="square" fill="none">{segs.map(([a, b, c, d, t = 10], i) => <line key={i} x1={a} y1={b} x2={c} y2={d} strokeWidth={t} />)}</g>;
}
/** door: hinge at (x,y), leaf length w, angle of leaf direction (deg), sweep direction */
function Door({ x, y, w = 50, rot = 0, flip = false }: any) {
  const sweep = flip ? 0 : 1;
  const ex = w, ey = 0, ax = 0, ay = flip ? -w : w;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <rect x={-1} y={-6} width={w + 2} height={12} fill={PAPER} />
      <line x1={0} y1={0} x2={ax} y2={ay} stroke={INK} strokeWidth={2} />
      <path d={`M ${ex} ${ey} A ${w} ${w} 0 0 ${sweep} ${ax} ${ay}`} fill="none" stroke={INK} strokeWidth={1} strokeDasharray="4 3" />
    </g>
  );
}
function Win({ x1, y1, x2, y2 }: any) {
  const horiz = y1 === y2;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={PAPER} strokeWidth={12} />
      {horiz ? (
        <>
          <line x1={x1} y1={y1 - 5} x2={x2} y2={y2 - 5} stroke={INK} strokeWidth={1.2} />
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={1} />
          <line x1={x1} y1={y1 + 5} x2={x2} y2={y2 + 5} stroke={INK} strokeWidth={1.2} />
        </>
      ) : (
        <>
          <line x1={x1 - 5} y1={y1} x2={x2 - 5} y2={y2} stroke={INK} strokeWidth={1.2} />
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={1} />
          <line x1={x1 + 5} y1={y1} x2={x2 + 5} y2={y2} stroke={INK} strokeWidth={1.2} />
        </>
      )}
    </g>
  );
}
function Room({ x, y, name, area, small }: any) {
  return (
    <g textAnchor="middle" fill={INK}>
      <text x={x} y={y} fontSize={small ? 13 : 16} fontWeight={600} fontFamily="var(--font-body)">{name}</text>
      {area ? <text x={x} y={y + (small ? 15 : 19)} fontSize={small ? 10.5 : 12} fontFamily="var(--font-mono)" opacity={0.75}>{area} מ״ר</text> : null}
    </g>
  );
}
function Dim({ x1, y1, x2, y2, label, off = 0 }: any) {
  const horiz = y1 === y2;
  const tx = (x1 + x2) / 2, ty = (y1 + y2) / 2;
  return (
    <g stroke={BP} fill={BP} fontFamily="var(--font-mono)" fontSize={11}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={0.8} />
      {[[x1, y1], [x2, y2]].map(([x, y], i) => <line key={i} x1={x - 5} y1={y + 5} x2={x + 5} y2={y - 5} strokeWidth={1.2} />)}
      {horiz ? <><line x1={x1} y1={y1 - 8} x2={x1} y2={y1 + 8} strokeWidth={0.6} /><line x1={x2} y1={y2 - 8} x2={x2} y2={y2 + 8} strokeWidth={0.6} /></> : <><line x1={x1 - 8} y1={y1} x2={x1 + 8} y2={y1} strokeWidth={0.6} /><line x1={x2 - 8} y1={y2} x2={x2 + 8} y2={y2} strokeWidth={0.6} /></>}
      <text x={horiz ? tx : tx - 6 + off} y={horiz ? ty - 6 + off : ty} stroke="none" textAnchor="middle" transform={horiz ? undefined : `rotate(-90 ${tx - 6 + off} ${ty})`} direction="ltr">{label}</text>
    </g>
  );
}
function Furn({ x, y, w, h, r = 4, label, dashed }: any) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={r} fill={FILL} stroke={INK} strokeWidth={1} strokeDasharray={dashed ? '5 3' : undefined} />
      {label ? <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fontSize={10} fill={INK} opacity={0.7} fontFamily="var(--font-body)">{label}</text> : null}
    </g>
  );
}
function Bed({ x, y, w = 110, h = 140 }: any) {
  return <g><rect x={x} y={y} width={w} height={h} rx={3} fill={FILL} stroke={INK} /><rect x={x + 8} y={y + 6} width={w / 2 - 12} height={24} rx={4} fill={PAPER} stroke={INK} strokeWidth={0.8} /><rect x={x + w / 2 + 4} y={y + 6} width={w / 2 - 12} height={24} rx={4} fill={PAPER} stroke={INK} strokeWidth={0.8} /><line x1={x} y1={y + 46} x2={x + w} y2={y + 46} stroke={INK} strokeWidth={0.8} /></g>;
}
function Sofa({ x, y, w = 180, h = 60 }: any) {
  return <g><rect x={x} y={y} width={w} height={h} rx={8} fill={FILL} stroke={INK} /><rect x={x + 8} y={y + 8} width={w - 16} height={14} rx={4} fill="none" stroke={INK} strokeWidth={0.7} /></g>;
}
function Table({ cx, cy, w = 120, h = 60, chairs = 6, round }: any) {
  const cs: any[] = [];
  if (round) { for (let i = 0; i < chairs; i++) { const a = (i / chairs) * Math.PI * 2; cs.push(<circle key={i} cx={cx + Math.cos(a) * (w / 2 + 12)} cy={cy + Math.sin(a) * (w / 2 + 12)} r={8} fill={PAPER} stroke={INK} strokeWidth={0.8} />); } }
  else { const per = Math.ceil(chairs / 2); for (let i = 0; i < per; i++) { const px = cx - w / 2 + (w / (per + 1)) * (i + 1); cs.push(<rect key={'a' + i} x={px - 9} y={cy - h / 2 - 20} width={18} height={14} rx={3} fill={PAPER} stroke={INK} strokeWidth={0.8} />); cs.push(<rect key={'b' + i} x={px - 9} y={cy + h / 2 + 6} width={18} height={14} rx={3} fill={PAPER} stroke={INK} strokeWidth={0.8} />); } }
  return <g>{cs}{round ? <circle cx={cx} cy={cy} r={w / 2} fill={FILL} stroke={INK} /> : <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={3} fill={FILL} stroke={INK} />}</g>;
}
function Stair({ x, y, w, h, n = 12, vertical = true }: any) {
  const lines = [];
  for (let i = 1; i < n; i++) lines.push(vertical ? <line key={i} x1={x} y1={y + (h / n) * i} x2={x + w} y2={y + (h / n) * i} stroke={INK} strokeWidth={0.8} /> : <line key={i} x1={x + (w / n) * i} y1={y} x2={x + (w / n) * i} y2={y + h} stroke={INK} strokeWidth={0.8} />);
  return <g><rect x={x} y={y} width={w} height={h} fill="none" stroke={INK} />{lines}<path d={vertical ? `M ${x + w / 2} ${y + h - 8} L ${x + w / 2} ${y + 12} m -6 10 l 6 -10 l 6 10` : `M ${x + 8} ${y + h / 2} L ${x + w - 12} ${y + h / 2} m -10 -6 l 10 6 l -10 6`} fill="none" stroke={INK} strokeWidth={1} /></g>;
}
function North({ x, y }: any) {
  return <g transform={`translate(${x} ${y})`}><circle r={18} fill="none" stroke={INK} strokeWidth={1} /><path d="M 0 -15 L 7 10 L 0 5 L -7 10 Z" fill={INK} /><text y={-22} textAnchor="middle" fontSize={11} fontFamily="var(--font-mono)" fill={INK}>N</text></g>;
}
function TitleBlock({ meta }: any) {
  if (!meta) return null;
  return (
    <g fontFamily="var(--font-mono)" fill={INK}>
      <rect x={720} y={660} width={260} height={56} fill={PAPER} stroke={INK} strokeWidth={1} />
      <line x1={720} y1={684} x2={980} y2={684} stroke={INK} strokeWidth={0.6} />
      <line x1={850} y1={684} x2={850} y2={716} stroke={INK} strokeWidth={0.6} />
      <text x={850} y={677} fontSize={12} textAnchor="middle" fontFamily="var(--font-body)" fontWeight={600}>{meta.project}</text>
      <text x={785} y={704} fontSize={11} textAnchor="middle" direction="ltr">{meta.number} · v{meta.v}</text>
      <text x={915} y={704} fontSize={11} textAnchor="middle" direction="ltr">{meta.scale}</text>
    </g>
  );
}
function Hatch({ id }: { id: string }) {
  return (
    <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="8" height="8" fill={PAPER} />
      <line x1="0" y1="0" x2="0" y2="8" stroke={INK} strokeWidth="1" opacity="0.55" />
    </pattern>
  );
}
function ElecSym({ pts }: { pts: [number, number, string][] }) {
  return <g>{pts.map(([x, y, k], i) => k === 's' ? <g key={i}><circle cx={x} cy={y} r={6} fill={PAPER} stroke={BP} strokeWidth={1.4} /><line x1={x - 4} y1={y} x2={x + 4} y2={y} stroke={BP} strokeWidth={1.4} /></g> : k === 'l' ? <g key={i}><circle cx={x} cy={y} r={7} fill="none" stroke={BP} strokeWidth={1.4} /><path d={`M ${x - 5} ${y - 5} L ${x + 5} ${y + 5} M ${x + 5} ${y - 5} L ${x - 5} ${y + 5}`} stroke={BP} strokeWidth={1.2} /></g> : <rect key={i} x={x - 5} y={y - 5} width={10} height={10} fill={BP} />)}</g>;
}

// ---------- layouts ----------
function Apartment({ mode, rev = 99 }: { mode?: 'elec' | 'ceiling'; rev?: number }) {
  return (
    <g>
      <rect x={60} y={60} width={880} height={580} fill={PAPER} />
      {mode === 'ceiling' ? <g stroke={BP} fill="none" strokeDasharray="8 5" strokeWidth={1.2}><rect x={90} y={330} width={440} height={280} /><rect x={110} y={90} width={170} height={190} /><rect x={590} y={90} width={190} height={210} /></g> : null}
      <Walls segs={[[60, 60, 940, 60, 14], [940, 60, 940, 640, 14], [940, 640, 60, 640, 14], [60, 640, 60, 60, 14],
        [rev >= 2 ? 560 : 600, 60, rev >= 2 ? 560 : 600, 220], [rev >= 2 ? 560 : 600, 280, rev >= 2 ? 560 : 600, 330], [560, 330, 680, 330], [740, 330, 940, 330], [800, 60, 800, 150], [800, 200, 800, 330], [800, 210, 940, 210, 6],
        [760, 330, 760, 420], [760, 470, 760, 640], [640, 500, 760, 500, 6], [640, 500, 640, 640, 6], [300, 60, 300, 120, 6]]} />
      <Win x1={120} y1={640} x2={300} y2={640} /><Win x1={340} y1={640} x2={520} y2={640} /><Win x1={60} y1={380} x2={60} y2={560} /><Win x1={600} y1={60} x2={760} y2={60} /><Win x1={940} y1={420} x2={940} y2={580} /><Win x1={120} y1={60} x2={240} y2={60} />
      <Door x={rev >= 2 ? 560 : 600} y={220} w={60} rot={90} /><Door x={680} y={330} w={60} rot={0} flip /><Door x={800} y={150} w={50} rot={90} /><Door x={760} y={420} w={50} rot={90} flip={rev >= 4} /><Door x={700} y={500} w={40} rot={0} />
      {mode !== 'elec' && mode !== 'ceiling' ? (
        <g>
          <Furn x={80} y={80} w={200} h={36} label="ארונות" /><Furn x={80} y={116} w={36} h={150} />{rev >= 3 ? <Furn x={150} y={180} w={180} h={64} label="אי 2.80" /> : <Furn x={170} y={185} w={140} h={56} label="אי 2.20" />}
          {rev >= 2 ? <Table cx={430} cy={180} w={150} h={70} chairs={8} /> : <Table cx={430} cy={190} w={70} chairs={6} round />}
          <Sofa x={120} y={520} w={240} h={66} /><Furn x={170} y={420} w={140} h={60} r={30} label="שולחן קפה" /><Furn x={420} y={440} w={60} h={60} r={30} />
          <Bed x={620} y={110} w={130} h={150} /><Furn x={820} y={225} w={100} h={30} label="ארון" />
          <Bed x={800} y={430} w={100} h={130} /><Furn x={660} y={545} w={80} h={36} label="אמבט" />
          <Furn x={830} y={80} w={90} h={40} label="כיור כפול" /><Furn x={860} y={140} w={60} h={56} label="מקלחון" dashed />
        </g>
      ) : null}
      {mode === 'elec' ? <ElecSym pts={[[120, 160, 's'], [200, 212, 's'], [270, 212, 's'], [200, 150, 'l'], [430, 180, 'l'], [300, 600, 's'], [500, 600, 's'], [90, 450, 's'], [240, 450, 'l'], [690, 120, 's'], [690, 270, 'l'], [880, 500, 'l'], [900, 350, 's'], [850, 100, 'l'], [580, 400, 'd'], [740, 560, 'l']]} /> : null}
      {mode === 'ceiling' ? <g fill={BP}>{[[150, 420], [230, 420], [310, 420], [390, 420], [470, 420], [150, 520], [470, 520], [180, 130], [240, 130], [180, 230], [240, 230], [640, 140], [740, 140], [640, 260], [740, 260], [870, 120], [850, 470], [700, 560]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={5} />)}<line x1={150} y1={470} x2={470} y2={470} stroke={BP} strokeWidth={3} /></g> : null}
      <Room x={185} y={295} name="מטבח" area="18.4" /><Room x={430} y={290} name="פינת אוכל" area="16.2" /><Room x={310} y={380} name="סלון" area="36.9" />
      <Room x={680} y={300} name="סוויטת הורים" area="17.1" small /><Room x={870} y={180} name="רחצה" area="5.4" small /><Room x={870} y={290} name="ארון" small />
      <Room x={850} y={400} name="חדר ילדים" area="14.2" small /><Room x={700} y={460} name="מבואה" small /><Room x={700} y={620} name="רחצה" area="4.3" small /><Room x={600} y={590} name="כביסה" small />
      <Dim x1={60} y1={30} x2={940} y2={30} label="14.08" /><Dim x1={30} y1={60} x2={30} y2={640} label="9.28" />
      <Dim x1={60} y1={665} x2={560} y2={665} label="8.00" />
      <North x={985} y={110} />
    </g>
  );
}
function Existing() {
  return (
    <g>
      <rect x={120} y={80} width={760} height={540} fill={PAPER} />
      <Walls segs={[[120, 80, 880, 80, 14], [880, 80, 880, 620, 14], [880, 620, 120, 620, 14], [120, 620, 120, 80, 14], [420, 80, 420, 300], [420, 360, 420, 620], [420, 330, 600, 330, 8], [600, 80, 600, 330, 8], [660, 330, 880, 330], [740, 80, 740, 330, 6], [600, 330, 600, 420, 6], [600, 470, 600, 620, 6]]} />
      <Win x1={180} y1={620} x2={360} y2={620} /><Win x1={120} y1={180} x2={120} y2={300} /><Win x1={460} y1={80} x2={560} y2={80} /><Win x1={880} y1={420} x2={880} y2={560} />
      <Door x={420} y={300} w={50} rot={90} /><Door x={600} y={330} w={55} rot={0} /><Door x={600} y={420} w={45} rot={90} />
      <g stroke="var(--bad)" strokeWidth={1.5} fill="none" strokeDasharray="6 4"><line x1={420} y1={420} x2={420} y2={600} /><text x={430} y={520} fill="var(--bad)" stroke="none" fontSize={11} fontFamily="var(--font-body)">קיר להריסה (מוצע)</text></g>
      <Room x={270} y={350} name="סלון ומטבח" area="38.6" /><Room x={510} y={210} name="חדר שינה" area="11.2" small /><Room x={670} y={210} name="רחצה" area="4.1" small /><Room x={810} y={210} name="שירותים" small />
      <Room x={510} y={480} name="חדר ילדים" area="10.4" small /><Room x={740} y={480} name="חדר הורים" area="13.0" small />
      <Dim x1={120} y1={50} x2={880} y2={50} label="12.16" /><Dim x1={90} y1={80} x2={90} y2={620} label="8.64" />
      <North x={940} y={110} />
      <text x={500} y={650} textAnchor="middle" fontSize={11} fill={INK} opacity={0.7} fontFamily="var(--font-body)">מבוסס על מדידת מודד מוסמך · גובה תקרה 2.70</text>
    </g>
  );
}
function Villa({ floor }: { floor: 'ground' | 'first' }) {
  const ground = floor === 'ground';
  return (
    <g>
      <rect x={60} y={70} width={880} height={560} fill={PAPER} />
      <Walls segs={[[60, 70, 940, 70, 16], [940, 70, 940, 630, 16], [940, 630, 60, 630, 16], [60, 630, 60, 70, 16],
        ...(ground ? [[420, 70, 420, 240], [420, 300, 420, 400], [420, 400, 560, 400, 8], [620, 400, 700, 400, 8], [700, 70, 700, 400], [700, 470, 700, 630], [820, 400, 940, 400, 8], [700, 400, 760, 400, 8]] as Seg[] :
          [[340, 70, 340, 330], [340, 330, 480, 330, 8], [540, 330, 940, 330, 8], [640, 70, 640, 330], [340, 400, 340, 630], [340, 400, 520, 400, 8], [620, 400, 620, 630], [780, 400, 780, 630], [620, 400, 940, 400, 8]] as Seg[])]} />
      <Win x1={100} y1={630} x2={380} y2={630} /><Win x1={60} y1={140} x2={60} y2={360} /><Win x1={460} y1={630} x2={680} y2={630} /><Win x1={940} y1={150} x2={940} y2={320} /><Win x1={120} y1={70} x2={360} y2={70} />
      {ground ? (
        <g>
          <Sofa x={110} y={430} w={260} h={70} /><Sofa x={110} y={300} w={70} h={110} /><Furn x={210} y={330} w={130} h={70} r={10} label="שולחן קפה" />
          <Table cx={250} cy={170} w={220} h={80} chairs={10} />
          <Furn x={480} y={90} w={200} h={36} label="ארונות שף" /><Furn x={500} y={190} w={160} h={70} label="אי נירוסטה" />
          <Stair x={720} y={90} w={90} h={200} n={14} /><Room x={850} y={200} name="מבואה" area="18.0" small />
          <Furn x={740} y={500} w={160} h={90} label="ספא" dashed />
          <Room x={240} y={560} name="סלון – גובה כפול" area="64.5" /><Room x={250} y={260} name="פינת אוכל" area="24.8" small /><Room x={560} y={330} name="מטבח שף" area="27.6" small />
          <Room x={560} y={520} name="חדר עבודה" area="14.1" small /><Room x={820} y={460} name="ספא ביתי" area="18.0" small />
        </g>
      ) : (
        <g>
          <Bed x={120} y={110} w={150} h={170} /><Room x={200} y={320} name="סוויטת הורים" area="32.0" small />
          <Furn x={360} y={90} w={260} h={40} label="ארון הליכה" /><Room x={490} y={250} name="חדר ארונות ורחצה" area="21.4" small />
          <Bed x={700} y={110} w={120} h={150} /><Room x={790} y={300} name="יחידת אירוח" area="22.0" small />
          <Bed x={120} y={440} w={110} h={140} /><Room x={240} y={600} name="חדר ילדים" area="17.5" small />
          <Stair x={540} y={410} w={70} h={200} n={14} /><Room x={460} y={520} name="גלריה" small />
          <Bed x={650} y={440} w={100} h={130} /><Room x={700} y={600} name="חדר ילדים" area="14.0" small /><Room x={860} y={520} name="רחצה" area="7.2" small />
          <g fill="none" stroke={BP} strokeDasharray="6 4"><rect x={70} y={350} width={260} height={30} /><text x={200} y={370} fill={BP} stroke="none" textAnchor="middle" fontSize={11} fontFamily="var(--font-body)">חלל פתוח לסלון</text></g>
        </g>
      )}
      <Dim x1={60} y1={40} x2={940} y2={40} label="22.00" /><Dim x1={30} y1={70} x2={30} y2={630} label="14.00" />
      <North x={985} y={110} />
    </g>
  );
}
function Cafe() {
  const tables = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) tables.push(<Table key={r + '-' + c} cx={150 + c * 120} cy={380 + r * 90} w={50} chairs={4} round />);
  return (
    <g>
      <rect x={80} y={80} width={840} height={540} fill={PAPER} />
      <Walls segs={[[80, 80, 920, 80, 14], [920, 80, 920, 620, 14], [920, 620, 80, 620, 14], [80, 620, 80, 80, 14], [700, 80, 700, 300], [700, 360, 700, 620], [700, 460, 920, 460, 8], [800, 460, 800, 620, 6]]} />
      <Win x1={140} y1={620} x2={640} y2={620} /><Door x={640} y={620} w={50} rot={180} />
      <Furn x={460} y={120} w={200} h={60} label="בר בטון" /><Furn x={460} y={180} w={30} h={150} /><g>{Array.from({ length: 6 }).map((_, i) => <circle key={i} cx={480 + i * 32} cy={205} r={10} fill={PAPER} stroke={INK} strokeWidth={0.8} />)}</g>
      <Furn x={110} y={110} w={300} h={40} label="ספסל חלון" />
      {tables}
      <Furn x={720} y={100} w={180} h={40} label="קו הכנה" /><Furn x={720} y={160} w={50} h={120} label="קירור" />
      <Room x={300} y={250} name="אזור ישיבה" area="52.0" /><Room x={810} y={330} name="מטבח אחורי" area="16.4" small /><Room x={750} y={550} name="שירותים" small /><Room x={860} y={550} name="מחסן" small />
      <Dim x1={80} y1={50} x2={920} y2={50} label="13.44" /><Dim x1={50} y1={80} x2={50} y2={620} label="8.64" />
      <text x={390} y={660} textAnchor="middle" fontSize={12} fill={INK} fontFamily="var(--font-body)">חזית – רח׳ פלורנטין</text>
      <North x={970} y={110} />
    </g>
  );
}
function Office({ partitions, rev = 99 }: { partitions?: boolean; rev?: number }) {
  const desks = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) desks.push(<g key={r + '-' + c}><Furn x={330 + c * 62} y={330 + r * 90} w={52} h={30} r={2} /><circle cx={356 + c * 62} cy={372 + r * 90} r={7} fill={PAPER} stroke={INK} strokeWidth={0.8} /></g>);
  return (
    <g>
      <rect x={40} y={60} width={920} height={580} fill={PAPER} />
      <Walls segs={[[40, 60, 960, 60, 16], [960, 60, 960, 640, 16], [960, 640, 40, 640, 16], [40, 640, 40, 60, 16],
        [300, 60, 300, 640, 8], [300, 260, 960, 260, 6], [rev >= 2 ? 460 : 420, 60, rev >= 2 ? 460 : 420, 260, 6], [600, 60, 600, 260, 6], [740, 60, 740, 260, 6], [850, 60, 850, 260, 6], [40, 250, 300, 250, 8], [40, 430, 300, 430, 6]]} />
      <rect x={120} y={290} width={80} height={110} fill="url(#hatch)" stroke={INK} />
      <text x={160} y={420} textAnchor="middle" fontSize={10} fill={INK} fontFamily="var(--font-body)">ליבה / פיר</text>
      {!partitions ? (
        <g>
          {desks}
          {rev >= 2 ? <Table cx={170} cy={155} w={200} h={70} chairs={14} /> : <Table cx={170} cy={155} w={150} h={64} chairs={10} />}<Table cx={380} cy={160} w={100} h={50} chairs={6} />
          <Furn x={70} y={480} w={200} h={40} label="דלפק קבלה" /><Sofa x={80} y={560} w={160} h={50} />
        </g>
      ) : (
        <g stroke={BP} strokeWidth={2.5} strokeDasharray="1 0">
          <line x1={300} y1={60} x2={300} y2={640} /><line x1={460} y1={60} x2={460} y2={260} /><line x1={600} y1={60} x2={600} y2={260} />
          <g fontFamily="var(--font-mono)" fontSize={10} fill={BP} stroke="none"><text x={170} y={235} textAnchor="middle">P1 · זכוכית אקוסטית 52dB</text><text x={530} y={248} textAnchor="middle">P2 · גבס כפול</text><text x={670} y={248} textAnchor="middle">P2</text></g>
        </g>
      )}
      <Room x={170} y={110} name="חדר ישיבות ראשי" area="38.0" small /><Room x={380} y={110} name="ישיבות" area="15.6" small /><Room x={530} y={150} name="שותף" area="13.4" small /><Room x={670} y={150} name="שותף" area="13.4" small /><Room x={795} y={150} name="חדר שקט" small /><Room x={905} y={150} name="מטבחון" small />
      <Room x={630} y={600} name="אופן ספייס – 42 עמדות" area="268" small /><Room x={170} y={460} name="קבלה" area="24.0" small />
      <Dim x1={40} y1={30} x2={960} y2={30} label="36.80" /><Dim x1={15} y1={60} x2={15} y2={640} label="23.20" />
    </g>
  );
}
function KitchenDetail({ rev = 99 }: any) {
  return (
    <g>
      <rect x={60} y={60} width={880} height={600} fill={PAPER} />
      <text x={500} y={95} textAnchor="middle" fontSize={14} fontWeight={600} fill={INK} fontFamily="var(--font-body)">פריסה A – קיר ארונות</text>
      <g stroke={INK} fill={FILL}>
        <rect x={120} y={130} width={760} height={130} />
        {Array.from({ length: 8 }).map((_, i) => <line key={i} x1={120 + i * 95} y1={130} x2={120 + i * 95} y2={260} strokeWidth={1} />)}
        <rect x={120} y={330} width={760} height={18} fill="url(#hatch)" />
        <rect x={120} y={348} width={760} height={150} />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <line key={i} x1={120 + i * 95} y1={348} x2={120 + i * 95} y2={498} strokeWidth={1} />)}
        {(rev >= 2 ? [0, 1, 2] : [1]).map((i) => <line key={'d' + i} x1={120 + 95 * 3} y1={348 + 50 * (i + 1)} x2={120 + 95 * 4} y2={348 + 50 * (i + 1)} strokeWidth={0.8} />)}
        <rect x={500} y={510} width={140} height={10} fill={INK} />
      </g>
      <g stroke={INK} fill="none" strokeWidth={1}><rect x={598} y={170} width={56} height={60} rx={4} /><circle cx={626} cy={200} r={14} /></g>
      <Dim x1={120} y1={540} x2={880} y2={540} label="7.60" /><Dim x1={120} y1={570} x2={405} y2={570} label="2.85" /><Dim x1={900} y1={348} x2={900} y2={498} label="0.92" off={30} /><Dim x1={900} y1={130} x2={900} y2={260} label="1.30" off={30} />
      <g fontFamily="var(--font-mono)" fontSize={11} fill={BP}><text x={130} y={320}>משטח שיש קלקטה 20 מ״מ</text><text x={130} y={620}>חזיתות: פורניר אלון מעושן · ידיות שקועות · מגירות טריקה שקטה</text></g>
    </g>
  );
}
function Bath() {
  return (
    <g>
      <rect x={60} y={60} width={880} height={600} fill={PAPER} />
      <Walls segs={[[100, 120, 420, 120, 12], [420, 120, 420, 500, 12], [420, 500, 100, 500, 12], [100, 500, 100, 120, 12]]} />
      <Door x={100} y={400} w={60} rot={-90} />
      <Furn x={120} y={140} w={180} h={50} label="כיור כפול" /><Furn x={330} y={140} w={70} h={120} label="מקלחת" dashed /><Furn x={330} y={420} w={70} h={60} label="אסלה" />
      <Room x={240} y={330} name="רחצה הורים" area="5.4" />
      <text x={680} y={115} textAnchor="middle" fontSize={13} fontWeight={600} fill={INK} fontFamily="var(--font-body)">פריסת קיר מקלחת</text>
      <g stroke={INK} strokeWidth={0.6}>
        <rect x={500} y={130} width={360} height={360} fill="none" strokeWidth={1.4} />
        {Array.from({ length: 24 }).map((_, i) => <line key={'h' + i} x1={500} y1={130 + i * 15} x2={860} y2={130 + i * 15} />)}
        {Array.from({ length: 24 }).map((_, r) => Array.from({ length: 4 }).map((__, c) => <line key={r + '-' + c} x1={500 + c * 90 + (r % 2 ? 45 : 0)} y1={130 + r * 15} x2={500 + c * 90 + (r % 2 ? 45 : 0)} y2={145 + r * 15} />))}
        <rect x={640} y={240} width={80} height={110} fill={PAPER} strokeWidth={1.2} />
      </g>
      <text x={680} y={300} textAnchor="middle" fontSize={11} fill={INK} fontFamily="var(--font-body)">נישה</text>
      <Dim x1={500} y1={520} x2={860} y2={520} label="1.80" /><Dim x1={880} y1={130} x2={880} y2={490} label="2.40" off={26} />
      <text x={680} y={570} textAnchor="middle" fontSize={11} fill={BP} fontFamily="var(--font-mono)">אריח 7.5×30 ירוק זית · הנחה בחצי אריח</text>
    </g>
  );
}
function Section() {
  return (
    <g>
      <rect x={40} y={60} width={920} height={600} fill={PAPER} />
      <rect x={60} y={470} width={880} height={26} fill="url(#hatch)" stroke={INK} />
      <rect x={60} y={190} width={620} height={26} fill="url(#hatch)" stroke={INK} />
      <path d="M 680 216 L 940 206 L 940 190 L 680 190 Z" fill="url(#hatch)" stroke={INK} />
      <rect x={60} y={216} width={18} height={254} fill={INK} /><rect x={662} y={216} width={18} height={254} fill={INK} />
      <rect x={300} y={216} width={12} height={254} fill={INK} opacity={0.85} />
      <line x1={940} y1={150} x2={940} y2={206} stroke={INK} strokeWidth={6} /><text x={930} y={145} textAnchor="end" fontSize={11} fill={INK} fontFamily="var(--font-body)">מעקה זכוכית 1.10</text>
      <g stroke={BP} fill="none" strokeDasharray="5 4"><line x1={690} y1={180} x2={930} y2={172} /></g>
      <text x={810} y={168} textAnchor="middle" fontSize={11} fill={BP} fontFamily="var(--font-mono)">שיפוע 1.5% ← ניקוז</text>
      <Room x={180} y={350} name="סוויטת הורים" small /><Room x={490} y={350} name="מבואה" small /><Room x={810} y={260} name="מרפסת גג" small />
      <Dim x1={30} y1={216} x2={30} y2={470} label="2.85" /><Dim x1={60} y1={540} x2={680} y2={540} label="7.20" /><Dim x1={680} y1={540} x2={940} y2={540} label="3.80" />
      <g fontFamily="var(--font-mono)" fontSize={11} fill={INK}><text x={70} y={182}>+17.40 פני תקרה</text><text x={70} y={462}>+14.55 פני ריצוף</text></g>
      <text x={500} y={620} textAnchor="middle" fontSize={14} fontWeight={600} fill={INK} fontFamily="var(--font-body)">חתך A-A</text>
    </g>
  );
}
function Elevation() {
  return (
    <g>
      <rect x={60} y={60} width={880} height={600} fill={PAPER} />
      <rect x={120} y={100} width={760} height={460} fill="none" stroke={INK} strokeWidth={2} />
      <g stroke={INK} strokeWidth={0.7}>{Array.from({ length: 38 }).map((_, i) => <line key={i} x1={120 + i * 20} y1={100} x2={120 + i * 20} y2={560} />)}</g>
      <rect x={400} y={300} width={200} height={120} fill={PAPER} stroke={INK} strokeWidth={1.5} />
      <rect x={420} y={390} width={160} height={20} fill={INK} opacity={0.75} />
      <rect x={380} y={180} width={240} height={80} fill={PAPER} stroke={INK} strokeDasharray="6 4" />
      <text x={500} y={225} textAnchor="middle" fontSize={11} fill={INK} fontFamily="var(--font-body)">נישה לאמנות + תאורה שקועה</text>
      <text x={500} y={365} textAnchor="middle" fontSize={11} fill={INK} fontFamily="var(--font-body)">אח גז</text>
      <line x1={60} y1={560} x2={940} y2={560} stroke={INK} strokeWidth={3} />
      <Dim x1={120} y1={600} x2={880} y2={600} label="7.60" /><Dim x1={900} y1={100} x2={900} y2={560} label="5.80" off={26} />
      <text x={500} y={640} textAnchor="middle" fontSize={11} fill={BP} fontFamily="var(--font-mono)">חיפוי אלון אנכי ברוחב 20 ס״מ · גימור שמן מט</text>
    </g>
  );
}
function BarDetail() {
  return (
    <g>
      <rect x={60} y={60} width={880} height={600} fill={PAPER} />
      <path d="M 300 160 L 700 160 L 700 200 L 640 200 L 640 520 L 300 520 Z" fill="url(#hatch)" stroke={INK} strokeWidth={1.6} />
      <rect x={290} y={150} width={420} height={14} fill={INK} />
      <rect x={320} y={220} width={300} height={280} fill={PAPER} stroke={INK} />
      <line x1={320} y1={360} x2={620} y2={360} stroke={INK} />
      <rect x={640} y={500} width={80} height={20} fill={INK} opacity={0.6} />
      <Dim x1={290} y1={570} x2={710} y2={570} label="0.70" /><Dim x1={240} y1={150} x2={240} y2={520} label="1.10" />
      <g fontFamily="var(--font-mono)" fontSize={11} fill={BP}><text x={720} y={170}>בטון מוחלק 40 מ״מ</text><text x={720} y={300}>מדפים פנימיים</text><text x={720} y={515}>פס פלדה לרגליים</text></g>
      <text x={500} y={630} textAnchor="middle" fontSize={14} fontWeight={600} fill={INK} fontFamily="var(--font-body)">חתך בר 1:10</text>
    </g>
  );
}

export function PlanSvg({ layout, meta, className, children, style, rev = 99, svgRef, onClick, onMouseMove }: { layout: PlanLayout; meta?: any; className?: string; children?: any; style?: any; rev?: number; svgRef?: any; onClick?: any; onMouseMove?: any }) {
  if (typeof layout === 'string' && (layout as string).startsWith('live:')) return <LiveDrawing planId={(layout as string).slice(5)} rev={rev} className={className} style={style} svgRef={svgRef} onClick={onClick} onMouseMove={onMouseMove}>{children}</LiveDrawing>;
  let body: any;
  switch (layout) {
    case 'apartment': body = <Apartment rev={rev} />; break;
    case 'apartment-elec': body = <Apartment mode="elec" />; break;
    case 'apartment-ceiling': body = <Apartment mode="ceiling" />; break;
    case 'existing': body = <Existing />; break;
    case 'villa-ground': body = <Villa floor="ground" />; break;
    case 'villa-first': body = <Villa floor="first" />; break;
    case 'cafe': body = <Cafe />; break;
    case 'office': body = <Office rev={rev} />; break;
    case 'office-partitions': body = <Office partitions />; break;
    case 'kitchen-detail': body = <KitchenDetail rev={rev} />; break;
    case 'bath': body = <Bath />; break;
    case 'section': body = <Section />; break;
    case 'elevation': body = <Elevation />; break;
    case 'bar-detail': body = <BarDetail />; break;
    default: body = <Apartment />;
  }
  return (
    <svg ref={svgRef} onClick={onClick} onMouseMove={onMouseMove} viewBox="0 0 1000 720" className={className} style={{ display: 'block', width: '100%', height: 'auto', background: PAPER, ...style }} role="img" aria-label="תצוגת שרטוט (איור הדגמה)">
      <rect width="1000" height="720" fill="url(#grid)" />
      {body}
      <TitleBlock meta={meta} />
      {children}
    </svg>
  );
}

/** Thumbnail for non-renderable formats (DWG/DXF) */
export function NoPreview({ fileType, processing }: any) {
  return (
    <svg viewBox="0 0 1000 720" style={{ display: 'block', width: '100%', height: 'auto', background: 'var(--surface-2)' }} role="img" aria-label="אין תצוגה מקדימה">
      <rect width="1000" height="720" fill="url(#gridnp)" />
      <rect x={380} y={230} width={240} height={200} rx={10} fill="var(--surface)" stroke="var(--line-strong)" />
      <text x={500} y={330} textAnchor="middle" fontSize={44} fontWeight={700} fill="var(--ink-3)" fontFamily="var(--font-mono)">{fileType}</text>
      <text x={500} y={385} textAnchor="middle" fontSize={20} fill="var(--ink-3)" fontFamily="var(--font-body)">{processing === 'נכשל' ? 'העיבוד נכשל' : (globalThis as any).__AF_LIVE ? 'אין תצוגה מקדימה בדפדפן' : 'אין תצוגה מקדימה בדמו'}</text>
    </svg>
  );
}

// Patterns shared by every drawing, defined once per page (ids must be unique in the document).
export function PlanDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden focusable="false">
      <defs>
        <Hatch id="hatch" />
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke={BP} strokeWidth="0.3" opacity="0.35" /></pattern>
        <pattern id="gridnp" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--line-strong)" strokeWidth="1" /></pattern>
      </defs>
    </svg>
  );
}
