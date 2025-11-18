#!/usr/bin/env python3
"""
Convert multiple images from different views to a 3D mesh using MiDaS depth estimation and Trimesh.
Combines point clouds from multiple views for better reconstruction.
Assumes images are in order: front, front-left, left, back-left, back, back-right, right, front-right, top, bottom, close-ups.
Creates organized output directory structure with OBJ, PLY, GLB, and metadata files.
Dependencies:
    pip install torch torchvision torchaudio
    pip install opencv-python
    pip install trimesh
Run:
    python image_to_3d_trimesh.py /path/to/image_directory [--output-dir models/custom_name] [--prefix model_name]
"""

import os
import cv2
import torch
import numpy as np
import trimesh
from pathlib import Path

def load_midas_model():
    model_type = "MiDaS_small"  # lightweight version
    midas = torch.hub.load("intel-isl/MiDaS", model_type)
    midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms")
    transform = midas_transforms.small_transform
    return midas, transform

def estimate_depth(image_path, midas, transform):
    img = cv2.imread(image_path)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    input_batch = transform(img).to("cpu")
    with torch.no_grad():
        prediction = midas(input_batch)
        depth = prediction.squeeze().cpu().numpy()
    return depth, img

def get_camera_pose(view_name):
    """Get camera position and rotation matrix for a given view name."""
    distance = 2.0  # Distance from object
    
    poses = {
        'front': {
            'position': np.array([0, 0, distance]),
            'rotation': np.eye(3)  # Identity
        },
        'front-left': {
            'position': np.array([-distance * 0.707, 0, distance * 0.707]),  # 45°
            'rotation': np.array([
                [0.707, 0, 0.707],
                [0, 1, 0],
                [-0.707, 0, 0.707]
            ])
        },
        'left': {
            'position': np.array([-distance, 0, 0]),
            'rotation': np.array([
                [0, 0, 1],
                [0, 1, 0],
                [-1, 0, 0]
            ])
        },
        'back-left': {
            'position': np.array([-distance * 0.707, 0, -distance * 0.707]),
            'rotation': np.array([
                [-0.707, 0, 0.707],
                [0, 1, 0],
                [-0.707, 0, -0.707]
            ])
        },
        'back': {
            'position': np.array([0, 0, -distance]),
            'rotation': np.array([
                [-1, 0, 0],
                [0, 1, 0],
                [0, 0, -1]
            ])
        },
        'back-right': {
            'position': np.array([distance * 0.707, 0, -distance * 0.707]),
            'rotation': np.array([
                [-0.707, 0, -0.707],
                [0, 1, 0],
                [0.707, 0, -0.707]
            ])
        },
        'right': {
            'position': np.array([distance, 0, 0]),
            'rotation': np.array([
                [0, 0, -1],
                [0, 1, 0],
                [1, 0, 0]
            ])
        },
        'front-right': {
            'position': np.array([distance * 0.707, 0, distance * 0.707]),
            'rotation': np.array([
                [0.707, 0, -0.707],
                [0, 1, 0],
                [0.707, 0, 0.707]
            ])
        },
        'top': {
            'position': np.array([0, distance, 0]),
            'rotation': np.array([
                [1, 0, 0],
                [0, 0, 1],
                [0, -1, 0]
            ])
        },
        'bottom': {
            'position': np.array([0, -distance, 0]),
            'rotation': np.array([
                [1, 0, 0],
                [0, 0, -1],
                [0, 1, 0]
            ])
        }
    }
    
    # Default to front if unknown
    return poses.get(view_name.lower().replace(' ', '-').replace('_', '-'), poses['front'])

def transform_point_cloud(points, colors, pose):
    """Transform point cloud from camera coordinates to world coordinates."""
    rotation = pose['rotation']
    translation = pose['position']
    
    # Apply rotation and translation
    world_points = (rotation @ points.T).T + translation
    
    return world_points, colors

def depth_to_point_cloud(depth, img, max_depth=None):
    h, w = depth.shape
    fx = fy = w
    cx, cy = w / 2, h / 2
    
    if max_depth is None:
        max_depth = np.max(depth)
    
    points = []
    colors = []
    for y in range(0, h, 4):  # downsample for speed
        for x in range(0, w, 4):
            Z = depth[y, x]
            if Z > max_depth * 0.1:  # Filter out very close points
                X = (x - cx) * Z / fx
                Y = (y - cy) * Z / fy
                points.append([X, -Y, Z])  # Y flipped for correct orientation
                colors.append(img[y, x] / 255.0)
    return np.array(points), np.array(colors)

def create_mesh_from_point_cloud(points, colors):
    """Create a mesh from combined point cloud."""
    try:
        # Create point cloud and try convex hull
        cloud = trimesh.PointCloud(points)
        mesh = cloud.convex_hull
        print(f"Created convex hull mesh with {len(mesh.vertices)} vertices and {len(mesh.faces)} faces")
    except Exception as e:
        print(f"Mesh creation failed: {e}, exporting point cloud only")
        # Create empty mesh
        mesh = trimesh.Trimesh(vertices=points, faces=[])
    
    return mesh

def images_to_3d(image_dir, output_dir=None, output_prefix="model"):
    """Process multiple images from different views to create 3D model."""
    # Create output directory
    if output_dir is None:
        # Use input directory name as output folder
        input_name = Path(image_dir).name
        output_dir = f"models/{input_name}"
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    output_obj = output_path / f"{output_prefix}.obj"
    output_ply = output_path / f"{output_prefix}.ply"
    output_glb = output_path / f"{output_prefix}.glb"
    metadata_file = output_path / "metadata.json"
    
    image_dir = Path(image_dir)
    if not image_dir.exists():
        raise FileNotFoundError(f"Directory {image_dir} not found")
    
    # Find all image files
    image_extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']
    image_files = []
    for ext in image_extensions:
        image_files.extend(image_dir.glob(f"*{ext}"))
    
    # Remove duplicates and sort
    image_files = list(set(image_files))
    image_files.sort()
    
    if not image_files:
        raise FileNotFoundError(f"No image files found in {image_dir}")
    
    print(f"Found {len(image_files)} images: {[f.name for f in image_files]}")
    
    # Define view order (assuming files are in this order)
    view_order = [
        'front', 'front-left', 'left', 'back-left',
        'back', 'back-right', 'right', 'front-right',
        'top', 'bottom'
    ]
    
    # Extend with close-ups if more files
    while len(view_order) < len(image_files):
        view_order.append('close-up')
    
    print(f"Output directory: {output_path}")
    midas, transform = load_midas_model()
    
    all_points = []
    all_colors = []
    
    for i, image_path in enumerate(image_files):
        view_name = view_order[i] if i < len(view_order) else 'close-up'
        print(f"Processing {image_path.name} as {view_name} view...")
        
        try:
            pose = get_camera_pose(view_name)
            depth, img = estimate_depth(str(image_path), midas, transform)
            points, colors = depth_to_point_cloud(depth, img)
            
            # Transform to world coordinates
            world_points, world_colors = transform_point_cloud(points, colors, pose)
            
            all_points.append(world_points)
            all_colors.append(world_colors)
            
            print(f"  Added {len(world_points)} points from {view_name} view")
            
        except Exception as e:
            print(f"  Error processing {image_path.name}: {e}")
            continue
    
    if not all_points:
        raise RuntimeError("No valid point clouds generated")
    
    # Combine all point clouds
    combined_points = np.vstack(all_points)
    combined_colors = np.vstack(all_colors)
    
    print(f"Combined point cloud has {len(combined_points)} points")
    
    # Create mesh from combined point cloud
    mesh = create_mesh_from_point_cloud(combined_points, combined_colors)
    
    # Center and scale
    if len(mesh.vertices) > 0:
        centroid = mesh.centroid
        if not np.isnan(centroid).any():
            mesh.apply_translation(-centroid)
    scale_factor = 0.01
    mesh.apply_scale(scale_factor)
    
    print(f"Final mesh has {len(mesh.vertices)} vertices and {len(mesh.faces)} faces")
    print(f"Bounding box: {mesh.bounds}")
    
    # Export
    mesh.export(output_obj)
    cloud = trimesh.points.PointCloud(combined_points * scale_factor, colors=combined_colors)
    cloud.export(output_ply)
    mesh.export(output_glb)
    
    # Save metadata
    import json
    metadata = {
        "input_directory": str(image_dir),
        "output_directory": str(output_path),
        "num_images": len(image_files),
        "image_files": [str(f) for f in image_files],
        "view_order": view_order[:len(image_files)],
        "total_points": len(combined_points),
        "mesh_vertices": len(mesh.vertices),
        "mesh_faces": len(mesh.faces),
        "bounding_box": mesh.bounds.tolist() if len(mesh.vertices) > 0 else None,
        "scale_factor": scale_factor,
        "processing_date": str(np.datetime64('now')),
    }
    with open(metadata_file, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"3D model saved to {output_obj}")
    print(f"Point cloud saved to {output_ply}")
    print(f"GLB model saved to {output_glb}")
    print(f"Metadata saved to {metadata_file}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Convert multiple images from different views to 3D mesh and point cloud")
    parser.add_argument("input_dir", help="Path to directory containing input images from different views")
    parser.add_argument("--output-dir", help="Output directory (default: models/{input_dir_name})")
    parser.add_argument("--prefix", default="model", help="Prefix for output files (default: model)")
    args = parser.parse_args()
    images_to_3d(args.input_dir, args.output_dir, args.prefix)
