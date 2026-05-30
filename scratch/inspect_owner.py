from PIL import Image

def inspect():
    try:
        img = Image.open("public/owner.png")
        print(f"Format: {img.format}, Size: {img.size}, Mode: {img.mode}")
        # Inspect some pixels at the corners
        w, h = img.size
        corners = [(0, 0), (w-1, 0), (0, h-1), (w-1, h-1), (w//2, h//2)]
        for x, y in corners:
            pixel = img.getpixel((x, y))
            print(f"Pixel at ({x}, {y}): {pixel}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect()
