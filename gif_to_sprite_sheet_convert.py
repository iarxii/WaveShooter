from PIL import Image, ImageSequence
import os
import zipfile

# Input and output directories
input_dir = "hero_effects"
output_dir = "hero_spritesheets"
os.makedirs(output_dir, exist_ok=True)

def gif_to_spritesheet(gif_path, output_path):
    # Open the GIF
    gif = Image.open(gif_path)
    frames = [frame.convert("RGBA") for frame in ImageSequence.Iterator(gif)]
    
    # Get dimensions
    frame_width, frame_height = frames[0].size
    sheet_width = frame_width * len(frames)
    sheet_height = frame_height
    
    # Create a new transparent image for the spritesheet
    spritesheet = Image.new("RGBA", (sheet_width, sheet_height), (0, 0, 0, 0))
    
    # Paste frames side by side
    for i, frame in enumerate(frames):
        spritesheet.paste(frame, (i * frame_width, 0))
    
    # Save the spritesheet
    spritesheet.save(output_path, "PNG")

# Convert all GIFs in the input directory
for file in os.listdir(input_dir):
    if file.endswith(".gif"):
        gif_path = os.path.join(input_dir, file)
        output_path = os.path.join(output_dir, file.replace(".gif", "_spritesheet.png"))
        gif_to_spritesheet(gif_path, output_path)

# Bundle all spritesheets into a ZIP file
zip_path = "hero_spritesheets_bundle.zip"
with zipfile.ZipFile(zip_path, "w") as zipf:
    for file in os.listdir(output_dir):
        zipf.write(os.path.join(output_dir, file), arcname=file)

print(f"All spritesheets created and bundled into {zip_path}")