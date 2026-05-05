from flask import Flask, request, jsonify
from flask_cors import CORS
from content_based import recommend_by_title, recommend_by_preferences, load_books, train_model
from collaborative import get_cf_model, refresh_cf_model
import os
import threading

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def load_models_background():
    try:
        print("Loading collaborative model in background...")
        get_cf_model()
        print("✅ Collaborative model ready!")
    except Exception as e:
        print(f"Warning: {e}")


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


@app.route('/recommend/hybrid', methods=['POST'])
def hybrid():
    data = request.json
    user_id         = data.get('userId', '')
    rating_count    = data.get('ratingCount', 0)
    genres          = data.get('genres', [])
    authors         = data.get('authors', [])
    favourite_books = data.get('favouriteBooks', [])

    if rating_count <= 5:
        w_content, w_collab = 0.80, 0.20
    elif rating_count <= 20:
        w_content, w_collab = 0.50, 0.50
    else:
        w_content, w_collab = 0.20, 0.70

    content_results = recommend_by_preferences(genres, authors, favourite_books, top_n=20)

    collab_results = []
    if rating_count >= 3 and user_id:
        try:
            model = get_cf_model()
            collab_results = model.recommend_for_user(user_id, n=20)
        except Exception as e:
            print(f"Collab error (non-fatal): {e}")

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


@app.route('/recommend/image', methods=['POST'])
def by_image():
    # Lazy import — torch sirf tab load hoga jab actually call aaye
    try:
        from image_recommender import recommend_by_image
        if 'image' not in request.files:
            return jsonify({'error': 'No image uploaded'}), 400
        file = request.files['image']
        img_path = f"/tmp/{file.filename}"
        file.save(img_path)
        results = recommend_by_image(img_path)
        return jsonify({'recommendations': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/scan', methods=['POST'])
def scan():
    # Lazy import — Gemini/torch sirf tab load hoga
    try:
        from image_detection import detect_books
        if 'image' not in request.files:
            return jsonify({'error': 'No image uploaded'}), 400
        file = request.files['image']
        img_path = f"/tmp/{file.filename}"
        file.save(img_path)
        results = detect_books(img_path)
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


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

    t = threading.Thread(target=load_models_background, daemon=True)
    t.start()

    port = int(os.environ.get('PORT', 7860))
app.run(host='0.0.0.0', port=port, debug=False)
