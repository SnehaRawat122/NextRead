import os
import base64
import pickle
import numpy as np
from flask import Blueprint, request, jsonify
from PIL import Image
import io
import torch
import torchvision.models as models
import torchvision.transforms as transforms
from sklearn.metrics.pairwise import cosine_similarity

image_detection_bp = Blueprint('image_detection', __name__)

# ─── LOAD RESNET MODEL (singleton) ───────────────────────
_resnet_model = None

def get_resnet_model():
    global _resnet_model
    if _resnet_model is None:
        model = models.resnet50(pretrained=True)
        model = torch.nn.Sequential(*list(model.children())[:-1])
        model.eval()
        _resnet_model = model
        print("✅ ResNet50 loaded for image search!")
    return _resnet_model

# ─── IMAGE TRANSFORM ─────────────────────────────────────
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

# ─── EXTRACT FEATURES FROM PIL IMAGE ────────────────────
def extract_features(pil_image):
    model = get_resnet_model()
    img = pil_image.convert('RGB')
    img_tensor = transform(img).unsqueeze(0)
    with torch.no_grad():
        features = model(img_tensor)
    return features.squeeze().numpy().flatten()

# ─── LOAD SAVED IMAGE FEATURE DATABASE ──────────────────
def load_image_features():
    features_path = 'models/image_features.pkl'
    if not os.path.exists(features_path):
        return None, None
    with open(features_path, 'rb') as f:
        features_array, books_df = pickle.load(f)
    return features_array, books_df


# ════════════════════════════════════════════════════════
# ENDPOINT 1: /image-search/detect
# Old: Gemini identified book titles from a bookshelf photo
# New: ResNet finds visually similar books from feature DB
# ════════════════════════════════════════════════════════
@image_detection_bp.route('/image-search/detect', methods=['POST'])
def detect_books():
    data = request.get_json()
    image_base64 = data.get('image')

    if not image_base64:
        return jsonify({'error': 'No image provided'}), 400

    try:
        # Decode base64 image
        image_bytes = base64.b64decode(image_base64)
        pil_image = Image.open(io.BytesIO(image_bytes))

        # Extract features from uploaded image
        query_features = extract_features(pil_image)

        # Load pre-built feature database
        features_array, books_df = load_image_features()

        if features_array is None or len(features_array) == 0:
            return jsonify({
                'error': 'Image feature database not built yet.',
                'fix': 'Run: python image_recommender.py from ml-service folder to build it.'
            }), 503

        # Ensure features_array is 2D
        if features_array.ndim == 1:
            features_array = features_array.reshape(1, -1)

        # Cosine similarity against all stored book covers
        similarities = cosine_similarity(
            query_features.reshape(1, -1),
            features_array
        ).flatten()

        top_n = 10
        top_indices = similarities.argsort()[::-1][:top_n]

        # Return visually similar books
        books = []
        for idx in top_indices:
            books.append({
                'title': books_df.iloc[idx]['title'],
                'author': books_df.iloc[idx]['author'],
                'isbn': books_df.iloc[idx]['isbn'],
                'cover': books_df.iloc[idx]['cover'],
                'confidence': round(float(similarities[idx]), 3)  # similarity score
            })

        return jsonify({'books': books, 'count': len(books)})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# ════════════════════════════════════════════════════════
# ENDPOINT 2: /image-search/recommend
# Old: Gemini generated recommendations from book titles
# New: content_based.py's recommend_by_title() does the same
# ════════════════════════════════════════════════════════
@image_detection_bp.route('/image-search/recommend', methods=['POST'])
def recommend_from_books():
    data = request.get_json()
    detected_books = data.get('detectedBooks', [])   # from /detect response
    user_history = data.get('userHistory', [])

    # Merge detected + history books as seed titles
    seed_books = detected_books + [
        {'title': b['title'], 'author': b.get('author', 'unknown')}
        for b in user_history[:10]
    ]

    if not seed_books:
        return jsonify({'recommendations': []}), 200

    try:
        from content_based import recommend_by_title, recommend_by_preferences

        all_recs = {}

        # Get recommendations for each detected book (top seeds only)
        for book in seed_books[:5]:
            title = book.get('title', '')
            if not title:
                continue
            recs = recommend_by_title(title, top_n=5)
            for r in recs:
                key = r.get('isbn', r.get('title', ''))
                # Keep highest-scored unique book
                if key not in all_recs:
                    all_recs[key] = r

        # Fallback: if no recs found, use preferences-based
        if not all_recs:
            authors = [b.get('author', '') for b in seed_books if b.get('author')]
            titles = [b.get('title', '') for b in seed_books if b.get('title')]
            fallback = recommend_by_preferences(
                genres=[], authors=authors, favourite_books=titles, top_n=8
            )
            return jsonify({'recommendations': fallback})

        # Return top 8 unique recommendations
        results = list(all_recs.values())[:8]
        return jsonify({'recommendations': results})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
