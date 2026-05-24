import math
from PIL import Image, ImageDraw

def process_owner_image():
    # Load the uploaded image from the brain directory
    uploaded_path = r"C:\Users\Vikhyat Gupta\.gemini\antigravity\brain\52bb2dde-e36b-41f7-b87d-0ded1f6f09f7\media__1779472556885.png"
    img = Image.open(uploaded_path)
    
    # Ensure it's in RGBA mode
    img = img.convert("RGBA")
    w, h = img.size
    print(f"Original image size: {w}x{h}")
    
    # Find the circular region center and radius
    # For a 381x381 image, the center is (190, 190) and the radius is 189.
    # Let's crop to a perfect circle to ensure NO black corners/parts exist.
    cx, cy = w // 2, h // 2
    r = 189
    
    # We will create a high-quality anti-aliased mask using supersampling (4x scale)
    scale = 4
    mask_size = (w * scale, h * scale)
    mask = Image.new("L", mask_size, 0)
    draw = ImageDraw.Draw(mask)
    
    # Draw perfect white circle on the mask
    mcx, mcy, mr = cx * scale, cy * scale, r * scale
    draw.ellipse([mcx - mr, mcy - mr, mcx + mr, mcy + mr], fill=255)
    
    # Downscale mask using Lanczos resampling for perfect smooth boundaries (anti-aliasing)
    mask = mask.resize((w, h), Image.Resampling.LANCZOS)
    
    # Apply the mask to the image's alpha channel
    # This guarantees that anything outside the radius of 189 is 100% transparent (Alpha=0)
    # rendering no black corners whatsoever when displayed on the web.
    img.putalpha(mask)
    
    # Crop the image tightly to the circle bounding box to make it perfectly centered
    bbox = (cx - r, cy - r, cx + r, cy + r)
    cropped_img = img.crop(bbox)
    
    # Save the output as a high-quality transparent PNG
    output_path = "public/owner.png"
    cropped_img.save(output_path, "PNG", quality=100)
    print(f"SUCCESS: Perfectly cropped transparent circular owner image saved to {output_path}")

if __name__ == "__main__":
    process_owner_image()
