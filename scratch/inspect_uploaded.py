from PIL import Image

def inspect():
    try:
        img = Image.open(r"C:\Users\Vikhyat Gupta\.gemini\antigravity\brain\52bb2dde-e36b-41f7-b87d-0ded1f6f09f7\media__1779472556885.png")
        print(f"Format: {img.format}, Size: {img.size}, Mode: {img.mode}")
        w, h = img.size
        # Sample pixels
        corners = [(0, 0), (w-1, 0), (0, h-1), (w-1, h-1), (w//2, h//2)]
        for x, y in corners:
            pixel = img.getpixel((x, y))
            print(f"Pixel at ({x}, {y}): {pixel}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect()
