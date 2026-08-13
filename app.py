import os
from flask import Flask, render_template

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE_DIR = os.path.join(BASE_DIR, 'templates')

app = Flask(__name__, template_folder=TEMPLATE_DIR)

@app.route('/') # type: ignore
def home():
    return render_template('index.html')

if __name__ == "__main__":
    app.run(debug=True)