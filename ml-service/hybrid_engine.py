from content_based import load_model
from collaborative import get_cf_model
from sklearn.metrics.pairwise import cosine_similarity


# ─── DYNAMIC WEIGHT RESOLVER ─────────────────────────────
def get_weights(rating_count):
    if rating_count <= 5:
        return {'cb': 0.80, 'cf': 0.20, 'img': 0.00}
    elif rating_count <= 20:
        return {'cb': 0.50, 'cf': 0.50, 'img': 0.00}
    else:
        return {'cb': 0.20, 'cf': 0.70, 'img': 0.10}


# ─── NORMALIZE SCORES TO 0-1 ─────────────────────────────
def normalize(scores: dict) -> dict:
    if not scores:
        return {}
    max_val = max(scores.values())
    if max_val == 0:
        return scores
    return {k: round(v / max_val, 4) for k, v in scores.items()}


# ─── CONTENT-BASED SCORES (no Google API) ────────────────
def get_cb_scores(genres, authors, favourite_books, top_n=50):
    try:
        tfidf, tfidf_matrix, df = load_model()

        query = ' '.join(authors) + ' ' + ' '.join(favourite_books) + ' ' + ' '.join(genres)

        if query.strip() == '':
            results = df.head(top_n).copy()
            results['similarity'] = 0.5
        else:
            query_vec = tfidf.transform([query])
            cosine_sim = cosine_similarity(query_vec, tfidf_matrix).flatten()
            top_indices = cosine_sim.argsort()[::-1][:top_n]
            results = df.iloc[top_indices].copy()
            results['similarity'] = cosine_sim[top_indices]

        scores = {}
        for _, row in results.iterrows():
            isbn = row.get('isbn')
            if isbn:
                scores[str(isbn)] = float(row.get('similarity', 0.5))
        return scores

    except Exception as e:
        print(f"CB scores error: {e}")
        return {}


# ─── COLLABORATIVE SCORES ─────────────────────────────────
def get_cf_scores(user_id, rating_count, top_n=50):
    try:
        if rating_count == 0:
            return {}

        model = get_cf_model()
        cf_results = model.recommend_for_user(user_id, n=top_n)

        scores = {}
        for item in cf_results:
            isbn = item.get('isbn')
            score = item.get('score', 0)
            if isbn:
                scores[str(isbn)] = float(score)
        return scores

    except Exception as e:
        print(f"CF scores error: {e}")
        return {}


# ─── ATTACH METADATA FROM DF ──────────────────────────────
def attach_metadata(sorted_books, weights):
    try:
        _, _, df = load_model()
        df['isbn'] = df['isbn'].astype(str)

        results = []
        for isbn, score in sorted_books:
            row = df[df['isbn'] == str(isbn)]
            if not row.empty:
                r = row.iloc[0]
                cover = r.get('cover', '') if isinstance(r.get('cover', ''), str) else ''
                results.append({
                    'isbn': isbn,
                    'title': r['title'],
                    'author': r['author'],
                    'cover': cover.replace('http://', 'https://') if cover else '',
                    'finalScore': score,
                    'weights': weights
                })
            else:
                results.append({
                    'isbn': isbn,
                    'title': 'Unknown',
                    'author': 'Unknown',
                    'cover': '',
                    'finalScore': score,
                    'weights': weights
                })
        return results

    except Exception as e:
        print(f"Metadata attach error: {e}")
        return [{'isbn': isbn, 'finalScore': score, 'weights': weights}
                for isbn, score in sorted_books]


# ─── MAIN HYBRID FUNCTION ────────────────────────────────
def hybrid_recommend(user_id, rating_count, genres=[], authors=[], favourite_books=[], top_n=10):

    # Step 1: Weights decide karo
    weights = get_weights(rating_count)
    print(f"User {user_id} | Ratings: {rating_count} | Weights: {weights}")

    # Step 2: Scores fetch karo dono modules se
    cb_scores = get_cb_scores(genres, authors, favourite_books, top_n=50)
    cf_scores = get_cf_scores(user_id, rating_count, top_n=50)

    print(f"CB candidates: {len(cb_scores)} | CF candidates: {len(cf_scores)}")

    # Step 3: Normalize
    cb_scores = normalize(cb_scores)
    cf_scores = normalize(cf_scores)

    # Step 4: Merge with weights
    all_isbns = set(cb_scores.keys()) | set(cf_scores.keys())

    merged = {}
    for isbn in all_isbns:
        cb = cb_scores.get(isbn, 0)
        cf = cf_scores.get(isbn, 0)
        final = round(
            weights['cb'] * cb +
            weights['cf'] * cf,
            4
        )
        merged[isbn] = final

    # Step 5: Sort and top N
    sorted_books = sorted(merged.items(), key=lambda x: x[1], reverse=True)[:top_n]
    print(f"Top {top_n} merged results ready")

    # Step 6: Metadata attach karo
    return attach_metadata(sorted_books, weights)