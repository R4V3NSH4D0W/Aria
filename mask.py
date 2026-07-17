import sys
try:
    from PIL import Image, ImageDraw
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image, ImageDraw

def make_transparent_rounded(img_path, out_path):
    img = Image.open(img_path).convert("RGBA")
    
    # Make a rounded corner mask
    # For a 1024x1024 image, radius of 220 gives standard iOS/macOS squircle feel
    radius = 225
    mask = Image.new("L", img.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, img.size[0], img.size[1]), radius=radius, fill=255)
    
    img.putalpha(mask)
    img.save(out_path)

make_transparent_rounded("app_icon_converted.png", "app_icon_transparent.png")
