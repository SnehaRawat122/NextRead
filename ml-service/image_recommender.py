import numpy as np
import pandas as pd
import pickle
import os
import requests
import urllib.parse
from PIL import Image
from io import BytesIO
import torch
import torchvision.models as models
import torchvision.transforms as transforms
from sklearn.metrics.pairwise import cosine_similarity

def load_resnet():
    model = models.resnet50(weights='ResNet50_Weights.IMAGENET1K_V1')
    model = torch.nn.Sequential(*list(model.children())[:-1])
    model.eval()
    print("✅ ResNet50 loaded!")
    return model

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

def extract_features_from_file(img_path, model):
    img = Image.open(img_path).convert('RGB')
    img_tensor = transform(img).unsqueeze(0)
    with torch.no_grad():
        features = model(img_tensor)
    return features.squeeze().numpy().flatten()

def extract_features_from_url(url, model):
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, timeout=5, headers=headers)
        img = Image.open(BytesIO(response.content)).convert('RGB')
        img_tensor = transform(img).unsqueeze(0)
        with torch.no_grad():
            features = model(img_tensor)
        return features.squeeze().numpy().flatten()
    except:
        return None

# ─── FETCH COVER FROM GOOGLE BOOKS ───────────────────────
def get_google_cover(title, author):
    try:
        q = urllib.parse.quote(f"{title} {author}")
        url = f"https://www.googleapis.com/books/v1/volumes?q={q}&maxResults=1"
        res = requests.get(url, timeout=4).json()
        items = res.get('items', [])
        if items:
            img = items[0].get('volumeInfo', {}).get('imageLinks', {})
            cover = img.get('thumbnail', '')
            if cover:
                return cover.replace('http://', 'https://')
    except:
        pass
    return ''

def build_image_features(sample_size=200):
    print("Loading books data...")
    df = pd.read_csv('data/Books.csv', encoding='latin-1', low_memory=False, on_bad_lines='skip')

    df = df[['ISBN', 'Book-Title', 'Book-Author']].copy()
    df.columns = ['isbn', 'title', 'author']
    df = df.dropna(subset=['isbn', 'title', 'author'])
    df = df.drop_duplicates(subset='isbn')
    df = df.sample(min(sample_size, len(df)), random_state=42)
    df.reset_index(drop=True, inplace=True)

    print(f"Fetching covers from Google Books for {len(df)} books...")
    print("(This will take ~5-8 minutes, please wait...)\n")

    model = load_resnet()

    features_list = []
    valid_books = []
    failed = 0

    for idx, row in df.iterrows():
        # Step 1: Get cover URL from Google Books
        cover_url = get_google_cover(row['title'], row['author'])
        if not cover_url:
            failed += 1
            continue

        # Step 2: Extract ResNet features
        features = extract_features_from_url(cover_url, model)
        if features is not None:
            features_list.append(features)
            valid_books.append({
                'isbn': row['isbn'],
                'title': row['title'],
                'author': row['author'],
                'cover': cover_url
            })

        total_done = len(valid_books) + failed
        if total_done % 25 == 0 and total_done > 0:
            print(f"  Progress: {total_done}/{len(df)} | ✅ Success: {len(valid_books)} | ❌ Failed: {failed}")

    if not valid_books:
        print("❌ No books processed. Check internet connection.")
        return None, None

    features_array = np.array(features_list)
    books_df = pd.DataFrame(valid_books)

    os.makedirs('models', exist_ok=True)
    with open('models/image_features.pkl', 'wb') as f:
        pickle.dump((features_array, books_df), f)

    print(f"\n🎉 Done! Image features saved for {len(valid_books)} books!")
    return features_array, books_df

def load_image_features():
    with open('models/image_features.pkl', 'rb') as f:
        return pickle.load(f)

def recommend_by_image(img_path, top_n=10):
    try:
        model = load_resnet()
        features_array, books_df = load_image_features()
        query_features = extract_features_from_file(img_path, model)
        similarities = cosine_similarity(query_features.reshape(1, -1), features_array).flatten()
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
    build_image_features(sample_size=200)