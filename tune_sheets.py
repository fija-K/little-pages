import cv2
import numpy as np

sheets = [
    ("cat-doodles-1", "C:/Users/fija/.gemini/antigravity/brain/c4b7f087-2eb8-45ec-ba76-0bdb0a16c37b/.user_uploaded/media_1790884888919.png"),
    ("gojo-stickers", "C:/Users/fija/.gemini/antigravity/brain/c4b7f087-2eb8-45ec-ba76-0bdb0a16c37b/.user_uploaded/media_1790884894403.png"),
    ("anime-heads", "C:/Users/fija/.gemini/antigravity/brain/c4b7f087-2eb8-45ec-ba76-0bdb0a16c37b/.user_uploaded/media_1790884900368.png"),
    ("cat-doodles-2", "C:/Users/fija/.gemini/antigravity/brain/c4b7f087-2eb8-45ec-ba76-0bdb0a16c37b/.user_uploaded/media_1790884905853.png"),
    ("pink-pixel", "C:/Users/fija/.gemini/antigravity/brain/c4b7f087-2eb8-45ec-ba76-0bdb0a16c37b/.user_uploaded/media_1790884931303.jpg"),
    ("red-pixel", "C:/Users/fija/.gemini/antigravity/brain/c4b7f087-2eb8-45ec-ba76-0bdb0a16c37b/.user_uploaded/media_1790884940611.jpg")
]

for name, path in sheets:
    img = cv2.imread(path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Try different thresholds
    for thresh in [180, 200, 220, 240]:
        _, binary = cv2.threshold(gray, thresh, 255, cv2.THRESH_BINARY_INV)
        # Find contours
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        valid = [c for c in contours if cv2.boundingRect(c)[2] > 20 and cv2.boundingRect(c)[3] > 20]
        print(f"{name} @ thresh={thresh}: {len(valid)} contours")
