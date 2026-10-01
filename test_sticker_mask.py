import os
import cv2
import numpy as np
import json
from PIL import Image

INPUT_SHEETS = [
    {
        "id": "cute-doodles",
        "title": "Cute Doodles",
        "path": "C:/Users/fija/.gemini/antigravity/brain/c4b7f087-2eb8-45ec-ba76-0bdb0a16c37b/.user_uploaded/media_1790884911328.png",
        "ignore_top": 0.12,
        "merge_dist": 28
    },
    {
        "id": "cat-doodles-1",
        "title": "Cat Doodles 1",
        "path": "C:/Users/fija/.gemini/antigravity/brain/c4b7f087-2eb8-45ec-ba76-0bdb0a16c37b/.user_uploaded/media_1790884888919.png",
        "ignore_top": 0.0,
        "merge_dist": 35
    },
    {
        "id": "gojo-stickers",
        "title": "Gojo Stickers",
        "path": "C:/Users/fija/.gemini/antigravity/brain/c4b7f087-2eb8-45ec-ba76-0bdb0a16c37b/.user_uploaded/media_1790884894403.png",
        "ignore_top": 0.0,
        "merge_dist": 25
    },
    {
        "id": "anime-heads",
        "title": "Anime Heads",
        "path": "C:/Users/fija/.gemini/antigravity/brain/c4b7f087-2eb8-45ec-ba76-0bdb0a16c37b/.user_uploaded/media_1790884900368.png",
        "ignore_top": 0.0,
        "merge_dist": 30
    },
    {
        "id": "cat-doodles-2",
        "title": "Cat Doodles 2",
        "path": "C:/Users/fija/.gemini/antigravity/brain/c4b7f087-2eb8-45ec-ba76-0bdb0a16c37b/.user_uploaded/media_1790884905853.png",
        "ignore_top": 0.0,
        "merge_dist": 30
    },
    {
        "id": "flork-memes",
        "title": "Flork Memes",
        "path": "C:/Users/fija/.gemini/antigravity/brain/c4b7f087-2eb8-45ec-ba76-0bdb0a16c37b/.user_uploaded/media_1790884926131.png",
        "ignore_top": 0.0,
        "merge_dist": 35
    },
    {
        "id": "pink-pixel",
        "title": "Pink Pixel Art",
        "path": "C:/Users/fija/.gemini/antigravity/brain/c4b7f087-2eb8-45ec-ba76-0bdb0a16c37b/.user_uploaded/media_1790884931303.jpg",
        "ignore_top": 0.0,
        "merge_dist": 18
    },
    {
        "id": "red-pixel",
        "title": "Red Pixel Art",
        "path": "C:/Users/fija/.gemini/antigravity/brain/c4b7f087-2eb8-45ec-ba76-0bdb0a16c37b/.user_uploaded/media_1790884940611.jpg",
        "ignore_top": 0.0,
        "merge_dist": 18
    }
]

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "public", "stickers")
REJECTED_DIR = os.path.join(OUTPUT_DIR, "_rejected")

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(REJECTED_DIR, exist_ok=True)

def find_outer_background_mask(img_bgr):
    """
    Uses floodFill from outer image borders to identify ONLY the external sheet background.
    Everything else (including interior white faces, cloud bodies, cups) is preserved!
    """
    h, w = img_bgr.shape[:2]
    
    # Convert to grayscale / lab for color diff
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    
    # Outer floodfill mask needs h+2, w+2
    ff_mask = np.zeros((h + 2, w + 2), np.uint8)
    
    # Sample background color from image corners
    corner_colors = [img_bgr[0,0], img_bgr[0, w-1], img_bgr[h-1, 0], img_bgr[h-1, w-1]]
    bg_color = np.median(corner_colors, axis=0).astype(np.uint8)
    
    # Floodfill from edges
    lo_diff = (18, 18, 18)
    up_diff = (18, 18, 18)
    
    # Seed points along outer border
    seed_points = []
    step = 10
    for x in range(0, w, step):
        seed_points.append((x, 0))
        seed_points.append((x, h - 1))
    for y in range(0, h, step):
        seed_points.append((0, y))
        seed_points.append((w - 1, y))
        
    for sx, sy in seed_points:
        if ff_mask[sy + 1, sx + 1] == 0:
            # Check color closeness to bg_color
            diff = np.linalg.norm(img_bgr[sy, sx].astype(float) - bg_color.astype(float))
            if diff < 45:
                cv2.floodFill(img_bgr.copy(), ff_mask, (sx, sy), (255, 255, 255), lo_diff, up_diff, 8 | (255 << 8) | cv2.FLOODFILL_MASK_ONLY)

    # Outer background is where ff_mask == 255
    outer_bg = (ff_mask[1:h+1, 1:w+1] == 255)
    
    # Content mask (true sticker cutout) is the inverse!
    content_mask = (~outer_bg).astype(np.uint8) * 255
    
    # Fill small internal pinhole gaps in the content mask
    cnts, _ = cv2.findContours(content_mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    for c in cnts:
        cv2.drawContours(content_mask, [c], -1, 255, -1)
        
    return outer_bg, content_mask

def merge_bounding_boxes(boxes, max_dist=30):
    if not boxes:
        return []
    
    changed = True
    current = list(boxes)
    
    while changed:
        changed = False
        new_boxes = []
        visited = [False] * len(current)
        
        for i in range(len(current)):
            if visited[i]:
                continue
            x1, y1, w1, h1 = current[i]
            
            for j in range(i + 1, len(current)):
                if visited[j]:
                    continue
                x2, y2, w2, h2 = current[j]
                
                # Check spatial distance
                dx = max(0, max(x1, x2) - min(x1 + w1, x2 + w2))
                dy = max(0, max(y1, y2) - min(y1 + h1, y2 + h2))
                
                if dx <= max_dist and dy <= max_dist:
                    nx1 = min(x1, x2)
                    ny1 = min(y1, y2)
                    nx2 = max(x1 + w1, x2 + w2)
                    ny2 = max(y1 + h1, y2 + h2)
                    x1, y1, w1, h1 = nx1, ny1, nx2 - nx1, ny2 - ny1
                    visited[j] = True
                    changed = True
                    
            visited[i] = True
            new_boxes.append((x1, y1, w1, h1))
            
        current = new_boxes
        
    return current

def create_sticker_cutout(crop_bgr, add_white_border=False):
    """
    Creates RGBA transparent cutout where ONLY outer background is transparent,
    and interior white areas (faces, clouds, cups) remain 100% opaque white!
    Optionally adds a clean 3px white border and soft drop shadow.
    """
    h, w = crop_bgr.shape[:2]
    
    # Flood fill outer background starting from border
    ff_mask = np.zeros((h + 2, w + 2), np.uint8)
    
    # Corner color
    corner = crop_bgr[0,0]
    lo_diff = (20, 20, 20)
    up_diff = (20, 20, 20)
    
    # Floodfill from edges
    for x in range(0, w, 5):
        if ff_mask[1, x + 1] == 0:
            cv2.floodFill(crop_bgr.copy(), ff_mask, (x, 0), 255, lo_diff, up_diff, 8 | (255 << 8) | cv2.FLOODFILL_MASK_ONLY)
        if ff_mask[h, x + 1] == 0:
            cv2.floodFill(crop_bgr.copy(), ff_mask, (x, h - 1), 255, lo_diff, up_diff, 8 | (255 << 8) | cv2.FLOODFILL_MASK_ONLY)
    for y in range(0, h, 5):
        if ff_mask[y + 1, 1] == 0:
            cv2.floodFill(crop_bgr.copy(), ff_mask, (0, y), 255, lo_diff, up_diff, 8 | (255 << 8) | cv2.FLOODFILL_MASK_ONLY)
        if ff_mask[y + 1, w] == 0:
            cv2.floodFill(crop_bgr.copy(), ff_mask, (w - 1, y), 255, lo_diff, up_diff, 8 | (255 << 8) | cv2.FLOODFILL_MASK_ONLY)
            
    outer_bg = (ff_mask[1:h+1, 1:w+1] == 255)
    
    # Alpha mask: 255 where NOT outer background, 0 where outer background
    alpha = (~outer_bg).astype(np.uint8) * 255
    
    # Fill internal holes inside doodle
    contours, _ = cv2.findContours(alpha, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    filled_alpha = np.zeros_like(alpha)
    cv2.drawContours(filled_alpha, contours, -1, 255, -1)
    
    # Smooth edges with 3x3 gaussian blur for soft alpha anti-aliasing
    soft_alpha = cv2.GaussianBlur(filled_alpha, (3, 3), 0)
    
    img_rgba = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2BGRA)
    img_rgba[:, :, 3] = soft_alpha
    
    if add_white_border:
        # Create white dilated border
        border_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        border_mask = cv2.dilate(filled_alpha, border_kernel, iterations=1)
        
        # New padded image size
        pad = 6
        padded = np.zeros((h + pad*2, w + pad*2, 4), dtype=np.uint8)
        
        # Fill dilated mask with solid white
        padded[:, :, 0] = 255
        padded[:, :, 1] = 255
        padded[:, :, 2] = 255
        padded[pad:h+pad, pad:w+pad, 3] = cv2.GaussianBlur(border_mask, (3, 3), 0)
        
        # Overlay original image on top of white border
        alpha_factor = (img_rgba[:, :, 3] / 255.0)[:, :, np.newaxis]
        padded[pad:h+pad, pad:w+pad, :3] = (img_rgba[:, :, :3] * alpha_factor + padded[pad:h+pad, pad:w+pad, :3] * (1 - alpha_factor)).astype(np.uint8)
        padded[pad:h+pad, pad:w+pad, 3] = np.maximum(padded[pad:h+pad, pad:w+pad, 3], img_rgba[:, :, 3])
        return padded

    return img_rgba

def process_all_sheets():
    manifest = []
    
    for sheet in INPUT_SHEETS:
        sheet_id = sheet["id"]
        sheet_title = sheet["title"]
        img_path = sheet["path"]
        ignore_top = sheet.get("ignore_top", 0.0)
        merge_dist = sheet.get("merge_dist", 25)
        
        if not os.path.exists(img_path):
            print(f"Skipping missing sheet: {img_path}")
            continue
            
        img_bgr = cv2.imread(img_path)
        if img_bgr is None:
            continue
            
        h, w = img_bgr.shape[:2]
        
        # Get content mask using outer floodfill
        _, content_mask = find_outer_background_mask(img_bgr)
        
        if ignore_top > 0:
            content_mask[:int(h * ignore_top), :] = 0
            
        # Detect individual ink stroke contours
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        
        # Dark lines / ink pixels
        _, ink_mask = cv2.threshold(gray, 225, 255, cv2.THRESH_BINARY_INV)
        if ignore_top > 0:
            ink_mask[:int(h * ignore_top), :] = 0
            
        # Morphological closing to group strokes
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        ink_closed = cv2.morphologyEx(ink_mask, cv2.MORPH_CLOSE, kernel)
        
        contours, _ = cv2.findContours(ink_closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        raw_boxes = []
        for c in contours:
            bx, by, bw, bh = cv2.boundingRect(c)
            area = bw * bh
            if bw < 10 or bh < 10 or area < 80:
                continue
            if ignore_top > 0 and by < h * 0.15 and bw > w * 0.4:
                continue
            raw_boxes.append((bx, by, bw, bh))
            
        merged_boxes = merge_bounding_boxes(raw_boxes, max_dist=merge_dist)
        
        # Filter out any tiny remaining noise boxes
        merged_boxes = [b for b in merged_boxes if b[2] >= 20 and b[3] >= 20]
        
        # Sort in reading order (rows top-to-bottom, left-to-right)
        merged_boxes.sort(key=lambda b: (b[1] // 100, b[0]))
        
        cat_dir = os.path.join(OUTPUT_DIR, sheet_id)
        os.makedirs(cat_dir, exist_ok=True)
        
        annotated = img_bgr.copy()
        sheet_doodles = []
        suspicious_count = 0
        
        for idx, (bx, by, bw, bh) in enumerate(merged_boxes, 1):
            pad = 10
            x1 = max(0, bx - pad)
            y1 = max(0, by - pad)
            x2 = min(w, bx + bw + pad)
            y2 = min(h, by + bh + pad)
            
            crop_bgr = img_bgr[y1:y2, x1:x2].copy()
            
            # Create true sticker cutout (outer transparent background, inner faces/bodies 100% white opaque)
            cutout_rgba = create_sticker_cutout(crop_bgr, add_white_border=False)
            
            filename = f"doodle_{idx:02d}.png"
            filepath = os.path.join(cat_dir, filename)
            cv2.imwrite(filepath, cutout_rgba)
            
            # Also save optional white border version
            cutout_border = create_sticker_cutout(crop_bgr, add_white_border=True)
            filepath_border = os.path.join(cat_dir, f"doodle_{idx:02d}_border.png")
            cv2.imwrite(filepath_border, cutout_border)
            
            # Suspicious checks
            is_suspicious = False
            suspicious_reason = ""
            if bw < 30 or bh < 30:
                is_suspicious = True
                suspicious_reason = "Very small component"
            elif bw > w * 0.5 or bh > h * 0.5:
                is_suspicious = True
                suspicious_reason = "Very large component"
            elif bw / float(bh) > 3.2 or bh / float(bw) > 3.2:
                is_suspicious = True
                suspicious_reason = "Elongated ratio"
                
            if is_suspicious:
                suspicious_count += 1
                
            sheet_doodles.append({
                "id": f"{sheet_id}_{idx}",
                "filename": filename,
                "filename_border": f"doodle_{idx:02d}_border.png",
                "path": f"stickers/{sheet_id}/{filename}",
                "path_border": f"stickers/{sheet_id}/doodle_{idx:02d}_border.png",
                "width": x2 - x1,
                "height": y2 - y1,
                "box": [bx, by, bw, bh],
                "is_suspicious": is_suspicious,
                "suspicious_reason": suspicious_reason
            })
            
            # Draw box on annotated sheet
            box_color = (0, 0, 255) if is_suspicious else (0, 200, 0)
            cv2.rectangle(annotated, (bx, by), (bx + bw, by + bh), box_color, 2)
            cv2.rectangle(annotated, (bx, by - 22), (bx + 28, by), box_color, -1)
            cv2.putText(annotated, str(idx), (bx + 4, by - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
            
        annotated_path = os.path.join(OUTPUT_DIR, f"{sheet_id}_annotated.png")
        cv2.imwrite(annotated_path, annotated)
        
        manifest.append({
            "id": sheet_id,
            "title": sheet_title,
            "annotated_image": f"stickers/{sheet_id}_annotated.png",
            "total_count": len(sheet_doodles),
            "suspicious_count": suspicious_count,
            "doodles": sheet_doodles
        })
        
        print(f"[{sheet_title}] Extracted {len(sheet_doodles)} true sticker cutouts ({suspicious_count} suspicious).")
        
    manifest_path = os.path.join(OUTPUT_DIR, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
        
    print(f"\nManifest successfully updated at {manifest_path}")

if __name__ == "__main__":
    process_all_sheets()
