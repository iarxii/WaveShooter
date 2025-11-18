import os
import sys
from PIL import Image
from datetime import datetime

def slice_image(source_image_path, horiz_grid_count, vert_grid_count):
    # Open the image
    img = Image.open(source_image_path)
    width, height = img.size

    # Calculate slice dimensions
    slice_width = width // horiz_grid_count
    slice_height = height // vert_grid_count

    # Prepare output directory
    base_name = os.path.splitext(os.path.basename(source_image_path))[0]
    run_date = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = os.path.join("split-output", f"{base_name}_{run_date}")
    os.makedirs(output_dir, exist_ok=True)

    # Slice and save
    for i in range(vert_grid_count):
        for j in range(horiz_grid_count):
            left = j * slice_width
            upper = i * slice_height
            right = left + slice_width
            lower = upper + slice_height

            cropped_img = img.crop((left, upper, right, lower))
            slice_filename = f"slice_{i+1}_{j+1}.png"
            cropped_img.save(os.path.join(output_dir, slice_filename))

    print(f"Image sliced into {vert_grid_count} rows and {horiz_grid_count} columns.")
    print(f"Slices saved in: {output_dir}")

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python slice_image.py <source_image_path> <horiz_grid_count> <vert_grid_count>")
        sys.exit(1)

    source_image_path = sys.argv[1]
    horiz_grid_count = int(sys.argv[2])
    vert_grid_count = int(sys.argv[3])

    slice_image(source_image_path, horiz_grid_count, vert_grid_count)