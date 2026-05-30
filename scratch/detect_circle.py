from PIL import Image

img = Image.open("public/logo.jpg")
width, height = img.size
pixels = img.load()

# Let's inspect a horizontal slice through the middle (y = height // 2)
mid_y = height // 2
non_bg_pixels = []

for x in range(width):
    r, g, b = pixels[x, mid_y]
    # The checkerboard background has light gray/white squares.
    # Let's see if we can detect the dark circular border.
    # Let's print out some pixels to understand their values.
    if x % 20 == 0:
        print(f"x={x}, y={mid_y} -> RGB=({r}, {g}, {b})")
