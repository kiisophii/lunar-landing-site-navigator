"""Small fixtures for the independent verifier; never load candidate/production tiles."""
import gzip
import json
import math
from pathlib import Path
import struct
import sys
import tempfile
import unittest
from urllib.request import urlopen

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from verify_north_terrain import NorthBrowserTiles, TerrainServer, accuracy_target_pass, band_summary


class VerificationTests(unittest.TestCase):
    def test_native_north_projection_and_independent_decoder(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            candidate = root / 'candidate'
            (candidate / 'n20').mkdir(parents=True)
            lv = dict(name='n20', pole='north', lat_edge_deg=85, res_m=100, x0_m=-100,
                      y0_m=100, tile_px=2, nt=1, n=3, q_m=1, to_km=3,
                      tiles=['0_0'], url='polar_n/n20/{ty}_{tx}.bin.gz')
            (candidate / 'index.json').write_text(json.dumps(dict(pole='north', lat_edge_deg=75, levels=[lv])))
            (root / 'index.json').write_text(json.dumps(dict(grids={})))
            # Hand-encoded 3x3 height plane [0,1,2; 10,11,12; 20,21,22].
            tile = gzip.compress(struct.pack('<i9h', 0, 0, 1, 1, 10, 0, 0, 10, 0, 0))
            (candidate / 'n20/0_0.bin.gz').write_bytes(tile)
            reader = NorthBrowserTiles(90, candidate, terrain_root=root)
            latitude = math.degrees(math.pi / 2 - 2 * math.atan(50 / 3474800))
            actual = reader.sampled(lv, np.array([90, latitude, latitude, latitude]),
                                    np.array([0, 0, 90, 180]), polar=True)
            np.testing.assert_allclose(actual, [11, 16, 11.5, 6], atol=1e-8)
            self.assertEqual(NorthBrowserTiles(84, candidate, terrain_root=root).levels, [])

    def test_overlay_serves_encoded_bytes_without_content_encoding(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'candidate/n20').mkdir(parents=True)
            payload = gzip.compress(b'independent transfer fixture')
            (root / 'candidate/n20/0_0.bin.gz').write_bytes(payload)
            with TerrainServer(root / 'candidate', web_root=root, baseline_files={}) as server:
                with urlopen(server.url + '/data/hterrain/polar_n/n20/0_0.bin.gz') as response:
                    self.assertIsNone(response.headers.get('Content-Encoding'))
                    self.assertEqual(response.read(), payload)
                events = server.transfers()
                self.assertEqual(sum(row['bytes'] for row in events), len(payload))
                self.assertTrue(events[0]['terrain'])

    def test_band_summary_preserves_a_single_sun_failure(self):
        rows = [dict(band='85-90N', metrics={'1h': {'difference': dict(rms_deg=.1, sun_diff_pp=v)}})
                for v in [.2, 2.01, -.3]]
        band = band_summary(rows, '1h')['85-90N']
        self.assertFalse(band['meets_target'])
        self.assertEqual(band['n'], 3)
        self.assertEqual(band['abs_sun_pp_max'], 2.01)
        self.assertAlmostEqual(band['rms_deg_median'], .1)

    def test_accuracy_requires_all_thirty_results_and_ten_in_each_band(self):
        rows = [dict(id=f'{band}_{i}', band=band, metrics={period: {'difference': dict(rms_deg=.1, sun_diff_pp=.2)}
                for period in ('1h', '2h')}) for band in ('75-80N', '80-85N', '85-90N') for i in range(10)]
        self.assertTrue(accuracy_target_pass(rows))
        self.assertFalse(accuracy_target_pass(rows[:-1]))
        incomplete = rows[:-1] + [dict(id='failed', band='85-90N', error='Worker timeout')]
        self.assertFalse(accuracy_target_pass(incomplete))
        missing_period = rows[:-1] + [dict(id='partial', band='85-90N', metrics={'1h': rows[-1]['metrics']['1h']})]
        self.assertFalse(accuracy_target_pass(missing_period))
        wrong_band = [dict(r, band='75-80N') if i == 29 else r for i, r in enumerate(rows)]
        self.assertFalse(accuracy_target_pass(wrong_band))


if __name__ == '__main__':
    unittest.main()
