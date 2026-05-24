import math
from PIL import Image

def inspect_boundary():
    img = Image.open(r"C:\Users\Vikhyat Gupta\.gemini\antigravity\brain\52bb2dde-e36b-41f7-b87d-0ded1f6f09f7\media__1779472556885.png")
    w, h = img.size
    cx, cy = w // 2, h // 2
    print(f"Center: ({cx}, {cy})")
    
    # Check pixels at different distances from the center
    # specifically around the edge of the circle (radius 180-190)
    for r in range(185, 206):
        # Sample a few angles
        samples = []
        for angle in range(0, 360, 45):
            rad = math.radians(angle)
            x = int(cx + r * math.cos(rad))
            y = int(cy + r * math.sin(rad))
            if 0 <= x < w and 0 <= y < h:
                pixel = img.getpixel((x, y))
                samples.append(pixel)
        # Calculate average RGB/Alpha
        avg_a = sum(p[3] for p in samples) / len(samples)
        avg_rgb = tuple(sum(p[i] for p in samples) // len(samples) for i in range(3))
        print(f"Radius {r}: Average RGB={avg_rgb}, Average Alpha={avg_a}")

if __name__ == "__main__":
    inspect_boundary()
