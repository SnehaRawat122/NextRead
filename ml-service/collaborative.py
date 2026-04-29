import os
import pandas as pd
from scipy.sparse import csr_matrix
from sklearn.neighbors import NearestNeighbors
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "nextread")
KAGGLE_CSV_PATH = os.getenv("KAGGLE_RATINGS_PATH", "./data/ratings.csv")

MIN_BOOK_RATINGS = 10
MIN_USER_RATINGS = 5
N_NEIGHBOURS = 20


def load_kaggle_ratings():
    try:
        df = pd.read_csv(
            KAGGLE_CSV_PATH,
            sep=",",
            encoding="latin-1",
            on_bad_lines="skip",
            usecols=["User-ID", "ISBN", "Book-Rating"],
        )
        df.columns = ["user_id", "isbn", "rating"]
        df["user_id"] = "kaggle_" + df["user_id"].astype(str)
        df["rating"] = pd.to_numeric(df["rating"], errors="coerce")
        df = df[df["rating"] > 0].dropna()
        return df
    except FileNotFoundError:
        print(f"Kaggle CSV not found at {KAGGLE_CSV_PATH}, skipping.")
        return pd.DataFrame(columns=["user_id", "isbn", "rating"])


def load_mongo_ratings():
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        db = client[DB_NAME]
        pipeline = [
            {
                "$lookup": {
                    "from": "books",
                    "localField": "bookId",
                    "foreignField": "_id",
                    "as": "book",
                }
            },
            {"$unwind": "$book"},
            {
                "$project": {
                    "_id": 0,
                    "userId": 1,
                    "rating": 1,
                    "isbn": "$book.isbn",
                }
            },
            {"$match": {"isbn": {"$nin": [None, ""]}}},
        ]
        records = list(db.ratings.aggregate(pipeline))
        client.close()

        if not records:
            return pd.DataFrame(columns=["user_id", "isbn", "rating"])

        df = pd.DataFrame(records)
        df.rename(columns={"userId": "user_id"}, inplace=True)
        df["user_id"] = df["user_id"].astype(str)
        df["rating"] = pd.to_numeric(df["rating"], errors="coerce")
        return df.dropna()
    except Exception as e:
        print(f"Could not connect to MongoDB: {e}")
        return pd.DataFrame(columns=["user_id", "isbn", "rating"])


def build_combined_ratings():
    kaggle_df = load_kaggle_ratings()
    mongo_df = load_mongo_ratings()

    combined = pd.concat([kaggle_df, mongo_df], ignore_index=True)
    combined.drop_duplicates(subset=["user_id", "isbn"], keep="last", inplace=True)
    return combined


class CollaborativeFilter:

    def __init__(self):
        self.model = None
        self.sparse_matrix = None
        self.isbn_index = None
        self.index_isbn = None

    def fit(self):
        df = build_combined_ratings()

        valid_books = df.groupby("isbn")["user_id"].count()
        valid_users = df.groupby("user_id")["isbn"].count()
        df = df[
            df["isbn"].isin(valid_books[valid_books >= MIN_BOOK_RATINGS].index) &
            df["user_id"].isin(valid_users[valid_users >= MIN_USER_RATINGS].index)
        ]

        if df.empty:
            print("Not enough data to build the rating matrix.")
            return

        pivot = df.pivot_table(index="isbn", columns="user_id", values="rating").fillna(0)

        self.isbn_index = {isbn: i for i, isbn in enumerate(pivot.index)}
        self.index_isbn = {i: isbn for isbn, i in self.isbn_index.items()}
        self.sparse_matrix = csr_matrix(pivot.values.astype('float32'))

        self.model = NearestNeighbors(
            n_neighbors=N_NEIGHBOURS,
            metric="cosine",
            algorithm="brute",
            n_jobs=-1,
        )
        self.model.fit(self.sparse_matrix)

    def recommend(self, isbn, n=2):
        if self.model is None:
            raise RuntimeError("Model not fitted. Call fit() first.")

        if isbn not in self.isbn_index:
            return []

        row_idx = self.isbn_index[isbn]
        distances, indices = self.model.kneighbors(
            self.sparse_matrix[row_idx], n_neighbors=n + 1
        )

        results = []
        for dist, idx in zip(distances.flatten(), indices.flatten()):
            if idx == row_idx:
                continue
            results.append({
                "isbn": self.index_isbn[idx],
                "score": round(1 - float(dist), 4),
            })

        return results[:n]

    def recommend_for_user(self, user_id, n=10):
        if self.model is None:
            raise RuntimeError("Model not fitted. Call fit() first.")

        try:
            client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            pipeline = [
                {"$match": {"userId": user_id}},
                {
                    "$lookup": {
                        "from": "books",
                        "localField": "bookId",
                        "foreignField": "_id",
                        "as": "book",
                    }
                },
                {"$unwind": "$book"},
                {
                    "$project": {
                        "_id": 0,
                        "rating": 1,
                        "isbn": "$book.isbn",
                    }
                },
                {"$match": {"isbn": {"$nin": [None, ""]}}},
            ]
            user_ratings = list(db.ratings.aggregate(pipeline))
            client.close()
        except Exception as e:
            print(f"MongoDB error: {e}")
            return []

        if not user_ratings:
            return []

        rated_isbns = {r["isbn"] for r in user_ratings}
        top_books = sorted(user_ratings, key=lambda x: x["rating"], reverse=True)[:5]

        aggregated = {}
        for item in top_books:
            for rec in self.recommend(item["isbn"], n=n):
                if rec["isbn"] not in rated_isbns:
                    if rec["isbn"] not in aggregated or rec["score"] > aggregated[rec["isbn"]]:
                        aggregated[rec["isbn"]] = rec["score"]

        sorted_recs = sorted(aggregated.items(), key=lambda x: x[1], reverse=True)
        return [{"isbn": isbn, "score": score} for isbn, score in sorted_recs[:n]]


_cf_model = None

def get_cf_model():
    global _cf_model
    if _cf_model is None:
        _cf_model = CollaborativeFilter()
        _cf_model.fit()
    return _cf_model


def refresh_cf_model():
    global _cf_model
    _cf_model = CollaborativeFilter()
    _cf_model.fit()


if __name__ == "__main__":
    model = CollaborativeFilter()
    model.fit()

    recs = model.recommend("0316769177", n=5)
    for r in recs:
        print(f"ISBN: {r['isbn']}  |  Score: {r['score']}")
