#!/usr/bin/env python3
"""
COLMAP 3D Reconstruction Script
CPU-friendly alternative to Meshroom that works without NVIDIA GPU.

Requirements:
- Install COLMAP: conda install -c conda-forge colmap
- Or download from: https://github.com/colmap/colmap/releases

Usage:
    python colmap_reconstruction.py /path/to/images --output-dir colmap_output
"""

import os
import subprocess
import argparse
from pathlib import Path

def run_colmap_reconstruction(image_dir, output_dir):
    """
    Run COLMAP automatic reconstruction pipeline.

    Args:
        image_dir: Directory containing input images
        output_dir: Directory for output
    """

    image_dir = Path(image_dir)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Database file
    database_path = output_dir / "database.db"

    print(f"Running COLMAP reconstruction...")
    print(f"Input images: {image_dir}")
print(f"Output directory: {output_dir}")

try:
    # Step 1: Feature extraction
    print("Step 1: Extracting features...")
    cmd1 = [
        "colmap", "feature_extractor",
        "--database_path", str(database_path),
        "--image_path", str(image_dir),
        "--ImageReader.single_camera", "1",  # Assume single camera
        "--SiftExtraction.use_gpu", "0"  # CPU only
    ]
    subprocess.run(cmd1, check=True)

    # Step 2: Feature matching
    print("Step 2: Matching features...")
    cmd2 = [
        "colmap", "exhaustive_matcher",
        "--database_path", str(database_path),
        "--SiftMatching.use_gpu", "0"  # CPU only
    ]
    subprocess.run(cmd2, check=True)

    # Step 3: Sparse reconstruction (Structure from Motion)
    sparse_dir = output_dir / "sparse"
    print("Step 3: Sparse reconstruction (SfM)...")
    cmd3 = [
        "colmap", "mapper",
        "--database_path", str(database_path),
        "--image_path", str(image_dir),
        "--output_path", str(sparse_dir)
    ]
    subprocess.run(cmd3, check=True)

    # Step 4: Dense reconstruction
    dense_dir = output_dir / "dense"
    print("Step 4: Dense reconstruction...")
    cmd4 = [
        "colmap", "image_undistorter",
        "--image_path", str(image_dir),
        "--input_path", str(sparse_dir / "0"),
        "--output_path", str(dense_dir)
    ]
    subprocess.run(cmd4, check=True)

    # Step 5: Stereo fusion
    print("Step 5: Stereo fusion...")
    cmd5 = [
        "colmap", "patch_match_stereo",
        "--workspace_path", str(dense_dir)
    ]
    subprocess.run(cmd5, check=True)

    # Step 6: Create dense point cloud
    print("Step 6: Creating point cloud...")
    fused_ply = output_dir / "fused.ply"
    cmd6 = [
        "colmap", "stereo_fusion",
        "--workspace_path", str(dense_dir),
        "--output_path", str(fused_ply)
    ]
    subprocess.run(cmd6, check=True)

    # Step 7: Create mesh (optional)
    print("Step 7: Creating mesh...")
    mesh_ply = output_dir / "mesh.ply"
    cmd7 = [
        "colmap", "poisson_mesher",
        "--input_path", str(fused_ply),
        "--output_path", str(mesh_ply)
    ]
    subprocess.run(cmd7, check=True)

    print("✅ COLMAP reconstruction completed successfully!")
    print(f"📁 Output directory: {output_dir}")
    print(f"🔵 Point cloud: {fused_ply}")
    print(f"🟢 Mesh: {mesh_ply}")
    print("💡 Next steps:")
    print("1. Open mesh.ply in Meshlab or Blender")
    print("2. Clean up the mesh if needed")
    print("3. Export as .obj or .glb for your game")

    return True

except subprocess.CalledProcessError as e:
    print(f"❌ COLMAP failed: {e}")
    print("💡 Troubleshooting:")
    print("1. Make sure COLMAP is installed: conda install -c conda-forge colmap")
    print("2. Check that all images are in the input directory")
    print("3. Ensure images have sufficient overlap (60-80%)")
    return False

except FileNotFoundError:
    print("❌ COLMAP not found in PATH")
    print("💡 Install COLMAP:")
    print("   conda install -c conda-forge colmap")
    print("   OR download from: https://github.com/colmap/colmap/releases")
    return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run COLMAP 3D reconstruction (CPU-friendly)")
    parser.add_argument("input_dir", help="Directory containing input images")
    parser.add_argument("--output-dir", help="Output directory (default: colmap_output)")

    args = parser.parse_args()

    output_dir = args.output_dir or f"colmap_output_{Path(args.input_dir).name}"

    success = run_colmap_reconstruction(args.input_dir, output_dir)

if not success:
    print("🔄 Alternative: Try online services like Sketchfab")
    print("   Upload your images to https://sketchfab.com/create")
    print("   Select 'Photogrammetry' and let them process it for free!")