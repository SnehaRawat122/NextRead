import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import pickle
import os

# ─── LOAD & CLEAN DATA 
def load_books():
    df = pd.read_csv('data/books.csv', encoding='latin-1', low_memory=False)

    
    df = df[['ISBN', 'Book-Title', 'Book-Author', 'Year-Of-Publication', 
             'Publisher', 'Image-URL-L']].copy()

    # Rename columns
    df.columns = ['isbn', 'title', 'author', 'year', 'publisher', 'cover']

    # Clean data
    df.dropna(subset=['title', 'author'], inplace=True)
    df.drop_duplicates(subset='isbn', inplace=True)
    df.reset_index(drop=True, inplace=True)

    # combine text features
    df['combined'] = df['title'] + ' ' + df['author'] + ' ' + df['publisher'].fillna('')

    return df

# ─── TRAIN TF-IDF MODEL ──────────────────────────────────
def train_model(df):
    tfidf = TfidfVectorizer(stop_words='english', max_features=5000)
    tfidf_matrix = tfidf.fit_transform(df['combined'])

    # Model save 
    os.makedirs('models', exist_ok=True)
    with open('models/tfidf_matrix.pkl', 'wb') as f:
        pickle.dump((tfidf, tfidf_matrix, df), f)

    print(f"✅ Model trained on {len(df)} books!")
    return tfidf, tfidf_matrix, df

# ─── LOAD SAVED MODEL ────────────────────────────────────
def load_model():
    with open('models/tfidf_matrix.pkl', 'rb') as f:
        return pickle.load(f)

# ─── RECOMMEND BY BOOK TITLE ─────────────────────────────
def recommend_by_title(title, top_n=10):
    tfidf, tfidf_matrix, df = load_model()

    # Title search
    matches = df[df['title'].str.contains(title, case=False, na=False)]
    if matches.empty:
        return []

    idx = matches.index[0]

    # Cosine similarity calculation
    cosine_sim = cosine_similarity(tfidf_matrix[idx], tfidf_matrix).flatten()

    # Top matches 
    similar_indices = cosine_sim.argsort()[::-1][1:top_n+1]

    results = df.iloc[similar_indices][['title', 'author', 'cover', 'isbn']].to_dict('records')
    return results

# ─── RECOMMEND BY USER PREFERENCES ──────────────────────
def recommend_by_preferences(genres=[], authors=[], favourite_books=[], top_n=10):
    tfidf, tfidf_matrix, df = load_model()

    # User preferences
    query = ' '.join(authors) + ' ' + ' '.join(favourite_books) + ' ' + ' '.join(genres)

    if query.strip() == '':
        # Koi preference nahi — popular books return karo
        return df.head(top_n)[['title', 'author', 'cover', 'isbn']].to_dict('records')

    # Query ko vectorize karo
    tfidf_loaded = tfidf
    query_vec = tfidf_loaded.transform([query])

    # Similarity calculate karo
    cosine_sim = cosine_similarity(query_vec, tfidf_matrix).flatten()

    # Top matches lo
    top_indices = cosine_sim.argsort()[::-1][:top_n]

    results = df.iloc[top_indices][['title', 'author', 'cover', 'isbn']].to_dict('records')
    return results

# ─── TRAIN KARO PEHLI BAAR ───────────────────────────────
if __name__ == '__main__':
    print("Loading books dataset...")
    df = load_books()
    print(f"Total books loaded: {len(df)}")
    train_model(df)