from PIL import Image

def count_dark_pixels():
    img = Image.open("public/owner.png")
    w, h = img.size
    dark_count = 0
    # Let's sample a grid or find the minimum RGB values
    min_rgb = (255, 255, 255)
    for y in range(h):
        for x in range(w):
            r, g, b = img.getpixel((x, y))[:3]
            if r < 10 and g < 10 and b < 10:
                dark_count += 1
            if (r + g + b) < (min_rgb[0] + min_rgb[1] + min_rgb[2]):
                min_rgb = (r, g, b)
    print(f"Total pixels: {w * h}")
    print(f"Dark pixels (RGB < 10): {dark_count}")
    print(f"Minimum RGB found: {min_rgb}")

if __name__ == "__main__":
    count_dark_pixels()
