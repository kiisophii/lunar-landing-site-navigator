// story_arc.js — the four-step story for the focused site over the analysis period:
//   1 the direct link fails → 2 a tower fixes it → 3 Korea's antenna also receives (site sees Earth AND Moon above Yeoju).
//   No orbiter/Danuri step: Danuri carries no lunar-surface relay payload.
// Numbers come from the same files as relay_panel.js / korea_panel.js (no new computation, no flat-horizon results).
import * as core from './core.js';
import { t } from './i18n.js';
import { addStrings, whenReady, translate, siteName, getFocus, fmtHours, LLSN } from './ui_shared.js';
import { relayIndex, relayMissingKind, relayFor, segmentHours, siteStationLink } from './diff_data.js';

addStrings({
  saTitle: 'The communication story for this site', saAria: 'Communication story: direct link, tower, Korea',
  sa1: '1 · Direct link to Earth', sa3: '2 · A relay tower', sa4: '3 · Korea receives too',
  sa1fail: 'Earth is hidden by terrain or libration for {x} of the period.', sa1ok: 'Earth is in view for the whole period — the direct link works here.',
  sa3txt: 'With {n} tower(s) of {h} m: link {a} → {b} of the period.', sa3none: 'No buildable tower within 10 km improves this site at {h} m.',
  sa4txt: 'Direct link to Yeoju (KDSA, 35 m) for {x} of the period ({hrs}): the site sees Earth and the Moon is ≥ 10° above Yeoju. With the 3 NASA DSN 70 m sites: {d}.',
  saPending: 'Terrain pending', saPendingTip: 'Real LOLA terrain for this site is still being computed; this step is shown only from real terrain.',
  saPeriod: 'Period', saChange: 'change in Analysis window ↓',
}, {
  saTitle: '이 착륙지의 통신 이야기', saAria: '통신 이야기: 직접 통신, 타워, 한국',
  sa1: '1 · 지구와 직접 통신', sa3: '2 · 중계 타워', sa4: '3 · 한국도 받는다',
  sa1fail: '기간의 {x} 동안 지형이나 칭동 때문에 지구가 가려진다.', sa1ok: '기간 내내 지구가 보인다 — 여기서는 직접 통신이 된다.',
  sa3txt: '{h} m 타워 {n}기: 통신 {a} → {b} (기간 대비).', sa3none: '{h} m에서는 10 km 안에 세울 수 있는 타워로 개선되지 않는다.',
  sa4txt: '기간의 {x} 동안 여주(KDSA, 35 m)와 직접 통신 가능 ({hrs}): 착륙지에서 지구가 보이고 여주에서 달이 10° 이상. NASA DSN 70 m 세 곳 합계: {d}.',
  saPending: '지형 대기 중', saPendingTip: '이 착륙지의 실제 LOLA 지형을 아직 계산 중이다. 이 단계는 실제 지형으로만 보여 준다.',
  saPeriod: '기간', saChange: '분석 기간에서 바꾸기 ↓',
});

let sec, seq = 0;
const pct = (x, d = 0) => `${(100 * x).toFixed(d)}%`;
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);
const isoDay = i => core.hourToDate(i).toISOString().slice(0, 10);
const pend = () => `<span class="tag warn" title="${t('saPendingTip')}">${t('saPending')}</span>`;

function build() {
  sec = document.getElementById('llsn-story');
  sec.dataset.i18nAria = 'saAria';
  sec.innerHTML = `<div class="panel-head"><h2><span data-i18n="saTitle"></span> — <span class="sa-site"></span></h2><a class="now-link" href="#llsn-window"><span data-i18n="saPeriod"></span> <span class="sa-period num"></span></a></div>
    <ol class="sa-steps">
      <li class="s1"><h3 data-i18n="sa1"></h3><p class="big num"></p><p class="txt"></p></li>
      <li class="s3"><h3 data-i18n="sa3"></h3><p class="big num"></p><p class="txt"></p></li>
      <li class="s4"><h3 data-i18n="sa4"></h3><p class="big num"></p><p class="txt"></p></li>
    </ol>`;
  const st = document.createElement('style');
  st.dataset.owner = 'story_arc.js';
  st.textContent = `
    #llsn-story .sa-steps { list-style: none; padding: 0; margin: .4em 0 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--gap); }
    @media (max-width: 960px) { #llsn-story .sa-steps { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 520px) { #llsn-story .sa-steps { grid-template-columns: 1fr; } }
    #llsn-story li { background: var(--surface-2); border-radius: var(--radius); padding: .7em .9em; border-top: 5px solid var(--off); position: relative; }
    #llsn-story li.s1 { border-top-color: var(--earth); } #llsn-story li.s2 { border-top-color: var(--warn); }
    #llsn-story li.s3 { border-top-color: var(--relay); } #llsn-story li.s4 { border-top-color: var(--earth); }
    #llsn-story h3 { margin: 0; font-size: .95rem; color: var(--muted); }
    #llsn-story .big { margin: .2em 0; font-size: var(--fs-big); font-weight: 700; line-height: 1.1; }
    #llsn-story .s1 .big { color: var(--earth); } #llsn-story .s2 .big { color: var(--warn); }
    #llsn-story .s3 .big { color: var(--relay); } #llsn-story .s4 .big { color: var(--earth); }
    #llsn-story .txt { margin: 0; font-size: .9rem; }
  `;
  document.head.appendChild(st);
  translate(sec);
}

async function render() {
  const my = ++seq;
  const w = LLSN().window, site = getFocus();
  const h = LLSN().relayHeight || 15;
  sec.querySelector('.sa-site').textContent = siteName(site);
  sec.querySelector('.sa-period').textContent = `${isoDay(w.i0)} → ${isoDay(w.i1)} · ${t('saChange')}`;
  const [rel, ln, idx] = await Promise.all([relayFor(site.id).catch(() => null), siteStationLink(site, w.i0, w.i1), relayIndex()]);
  if (my !== seq) return;
  const put = (cls, big, txt) => { const li = sec.querySelector('.' + cls); li.querySelector('.big').innerHTML = big; li.querySelector('.txt').innerHTML = txt; };
  // 1 + 3 from the relay timeline (real terrain only)
  if (rel) {
    const j = rel.params.heights_m.findIndex(x => Number(x) === h);
    const net = rel.networks[j];
    const s = segmentHours(net.timeline.segments, w.i0, w.i1), T = s.total || 1;
    const d = s.direct / T, a = (s.direct + s.via) / T;
    put('s1', pct(d), d >= 0.999 ? t('sa1ok') : fill(t('sa1fail'), { x: pct(1 - d) }));
    put('s3', net.towers.length ? pct(a) : '—', net.towers.length
      ? fill(t('sa3txt'), { n: net.towers.length, h, a: pct(d), b: pct(a) })
      : (rel.lander.earth_frac >= 0.9999 ? t('sa3ok') : fill(t('sa3none'), { h })));
  } else if (relayMissingKind(site, idx) === 'na' && !core.terrainPending(site) && !core.horizonMock(site)) {
    // no relay run for this site: step 1 comes straight from the period metrics (Earth centre above the terrain horizon)
    const m = w.metrics.get(site.id), d = m ? m.earth_frac : 0;
    put('s1', pct(d), d >= 0.999 ? t('sa1ok') : fill(t('sa1fail'), { x: pct(1 - d) }));
    put('s3', `<span class="tag" title="${t('saNotAvailTip')}">${t('saNotAvail')}</span>`, t('rlNotAvail'));
  } else {
    put('s1', pend(), t('saPendingTip')); put('s3', pend(), t('saPendingTip'));
  }
  // 3 Korea: direct link site -> Yeoju (real terrain only)
  if (ln.pending) put('s4', pend(), t('saPendingTip'));
  else {
    const H = ln.hours || 1;
    put('s4', pct(ln.kdsa / H), fill(t('sa4txt'), { x: pct(ln.kdsa / H), hrs: fmtHours(ln.kdsa), d: pct(ln.dsn / H) }));
  }
}

whenReady(() => {
  build();
  render();
  for (const ev of ['llsn:focus', 'llsn:window', 'llsn:relayheight']) window.addEventListener(ev, () => render());
  window.addEventListener('llsn:lang', () => { translate(sec); render(); });
});
