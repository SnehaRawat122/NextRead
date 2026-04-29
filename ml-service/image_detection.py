import os
import json
import base64
from google import genai
from flask import Blueprint, request, jsonify
from PIL import Image
import io

image_bp = Blueprint('image', __name__)

client = genai.Client(api_key=os.environ.get('GEMINI_API_KEY'))

@image_bp.route('/image-search/detect', methods=['POST'])
def detect_books():
    data = request.get_json()
    image_base64 = data.get('image')
    
    if not image_base64:
        return jsonify({'error': 'No image provided'}), 400
    
    try:
        image_bytes = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_bytes))
        
        prompt = """Look at this bookshelf image and identify all visible book titles and authors.
Return ONLY a JSON array, no markdown, no explanation:
[{"title":"Book Title","author":"Author Name","confidence":0.9},...]
confidence is 0.0 to 1.0 based on how clearly you can read it.
Return empty array [] if no books are visible."""

        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=[prompt, image]
        )
        
        raw = response.text.strip()
        raw = raw.replace('```json', '').replace('```', '').strip()
        books = json.loads(raw)
        
        return jsonify({'books': books, 'count': len(books)})
    
    except json.JSONDecodeError:
        return jsonify({'error': 'Could not parse response', 'raw': response.text}), 500
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@image_bp.route('/image-search/recommend', methods=['POST'])
def recommend_from_books():
    data = request.get_json()
    detected_books = data.get('detectedBooks', [])
    user_history = data.get('userHistory', [])
    
    all_books = detected_books + [
        {'title': b['title'], 'author': b.get('author', 'unknown')} 
        for b in user_history[:10]
    ]
    
    book_list = ', '.join([
        f'"{b["title"]}" by {b.get("author", "unknown")}' 
        for b in all_books[:15]
    ])
    
    try:
        prompt = f"""Based on this reading collection: {book_list}
Recommend 8 books they would enjoy. Return ONLY a JSON array, no markdown:
[{{"title":"Title","author":"Author","genre":"Genre","reason":"why they'd like it in max 10 words","matchScore":0.92}}]"""

        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt
        )
        raw = response.text.strip().replace('```json', '').replace('```', '').strip()
        recs = json.loads(raw)
        
        return jsonify({'recommendations': recs})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500