"""Generate PWA icons from namaste portrait + ensure splash assets exist."""
from pathlib import Path
from PIL import Image

assets = Path(r"C:\Users\prash\.cursor\projects\c-Users-prash-Downloads-Rural-Connect-Hub\assets")
public = Path(r"c:\Users\prash\Downloads\Rural-Connect-Hub\Rural-Connect-Hub\client\public")

src = next(assets.glob("*Best_Photo*.png"))
img = Image.open(src).convert("RGBA")
print("source", src.name, img.size)

# Square crop centered slightly toward face (upper-mid)
w, h = img.size
side = min(w, h)
left = (w - side) // 2
top = max(0, (h - side) // 2 - side // 10)  # bias up for face
top = min(top, h - side)
crop = img.crop((left, top, left + side, top + side))

# Pad for maskable safe zone (~80% content)
def make_icon(size: int, maskable: bool = False) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (10, 39, 79, 255))  # navy
    if maskable:
        content = int(size * 0.72)
        pad = (size - content) // 2
    else:
        content = size
        pad = 0
    face = crop.resize((content, content), Image.Resampling.LANCZOS)
    # circular-ish rounded look: draw on white circle plate for any icon
    plate = Image.new("RGBA", (content, content), (255, 255, 255, 255))
    plate.paste(face, (0, 0), face)
    # rounded mask
    mask = Image.new("L", (content, content), 0)
    from PIL import ImageDraw
    draw = ImageDraw.Draw(mask)
    radius = max(8, content // 8)
    draw.rounded_rectangle((0, 0, content - 1, content - 1), radius=radius, fill=255)
    rounded = Image.new("RGBA", (content, content), (0, 0, 0, 0))
    rounded.paste(plate, (0, 0))
    rounded.putalpha(mask)
    canvas.paste(rounded, (pad, pad), rounded)
    return canvas.convert("RGB")

for size, name in [(192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")]:
    out = make_icon(size, maskable=(size == 512))
    out.save(public / name, "PNG", optimize=True)
    print("wrote", name, out.size)

# favicon + maskable
make_icon(192, maskable=False).save(public / "favicon.png", "PNG", optimize=True)
make_icon(512, maskable=True).save(public / "icon-512-maskable.png", "PNG", optimize=True)
print("wrote favicon.png and icon-512-maskable.png")

# Ensure splash uses pointing minister photo fullscreen asset
minister = public / "minister.jpg"
if minister.exists():
    # Also save splash-specific copy as PNG for reliability
    m = Image.open(minister).convert("RGB")
    m.save(public / "splash-minister.jpg", "JPEG", quality=88, optimize=True)
    print("splash-minister.jpg", m.size)
else:
    print("WARNING: minister.jpg missing")
