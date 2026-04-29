from flask import Flask, request, jsonify
from flask_cors import CORS
from content_based import recommend_by_title, recommend_by_preferences, load_books, train_model
from collaborative import get_cf_model, refresh_cf_model
from image_detection import image_bp
import os


def load_env_file():
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if not os.path.exists(env_path):
        return

    with open(env_path, 'r', encoding='utf-8') as env_file:
        for raw_line in env_file:
            line = raw_line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, value = line.split('=', 1)
            os.environ.setdefault(key.strip(), value.strip())


load_env_file()

app = Flask(__name__)
CORS(app)
app.register_blueprint(image_bp)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


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


# ─── HYBRID ENDPOINT ──────────────────────────────────────
@app.route('/recommend/hybrid', methods=['POST'])
def hybrid():
    data = request.json

    user_id         = data.get('userId', '')
    rating_count    = data.get('ratingCount', 0)
    genres          = data.get('genres', [])
    authors         = data.get('authors', [])
    favourite_books = data.get('favouriteBooks', [])

    # Dynamic weights based on rating count
    if rating_count <= 5:
        w_content = 0.80
        w_collab  = 0.20
    elif rating_count <= 20:
        w_content = 0.50
        w_collab  = 0.50
    else:
        w_content = 0.20
        w_collab  = 0.70

    # Content-based results
    content_results = recommend_by_preferences(genres, authors, favourite_books, top_n=20)

    # Collaborative results (only if user has enough ratings)
    collab_results = []
    if rating_count >= 3 and user_id:
        try:
            model = get_cf_model()
            collab_results = model.recommend_for_user(user_id, n=20)
        except Exception as e:
            print(f"Collab error (non-fatal): {e}")

    # Merge scores
    scores = {}

    for i, book in enumerate(content_results):
        isbn = book.get('isbn', f'content_{i}')
        scores[isbn] = {
            'book': book,
            'score': w_content * (1 - i / max(len(content_results), 1))
        }

    for item in collab_results:
        isbn = item.get('isbn')
        if not isbn:
            continue
        collab_score = w_collab * item.get('score', 0.5)
        if isbn in scores:
            scores[isbn]['score'] += collab_score
        else:
            scores[isbn] = {'book': {'isbn': isbn}, 'score': collab_score}

    sorted_books = sorted(scores.values(), key=lambda x: x['score'], reverse=True)
    recommendations = [entry['book'] for entry in sorted_books[:10]]

    return jsonify({
        'recommendations': recommendations,
        'weights': {'content': w_content, 'collaborative': w_collab},
        'ratingCount': rating_count
    })


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

    port = int(os.environ.get('PORT', 8000))
    app.run(port=port, debug=True)

    
