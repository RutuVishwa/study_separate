import json
import re
import httpx
from app.config import (
    ALLOWED_SUBJECTS,
    MAX_CLASSIFICATION_CHARS,
    OPENROUTER_API_KEY,
    OPENROUTER_MODEL
)

SYSTEM_PROMPT = """You are a study-material classification system.

Classify the provided study material into exactly ONE of these five subjects:

1. Discrete Mathematics
2. DSA
3. OOP
4. DBMS
5. LDM

Subject definitions:

Discrete Mathematics:
Logic, propositions, sets, relations, functions, proofs, combinatorics, graph theory, mathematical reasoning, recurrence, predicate logic, etc.

DSA:
Arrays, linked lists, stacks, queues, trees, graphs, sorting, searching, hashing, recursion, algorithms, complexity, binary search, dynamic programming, etc.

OOP:
Classes, objects, constructors, inheritance, polymorphism, encapsulation, abstraction, virtual functions, C++/Java object-oriented concepts, methods, interface, etc.

DBMS:
Database concepts, SQL, relational algebra, normalization, ER models, keys, transactions, indexing, tables, queries, primary key, foreign key, SELECT, FROM, WHERE, etc.

LDM:
Logic design, digital logic, Boolean algebra, logic gates, K-maps, flip-flops, registers, microprocessors, 8086 concepts, assembly/microprocessor concepts, AND/OR/NOT gates, multiplexer, etc.

Return JSON only:

{
  "subject": "one of the five exact subject names",
  "confidence": number between 0 and 1
}

Do not invent another subject.
"""

# Heuristic keywords for robust offline fallback classification
HEURISTIC_KEYWORDS = {
    "Discrete Mathematics": [
        "proposition", "predicate", "combinatorics", "graph theory", "set theory", 
        "relation", "function", "tautology", "proof", "mathematical induction", 
        "pigeonhole", "recurrence", "lattice", "boolean algebra"
    ],
    "DSA": [
        "array", "linked list", "stack", "queue", "binary tree", "bst", "heap", 
        "graph", "sorting", "quick sort", "merge sort", "search", "hashing", 
        "time complexity", "big o", "recursion", "dijkstra", "traversal", "node", "pointer"
    ],
    "OOP": [
        "class", "object", "inheritance", "polymorphism", "encapsulation", 
        "abstraction", "virtual", "constructor", "destructor", "override", 
        "public", "private", "protected", "extends", "implements", "cpp", "java", "this->"
    ],
    "DBMS": [
        "database", "sql", "select", "from", "where", "join", "table", "schema", 
        "normalization", "1nf", "2nf", "3nf", "bcnf", "relational algebra", 
        "primary key", "foreign key", "transaction", "acid", "er diagram", "index"
    ],
    "LDM": [
        "logic gate", "and gate", "or gate", "nand", "nor", "xor", "boolean algebra", 
        "k-map", "karnaugh", "flip-flop", "multiplexer", "register", "8086", 
        "microprocessor", "assembly", "instruction set", "counter", "decoder", "cpu"
    ]
}

def prepare_text_for_classification(text: str) -> str:
    """Truncate or sample text safely if larger than MAX_CLASSIFICATION_CHARS."""
    if len(text) <= MAX_CLASSIFICATION_CHARS:
        return text
    
    half_limit = MAX_CLASSIFICATION_CHARS // 2
    first_part = text[:half_limit]
    last_part = text[-half_limit:]
    return f"{first_part}\n\n[... TRUNCATED MIDDLE CONTENT ...]\n\n{last_part}"

def heuristic_fallback_classifier(text: str) -> dict:
    """Fallback keyword-matching classifier if API key is missing or request fails."""
    text_lower = text.lower()
    scores = {subj: 0 for subj in ALLOWED_SUBJECTS}

    for subject, keywords in HEURISTIC_KEYWORDS.items():
        for kw in keywords:
            # count occurrences of keyword pattern
            matches = len(re.findall(r'\b' + re.escape(kw) + r'\b', text_lower))
            scores[subject] += matches

    total_matches = sum(scores.values())
    if total_matches == 0:
        # Default to DSA with low confidence if no keywords match
        return {"subject": "DSA", "confidence": 0.40}

    best_subject = max(scores, key=scores.get)
    best_score = scores[best_subject]
    
    # Calculate relative confidence
    confidence = round(best_score / (total_matches + 2), 2)
    confidence = max(0.50, min(0.95, confidence))

    return {"subject": best_subject, "confidence": confidence}

def classify_material(text: str) -> dict:
    """
    Classify material using OpenRouter API or heuristic fallback.
    Returns: {"subject": str, "confidence": float}
    """
    prepared_text = prepare_text_for_classification(text)

    # Use LLM via OpenRouter if API Key is set
    if OPENROUTER_API_KEY and OPENROUTER_API_KEY.strip():
        try:
            url = "https://openrouter.ai/api/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY.strip()}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://study-organizer.local",
                "X-Title": "Study Material Organizer"
            }
            payload = {
                "model": OPENROUTER_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"Material:\n{prepared_text}"}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.1
            }

            with httpx.Client(timeout=25.0) as client:
                res = client.post(url, json=payload, headers=headers)
                res.raise_for_status()
                data = res.json()
                content = data["choices"][0]["message"]["content"]
                parsed = json.loads(content)

                subj = parsed.get("subject", "").strip()
                conf = float(parsed.get("confidence", 0.90))

                # Validate returned subject strictly
                if subj in ALLOWED_SUBJECTS:
                    return {
                        "subject": subj,
                        "confidence": round(min(1.0, max(0.0, conf)), 2)
                    }
        except Exception as e:
            # Log error internally and fallback gracefully
            print(f"[Classifier API Error] Falling back to heuristic classifier: {e}")

    # Fallback to heuristic classifier
    return heuristic_fallback_classifier(prepared_text)
