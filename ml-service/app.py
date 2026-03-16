from flask import Flask, request, jsonify
from flask_cors import CORS
from content_based import recommend_by_title, recommend_by_preferences, load_books, train_model
from collaborative import recommend_from_ratings, load_ratings, train_collaborative, load_collaborative_model, get_popular_books
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

# ─── RECOMMEND BY PREFERENCES (Cold Start) ───────────────
@app.route('/recommend/preferences', methods=['POST'])
def by_preferences():
    data = request.json
    genres = data.get('genres', [])
    authors = data.get('authors', [])
    favourite_books = data.get('favouriteBooks', [])
    results = recommend_by_preferences(genres, authors, favourite_books)
    return jsonify({'recommendations': results})

# ─── USER-BASED COLLABORATIVE ────────────────────────────
@app.route('/recommend/collaborative', methods=['POST'])
def collaborative():
    data = request.json
    user_ratings = data.get('user_ratings', [])

    if not user_ratings:
        try:
            model, user_item_matrix = load_collaborative_model()
            results = get_popular_books(user_item_matrix, top_n=10)
            return jsonify({'recommendations': results})
        except:
            return jsonify({'recommendations': []})

    results = recommend_from_ratings(user_ratings)
    return jsonify({'recommendations': results})

# ─── TRAIN CONTENT MODEL ─────────────────────────────────
@app.route('/train', methods=['GET'])
def train():
    df = load_books()
    train_model(df)
    return jsonify({'message': 'Content model trained ✅'})

# ─── TRAIN COLLABORATIVE MODEL ───────────────────────────
@app.route('/train/collaborative', methods=['GET'])
def train_collab():
    ratings = load_ratings()
    train_collaborative(ratings)
    return jsonify({'message': 'Collaborative model trained ✅'})

if __name__ == '__main__':
    if not os.path.exists('models/tfidf_matrix.pkl'):
        print("Training content model...")
        df = load_books()
        train_model(df)
    if not os.path.exists('models/collaborative_model.pkl'):
        print("Training collaborative model...")
        ratings = load_ratings()
        train_collaborative(ratings)
    app.run(port=8000, debug=True)