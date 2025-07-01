from flask import Flask, render_template
import flask_cors
import numpy as np

flask_app = Flask(__name__, template_folder='templates', static_folder='static')
flask_cors.CORS(flask_app)

@flask_app.route('/')
def index():
    return render_template('index.html')


if __name__ == "__main__":
    flask_app.run(debug=True, port=8000)