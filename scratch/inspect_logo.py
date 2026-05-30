from PIL import Image

img = Image.open("public/logo.jpg")
print(f"Image Size: {img.size}")
print(f"Image Mode: {img.mode}")
