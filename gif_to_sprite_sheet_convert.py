from PIL import Image, ImageSequence
import os
import zipfile
import json

# Input and output directories
input_dir = "hero_effects"
output_dir = "hero_spritesheets"
metadata_dir = "hero_spritesheets_metadata"
os.makedirs(output_dir, exist_ok=True)
os.makedirs(metadata_dir, exist_ok=True)

def gif_to_spritesheet(gif_path, output_path, metadata_path):
    # Open the GIF
    gif = Image.open(gif_path)
    frames = [frame.convert("RGBA") for frame in ImageSequence.Iterator(gif)]
    
    # Get dimensions
    frame_width, frame_height = frames[0].size
    frame_count = len(frames)
    sheet_width = frame_width * frame_count
    sheet_height = frame_height
    
    # Create a new transparent image for the spritesheet
    spritesheet = Image.new("RGBA", (sheet_width, sheet_height), (0, 0, 0, 0))
    
    # Paste frames side by side
    for i, frame in enumerate(frames):
        spritesheet.paste(frame, (i * frame_width, 0))
    
    # Save the spritesheet
    spritesheet.save(output_path, "PNG")
    
    # Save metadata
    metadata = {
        "frameCount": frame_count,
        "frameWidth": frame_width,
        "frameHeight": frame_height,
        "sheetWidth": sheet_width,
        "sheetHeight": sheet_height,
        "frameRate": getattr(gif, 'info', {}).get('duration', 100) / 1000.0  # Convert ms to seconds, default 100ms
    }
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)

# Convert all GIFs in the input directory
for file in os.listdir(input_dir):
    if file.endswith(".gif"):
        gif_path = os.path.join(input_dir, file)
        base_name = file.replace(".gif", "")
        output_path = os.path.join(output_dir, f"{base_name}_spritesheet.png")
        metadata_path = os.path.join(metadata_dir, f"{base_name}_metadata.json")
        gif_to_spritesheet(gif_path, output_path, metadata_path)

# Bundle all spritesheets and metadata into a ZIP file
zip_path = "hero_spritesheets_bundle.zip"
with zipfile.ZipFile(zip_path, "w") as zipf:
    for file in os.listdir(output_dir):
        zipf.write(os.path.join(output_dir, file), arcname=file)
    for file in os.listdir(metadata_dir):
        zipf.write(os.path.join(metadata_dir, file), arcname=file)

print(f"All spritesheets and metadata created and bundled into {zip_path}")