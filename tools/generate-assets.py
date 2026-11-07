"""Generate Perpetual Care furnishings using the documented local FLUX → TRELLIS services.
Run with /usr/bin/python3 tools/generate-assets.py. Existing outputs are retained.
"""
import base64
import concurrent.futures
import json
from pathlib import Path
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
CONCEPTS = ROOT / 'tools' / 'concepts'
MODELS = ROOT / 'assets' / 'models'
FLUX = 'http://192.168.8.163:7870'
TRELLIS = 'http://192.168.8.187:7871'
STYLE = ('One isolated object, centered on a pure white background, full object visible, '
         'three quarter front view. A beautiful chunky miniature prop for a charming hospital '
         'management video game. Mid-century British design, ivory enamel, muted sage green '
         'and warm honey wood, small terracotta details. High quality stylized 3D render, '
         'rounded edges, clean readable silhouette, no words, no person, no ground platform. ')
SUBJECTS = {
    'desk': 'A compact doctor desk, wooden top, sage green drawers, a cream CRT monitor and a little examination lamp on top.',
    'bed': 'A single hospital bed, cream metal frame, sage green blanket, thick white pillow, small caster wheels, no patient.',
    'pharmacy': 'A tall medicine dispensing cabinet, sage green lower cupboard, cream upper shelves holding colorful little medicine bottles, brass handles.',
    'scanner': 'A whimsical medical diagnostic scanner, a large cream and muted terracotta cylindrical ring with a small green patient examination platform extending in front, compact footprint.',
    'sofa': 'A small two-seat waiting room sofa, plush muted terracotta upholstery, rounded corners, short honey wood legs.',
    'plant': 'A lush small broadleaf indoor plant in a chunky warm terracotta cylindrical pot, compact rounded silhouette.',
}

def post(base, payload):
    request = urllib.request.Request(base + '/generate', json.dumps(payload).encode(), {'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=1800) as response:
        return json.load(response)

def download(base, route, target):
    with urllib.request.urlopen(base + route, timeout=120) as response:
        target.write_bytes(response.read())

def mesh(name):
    target = MODELS / (name + '.glb')
    if target.exists():
        return
    print('TRELLIS ' + name, flush=True)
    result = post(TRELLIS, {'image': base64.b64encode((CONCEPTS / (name + '.png')).read_bytes()).decode(),
                           'formats': ['glb'], 'seed': 73, 'simplify': .97, 'texture_size': 512})
    download(TRELLIS, result['files']['glb']['url'], target)
    (CONCEPTS / (name + '-trellis.json')).write_text(json.dumps(result, indent=2))
    print('SAVED ' + str(target.relative_to(ROOT)), flush=True)

if __name__ == '__main__':
    CONCEPTS.mkdir(parents=True, exist_ok=True)
    MODELS.mkdir(parents=True, exist_ok=True)
    (CONCEPTS / 'prompts.json').write_text(json.dumps({k: STYLE + v for k, v in SUBJECTS.items()}, indent=2))
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        jobs = []
        for index, (name, subject) in enumerate(SUBJECTS.items()):
            image = CONCEPTS / (name + '.png')
            if not image.exists():
                print('FLUX ' + name, flush=True)
                result = post(FLUX, {'prompt': STYLE + subject, 'width': 768, 'height': 768,
                                     'num_inference_steps': 28, 'seed': 71 + index, 'return_base64': False})
                download(FLUX, result['images'][0]['url'], image)
                (CONCEPTS / (name + '-flux.json')).write_text(json.dumps(result, indent=2))
            jobs.append(executor.submit(mesh, name))
        for job in jobs:
            job.result()
    print('All six furnishings generated.', flush=True)
