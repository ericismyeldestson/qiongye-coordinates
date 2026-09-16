"""Generate numerical fixtures using native official Swiss C, never a website replica."""
from pathlib import Path
import ctypes as C, datetime as dt, json, subprocess, sys, tempfile
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'third_party/swisseph'
FILES=['swedate.c','swehouse.c','swejpl.c','swemmoon.c','swemplan.c','sweph.c','swephlib.c']
with tempfile.TemporaryDirectory(prefix='qiongye-reference-') as folder:
    lib=Path(folder)/('swiss.dylib' if sys.platform=='darwin' else 'swiss.so')
    subprocess.run(['cc','-O2','-fPIC','-dynamiclib' if sys.platform=='darwin' else '-shared',*[str(SOURCE/f) for f in FILES],'-o',str(lib),'-lm'],check=True)
    swe=C.CDLL(str(lib));D=C.c_double;I=C.c_int;P=C.POINTER(D)
    swe.swe_set_ephe_path.argtypes=[C.c_char_p];swe.swe_set_ephe_path(str(SOURCE/'ephe').encode())
    swe.swe_calc_ut.argtypes=[D,I,I,P,C.c_char_p];swe.swe_calc_ut.restype=I
    swe.swe_houses.argtypes=[D,D,D,I,P,P];swe.swe_houses.restype=I
    dates=['1899-12-31T12:00:00Z','1900-01-01T12:00:00Z','1920-06-21T00:00:00Z','1940-11-27T15:12:00Z','1961-08-05T05:24:00Z','1980-09-12T11:00:00Z','1989-12-13T13:36:00Z','2000-01-01T12:00:00Z','2004-02-29T23:59:59Z','2026-09-15T00:00:00Z','2099-12-30T12:00:00Z','2100-01-01T12:00:00Z']
    rows=[]
    for utc in dates:
        jd=dt.datetime.fromisoformat(utc.replace('Z','+00:00')).timestamp()/86400+2440587.5
        bodies=[]
        for body in [0,1,2,3,4,5,6,7,8,9,15,11]:
            values=(D*6)();error=C.create_string_buffer(256);flag=swe.swe_calc_ut(jd,body,258,values,error)
            if flag<0 or not flag&2:raise RuntimeError(error.value)
            bodies.append({'body':body,'values':list(values)})
        places=[]
        for lat,lon in [(31.2304,121.4737),(37+47/60,-122-25/60),(-33.87,151.21),(64.1,-21.9),(80,10)]:
            for system in ['P','W']:
                cusps=(D*13)();axes=(D*10)();code=swe.swe_houses(jd,lat,lon,ord(system),cusps,axes)
                places.append({'latitude':lat,'longitude':lon,'system':system,'code':code,'cusps':list(cusps)[1:],'asc':axes[0],'mc':axes[1]})
        rows.append({'utc':utc,'jd':jd,'bodies':bodies,'places':places})
    target=ROOT/'tests/fixtures';target.mkdir(exist_ok=True)
    (target/'swiss-native.json').write_text(json.dumps({'source':'Official Swiss Ephemeris C, native build','revision':json.loads((SOURCE/'provenance.json').read_text())['revision'],'cases':rows},indent=2)+'\n')
    print('Generated',len(rows),'dates x 12 bodies,',len(rows)*10,'house cases')
