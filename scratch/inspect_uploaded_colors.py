from PIL import Image

def find_black():
    img = Image.open(r"C:\Users\Vikhyat Gupta\.gemini\antigravity\brain\52bb2dde-e36b-41f7-b87d-0ded1f6f09f7\media__1779472556885.png")
    w, h = img.size
    black_pixels = []
    for y in range(h):
        for x in range(w):
            pixel = img.getpixel((x, y))
            r, g, b, a = pixel
            # Check if pixel is black and not fully transparent
            if r < 30 and g < 30 and b < 30 and a > 0:
                black_pixels.append((x, y, pixel))
    print(f"Total non-transparent dark pixels: {len(black_pixels)}")
    if len(black_pixels) > 0:
        print("Some sample dark pixels:")
        for p in black_pixels[:20]:
            print(p)

if __name__ == "__main__":
    find_black()
