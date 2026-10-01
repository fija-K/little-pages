import os
import cv2
import numpy as np
import json

INPUT_SHEETS = [
    {
        "id": "cute-doodles",
        "title": "Cute Doodles",
        "path": "C:/Users/fija/.gemini/antigravity/brain/c4b7f087-2eb8-45ec-ba76-0bdb0a16c37b/.user_uploaded/media_1790884911328.png",
        "ignore_top": 0.12,
        "thresh": 210,
        "merge_dist": 20,
        "min_w": 18,
        "min_h": 18,
        "mode": "gray"
    },
    {
        "id": "cat-doodles-1",
        "title": "Cat Doodles 1",
        "path": "C:/Users/fija/.gemini/antigravity/brain/c4b7f087-2eb8-45ec-ba76-0bdb0a16c37b/.user_uploaded/media_1790884888919.png",
        "ignore_top": 0.0,
        "thresh": 210,
        "merge_dist": 12,
        "min_w": 25,
        "min_h": 25,
        "mode": "gray"
    },
    {
        "id": "gojo-stickers",
        "title": "Gojo Stickers",
        "path": "C:/Users/fija/.gemini/antigravity/brain/c4b7f087-2eb8-45ec-ba76-0bdb0a16c37b/.user_uploaded/media_1790884894403.png",
        "ignore_top": 0.0,
        "thresh": 210,
        "merge_dist": 12,
        "min_w": 25,
        "min_h": 25,
        "mode": "gray"
    },
    {
        "id": "anime-heads",
        "title": "Anime Heads",
        "path": "C:/Users/fija/.gemini/antigravity/brain/c4b7f087-2eb8-45ec-ba76-0bdb0a16c37b/.user_uploaded/media_1790884900368.png",
        "ignore_top": 0.0,
        "thresh": 210,
        "merge_dist": 12,
        "min_w": 30,
        "min_h": 30,
        "mode": "gray"
    },
    {
        "id": "cat-doodles-2",
        "title": "Cat Doodles 2",
        "path": "C:/Users/fija/.gemini/antigravity/brain/c4b7f087-2eb8-45ec-ba76-0bdb0a16c37b/.user_uploaded/media_1790884905853.png",
        "ignore_top": 0.0,
        "thresh": 210,
        "merge_dist": 12,
        "min_w": 25,
        "min_h": 25,
        "mode": "gray"
    },
    {
        "id": "flork-memes",
        "title": "Flork Memes",
        "path": "C:/Users/fija/.gemini/antigravity/brain/c4b7f087-2eb8-45ec-ba76-0bdb0a16c37b/.user_uploaded/media_1790884926131.png",
        "ignore_top": 0.0,
        "thresh": 210,
        "merge_dist": 25,
        "min_w": 30,
        "min_h": 30,
        "mode": "gray"
    },
    {
        "id": "pink-pixel",
        "title": "Pink Pixel Art",
        "path": "C:/Users/fija/.gemini/antigravity/brain/c4b7f087-2eb8-45ec-ba76-0bdb0a16c37b/.user_uploaded/media_1790884931303.jpg",
        "ignore_top": 0.0,
        "thresh": 0,
        "merge_dist": 8,
        "min_w": 16,
        "min_h": 16,
        "mode": "hsv_saturation"
    },
    {
        "id": "red-pixel",
        "title": "Red Pixel Art",
        "path": "C:/Users/fija/.gemini/antigravity/brain/c4b7f087-2eb8-45ec-ba76-0bdb0a16c37b/.user_uploaded/media_1790884940611.jpg",
        "ignore_top": 0.0,
        "thresh": 0,
        "merge_dist": 8,
        "min_w": 16,
        "min_h": 16,
        "mode": "hsv_saturation"
    }
]

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
OUTPUT_DIR = os.path.join(PUBLIC_DIR, "stickers")

os.makedirs(OUTPUT_DIR, exist_ok=True)

def merge_bounding_boxes(boxes, max_dist=20):
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

def create_true_sticker_cutout(crop_bgr, add_white_border=False):
    """
    Flood-fills ONLY the outer sheet background from crop borders so white areas
    INSIDE the doodle (bunny face, cloud body, cat fur, flower petals, cup) STAY 100% WHITE & OPAQUE!
    """
    h, w = crop_bgr.shape[:2]
    
    # Outer flood fill mask (size h+2, w+2)
    ff_mask = np.zeros((h + 2, w + 2), np.uint8)
    
    lo_diff = (24, 24, 24)
    up_diff = (24, 24, 24)
    
    # Flood-fill from outer edges
    step = 4
    for x in range(0, w, step):
        if ff_mask[1, x + 1] == 0:
            cv2.floodFill(crop_bgr.copy(), ff_mask, (x, 0), 255, lo_diff, up_diff, 8 | (255 << 8) | cv2.FLOODFILL_MASK_ONLY)
        if ff_mask[h, x + 1] == 0:
            cv2.floodFill(crop_bgr.copy(), ff_mask, (x, h - 1), 255, lo_diff, up_diff, 8 | (255 << 8) | cv2.FLOODFILL_MASK_ONLY)
    for y in range(0, h, step):
        if ff_mask[y + 1, 1] == 0:
            cv2.floodFill(crop_bgr.copy(), ff_mask, (0, y), 255, lo_diff, up_diff, 8 | (255 << 8) | cv2.FLOODFILL_MASK_ONLY)
        if ff_mask[y + 1, w] == 0:
            cv2.floodFill(crop_bgr.copy(), ff_mask, (w - 1, y), 255, lo_diff, up_diff, 8 | (255 << 8) | cv2.FLOODFILL_MASK_ONLY)
            
    outer_bg = (ff_mask[1:h+1, 1:w+1] == 255)
    
    # Alpha mask: 255 for doodle content (including white faces/bodies), 0 for outer background
    alpha = (~outer_bg).astype(np.uint8) * 255
    
    # Fill any interior holes in doodle mask
    contours, _ = cv2.findContours(alpha, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    filled_alpha = np.zeros_like(alpha)
    cv2.drawContours(filled_alpha, contours, -1, 255, -1)
    
    # Smooth edges with Gaussian blur for soft anti-aliased alpha
    soft_alpha = cv2.GaussianBlur(filled_alpha, (3, 3), 0)
    
    img_rgba = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2BGRA)
    img_rgba[:, :, 3] = soft_alpha
    
    if add_white_border:
        # Create crisp 3-4px white outer sticker border
        border_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        border_mask = cv2.dilate(filled_alpha, border_kernel, iterations=1)
        
        pad = 6
        padded = np.zeros((h + pad*2, w + pad*2, 4), dtype=np.uint8)
        
        # Solid white background under dilated mask
        padded[:, :, 0] = 255
        padded[:, :, 1] = 255
        padded[:, :, 2] = 255
        padded[pad:h+pad, pad:w+pad, 3] = cv2.GaussianBlur(border_mask, (3, 3), 0)
        
        # Overlay original doodle on top
        alpha_factor = (img_rgba[:, :, 3] / 255.0)[:, :, np.newaxis]
        padded[pad:h+pad, pad:w+pad, :3] = (img_rgba[:, :, :3] * alpha_factor + padded[pad:h+pad, pad:w+pad, :3] * (1 - alpha_factor)).astype(np.uint8)
        padded[pad:h+pad, pad:w+pad, 3] = np.maximum(padded[pad:h+pad, pad:w+pad, 3], img_rgba[:, :, 3])
        return padded

    return img_rgba

def process_sheets():
    manifest = []
    
    for sheet in INPUT_SHEETS:
        sheet_id = sheet["id"]
        sheet_title = sheet["title"]
        img_path = sheet["path"]
        ignore_top = sheet.get("ignore_top", 0.0)
        thresh_val = sheet.get("thresh", 210)
        merge_dist = sheet.get("merge_dist", 15)
        min_w = sheet.get("min_w", 20)
        min_h = sheet.get("min_h", 20)
        mode = sheet.get("mode", "gray")
        
        if not os.path.exists(img_path):
            print(f"Skipping missing sheet: {img_path}")
            continue
            
        img_bgr = cv2.imread(img_path)
        if img_bgr is None:
            continue
            
        h, w = img_bgr.shape[:2]
        
        if mode == "hsv_saturation":
            hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
            binary = cv2.inRange(hsv, (0, 25, 25), (180, 255, 255))
        else:
            gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
            _, binary = cv2.threshold(gray, thresh_val, 255, cv2.THRESH_BINARY_INV)
        
        if ignore_top > 0:
            binary[:int(h * ignore_top), :] = 0
            
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        closed = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        
        contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        raw_boxes = []
        for c in contours:
            bx, by, bw, bh = cv2.boundingRect(c)
            if bw < min_w or bh < min_h:
                continue
            if ignore_top > 0 and by < h * 0.15 and bw > w * 0.4:
                continue
            raw_boxes.append((bx, by, bw, bh))
            
        merged_boxes = merge_bounding_boxes(raw_boxes, max_dist=merge_dist)
        merged_boxes = [b for b in merged_boxes if b[2] >= min_w and b[3] >= min_h]
        
        # Sort in reading order
        merged_boxes.sort(key=lambda b: (b[1] // 85, b[0]))
        
        cat_dir = os.path.join(OUTPUT_DIR, sheet_id)
        os.makedirs(cat_dir, exist_ok=True)
        
        annotated = img_bgr.copy()
        sheet_doodles = []
        suspicious_count = 0
        
        for idx, (bx, by, bw, bh) in enumerate(merged_boxes, 1):
            pad = 8
            x1 = max(0, bx - pad)
            y1 = max(0, by - pad)
            x2 = min(w, bx + bw + pad)
            y2 = min(h, by + bh + pad)
            
            crop_bgr = img_bgr[y1:y2, x1:x2].copy()
            
            # 1. Soft Alpha Cutout (Inner white preserved!)
            cutout_rgba = create_true_sticker_cutout(crop_bgr, add_white_border=False)
            filename = f"doodle_{idx:02d}.png"
            filepath = os.path.join(cat_dir, filename)
            cv2.imwrite(filepath, cutout_rgba)
            
            # 2. White Border Sticker Version
            cutout_border = create_true_sticker_cutout(crop_bgr, add_white_border=True)
            filename_border = f"doodle_{idx:02d}_border.png"
            filepath_border = os.path.join(cat_dir, filename_border)
            cv2.imwrite(filepath_border, cutout_border)
            
            # Suspicious check
            is_suspicious = False
            suspicious_reason = ""
            if bw < 25 or bh < 25:
                is_suspicious = True
                suspicious_reason = "Very small component"
            elif bw > w * 0.45 or bh > h * 0.45:
                is_suspicious = True
                suspicious_reason = "Very large component"
            elif bw / float(bh) > 3.5 or bh / float(bw) > 3.5:
                is_suspicious = True
                suspicious_reason = "Elongated ratio"
                
            if is_suspicious:
                suspicious_count += 1
                
            sheet_doodles.append({
                "id": f"{sheet_id}_{idx}",
                "number": idx,
                "filename": filename,
                "filename_border": filename_border,
                "path": f"stickers/{sheet_id}/{filename}",
                "path_border": f"stickers/{sheet_id}/{filename_border}",
                "width": x2 - x1,
                "height": y2 - y1,
                "box": [bx, by, bw, bh],
                "is_suspicious": is_suspicious,
                "suspicious_reason": suspicious_reason
            })
            
            # Draw box on annotated sheet
            box_color = (0, 0, 255) if is_suspicious else (0, 180, 0)
            cv2.rectangle(annotated, (bx, by), (bx + bw, by + bh), box_color, 2)
            cv2.rectangle(annotated, (bx, by - 20), (bx + 26, by), box_color, -1)
            cv2.putText(annotated, str(idx), (bx + 4, by - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
            
        annotated_filename = f"{sheet_id}_annotated.png"
        annotated_path = os.path.join(OUTPUT_DIR, annotated_filename)
        cv2.imwrite(annotated_path, annotated)
        
        manifest.append({
            "id": sheet_id,
            "title": sheet_title,
            "annotated_image": f"stickers/{annotated_filename}",
            "total_count": len(sheet_doodles),
            "suspicious_count": suspicious_count,
            "doodles": sheet_doodles
        })
        
        print(f"[{sheet_title}] Extracted {len(sheet_doodles)} true sticker cutouts ({suspicious_count} suspicious).")
        
    manifest_path = os.path.join(OUTPUT_DIR, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
        
    print(f"\nManifest JSON successfully updated at {manifest_path}")

if __name__ == "__main__":
    process_sheets()
