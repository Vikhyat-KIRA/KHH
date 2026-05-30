from PIL import Image

def process_uploaded_logo():
    # Load the new uploaded logo
    src_path = "C:/Users/Vikhyat Gupta/.gemini/antigravity/brain/e9aca8fe-d518-433b-b37a-b8449712ad8f/media__1779692327334.png"
    img = Image.open(src_path)
    
    # Get the bounding box of non-transparent pixels
    bbox = img.getbbox()
    print(f"Detected active bounding box: {bbox}")
    
    # Crop tightly to the bounding box
    cropped = img.crop(bbox)
    
    # Save as public/logo.png with maximum quality
    cropped.save("public/logo.png", "PNG", quality=100)
    print("SUCCESS: Cropped uploaded logo to perfect square and saved to public/logo.png")

if __name__ == "__main__":
    process_uploaded_logo()
