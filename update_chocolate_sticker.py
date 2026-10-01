import os
import numpy as np
from PIL import Image, ImageFilter, ImageOps
from collections import deque

new_choc_path = r"C:\Users\fija\.gemini\antigravity\brain\c4b7f087-2eb8-45ec-ba76-0bdb0a16c37b\.user_uploaded\media_1790890635880.png"
out_dir = r"C:\Users\fija\.gemini\antigravity\scratch\little-pages\public\stickers\backgrounds"
artifact_dir = r"C:\Users\fija\.gemini\antigravity\brain\c4b7f087-2eb8-45ec-ba76-0bdb0a16c37b"

def process_new_chocolate(path):
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    arr = np.array(img, dtype=np.float32)
    bg_color = arr[2, 2, :3]
    
    bg_connected = Image.new("L", (w, h), 0)
    q = deque([(0, 0), (w-1, 0), (0, h-1), (w-1, h-1)])
    visited = np.zeros((h, w), dtype=bool)
    
    while q:
        x, y = q.popleft()
        if x < 0 or x >= w or y < 0 or y >= h:
            continue
        if visited[y, x]:
            continue
        visited[y, x] = True
        
        p = arr[y, x, :3]
        d = np.sqrt(np.sum((p - bg_color)**2))
        if d < 40.0:
            bg_connected.putpixel((x, y), 255)
            q.append((x+1, y))
            q.append((x-1, y))
            q.append((x, y+1))
            q.append((x, y-1))
            
    alpha = ImageOps.invert(bg_connected)
    alpha_smooth = alpha.filter(ImageFilter.GaussianBlur(radius=0.7))
    img.putalpha(alpha_smooth)
    
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    return img

choc_img = process_new_chocolate(new_choc_path)

# Save @2x and normal versions
choc_img.save(os.path.join(out_dir, "chocolate@2x.png"))
choc_normal = choc_img.resize((150, int(150 * choc_img.height / choc_img.width)), Image.Resampling.LANCZOS)
choc_normal.save(os.path.join(out_dir, "chocolate.png"))

print("Updated chocolate sticker saved!")
