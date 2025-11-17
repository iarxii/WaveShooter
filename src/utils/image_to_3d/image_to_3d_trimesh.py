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

def create_depth_mesh(depth, img):
    h, w = depth.shape
    fx = fy = w
    cx, cy = w / 2, h / 2
    step = 4  # downsample
    h_down = h // step
    w_down = w // step
    vertices = []
    colors = []
    for y in range(0, h, step):
        for x in range(0, w, step):
            Z = depth[y, x]
            X = (x - cx) * Z / fx
            Y = (y - cy) * Z / fy
            vertices.append([X, -Y, Z])
            colors.append(img[y, x] / 255.0)
    
    faces = []
    for y in range(h_down - 1):
        for x in range(w_down - 1):
            i = y * w_down + x
            faces.append([i, i + 1, i + w_down])
            faces.append([i + 1, i + w_down + 1, i + w_down])
    
    mesh = trimesh.Trimesh(vertices=vertices, faces=faces)
    return mesh, colors

def image_to_3d(image_path, output_obj="output.obj", output_ply="output.ply", output_glb="output.glb"):
    midas, transform = load_midas_model()
    depth, img = estimate_depth(image_path, midas, transform)
    points, colors = depth_to_point_cloud(depth, img)
    mesh, mesh_colors = create_depth_mesh(depth, img)
    print(f"Mesh has {len(mesh.vertices)} vertices and {len(mesh.faces)} faces")
    print(f"Bounding box: {mesh.bounds}")
    # Center the mesh
    mesh.apply_translation(-mesh.centroid)
    # Scale down to reasonable size
    mesh.apply_scale(0.01)
    print(f"After scaling, bounding box: {mesh.bounds}")
    print(f"After centering, centroid: {mesh.centroid}")
    mesh.export(output_obj)
    # Export point cloud as PLY
    ply_cloud = trimesh.points.PointCloud(points, colors=colors)
    ply_cloud.export(output_ply)
    # Export as GLB
    mesh.export(output_glb)
    print(f"3D model saved to {output_obj}, point cloud to {output_ply}, and GLB to {output_glb}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Convert image to 3D mesh and point cloud")
    parser.add_argument("image", help="Path to input image")
    parser.add_argument("--obj", default="output.obj", help="Path to output OBJ file")
    parser.add_argument("--ply", default="output.ply", help="Path to output PLY file")
    parser.add_argument("--glb", default="output.glb", help="Path to output GLB file")
    args = parser.parse_args()
    image_to_3d(args.image, args.obj, args.ply, args.glb)
