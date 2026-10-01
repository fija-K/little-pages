import os
import shutil
import json

# Total counts extracted per category in Stage 1
TOTAL_COUNTS = {
    "cute-doodles": 45,
    "cat-doodles-1": 9,
    "gojo-stickers": 19,
    "anime-heads": 18,
    "cat-doodles-2": 14,
    "pink-pixel": 36
}

# User's list of numbers to REMOVE (delete):
REMOVE_LISTS = {
    "cute-doodles": [1, 10, 11, 19, 27, 36, 32, 38, 39, 44, 45],
    "cat-doodles-1": [1, 2, 7, 8, 9, 5, 4],
    "gojo-stickers": [1, 4, 5, 8, 9, 11, 12, 15, 17, 18],
    "anime-heads": [3, 5, 10],
    "cat-doodles-2": [2, 3, 4, 5, 8, 10, 12, 14],
    "pink-pixel": [1, 9]
}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STICKERS_DIR = os.path.join(BASE_DIR, "public", "stickers")
TARGET_DIR = os.path.join(STICKERS_DIR, "cute-doodles")

# Temporary output staging directory
STAGE_DIR = os.path.join(STICKERS_DIR, "_temp_consolidated")
if os.path.exists(STAGE_DIR):
    shutil.rmtree(STAGE_DIR)
os.makedirs(STAGE_DIR, exist_ok=True)

consolidated_list = []
counter = 1

for cat_id, total in TOTAL_COUNTS.items():
    cat_path = os.path.join(STICKERS_DIR, cat_id)
    if not os.path.exists(cat_path):
        continue
        
    remove_set = set(REMOVE_LISTS.get(cat_id, []))
    
    for num in range(1, total + 1):
        if num in remove_set:
            continue
            
        filename = f"doodle_{num:02d}.png"
        src_file = os.path.join(cat_path, filename)
        
        if not os.path.exists(src_file):
            continue
            
        new_filename = f"sticker_{counter:02d}.png"
        dst_file = os.path.join(STAGE_DIR, new_filename)
        
        # Copy transparent PNG
        shutil.copy2(src_file, dst_file)
        
        # Copy border version if present
        border_filename = f"doodle_{num:02d}_border.png"
        src_border = os.path.join(cat_path, border_filename)
        if os.path.exists(src_border):
            dst_border = os.path.join(STAGE_DIR, f"sticker_{counter:02d}_border.png")
            shutil.copy2(src_border, dst_border)
            
        consolidated_list.append({
            "id": f"sticker_{counter:02d}",
            "filename": new_filename,
            "path": f"stickers/cute-doodles/{new_filename}",
            "number": counter
        })
        
        counter += 1

# Clean old categories and move staged stickers to cute-doodles
for item in os.listdir(STICKERS_DIR):
    item_path = os.path.join(STICKERS_DIR, item)
    if os.path.isdir(item_path) and item != "_temp_consolidated":
        shutil.rmtree(item_path, ignore_errors=True)

os.rename(STAGE_DIR, TARGET_DIR)

manifest_data = [{
    "id": "cute-doodles",
    "title": "Cute Doodles",
    "total_count": len(consolidated_list),
    "doodles": consolidated_list
}]

with open(os.path.join(STICKERS_DIR, "manifest.json"), "w", encoding="utf-8") as f:
    json.dump(manifest_data, f, indent=2)

print(f"Successfully consolidated {len(consolidated_list)} kept stickers into public/stickers/cute-doodles/")
