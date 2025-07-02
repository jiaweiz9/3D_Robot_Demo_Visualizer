import zarr
from typing import Optional

def load_from_zarr(path: str, traj_id: Optional[int] = 0):
    zarr_data = zarr.open(path, mode='r')
    episode_end_index = zarr_data['meta/episode_ends'][traj_id]
    episode_start_index = zarr_data['meta/episode_ends'][traj_id - 1] if traj_id > 0 else 0
    pcd_data = zarr_data['data/point_cloud'][episode_start_index:episode_end_index]
    print(f"Loaded point cloud data from {path} for trajectory {traj_id}: shape {pcd_data.shape}")
    print(f"Episode start index: {episode_start_index}, end index: {episode_end_index}")
    assert pcd_data.shape == (episode_end_index - episode_start_index, pcd_data.shape[1], 6)

    pcd_data[..., 3:] = pcd_data[..., 3:] / 255.0  # Normalize RGB values to [0, 1]

    return pcd_data