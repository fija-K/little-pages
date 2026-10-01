import os
import numpy as np
from PIL import Image, ImageFilter, ImageOps

# Source paths
strawberry_path = r"C:\Users\fija\.gemini\antigravity\brain\c4b7f087-2eb8-45ec-ba76-0bdb0a16c37b\.user_uploaded\media_1790889987900.png"
chocolate_path = r"C:\Users\fija\.gemini\antigravity\brain\c4b7f087-2eb8-45ec-ba76-0bdb0a16c37b\.user_uploaded\media_1790890202287.png"

# Target directories
out_dir = r"C:\Users\fija\.gemini\antigravity\scratch\little-pages\public\stickers\backgrounds"
artifact_dir = r"C:\Users\fija\.gemini\antigravity\brain\c4b7f087-2eb8-45ec-ba76-0bdb0a16c37b"
os.makedirs(out_dir, exist_ok=True)

def process_strawberry(path):
    img = Image.open(path).convert("RGBA")
    arr = np.array(img, dtype=np.float32)
    r, g, b, a = arr[:,:,0], arr[:,:,1], arr[:,:,2], arr[:,:,3]
    
    # Background color is light grayish blue (~235-248, 240-252, 245-255)
    # Distance from typical top-left background pixel
    bg_color = arr[5, 5, :3]
    dist = np.sqrt(np.sum((arr[:,:,:3] - bg_color)**2, axis=2))
    
    # Threshold for background
    bg_mask = dist < 30.0
    
    # Refine mask with Floodfill to avoid removing inner pink if similar
    # Using PIL floodfill on L image
    mask_img = Image.new("L", (img.width, img.height), 0)
    for y in range(img.height):
        for x in range(img.width):
            if bg_mask[y, x]:
                mask_img.putpixel((x, y), 255)
                
    # Keep only connected component from border
    # Simple way: floodfill from (0,0) on inverse
    bg_connected = Image.new("L", (img.width, img.height), 0)
    # We can floodfill from corners
    from collections import deque
    q = deque([(0, 0), (img.width-1, 0), (0, img.height-1), (img.width-1, img.height-1)])
    visited = np.zeros((img.height, img.width), dtype=bool)
    
    while q:
        x, y = q.popleft()
        if x < 0 or x >= img.width or y < 0 or y >= img.height:
            continue
        if visited[y, x]:
            continue
        visited[y, x] = True
        
        # Check if color is close to bg_color
        p = arr[y, x, :3]
        d = np.sqrt(np.sum((p - bg_color)**2))
        if d < 32.0:
            bg_connected.putpixel((x, y), 255)
            q.append((x+1, y))
            q.append((x-1, y))
            q.append((x, y+1))
            q.append((x, y-1))
            
    # Alpha = 255 - bg_connected
    alpha = ImageOps.invert(bg_connected)
    
    # Smooth edges with slight blur on alpha
    alpha_smooth = alpha.filter(ImageFilter.GaussianBlur(radius=0.8))
    
    img.putalpha(alpha_smooth)
    
    # Crop to bounding box
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    return img

def process_chocolate(path):
    img = Image.open(path).convert("RGBA")
    
    # First crop central chocolate bar (avoiding corner partial doodles)
    # Image size check
    w, h = img.size
    # Chocolate bar is centered around [0.15*w : 0.85*w, 0.15*h : 0.85*h]
    # Let's crop padding first
    crop_box = (int(w * 0.08), int(h * 0.08), int(w * 0.92), int(h * 0.92))
    img_cropped = img.crop(crop_box)
    
    arr = np.array(img_cropped, dtype=np.float32)
    bg_color = arr[2, 2, :3]
    
    # Connected floodfill from corners
    cw, ch = img_cropped.size
    bg_connected = Image.new("L", (cw, ch), 0)
    
    from collections import deque
    q = deque([(0, 0), (cw-1, 0), (0, ch-1), (cw-1, ch-1)])
    visited = np.zeros((ch, cw), dtype=bool)
    
    while q:
        x, y = q.popleft()
        if x < 0 or x >= cw or y < 0 or y >= ch:
            continue
        if visited[y, x]:
            continue
        visited[y, x] = True
        
        p = arr[y, x, :3]
        d = np.sqrt(np.sum((p - bg_color)**2))
        # Chocolate is dark brown, background is light off-white. Distance threshold ~40 is very safe.
        if d < 45.0:
            bg_connected.putpixel((x, y), 255)
            q.append((x+1, y))
            q.append((x-1, y))
            q.append((x, y+1))
            q.append((x, y-1))
            
    alpha = ImageOps.invert(bg_connected)
    alpha_smooth = alpha.filter(ImageFilter.GaussianBlur(radius=0.8))
    
    img_cropped.putalpha(alpha_smooth)
    
    bbox = img_cropped.getbbox()
    if bbox:
        img_cropped = img_cropped.crop(bbox)
        
    return img_cropped

# Process both
straw_img = process_strawberry(strawberry_path)
choc_img = process_chocolate(chocolate_path)

# Save @2x and normal versions
straw_img.save(os.path.join(out_dir, "strawberry@2x.png"))
choc_img.save(os.path.join(out_dir, "chocolate@2x.png"))

# Normal version (~150px)
straw_normal = straw_img.resize((150, int(150 * straw_img.height / straw_img.width)), Image.Resampling.LANCZOS)
choc_normal = choc_img.resize((150, int(150 * choc_img.height / choc_img.width)), Image.Resampling.LANCZOS)

straw_normal.save(os.path.join(out_dir, "strawberry.png"))
choc_normal.save(os.path.join(out_dir, "chocolate.png"))

# Create Checkered Preview Artifact for user inspection
def make_checkered_preview(straw, choc):
    tile_size = 20
    w, h = 600, 300
    checkered = Image.new("RGBA", (w, h))
    for y in range(0, h, tile_size):
        for x in range(0, w, tile_size):
            color = (240, 240, 240, 255) if ((x // tile_size) + (y // tile_size)) % 2 == 0 else (200, 200, 200, 255)
            for ty in range(tile_size):
                for tx in range(tile_size):
                    if x + tx < w and y + ty < h:
                        checkered.putpixel((x + tx, y + ty), color)
                        
    # Paste strawberry on left half, chocolate on right half
    s_thumb = straw.resize((180, int(180 * straw.height / straw.width)), Image.Resampling.LANCZOS)
    c_thumb = choc.resize((180, int(180 * choc.height / choc.width)), Image.Resampling.LANCZOS)
    
    checkered.paste(s_thumb, (60, (h - s_thumb.height) // 2), s_thumb)
    checkered.paste(c_thumb, (360, (h - c_thumb.height) // 2), c_thumb)
    
    preview_path = os.path.join(artifact_dir, "stickers_checkered_preview.png")
    checkered.save(preview_path)
    print("Checkered preview saved to:", preview_path)

make_checkered_preview(straw_img, choc_img)
print("Sticker processing complete!")
