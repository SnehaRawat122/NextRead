import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import pickle
import os
import requests

#LOAD AND CLEAN DATA 
def load_books():
    df = pd.read_csv('data/Books.csv', encoding='latin-1', low_memory=False)
    df = df[['ISBN', 'Book-Title', 'Book-Author', 'Year-Of-Publication',
             'Publisher', 'Image-URL-L']].copy()
    df.columns = ['isbn', 'title', 'author', 'year', 'publisher', 'cover']
    df.dropna(subset=['title', 'author'], inplace=True)
    df.drop_duplicates(subset='isbn', inplace=True)
    df.reset_index(drop=True, inplace=True)
    df['combined'] = df['title'] + ' ' + df['author'] + ' ' + df['publisher'].fillna('')
    return df


# TRAIN TF-IDF MODEL 
def train_model(df):
    tfidf = TfidfVectorizer(stop_words='english', max_features=5000)
    tfidf_matrix = tfidf.fit_transform(df['combined'])
    os.makedirs('models', exist_ok=True)
    with open('models/tfidf_matrix.pkl', 'wb') as f:
        pickle.dump((tfidf, tfidf_matrix, df), f)
    print(f"✅ Model trained on {len(df)} books!")
    return tfidf, tfidf_matrix, df

# LOAD SAVED MODEL 
def load_model():
    with open('models/tfidf_matrix.pkl', 'rb') as f:
        return pickle.load(f)

# GOOGLE BOOKS COVER FETCH 
def enrich_with_google(books):
    enriched = []
    for book in books:
        try:
            query = f"{book['title']} {book['author']}"
            url = f"https://www.googleapis.com/books/v1/volumes?q={query}&maxResults=1"
            res = requests.get(url, timeout=3).json()
            items = res.get('items', [])
            if items:
                img = items[0].get('volumeInfo', {}).get('imageLinks', {})
                cover = img.get('thumbnail', book.get('cover', ''))
                book['cover'] = cover.replace('http://', 'https://')
            else:
                book['cover'] = book.get('cover', '')
        except:
            book['cover'] = book.get('cover', '')
        enriched.append(book)
    return enriched

# RECOMMEND BY BOOK TITLE 
def recommend_by_title(title, top_n=10):
    tfidf, tfidf_matrix, df = load_model()

    matches = df[df['title'].str.contains(title, case=False, na=False)]
    if matches.empty:
        return []

    idx = matches.index[0]
    cosine_sim = cosine_similarity(tfidf_matrix[idx], tfidf_matrix).flatten()
    similar_indices = cosine_sim.argsort()[::-1][1:top_n+1]

    results = df.iloc[similar_indices][['title', 'author', 'cover', 'isbn']].to_dict('records')
    return enrich_with_google(results)  ##return image.

#RECOMMEND BY USER PREFERENCES
def recommend_by_preferences(genres=[], authors=[], favourite_books=[], top_n=10):
    tfidf, tfidf_matrix, df = load_model()

    query = ' '.join(authors) + ' ' + ' '.join(favourite_books) + ' ' + ' '.join(genres)

    if query.strip() == '':
        results = df.head(top_n)[['title', 'author', 'cover', 'isbn']].to_dict('records')
        return enrich_with_google(results)

    tfidf_loaded = tfidf
    query_vec = tfidf_loaded.transform([query])
    cosine_sim = cosine_similarity(query_vec, tfidf_matrix).flatten()
    top_indices = cosine_sim.argsort()[::-1][:top_n]

    results = df.iloc[top_indices][['title', 'author', 'cover', 'isbn']].to_dict('records')
    return enrich_with_google(results)  # enrich with Google Books covers

# TRAIN FROM SCRATCH
if __name__ == '__main__':
    print("Loading books dataset...")
    df = load_books()
    print(f"Total books loaded: {len(df)}")
    train_model(df)