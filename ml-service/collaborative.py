import pandas as pd
import numpy as np
from sklearn.neighbors import NearestNeighbors
from scipy.sparse import csr_matrix
import pickle
import os

# ─── LOAD & CLEAN RATINGS ────────────────────────────────
def load_ratings():
    ratings = pd.read_csv('data/Ratings.csv', encoding='latin-1')
    ratings.columns = ['user_id', 'isbn', 'rating']

    # Sirf explicit ratings rakho
    ratings = ratings[ratings['rating'] > 0]

    # Active users — kam se kam 10 books rate ki hain
    user_counts = ratings['user_id'].value_counts()
    active_users = user_counts[user_counts >= 10].index
    ratings = ratings[ratings['user_id'].isin(active_users)]

    # Popular books — kam se kam 20 baar rated
    book_counts = ratings['isbn'].value_counts()
    popular_books = book_counts[book_counts >= 20].index
    ratings = ratings[ratings['isbn'].isin(popular_books)]

    print(f"✅ Ratings loaded: {len(ratings)} interactions")
    print(f"✅ Users: {ratings['user_id'].nunique()}")
    print(f"✅ Books: {ratings['isbn'].nunique()}")

    return ratings

# ─── LOAD BOOKS DATA ─────────────────────────────────────
def load_books_data():
    df = pd.read_csv('data/Books.csv', encoding='latin-1', low_memory=False)
    df = df[['ISBN', 'Book-Title', 'Book-Author', 'Image-URL-L']].copy()
    df.columns = ['isbn', 'title', 'author', 'cover']
    df.dropna(subset=['title'], inplace=True)
    return df

# ─── TRAIN USER-BASED KNN ────────────────────────────────
def train_collaborative(ratings):
    # User-item matrix — rows = USERS, cols = BOOKS
    user_item_matrix = ratings.pivot_table(
        index='user_id',
        columns='isbn',
        values='rating',
        fill_value=0
    )

    # Sparse matrix
    sparse_matrix = csr_matrix(user_item_matrix.values)

    # KNN on USERS
    model = NearestNeighbors(
        metric='cosine',
        algorithm='brute',
        n_neighbors=20
    )
    model.fit(sparse_matrix)

    os.makedirs('models', exist_ok=True)
    with open('models/collaborative_model.pkl', 'wb') as f:
        pickle.dump((model, user_item_matrix), f)

    print(f"✅ User-based collaborative model trained!")
    print(f"✅ Total users in model: {user_item_matrix.shape[0]}")
    return model, user_item_matrix

# ─── LOAD SAVED MODEL ────────────────────────────────────
def load_collaborative_model():
    with open('models/collaborative_model.pkl', 'rb') as f:
        return pickle.load(f)

# ─── POPULAR BOOKS FALLBACK ──────────────────────────────
def get_popular_books(user_item_matrix, top_n=10):
    try:
        books_df = load_books_data()
        book_scores = user_item_matrix.sum(axis=0).sort_values(ascending=False)
        top_isbns = book_scores.head(top_n * 2).index.tolist()

        results = []
        for isbn in top_isbns:
            book_info = books_df[books_df['isbn'] == isbn]
            if not book_info.empty:
                results.append({
                    'isbn': isbn,
                    'title': book_info.iloc[0]['title'],
                    'author': book_info.iloc[0]['author'],
                    'cover': book_info.iloc[0]['cover'],
                    'score': float(book_scores[isbn])
                })
            if len(results) >= top_n:
                break

        return results
    except Exception as e:
        print(f"Popular books error: {e}")
        return []

# ─── RECOMMEND FROM USER'S OWN RATINGS ──────────────────
def recommend_from_ratings(user_ratings, top_n=10):
    try:
        model, user_item_matrix = load_collaborative_model()

        # User ki ratings ko vector mein convert karo
        user_vector = np.zeros(len(user_item_matrix.columns))

        matched = 0
        for rating_obj in user_ratings:
            isbn = rating_obj.get('isbn')
            rating = rating_obj.get('rating', 0)
            if isbn in user_item_matrix.columns:
                col_idx = user_item_matrix.columns.get_loc(isbn)
                user_vector[col_idx] = rating
                matched += 1

        print(f"✅ Matched {matched}/{len(user_ratings)} rated books in dataset")

        # Agar koi match nahi — popular books return karo
        if matched == 0:
            print("No matches found — returning popular books")
            return get_popular_books(user_item_matrix, top_n)

        # Similar users dhundo
        distances, indices = model.kneighbors(
            user_vector.reshape(1, -1),
            n_neighbors=11
        )

        # Already read ISBNs
        already_read = set(r.get('isbn') for r in user_ratings)

        # Similar users ki books collect karo — weighted score
        weighted_scores = {}
        for i, idx in enumerate(indices.flatten()[1:]):
            similarity = 1 - distances.flatten()[i + 1]
            if similarity <= 0:
                continue
            user_row = user_item_matrix.iloc[idx]

            for isbn, rating in user_row.items():
                if rating > 0 and isbn not in already_read:
                    if isbn not in weighted_scores:
                        weighted_scores[isbn] = 0
                    weighted_scores[isbn] += similarity * rating

        # Top books sort karo
        top_books = sorted(
            weighted_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )[:top_n]

        if not top_books:
            print("No weighted scores — returning popular books")
            return get_popular_books(user_item_matrix, top_n)

        # Books data fetch karo
        books_df = load_books_data()
        results = []
        for isbn, score in top_books:
            book_info = books_df[books_df['isbn'] == isbn]
            if not book_info.empty:
                results.append({
                    'isbn': isbn,
                    'title': book_info.iloc[0]['title'],
                    'author': book_info.iloc[0]['author'],
                    'cover': book_info.iloc[0]['cover'],
                    'score': round(score, 3)
                })

        print(f"✅ Returning {len(results)} recommendations")
        return results if results else get_popular_books(user_item_matrix, top_n)

    except Exception as e:
        print(f"recommend_from_ratings error: {e}")
        return []

# ─── RECOMMEND BY KAGGLE USER ID ─────────────────────────
def recommend_for_user(user_id, top_n=10):
    try:
        model, user_item_matrix = load_collaborative_model()

        if user_id not in user_item_matrix.index:
            print(f"User {user_id} not found — popular books")
            return get_popular_books(user_item_matrix, top_n)

        user_idx = user_item_matrix.index.get_loc(user_id)

        distances, indices = model.kneighbors(
            user_item_matrix.iloc[user_idx, :].values.reshape(1, -1),
            n_neighbors=11
        )

        already_read = set(
            user_item_matrix.columns[user_item_matrix.iloc[user_idx] > 0]
        )

        weighted_scores = {}
        for i, idx in enumerate(indices.flatten()[1:]):
            similarity = 1 - distances.flatten()[i + 1]
            user_row = user_item_matrix.iloc[idx]

            for isbn, rating in user_row.items():
                if rating > 0 and isbn not in already_read:
                    if isbn not in weighted_scores:
                        weighted_scores[isbn] = 0
                    weighted_scores[isbn] += similarity * rating

        top_books = sorted(
            weighted_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )[:top_n]

        books_df = load_books_data()
        results = []
        for isbn, score in top_books:
            book_info = books_df[books_df['isbn'] == isbn]
            if not book_info.empty:
                results.append({
                    'isbn': isbn,
                    'title': book_info.iloc[0]['title'],
                    'author': book_info.iloc[0]['author'],
                    'cover': book_info.iloc[0]['cover'],
                    'score': round(score, 3)
                })

        return results if results else get_popular_books(user_item_matrix, top_n)

    except Exception as e:
        print(f"recommend_for_user error: {e}")
        return []

# ─── TRAIN FROM SCRATCH ──────────────────────────────────
if __name__ == '__main__':
    print("Loading ratings...")
    ratings = load_ratings()
    train_collaborative(ratings)