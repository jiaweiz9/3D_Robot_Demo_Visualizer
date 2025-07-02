from flask import Flask, render_template, request, jsonify
import flask_cors
import numpy as np
import os

from loader.load_from_zarr import load_from_zarr

flask_app = Flask(__name__, template_folder='templates', static_folder='static')
flask_cors.CORS(flask_app)

@flask_app.route('/')
def index():
    return render_template('index.html')

@flask_app.route('/load_zarr', methods=['POST'])
def load_zarr_data():
    try:
        data = request.get_json()
        file_path = data.get('path', '')
        traj_id = data.get('traj_id', 0)
        
        if not file_path:
            return jsonify({'success': False, 'error': 'path is required'})
        
        if not os.path.exists(file_path):
            return jsonify({'success': False, 'error': f'path is invalid: {file_path}'})
        
        point_cloud_array = load_from_zarr(file_path, traj_id)
        print(point_cloud_array.shape)
        
        if len(point_cloud_array.shape) != 3 or point_cloud_array.shape[2] != 6:
            return jsonify({
                'success': False, 
                'error': f'Shape error. Expected (frames, points, 6), actually got {point_cloud_array.shape}'
            })
        
        point_cloud_data = np.array(point_cloud_array[:])
        frames, points_per_frame, features = point_cloud_data.shape
        
        formatted_data = []
        for frame_idx in range(frames):
            frame_data = point_cloud_data[frame_idx].flatten()  # flatten to (points*6,)
            formatted_data.append(frame_data.tolist())
        
        print(len(formatted_data))
        return jsonify({
            'success': True,
            'point_cloud_data': formatted_data,
            'frames': frames,
            'points_per_frame': points_per_frame,
            'features': features,
            'message': f'Successfully loaded {frames} frames; {points_per_frame} points per frame'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': f'failed: {str(e)}'})

if __name__ == "__main__":
    flask_app.run(debug=True, port=8000)