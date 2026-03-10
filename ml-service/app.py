#flask API for ML model

from flask import Flask, request, jsonify
from flask_cors import CORS
from content_based import recommend_by_title, recommend_by_preferences, load_books, train_model
import os

app = Flask(__name__)
CORS(app)

# ─── HEALTH CHECK ────────────────────────────────────────
@app.route('/', methods=['GET'])
def home():
    return jsonify({'message': 'ML Service running ✅'})

# ─── RECOMMEND BY TITLE ──────────────────────────────────
@app.route('/recommend/title', methods=['POST'])
def by_title():
    data = request.json
    title = data.get('title', '')
    results = recommend_by_title(title)
    return jsonify({'recommendations': results})

# ─── RECOMMEND BY PREFERENCES (Cold Start Fix) ───────────
@app.route('/recommend/preferences', methods=['POST'])
def by_preferences():
    data = request.json
    genres = data.get('genres', [])
    authors = data.get('authors', [])
    favourite_books = data.get('favouriteBooks', [])
    results = recommend_by_preferences(genres, authors, favourite_books)
    return jsonify({'recommendations': results})

# ─── TRAIN MODEL ─────────────────────────────────────────
@app.route('/train', methods=['GET'])
def train():
    df = load_books()
    train_model(df)
    return jsonify({'message': f'Model trained on {len(df)} books ✅'})

if __name__ == '__main__':
    # Model pehle se trained hai toh load karo
    if not os.path.exists('models/tfidf_matrix.pkl'):
        print("Training model for first time...")
        df = load_books()
        train_model(df)
    app.run(port=8000, debug=True)