import os
import base64

bg_dir = r"C:\Users\fija\.gemini\antigravity\scratch\little-pages\public\stickers\backgrounds"

def get_base64_png(file_path):
    with open(file_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

straw_b64 = get_base64_png(os.path.join(bg_dir, "strawberry.png"))
choc_b64 = get_base64_png(os.path.join(bg_dir, "chocolate.png"))

# 520x520 tile size with Poisson-disc style scattered placement
items = [
    {"x": 70,  "y": 80,  "rot": -18, "scale": 0.92},
    {"x": 330, "y": 60,  "rot": 22,  "scale": 1.08},
    {"x": 210, "y": 280, "rot": -8,  "scale": 1.00},
    {"x": 440, "y": 350, "rot": 16,  "scale": 0.88},
    {"x": 75,  "y": 420, "rot": 25,  "scale": 1.05},
]

def generate_svg_pattern(b64_data, width=70, height=70):
    svg_header = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="520" height="520" viewBox="0 0 520 520">\n'
    svg_body = ""
    for it in items:
        x, y = it["x"], it["y"]
        rot = it["rot"]
        s = it["scale"]
        w = width * s
        h = height * s
        svg_body += f'  <g transform="translate({x},{y}) rotate({rot}) translate({-w/2},{-h/2})">\n'
        svg_body += f'    <image xlink:href="data:image/png;base64,{b64_data}" width="{w:.1f}" height="{h:.1f}" opacity="0.32" />\n'
        svg_body += f'  </g>\n'
    svg_footer = '</svg>'
    return svg_header + svg_body + svg_footer

straw_svg = generate_svg_pattern(straw_b64, width=68, height=76)
choc_svg = generate_svg_pattern(choc_b64, width=72, height=72)

with open(os.path.join(bg_dir, "strawberry_pattern.svg"), "w") as f:
    f.write(straw_svg)

with open(os.path.join(bg_dir, "chocolate_pattern.svg"), "w") as f:
    f.write(choc_svg)

print("SVG pattern generation complete!")
