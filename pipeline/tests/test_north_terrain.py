import importlib.util
from pathlib import Path
import math
import numpy as np
import pytest


def builder():
    path=Path(__file__).parents[1]/'build_north_terrain.py'
    assert path.exists(),'North geographic tile builder is not implemented yet'
    spec=importlib.util.spec_from_file_location('north_builder',path)
    mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
    return mod


def test_native_grid_covers_edge_plus_full_geodesic_range():
    m=builder();g=m.level_geometry(-999970.,999970.,60,(33334,33334),75,200)
    assert (g['x0_m']+999970)/60==pytest.approx(round((g['x0_m']+999970)/60))
    keys=set(m.tile_keys(g));T=g['tile_px']
    lat=75-200000/m.R*180/math.pi
    rho=2*m.R*math.tan(math.pi/4-math.radians(lat)/2)
    for lon in np.linspace(-180,180,73):
        x,y=rho*math.sin(math.radians(lon)),-rho*math.cos(math.radians(lon))
        row,col=(g['y0_m']-y)/60,(x-g['x0_m'])/60
        assert f'{int(row)//T}_{int(col)//T}' in keys


def test_source_overrun_and_bad_north_parameters_rejected():
    m=builder()
    with pytest.raises(ValueError):m.level_geometry(-1000,1000,20,(100,100),75,200)
    with pytest.raises(ValueError):m.level_geometry(-999970,999970,60,(33334,33334),-75,3)


def test_codec_preserves_quantized_source_and_rejects_missing_pixels():
    m=builder();a=np.array([[-12.13,-4.01,1.99],[5.12,13.01,32.62],[35.24,38.75,42.48]])
    blob=m.encode(a,.25)
    np.testing.assert_array_equal(m.decode(blob,3,.25),np.rint(a/.25)*.25)
    a[0,0]=np.nan
    with pytest.raises(ValueError):m.encode(a,.25)


def test_resume_rejects_corrupt_encoded_tile(tmp_path):
    m=builder();p=tmp_path/'tile.bin.gz';p.write_bytes(m.encode(np.zeros((3,3)),.25))
    r={'sha256':m.sha(p),'bytes':p.stat().st_size}
    assert m.valid_tile(p,r)
    p.write_bytes(b'corrupt')
    assert not m.valid_tile(p,r)


def test_contract_rejects_wrong_north_projection_and_missing_tile(tmp_path):
    import sys, json
    sys.path.insert(0,str(Path(__file__).parents[1]))
    import check_contract as c
    d=tmp_path/'polar_n';d.mkdir()
    value=dict(pole='north',lat_edge_deg=75,projection='+proj=stere +lat_0=-90 +R=1737400',mock=False,
        levels=[dict(name='n60',pole='north',lat_edge_deg=75,res_m=60,q_m=.25,to_km=60,
                     x0_m=0,y0_m=0,tile_px=2,n=3,nt=1,tiles=['0_0'],url='polar_n/n60/{ty}_{tx}.bin.gz')])
    (d/'index.json').write_text(json.dumps(value))
    c.errors.clear();c.check_hterrain_polar(tmp_path,'north')
    assert any('projection' in x for x in c.errors)
    assert any('missing' in x for x in c.errors)
    c.errors.clear()
