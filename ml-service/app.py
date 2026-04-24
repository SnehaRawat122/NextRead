from flask import Flask, request, jsonify
from flask_cors import CORS
from content_based import recommend_by_title, recommend_by_preferences, load_books, train_model
from collaborative import get_cf_model, refresh_cf_model, build_combined_ratings
import os

app = Flask(__name__)
CORS(app)


@app.route('/', methods=['GET'])
def home():
    return jsonify({'message': 'ML Service running ✅'})


@app.route('/recommend/title', methods=['POST'])
def by_title():
    data = request.json
    title = data.get('title', '')
    results = recommend_by_title(title)
    return jsonify({'recommendations': results})


@app.route('/recommend/preferences', methods=['POST'])
def by_preferences():
    data = request.json
    genres = data.get('genres', [])
    authors = data.get('authors', [])
    favourite_books = data.get('favouriteBooks', [])
    results = recommend_by_preferences(genres, authors, favourite_books)
    return jsonify({'recommendations': results})


@app.route('/recommend/collaborative', methods=['POST'])
def collaborative():
    data = request.json
    user_id = data.get('userId', '')
    isbn = data.get('isbn', '')

    model = get_cf_model()

    if user_id:
        results = model.recommend_for_user(user_id, n=10)
    elif isbn:
        results = model.recommend(isbn, n=10)
    else:
        results = []

    return jsonify({'recommendations': results})


@app.route('/train', methods=['GET'])
def train():
    df = load_books()
    train_model(df)
    return jsonify({'message': 'Content model trained ✅'})


@app.route('/train/collaborative', methods=['GET'])
def train_collab():
    refresh_cf_model()
    return jsonify({'message': 'Collaborative model trained ✅'})


if __name__ == '__main__':
    if not os.path.exists('models/tfidf_matrix.pkl'):
        print("Training content model...")
        df = load_books()
        train_model(df)

    print("Loading collaborative model...")
    get_cf_model()

    app.run(port=8000, debug=True)