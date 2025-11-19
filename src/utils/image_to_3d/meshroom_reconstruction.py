#!/usr/bin/env python3
"""
Multi-View 3D Reconstruction using Meshroom
This script sets up and runs Meshroom for proper 3D reconstruction from multiple views.

Requirements:
- Meshroom installed (https://alicevision.org/#meshroom)
- Images in a directory

Usage:
    python meshroom_reconstruction.py /path/to/images --output /path/to/output
"""

import os
import subprocess
import argparse
from pathlib import Path
import json

def run_meshroom_reconstruction(image_dir, output_dir, meshroom_exe=None):
    """
    Run Meshroom pipeline for multi-view 3D reconstruction.

    Args:
        image_dir: Directory containing input images
        output_dir: Directory for output
        meshroom_exe: Path to Meshroom executable (if not in PATH)
    """

    image_dir = Path(image_dir)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

def run_meshroom_reconstruction(image_dir, output_dir, meshroom_exe=None):
    """
    Run Meshroom pipeline for multi-view 3D reconstruction.

    Args:
        image_dir: Directory containing input images
        output_dir: Directory for output
        meshroom_exe: Path to Meshroom executable (if not in PATH)
    """

    image_dir = Path(image_dir)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Find Meshroom executable
    if meshroom_exe is None:
        # Try common locations
        common_paths = [
            "C:/Program Files/Meshroom/Meshroom.exe",
            "C:/Program Files (x86)/Meshroom/Meshroom.exe",
            "/Applications/Meshroom.app/Contents/MacOS/Meshroom",
            "/usr/local/bin/meshroom",
            "meshroom"  # in PATH
        ]
        for path in common_paths:
            if Path(path).exists() or (path == "meshroom"):
                try:
                    # Test if meshroom command works
                    result = subprocess.run([path, "--help"], capture_output=True, text=True, timeout=10)
                    if result.returncode == 0:
                        meshroom_exe = path
                        break
                except:
                    continue

    if meshroom_exe is None:
        print("Meshroom not found! Please install Meshroom from https://alicevision.org/#meshroom")
        print("\nInstallation instructions:")
        print("1. Download from: https://github.com/alicevision/Meshroom/releases")
        print("2. Extract to a folder (e.g., C:/Program Files/Meshroom/)")
        print("3. Run this script again with --meshroom-exe pointing to Meshroom.exe")
        print("\nAlternatively, use COLMAP or RealityCapture for 3D reconstruction.")
        return False

    # Create Meshroom project file
    project_file = output_dir / "meshroom_project.mg"

    # Basic Meshroom pipeline command
    cmd = [
        str(meshroom_exe),
        "--input", str(image_dir),
        "--output", str(output_dir),
        "--pipeline", "photogrammetry",  # Use photogrammetry pipeline
        "--save", str(project_file)
    ]

    print(f"Running Meshroom with command: {' '.join(cmd)}")
    print(f"Input images: {image_dir}")
    print(f"Output directory: {output_dir}")

    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print("Meshroom reconstruction completed successfully!")
        print("Output files:")
        for file in output_dir.glob("*"):
            if file.is_file():
                print(f"  - {file.name}")

    except subprocess.CalledProcessError as e:
        print(f"Meshroom failed with error: {e}")
        print(f"STDOUT: {e.stdout}")
        print(f"STDERR: {e.stderr}")
        return False

    return True

def create_meshroom_instructions(output_dir):
    """Create a text file with instructions for using the Meshroom output."""

    instructions = f"""
Meshroom Reconstruction Complete!

Your 3D model has been reconstructed using photogrammetry techniques.

Output Directory: {output_dir}

Key Files:
- meshroom_project.mg: Meshroom project file (can be reopened in Meshroom GUI)
- [various intermediate files]: Processing steps
- [final mesh files]: Usually .obj or .ply files in subdirectories

To view/edit the results:
1. Open Meshroom GUI
2. Load the project file: meshroom_project.mg
3. Review and adjust parameters if needed
4. Export final mesh

For your game:
- Look for .obj or .ply files in the output
- Import into your 3D modeling software (Blender, etc.)
- Clean up and optimize the mesh
- Export as .glb for Three.js

Tips for better results:
- Ensure images have good overlap (60-80%)
- Use consistent lighting
- Avoid blurry or low-quality images
- More images generally = better reconstruction
"""

    instructions_file = Path(output_dir) / "README_Meshroom_Output.txt"
    with open(instructions_file, 'w') as f:
        f.write(instructions)

    print(f"Instructions saved to: {instructions_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Meshroom multi-view 3D reconstruction")
    parser.add_argument("input_dir", help="Directory containing input images")
    parser.add_argument("--output-dir", help="Output directory (default: meshroom_output)")
    parser.add_argument("--meshroom-exe", help="Path to Meshroom executable")

    args = parser.parse_args()

    output_dir = args.output_dir or f"meshroom_output_{Path(args.input_dir).name}"

    success = run_meshroom_reconstruction(args.input_dir, output_dir, args.meshroom_exe)

    if success:
        create_meshroom_instructions(output_dir)
        print(f"\nSuccess! Check {output_dir} for your 3D reconstruction results.")
    else:
        print("\nReconstruction failed. Check the error messages above.")