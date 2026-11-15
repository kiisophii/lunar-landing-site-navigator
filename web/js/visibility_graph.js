// Geometry-only visibility strips. Each sample occupies its hourly bin.
import { t } from './i18n.js';
import { addStrings } from './ui_shared.js';
import { hourBits } from './values.js';
addStrings({visSun:'Sunlit',visEarth:'Earth in view',visBlocked:'Earth hidden by terrain',visGeometry:'These bars show visibility, not power or communication performance.',visStation:'The bars above show total hours: the first is Earth in view from the site; station bars also require the Moon ≥ 10° above that station’s horizon. The separate strip below reads left to right through the selected period; gray hatching marks Earth hidden by terrain.',visRelay:'Blue marks Earth directly in view; green marks added visibility through the modeled tower. Gray hatching below marks Earth hidden by terrain at the site, even when a tower provides another line of sight.'},{visSun:'햇빛 있음',visEarth:'지구 보임',visBlocked:'지구가 지형에 가려짐',visGeometry:'가시 여부를 보여 주며, 발전량이나 통신 성능을 뜻하지 않습니다.',visStation:'위 막대는 시간 합계입니다. 첫 막대는 착륙지에서 지구가 보이는 시간이고, 지상국 막대는 그곳에서 달 고도도 10° 이상인 시간입니다. 별도 띠는 선택 기간을 왼쪽부터 시간순으로 보여 줍니다. 회색 빗금은 지형에 지구가 가려진 때입니다.',visRelay:'파랑은 지구가 직접 보이는 시간, 초록은 계산된 중계탑을 통해 가시선이 추가되는 시간입니다. 아래 회색 빗금은 중계탑의 가시선과 별개로 착륙지 지형이 지구를 가린 시간입니다.'});
let seq=0;
export function visibilityRows(bits, rows, {x=28,y=0,width=326,height=8,gap=6}={}) {
  const id=`vis-${++seq}`;
  const pattern=(name,color)=>`<pattern id="${id}-${name}" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M-1 1 1-1M0 5 5 0M4 6 6 4" stroke="${color}" stroke-width="1.5"/></pattern>`;
  let svg=`<defs>${pattern('earth','var(--earth)')}${pattern('blocked','#999')}</defs>`;
  rows.forEach((row,j)=>{
    const yy=y+j*(height+gap);svg+=`<g data-visibility="${row.key}"><rect x="${x}" y="${yy}" width="${width}" height="${height}" fill="var(--surface-2)"/>`;
    let start=-1;
    for(let k=0;k<=bits.length;k++){
      const on=k<bits.length&&row.on(bits[k],k);
      if(on&&start<0)start=k;
      if(!on&&start>=0){svg+=`<rect data-start="${start}" data-len="${k-start}" x="${x+start/bits.length*width}" y="${yy}" width="${(k-start)/bits.length*width}" height="${height}" fill="${row.key==='sun'?'var(--sun)':`url(#${id}-${row.key==='blocked'?'blocked':'earth'})`}"/>`;start=-1;}
    }
    svg+='</g>';
  });
  return svg;
}
export function blockedStrip(site,w) {
  const bits=hourBits(site,w.i0,w.i1);if(!bits)return '';
  return `<svg class="geometry-strip" viewBox="0 0 600 12" preserveAspectRatio="none" role="img" aria-label="${t('visBlocked')}">${visibilityRows(bits,[{key:'blocked',on:b=>!(b&2)}],{x:0,y:0,width:600,height:12})}</svg><div class="geometry-legend"><i class="blocked-swatch"></i>${t('visBlocked')}</div>`;
}
