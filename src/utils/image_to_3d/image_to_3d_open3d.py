#!/usr/bin/env python3
"""
Convert an image to a 3D mesh using MiDaS depth estimation and Open3D.
Dependencies:
    pip install torch torchvision torchaudio
    pip install opencv-python
    pip install open3d
Run:
    python image_to_3d.py input.jpg --output output.obj
"""

import os
import cv2
import torch
import numpy as np
import open3d as o3d

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
    pcd = o3d.geometry.PointCloud()
    pcd.points = o3d.utility.Vector3dVector(points)
    pcd.estimate_normals()
    mesh = o3d.geometry.TriangleMesh.create_from_point_cloud_alpha_shape(pcd, alpha=0.03)
    mesh.compute_vertex_normals()
    return mesh

def image_to_3d(image_path, output_path="output.obj"):
    midas, transform = load_midas_model()
    depth, img = estimate_depth(image_path, midas, transform)
    points, colors = depth_to_point_cloud(depth, img)
    mesh = reconstruct_mesh(points)
    o3d.io.write_triangle_mesh(output_path, mesh)
    print(f"3D model saved to {output_path}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Convert image to 3D mesh")
    parser.add_argument("image", help="Path to input image")
    parser.add_argument("--output", default="output.obj", help="Path to output OBJ file")
    args = parser.parse_args()
    image_to_3d(args.image, args.output)
