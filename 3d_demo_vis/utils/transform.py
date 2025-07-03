import transforms3d
import numpy as np
import os

def quaternion_to_rotation_matrix(quaternion):
    """
    Convert a quaternion to a rotation matrix.
    Args:
        quaternion (list or np.ndarray): A quaternion represented as [w, x, y, z].
    Returns:
        np.ndarray: A 3x3 rotation matrix.
    """
    return transforms3d.quaternions.quat2mat(quaternion)


def record_pose(pose, file_path:str, current_frame:int = -1):
    """
    Record the pose to a file.
    Args:
        pose (list or np.ndarray): The pose to record, which is a (7,) array containing
                                   [x, y, z, qw, qx, qy, qz]
                                   where (x, y, z) is the position and (qw, qx, qy, qz) is the quaternion orientation.
        file_path (str): The path to the file where the pose will be saved.
        current_frame (int): The frame number for which the pose is recorded. Defaults to -1.
    """
    if isinstance(pose, list):
        pose = np.array(pose)
    if pose.shape != (7,):
        raise ValueError("Pose must be a 7-element array: [x, y, z, qw, qx, qy, qz]")
    
    if current_frame == -1:
        # annotating mesh
        mesh_dir = os.path.dirname(file_path) 
        annoted_pose_file = os.path.join(mesh_dir, "annotated_poses.csv")
        print(f"Recording pose to {annoted_pose_file} for mesh annotation.")
    elif current_frame >= 0:
        # annotating point cloud
        if file_path.endswith('.h5'): # h5 format demo
            annoted_pose_file = file_path.replace('.h5', '_annotated_poses.csv')
        elif os.path.isdir(file_path): # zarr format demo
            annoted_pose_file = file_path + "_annotated_poses.csv"
        print(f"Recording pose to {annoted_pose_file} for point cloud annotation.")
    else:
        raise ValueError("Current frame must be -1 or a positive integer.")
    
    if not os.path.exists(annoted_pose_file):
        with open(annoted_pose_file, 'w') as f:
            f.write("frame,x,y,z,qw,qx,qy,qz\n")

    with open(annoted_pose_file, 'a') as f:
        f.write(f"{current_frame},{pose[0]},{pose[1]},{pose[2]},{pose[3]},{pose[4]},{pose[5]},{pose[6]}\n")