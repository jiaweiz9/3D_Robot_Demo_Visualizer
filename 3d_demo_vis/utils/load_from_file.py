import numpy as np
import zarr
import h5py
import os
from typing import Optional

def load_data_from_zarr(path: str):# -> list:
    """Load point cloud data from a Zarr file (diffusion policy format)."""
    zarr_data = zarr.open(path, mode='r')
    num_episodes = len(zarr_data['meta/episode_ends'])
    pointclouds = []
    for traj_id in range(num_episodes):
        episode_end_index = zarr_data['meta/episode_ends'][traj_id]
        episode_start_index = zarr_data['meta/episode_ends'][traj_id - 1] if traj_id > 0 else 0
        pcd_data = zarr_data['data/point_cloud'][episode_start_index: episode_end_index]
        print(f"Loaded point cloud data for trajectory {traj_id}: shape {pcd_data.shape}")
        pcd_data[..., 3:] = pcd_data[..., 3:]  # Normalize RGB values to [0, 1]
        pointclouds.append(pcd_data)
    
    return pointclouds

def load_data_from_h5(path: str):# -> list:
    """Load point cloud data from an HDF5 file (ManiKill3 format)."""
    pointclouds = []
    with h5py.File(path, 'r') as h5_data:
        num_episodes = len(h5_data)
        print(f"Number of episodes found: {num_episodes}")
        for traj_id in range(num_episodes):
            pcd_data_xyz = h5_data[f'traj_{traj_id}/obs/pointcloud/xyzw'][..., :3] 
            pcd_data_rgb = h5_data[f'traj_{traj_id}/obs/pointcloud/rgb'][..., :3] / 255.0 
            pcd_data = np.concatenate([
                pcd_data_xyz, 
                pcd_data_rgb 
            ], axis=-1) 
            pointclouds.append(pcd_data)
    return pointclouds

def load_data_from_file(path: str) -> Optional[list]:
    """Load point cloud data from a file, supporting both Zarr and HDF5 formats."""
    if not os.path.exists(path):
        raise FileNotFoundError(f"File not found: {path}")
    
    if os.path.isdir(path):
        # If the path is a directory, **assume** it's a Zarr dataset
        return load_data_from_zarr(path)
    elif path.endswith('.h5'):
        return load_data_from_h5(path)
    else:
        raise ValueError(f"Unsupported file format: {path}")