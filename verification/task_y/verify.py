"""Independent PR75 terrain check. No pipeline or web imports."""
import csv,hashlib,json,math,os,subprocess,time
from pathlib import Path
import numpy as np
from numpy.lib.stride_tricks import sliding_window_view
from pyproj import Proj
from scipy.ndimage import map_coordinates
import tifffile
from source_http import RemoteTIFF
R=1737400.
TARGET=Path(os.environ.get('Y_TARGET_ROOT','target')).resolve()
OUT=Path('docs/task_y_independent');OUT.mkdir(parents=True,exist_ok=True)
HEAD='9758ecdb156eae902881634090f53e4d2ea7d8e0'
MAIN='300b8499e3ea4cadf1e9f2c36a267ba91e935aee'
SELECTED=['ARTEMIS_HAWORTH','ARTEMIS_NOBILE_RIM2','IM1']
URLS={5:'https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/87S/ldem_87s_5mpp.tif',10:'https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_83S_10MPP_ADJ.TIF',20:'https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_20MPP_ADJ.TIF'}
PROJ=Proj('+proj=stere +lat_0=-90 +lat_ts=-90 +lon_0=0 +R=1737400 +units=m')
def sha(b):return hashlib.sha256(b).hexdigest()
def read(path):return json.loads((TARGET/path).read_text())
def write(path,value):
    p=path.with_suffix('.part');p.write_text(json.dumps(value,indent=2,allow_nan=False)+'\n');p.replace(path)
def canonical(v):return json.dumps(v,sort_keys=True,separators=(',',':'),ensure_ascii=True,allow_nan=False).encode()
def original_window(site,res):
    stream=RemoteTIFF(URLS[res])
    with tifffile.TiffFile(stream) as f:
        p=f.pages[0];g=p.geotiff_tags
        assert g['GeogSemiMajorAxisGeoKey']==g['GeogSemiMinorAxisGeoKey']==R
        assert g['ProjNatOriginLatGeoKey']==-90 and g['ProjStraightVertPoleLongGeoKey']==0
        sx,sy,_=p.tags['ModelPixelScaleTag'].value
        assert sx==sy==res and g['GTRasterTypeGeoKey']==1
        i,j,_,tx,ty,_=p.tags['ModelTiepointTag'].value
        xf,yf=tx+(0.5-i)*res,ty-(0.5-j)*res
        cx,cy=PROJ(site['lon'],site['lat'])
        margin=1150+12*res
        c0=math.floor((cx-margin-xf)/res);c1=math.ceil((cx+margin-xf)/res)+1
        r0=math.floor((yf-cy-margin)/res);r1=math.ceil((yf-cy+margin)/res)+1
        if c0<0 or r0<0 or c1>p.imagewidth or r1>p.imagelength:
            return None,dict(url=URLS[res],resolution_m=res,reason='required envelope outside original raster',requested=[r0,r1,c0,c1],shape=[p.imagelength,p.imagewidth])
        h=np.full((r1-r0,c1-c0),np.nan)
        th=p.tilelength if p.is_tiled else p.rowsperstrip
        tw=p.tilewidth if p.is_tiled else p.imagewidth
        nc=(p.imagewidth+tw-1)//tw
        for rr in range(r0//th,(r1-1)//th+1):
            for cc in range(c0//tw,(c1-1)//tw+1):
                k=rr*nc+cc;stream.seek(p.dataoffsets[k])
                d=p.decode(stream.read(p.databytecounts[k]),k)[0]
                if d is None:continue
                tile=d.reshape(d.shape[1:3])
                ya,yb=max(r0,rr*th),min(r1,rr*th+tile.shape[0])
                xa,xb=max(c0,cc*tw),min(c1,cc*tw+tile.shape[1])
                h[ya-r0:yb-r0,xa-c0:xb-c0]=tile[ya-rr*th:yb-rr*th,xa-cc*tw:xb-cc*tw]
        nd=p.tags.get('GDAL_NODATA')
        if nd:h[h==float(str(nd.value).rstrip(chr(0)))]=np.nan
        evidence=dict(url=URLS[res],resolution_m=res,source_bytes=stream.length,etag=stream.etag,bounds=[r0,r1,c0,c1],registration='pixel-area, half-cell centre',raster_sha256=sha(h.astype('<f8').tobytes()),projection_geokeys=str(g),blocks=[dict(block=q.name,sha256=sha(q.read_bytes())) for q in sorted(stream.folder.glob('*.bin'))])
        return (h,xf+np.arange(c0,c1)*res,yf-np.arange(r0,r1)*res),evidence
def fits(z,res,n):
    d=(np.arange(n)-n//2)*res;xx,yy=np.meshgrid(d,-d)
    A=np.column_stack([xx.ravel(),yy.ravel(),np.ones(n*n)])
    w=sliding_window_view(np.asarray(z,dtype=float),(n,n));flat=w.reshape(-1,n*n)
    gradients=np.full((len(flat),2),np.nan);rms=np.full(len(flat),np.nan)
    for start in range(0,len(flat),1024):
        stop=min(start+1024,len(flat));b=flat[start:stop].T
        valid=np.isfinite(b).all(axis=0);v=b[:,valid]
        if not v.shape[1]:continue
        v=v-v[n*n//2]
        coef=np.linalg.lstsq(A,v,rcond=None)[0]
        gradients[start:stop][valid]=coef[:2].T
        rms[start:stop][valid]=np.sqrt(np.mean((v-A@coef)**2,axis=0))
    return gradients.reshape(w.shape[:2]+(2,)),rms.reshape(w.shape[:2])
def distances(xx,yy,site):
    lon,lat=PROJ(xx,yy,inverse=True)
    q=np.sin(np.deg2rad(lat-site['lat'])/2)**2+np.cos(np.deg2rad(lat))*np.cos(np.deg2rad(site['lat']))*np.sin(np.deg2rad(lon-site['lon'])/2)**2
    q=np.clip(q,0,1)
    return 2*R*np.arctan2(np.sqrt(q),np.sqrt(1-q))
def measure(site,res,window,thresholds):
    h,x,y=window;cx,cy=PROJ(site['lon'],site['lat'])
    grad,_=fits(h,res,3);xx,yy=np.meshgrid(x[1:-1],y[1:-1])
    k=1+(xx*xx+yy*yy)/(4*R*R)
    slope=np.rad2deg(np.arctan(np.linalg.norm(grad,axis=-1)*k*R/(R+h[1:-1,1:-1])))
    distance=distances(xx,yy,site);weights=(res/k)**2;stats={}
    for radius in [100,500,1000]:
        mask=distance<=radius;values=slope[mask];area=weights[mask]
        assert len(values)>0 and np.isfinite(values).all()
        stats[str(radius)]=dict(n=int(len(values)),median_deg=float(np.median(values)),p95_deg=float(np.percentile(values,95)),max_deg=float(max(values)),sampled_area_m2=float(sum(area)),flat_fraction={format(t,'g'):float(sum(area[values<=t])/sum(area)) for t in thresholds})
    dx,dy=np.meshgrid(np.arange(-1,2)*res,np.arange(1,-2,-1)*res)
    samples=map_coordinates(h,np.array([(y[0]-cy-dy)/res,(cx+dx-x[0])/res]),order=1,mode='constant',cval=np.nan,prefilter=False)
    assert np.isfinite(samples).all()
    A=np.column_stack([dx.ravel(),dy.ravel(),np.ones(9)])
    coef=np.linalg.lstsq(A,(samples-samples[1,1]).ravel(),rcond=None)[0]
    ks=1+(cx*cx+cy*cy)/(4*R*R)
    point=float(np.rad2deg(np.arctan(np.linalg.norm(coef[:2])*ks*R/(R+samples[1,1]))))
    n=2*math.floor(25*ks/res)+1;half=n//2
    ix=np.where(abs(x-cx)<=550*ks+half*res)[0];iy=np.where(abs(y-cy)<=550*ks+half*res)[0]
    _,rough=fits(h[iy[0]:iy[-1]+1,ix[0]:ix[-1]+1],res,n)
    rx,ry=np.meshgrid(x[ix[0]+half:ix[-1]+1-half],y[iy[0]+half:iy[-1]+1-half])
    rv=rough[distances(rx,ry,site)<=500];assert np.isfinite(rv).all()
    return dict(landing_slope_deg=point,slope_by_radius_m=stats,roughness_within_500m=dict(n=int(len(rv)),median_m=float(np.median(rv)),p95_m=float(np.percentile(rv,95))))
def controls():
    yy,xx=np.mgrid[0:13,0:13];p=12+.1*xx*5-.2*yy*5
    g,r=fits(p,5,3);assert np.allclose(g,[.1,.2],atol=1e-12) and r.max()<1e-12
    _,r=fits(p,5,11);assert r.max()<1e-12
    assert np.allclose(PROJ(0,-90),(0,0),atol=1e-8)
    x,y=PROJ(90,-89);assert x>0 and abs(y)<1e-8
    return dict(analytic_plane=True,plane_roughness=True,projection_orientation=True)
def inventory():
    sites=read('web/data/sites.json');idx=read('web/data/terrain/index.json')
    assert len(sites)==len(idx['sites'])==33
    assert set(s['id'] for s in sites)==set(e['id'] for e in idx['sites'])
    counts={}
    for site in sites:
        obj=read('web/data/terrain/'+site['id']+'.json')
        assert obj['content_sha256']==sha(canonical({k:v for k,v in obj.items() if k!='content_sha256'}))
        assert obj['lat']==site['lat'] and obj['lon']==site['lon'] and obj['thresholds_label']=='reference_only'
        path='web/data/relay/'+site['id']+'.json';relay=read(path);box=obj['relay_box'];c=relay['candidates']
        centre=[i for i,(e,n) in enumerate(zip(c['e_m'],c['n_m'])) if e==n==0]
        assert centre==[box['candidate_index']] and box['slope_deg']==c['slope_deg'][centre[0]]
        assert box['source_sha256']==sha((TARGET/path).read_bytes())==obj['inputs']['relay_sha256']
        if site['lat']>-75:
            assert obj['kind']=='coarse_relay_comparison'
            assert all(obj[k] is None for k in ['landing_slope_deg','method','slope_by_radius_m','roughness_within_500m'])
        else:
            res=str(obj['source']['resolution_m']);counts[res]=counts.get(res,0)+1
    assert counts=={'5':8,'10':7,'20':1}
    return dict(content_hashes_and_relay_centres=33,polar_resolution_counts=counts)
def run():
    start=time.time();assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=TARGET,text=True).strip()==HEAD
    summary=dict(pr=75,reviewed_sha=HEAD,main_at_start=MAIN,checker='Minchul Kim',producer='Jiyong Sung',controls=controls(),inventory=inventory(),criteria=dict(slope_deg=.5,flat_pp=1),sites=[],failures=[])
    rows=[]
    for sid in SELECTED:
        site=next(s for s in read('web/data/sites.json') if s['id']==sid)
        path='web/data/terrain/'+sid+'.json';obj=read(path);res=obj['source']['resolution_m']
        cache=OUT/(sid+'.json');key=sha(Path(__file__).read_bytes()+(TARGET/path).read_bytes())
        if cache.exists() and json.loads(cache.read_text()).get('signature')==key:result=json.loads(cache.read_text())
        else:
            diagnostics=[]
            for finer in [5,10,20]:
                window,evidence=original_window(site,finer)
                if window is None:diagnostics.append(evidence);continue
                own=measure(site,finer,window,obj['thresholds_deg'])
                assert finer==res,'Independent source selection differs'
                result=dict(id=sid,signature=key,resolution_m=res,source=evidence,finer_unavailable=diagnostics,own=own);write(cache,result);break
            else:raise ValueError('No original source '+sid)
        own=result['own']
        def compare(field,stored,value,limit,unit):
            row=dict(id=sid,resolution_m=res,field=field,stored=stored,independent=value,difference=value-stored,unit=unit,criterion=limit,passed=abs(value-stored)<=limit if limit is not None else 'diagnostic')
            rows.append(row)
            if row['passed'] is False:summary['failures'].append(row)
        compare('landing_slope_deg',obj['landing_slope_deg'],own['landing_slope_deg'],.5,'deg')
        for radius in ['100','500','1000']:
            old=obj['slope_by_radius_m'][radius];new=own['slope_by_radius_m'][radius]
            compare(radius+'.n',old['n'],new['n'],0,'centres')
            for field in ['median_deg','p95_deg','max_deg']:compare(radius+'.'+field,old[field],new[field],.5,'deg')
            for t in obj['thresholds_deg']:
                key=format(t,'g');compare(radius+'.flat_'+key,100*old['flat_fraction'][key],100*new['flat_fraction'][key],1,'pp')
        old=obj['roughness_within_500m'];new=own['roughness_within_500m']
        compare('roughness.n',old['n'],new['n'],0,'centres')
        for field in ['median_m','p95_m']:compare('roughness.'+field,old[field],new[field],None,'m')
        summary['sites'].append(dict(id=sid,resolution_m=res,source=result['source'],finer_unavailable=result['finer_unavailable']))
        print('CHECKED',sid,flush=True)
    for unit,key in [('deg','slope_deg'),('pp','flat_pp'),('m','roughness_m')]:summary['max_abs_'+key]=max(abs(r['difference']) for r in rows if r['unit']==unit)
    summary.update(complete=len(summary['sites'])==3,elapsed_s=time.time()-start,checker_sha256=sha(Path(__file__).read_bytes()),rows=len(rows))
    summary['passed']=summary['complete'] and not summary['failures']
    summary['target_product_sha256']={s['id']:sha((TARGET/('web/data/terrain/'+s['id']+'.json')).read_bytes()) for s in read('web/data/sites.json')}
    with (OUT/'comparisons.csv').open('w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
    write(OUT/'summary.json',summary)
    lines=['# Task Y independent member verification','','PR #75 pinned head: '+HEAD+'. Latest main at start: '+MAIN+'.','','Checker: Minchul Kim. Producer: Jiyong Sung. Independent multi-RHS least squares, scipy bilinear samples, PROJ/haversine masks and explicit area sums; no pipeline/web imports. Source transport is this checker\'s original task A reader, not Y producer code.','','All native sample centres in the 100/500/1000 m circles were recomputed at three sites spanning 5/10/20 m resolution. Roughness is an additional diagnostic.','','| Site | DEM m | Point slope stored / own deg | Max slope diff deg | Max flat diff pp |','|---|---:|---:|---:|---:|']
    for s in summary['sites']:
        sr=[r for r in rows if r['id']==s['id']];p=next(r for r in sr if r['field']=='landing_slope_deg')
        lines.append(f"| {s['id']} | {s['resolution_m']} | {p['stored']:.12f} / {p['independent']:.12f} | {max(abs(r['difference']) for r in sr if r['unit']=='deg'):.12g} | {max(abs(r['difference']) for r in sr if r['unit']=='pp'):.12g} |")
    lines+=['','Result: '+('PASS' if summary['passed'] else 'FAIL')+'. Slope <=0.5 deg; flat fractions <=1 percentage point. All failed rows are retained in summary.json.','','All 33 content hashes, reference labels, coordinates and relay-centre copies checked. Detailed numerical scope is three sites only; no production product changed. Original source URLs, validators, bounds, byte-block hashes, decoded-window hashes and every comparison are published.','','Limits: shared-source implementation agreement, not physical surface accuracy or safe-landing certification. 8/15 degree cutoffs remain reference values. No task criterion is invented for roughness.','','Reproduce: install numpy scipy pyproj tifffile imagecodecs requests, check out the pinned PR head into target/, then run Y_TARGET_ROOT=target python verification/task_y/verify.py from the verification branch.']
    (OUT/'report.md').write_text('\n'.join(lines)+'\n')
    print(json.dumps({k:v for k,v in summary.items() if k not in ['sites','target_product_sha256']}),flush=True)
    assert summary['passed'],'Numerical failures retained'
if __name__=='__main__':run()
