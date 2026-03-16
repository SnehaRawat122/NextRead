import numpy as np
import pandas as pd
import pickle
import os
import requests
from PIL import Image
from io import BytesIO
import torch
import torchvision.models as models
import torchvision.transforms as transforms
from sklearn.metrics.pairwise import cosine_similarity

# ─── LOAD RESNET MODEL ───────────────────────────────────
def load_resnet():
    model = models.resnet50(pretrained=True)
    model = torch.nn.Sequential(*list(model.children())[:-1])
    model.eval()
    print("✅ ResNet50 loaded!")
    return model

# ─── IMAGE TRANSFORM ─────────────────────────────────────
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

# ─── EXTRACT FEATURES FROM FILE ──────────────────────────
def extract_features_from_file(img_path, model):
    img = Image.open(img_path).convert('RGB')
    img_tensor = transform(img).unsqueeze(0)
    with torch.no_grad():
        features = model(img_tensor)
    return features.squeeze().numpy().flatten()

# ─── EXTRACT FEATURES FROM URL ───────────────────────────
def extract_features_from_url(url, model):
    try:
        response = requests.get(url, timeout=5)
        img = Image.open(BytesIO(response.content)).convert('RGB')
        img_tensor = transform(img).unsqueeze(0)
        with torch.no_grad():
            features = model(img_tensor)
        return features.squeeze().numpy().flatten()
    except:
        return None

# ─── BUILD FEATURE DATABASE ──────────────────────────────
def build_image_features(sample_size=500):
    print("Loading books data...")
    df = pd.read_csv('data/Books.csv', encoding='latin-1', low_memory=False)
    df = df[['ISBN', 'Book-Title', 'Book-Author', 'Image-URL-L']].copy()
    df.columns = ['isbn', 'title', 'author', 'cover']
    df = df.dropna(subset=['cover'])
    df = df.sample(min(sample_size, len(df)), random_state=42)

    print(f"Extracting features from {len(df)} book covers...")
    model = load_resnet()

    features_list = []
    valid_books = []

    for idx, row in df.iterrows():
        features = extract_features_from_url(row['cover'], model)
        if features is not None:
            features_list.append(features)
            valid_books.append({
                'isbn': row['isbn'],
                'title': row['title'],
                'author': row['author'],
                'cover': row['cover']
            })
        if len(valid_books) % 100 == 0 and len(valid_books) > 0:
            print(f"Processed {len(valid_books)} books...")

    features_array = np.array(features_list)
    books_df = pd.DataFrame(valid_books)

    os.makedirs('models', exist_ok=True)
    with open('models/image_features.pkl', 'wb') as f:
        pickle.dump((features_array, books_df), f)

    print(f"✅ Image features saved for {len(valid_books)} books!")
    return features_array, books_df

# ─── LOAD SAVED FEATURES ─────────────────────────────────
def load_image_features():
    with open('models/image_features.pkl', 'rb') as f:
        return pickle.load(f)

# ─── RECOMMEND BY UPLOADED IMAGE ─────────────────────────
def recommend_by_image(img_path, top_n=10):
    try:
        model = load_resnet()
        features_array, books_df = load_image_features()

        query_features = extract_features_from_file(img_path, model)

        similarities = cosine_similarity(
            query_features.reshape(1, -1),
            features_array
        ).flatten()

        top_indices = similarities.argsort()[::-1][:top_n]

        results = []
        for idx in top_indices:
            results.append({
                'isbn': books_df.iloc[idx]['isbn'],
                'title': books_df.iloc[idx]['title'],
                'author': books_df.iloc[idx]['author'],
                'cover': books_df.iloc[idx]['cover'],
                'similarity': round(float(similarities[idx]), 3)
            })

        return results

    except Exception as e:
        print(f"Error: {e}")
        return []

if __name__ == '__main__':
    build_image_features(sample_size=500)