from flask import Flask, render_template, request, jsonify, send_from_directory
import flask_cors
import numpy as np
import os
from loader.load_from_zarr import load_data_from_zarr

class VisualizerApp:
    cached_pointcloud_data = None

    def __init__(self):
        self.flask_app = Flask(__name__, template_folder='templates', static_folder='static')
        flask_cors.CORS(self.flask_app)
        self.setup_routes()

    def setup_routes(self):
        @self.flask_app.route('/')
        def index():
            return render_template('index.html')
        
        @self.flask_app.route('/mesh')
        def mesh():
            return render_template('mesh.html')

        @self.flask_app.route('/load_zarr', methods=['POST'])
        def load_zarr_data():
            try:
                data = request.get_json()
                file_path = data.get('path', '')
                
                if not file_path:
                    return jsonify({'success': False, 'error': 'path is required'})
                
                if not os.path.exists(file_path):
                    return jsonify({'success': False, 'error': f'path is invalid: {file_path}'})
                
                point_cloud_list = load_data_from_zarr(file_path) 
                
                if len(point_cloud_list) <= 0:
                    return jsonify({
                        'success': False, 
                        'error': f'No point cloud data found in {file_path}'
                    })
                if len((episode_data := point_cloud_list[0]).shape) != 3:
                    return jsonify({
                        'success': False, 
                        'error': f'Invalid point cloud data shape: {episode_data.shape}'
                    })
                
                VisualizerApp.cached_pointcloud_data = [
                    episode_data.reshape(episode_data.shape[0], -1) for episode_data in point_cloud_list
                ]
                
                return jsonify({
                    'success': True,
                    'episode_count': len(point_cloud_list),
                    'message': f'Successfully loaded {len(point_cloud_list)} episodes'
                })
                
            except Exception as e:
                return jsonify({'success': False, 'error': f'failed: {str(e)}'})
        
        @self.flask_app.route('/show_episode', methods=['POST'])
        def show_episode():
            try:
                data = request.get_json()
                episode_id = data.get('episode_id', 0)
                
                if VisualizerApp.cached_pointcloud_data is None:
                    return jsonify({'success': False, 'error': 'No point cloud data loaded'})
                
                if episode_id < 0 or episode_id >= len(VisualizerApp.cached_pointcloud_data):
                    return jsonify({'success': False, 'error': 'Invalid episode ID'})
                
                episode_data = VisualizerApp.cached_pointcloud_data[episode_id]
                return jsonify({'success': True, 'episode_data': episode_data.tolist()})
                
            except Exception as e:
                return jsonify({'success': False, 'error': f'failed: {str(e)}'})
        

        @self.flask_app.route('/load_mesh', methods=['POST'])
        def load_mesh_from_path():
            data = request.get_json()
            file_path = data.get('file_path', '')
            print(f"Loading mesh from path: {file_path}")
            if not file_path:
                return jsonify({'success': False, 'error': 'path is required'})

            print(f"Checking if file exists: {os.path.exists(file_path)}")
            print(f"Checking if path is a file: {os.path.isfile(file_path)}")

            if not os.path.exists(file_path) or not os.path.isfile(file_path):
                return jsonify({'success': False, 'error': f'path is invalid: {file_path}'})
                
            try:
                directory = os.path.dirname(file_path)
                filename = os.path.basename(file_path)
                return send_from_directory(directory, filename)
            except Exception as e:
                return jsonify({'success': False, 'error': "An error occurred while reading the file", 'details': str(e)}), 500


    def run(self, debug=True, port=8000):
        self.flask_app.run(debug=debug, port=port)


if __name__ == "__main__":
    app = VisualizerApp()
    app.run()