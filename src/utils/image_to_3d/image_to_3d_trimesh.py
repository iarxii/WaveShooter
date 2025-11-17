#!/usr/bin/env python3
"""
Convert an image to a 3D mesh using MiDaS depth estimation and Trimesh.
Exports both OBJ and PLY formats.
Dependencies:
    pip install torch torchvision torchaudio
    pip install opencv-python
    pip install trimesh
Run:
    python image_to_3d_trimesh.py input.jpg --output output.obj
"""

import os
import cv2
import torch
import numpy as np
import trimesh

def load_midas_model():
    model_type = "DPT_Small"  # lightweight version
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

def depth_to_point_cloud(depth, img):
    h, w = depth.shape
    fx = fy = w
    cx, cy = w / 2, h / 2
    points = []
    colors = []
    for y in range(0, h, 4):  # downsample for speed
        for x in range(0, w, 4):
            Z = depth[y, x]
            X = (x - cx) * Z / fx
            Y = (y - cy) * Z / fy
            points.append([X, -Y, Z])
            colors.append(img[y, x] / 255.0)
    return np.array(points), np.array(colors)

def reconstruct_mesh(points):
    # Use Trimesh to create a convex hull mesh from points
    cloud = trimesh.points.PointCloud(points)
    mesh = cloud.convex_hull
    return mesh

def image_to_3d(image_path, output_obj="output.obj", output_ply="output.ply"):
    midas, transform = load_midas_model()
    depth, img = estimate_depth(image_path, midas, transform)
    points, colors = depth_to_point_cloud(depth, img)
    mesh = reconstruct_mesh(points)
    mesh.export(output_obj)
    # Export point cloud as PLY
    ply_cloud = trimesh.points.PointCloud(points, colors=colors)
    ply_cloud.export(output_ply)
    print(f"3D model saved to {output_obj} and point cloud saved to {output_ply}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Convert image to 3D mesh and point cloud")
    parser.add_argument("image", help="Path to input image")
    parser.add_argument("--obj", default="output.obj", help="Path to output OBJ file")
    parser.add_argument("--ply", default="output.ply", help="Path to output PLY file")
    args = parser.parse_args()
    image_to_3d(args.image, args.obj, args.ply)
