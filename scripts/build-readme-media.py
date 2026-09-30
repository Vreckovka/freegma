"""Build captioned README GIFs from unmodified editor screenshots.

Optional documentation tooling: Python 3 + Pillow. Does not run in yarn build.
Run: python scripts/build-readme-media.py
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
MEDIA = ROOT / 'docs' / 'media'
SOURCES = MEDIA / 'source'
MANIFEST = json.loads((MEDIA / 'demos.json').read_text(encoding='utf-8'))


def font(size, bold=False):
    choices = [
        Path('C:/Windows/Fonts') / ('segoeuib.ttf' if bold else 'segoeui.ttf'),
        Path('/usr/share/fonts/truetype/dejavu') / ('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf'),
    ]
    for path in choices:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default(size=size)


def captioned(frame, index, total):
    screenshot = Image.open(SOURCES / frame['file']).convert('RGB')
    canvas = Image.new('RGB', (screenshot.width, screenshot.height + 108), '#101219')
    canvas.paste(screenshot, (0, 108))
    draw = ImageDraw.Draw(canvas)
    draw.text((24, 17), frame['title'], fill='#e8eaf3', font=font(25, True))
    draw.text((24, 60), frame['detail'], fill='#afb4c5', font=font(17))
    draw.text((screenshot.width - 86, 23), f'{index + 1:02}/{total:02}', fill='#ae9bff', font=font(17, True))
    draw.rectangle((0, 103, round(screenshot.width * (index + 1) / total), 107), fill='#ae9bff')
    return canvas


for filename, sequence in MANIFEST.items():
    frames = [captioned(frame, i, len(sequence)) for i, frame in enumerate(sequence)]
    if len({f.size for f in frames}) != 1:
        raise ValueError(f'Inconsistent capture dimensions for {filename}')
    # Train on full-resolution pixels so small UI text retains its antialiasing.
    # Each frame has a local GIF palette; gradient-heavy picker frames need it.
    indexed = [f.quantize(colors=256, method=Image.Quantize.MEDIANCUT,
                         dither=Image.Dither.NONE) for f in frames]
    output = MEDIA / filename
    indexed[0].save(output, save_all=True, append_images=indexed[1:],
                    duration=[f['duration'] for f in sequence], loop=0, optimize=True, disposal=2)
    with Image.open(output) as result:
        if result.n_frames != len(sequence) or result.size != frames[0].size:
            raise ValueError(f'Invalid GIF output: {filename}')
        result.seek(result.n_frames - 1)
        result.load()
    print(f'{filename}: {len(sequence)} frames, {output.stat().st_size:,} bytes')
