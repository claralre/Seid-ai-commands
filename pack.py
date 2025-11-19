import json, os, sys, shutil, zipfile
from pathlib import Path
import subprocess

supported_browsers = ['chrome', 'firefox']

if len(sys.argv) < 2:
    print('Informe o navegador como primeiro parâmetro.');
    exit(1) 

if not sys.argv[1] in supported_browsers:
    print('Navegadores suportados: ', supported_browsers);
    exit(1)

BROWSER = sys.argv[1]

SRC_MANIFEST = f'manifest-{BROWSER}.json'
DST_DIR = 'dist'

def minify_js(src, dst):
    print('Minify: ', src, dst)
    subprocess.run(['terser', src, '-o', dst, '--compress', '--mangle', '--toplevel'], check=True)

def pack_extension():
    # Clean output directory
    shutil.rmtree(DST_DIR, ignore_errors=True)
    os.makedirs(DST_DIR, exist_ok=True)

    # Load manifest
    files = set()
    js_files = []
    with open(SRC_MANIFEST, 'r', encoding='utf-8') as f:
        manifest = json.load(f)

        # Copy manifest
        js_files = manifest['content_scripts'][0]['js']
        manifest['content_scripts'][0]['js'] = ['scripts/all.js']
        with open(f'{DST_DIR}/manifest.json', 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)

        for key in ['background', 'content_scripts', 'web_accessible_resources']:
            if key in manifest:
                items = manifest[key]
                if isinstance(items, dict): items = [items]
                for item in items:
                    for k in ['css', 'resources']:
                        for f in item.get(k, []):
                            files.add(f)
    
        for icon_set in manifest.get('icons', {}).values():
            files.add(icon_set)

        # Concatenate all js's
        with open(f'/tmp/all.js', "w", encoding="utf-8") as outfile:
            for fname in js_files:
                with open(fname, "r", encoding="utf-8") as infile:
                    outfile.write(infile.read() + "\n")
                    
        # Copy and optionally minify files
        for fpath in files:
            src = Path(fpath)
            dst = Path(DST_DIR) / src
            print(src, dst)
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
        
        scripts_dir = f'{DST_DIR}/scripts'
        os.makedirs(scripts_dir, exist_ok=True)
        minify_js('/tmp/all.js', f'{scripts_dir}/all.js')

    # Zip it
    VERSION = manifest['version']
    ZIP_NAME = f'seid+-{BROWSER}-{VERSION}.zip'
    with zipfile.ZipFile(ZIP_NAME, 'w', zipfile.ZIP_DEFLATED) as z:
        for root, _, files in os.walk(DST_DIR):
            for file in files:
                full_path = Path(root) / file
                z.write(full_path, full_path.relative_to(DST_DIR))

if __name__ == "__main__":
    pack_extension()
