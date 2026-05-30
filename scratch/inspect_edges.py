from PIL import Image

def print_edge_pixels():
    img = Image.open("public/owner.png")
    w, h = img.size
    print(f"Top-left (0,0): {img.getpixel((0, 0))}")
    print(f"Top-right (w-1,0): {img.getpixel((w-1, 0))}")
    print(f"Bottom-left (0,h-1): {img.getpixel((0, h-1))}")
    print(f"Bottom-right (w-1,h-1): {img.getpixel((w-1, h-1))}")
    print(f"Middle-top (w//2, 0): {img.getpixel((w//2, 0))}")
    print(f"Middle-bottom (w//2, h-1): {img.getpixel((w//2, h-1))}")
    print(f"Middle-left (0, h//2): {img.getpixel((0, h//2))}")
    print(f"Middle-right (w-1, h//2): {img.getpixel((w-1, h//2))}")

if __name__ == "__main__":
    print_edge_pixels()
