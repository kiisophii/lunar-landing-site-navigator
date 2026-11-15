"""Original-byte transport from this checker's task A; no Y producer imports."""
import io, os, json, re, hashlib, time
from pathlib import Path
from urllib.parse import urlsplit
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
RAW=Path(os.environ.get('Y_RAW_ROOT','data/raw/y_independent'))
def digest(data):return hashlib.sha256(data).hexdigest()
def atomic(path,value):
    path.parent.mkdir(parents=True,exist_ok=True)
    tmp=path.with_suffix(path.suffix+'.part')
    tmp.write_text(json.dumps(value,indent=2,allow_nan=False)+'\n')
    tmp.replace(path)
class SourceSession(requests.Session):
    def send(self, request, **kwargs):
        host = urlsplit(request.url).hostname
        if host not in {'pds-geosciences.wustl.edu','pgda.gsfc.nasa.gov'}:
            raise ValueError('Blocked non-source network destination: '+str(host))
        for attempt in range(3):
            response=super().send(request, **kwargs)
            if response.status_code!=403 or host!='pgda.gsfc.nasa.gov' or attempt==2:
                return response
            # The canonical public product was independently observed returning
            # 206; allow two bounded retries for transient provider responses.
            retry_after=response.headers.get('Retry-After')
            if retry_after and (not retry_after.isdigit() or int(retry_after)>10):
                return response
            delay=int(retry_after) if retry_after else 2*(attempt+1)
            response.close()
            time.sleep(delay)


def session():
    s = SourceSession()
    s.headers.update({'Accept-Encoding': 'identity'})
    s.mount('https://', HTTPAdapter(max_retries=Retry(total=5, backoff_factor=0.5,
            status_forcelist=[429, 500, 502, 503, 504])))
    return s


class RemoteTIFF(io.RawIOBase):
    """Seekable original byte blocks; tifffile only decodes selected source segments."""
    block = 1024**2

    def __init__(self, url):
        super().__init__()
        self.url, self.position = url, 0
        self.http = session()
        with self.http.get(url, headers={'Range': 'bytes=0-0'}, stream=True, timeout=(20, 120)) as r:
            r.raise_for_status()
            m = re.fullmatch(r'bytes 0-0/(\d+)', r.headers.get('Content-Range', ''))
            if r.status_code != 206 or not m:
                raise ValueError('No range support: ' + url)
            self.length = int(m[1])
            self.etag = r.headers.get('ETag')
            meta = {'url': url, 'size': self.length, 'etag': self.etag,
                    'modified': r.headers.get('Last-Modified')}
        self.folder = RAW / 'tiff_bytes' / digest(json.dumps(meta, sort_keys=True).encode())[:24]
        atomic(self.folder / 'source.json', meta)
        self.last = (-1, b'')

    def readable(self): return True
    def seekable(self): return True
    def tell(self): return self.position

    def seek(self, offset, whence=0):
        self.position = offset + (0 if whence == 0 else self.position if whence == 1 else self.length)
        if self.position < 0:
            raise ValueError('negative seek')
        return self.position

    def read(self, n=-1):
        stop = self.length if n < 0 else min(self.length, self.position + n)
        parts = []
        while self.position < stop:
            k = self.position // self.block
            begin, end = k * self.block, min((k + 1) * self.block, self.length) - 1
            p = self.folder / f'{k}.bin'
            if self.last[0] == k:
                b = self.last[1]
            elif p.exists():
                b = p.read_bytes()
            else:
                with self.http.get(self.url, headers={'Range': f'bytes={begin}-{end}'},
                         stream=True, timeout=(20, 180)) as r:
                    r.raise_for_status()
                    if r.status_code != 206 or r.headers.get('Content-Range') != f'bytes {begin}-{end}/{self.length}':
                        raise ValueError('TIFF invalid source byte range')
                    if self.etag and r.headers.get('ETag') != self.etag:
                        raise ValueError('TIFF source changed')
                    b = r.content
                if len(b) != end - begin + 1:
                    raise ValueError('TIFF truncated range')
                tmp = p.with_suffix('.part')
                tmp.write_bytes(b)
                tmp.replace(p)
            if len(b) != end - begin + 1:
                raise ValueError('Bad cached source block')
            self.last = (k, b)
            hi = min(stop, end + 1)
            parts.append(b[self.position - begin:hi - begin])
            self.position = hi
        return b''.join(parts)


