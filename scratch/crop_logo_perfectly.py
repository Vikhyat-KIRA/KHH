from PIL import Image, ImageDraw

def crop_logo_to_circle():
    # Load the source logo
    img = Image.open("public/logo.jpg")
    width, height = img.size
    
    # We detected:
    # center_x = 512
    # center_y = 406
    # radius = 364 (captures the outer gold ring completely)
    cx, cy, r = 512, 406, 364
    
    # Bounding box for cropping the logo
    bbox = (cx - r, cy - r, cx + r, cy + r)
    
    # Convert image to RGBA (with alpha channel)
    img = img.convert("RGBA")
    
    # Create an antialiased circular mask using 4x supersampling
    scale = 4
    mask_size = (width * scale, height * scale)
    mask = Image.new("L", mask_size, 0)
    draw = ImageDraw.Draw(mask)
    
    # Scale center and radius for supersampling
    mcx, mcy, mr = cx * scale, cy * scale, r * scale
    draw.ellipse([mcx - mr, mcy - mr, mcx + mr, mcy + mr], fill=255)
    
    # Downscale the mask to original size using high-quality Lanczos resampling
    # to achieve perfectly smooth anti-aliased borders (no jagged edges!)
    mask = mask.resize((width, height), Image.Resampling.LANCZOS)
    
    # Apply the mask to the image
    img.putalpha(mask)
    
    # Crop the image tightly to the circle bounding box
    cropped_img = img.crop(bbox)
    
    # Save the output as a transparent PNG in the public directory!
    cropped_img.save("public/logo.png", "PNG", quality=100)
    print("SUCCESS: Logo cropped to a perfect circle with smooth transparent background and saved to public/logo.png")

if __name__ == "__main__":
    crop_logo_to_circle()
