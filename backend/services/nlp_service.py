import re
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer


class NLPService:
    def __init__(self):
        self.analyzer = SentimentIntensityAnalyzer()
        self.stop_words = set("a an the and or but if to of in on at by for from with about as is are was were be been being i me my we our you your he she they it this that these those".split())
        self.dream_symbol_lexicon = {
            "People": ["person", "people", "someone", "man", "woman", "stranger"],
            "Family": ["mother", "father", "sister", "brother", "parent", "family", "grandma", "grandpa", "mom", "dad"],
            "Death": ["death", "dead", "die", "dying", "killed", "corpse", "grave", "funeral"],
            "Water": ["water", "ocean", "sea", "river", "lake", "flood", "drowning", "swim", "rain"],
            "Flying": ["flying", "fly", "float", "soar", "levitate", "airborne"],
            "Falling": ["falling", "fall", "drop", "plunge", "tumble"],
            "Animals": ["animal", "dog", "cat", "snake", "bird", "wolf", "lion", "bear", "horse"],
            "School": ["school", "class", "teacher", "student", "exam", "test", "homework", "university", "college"],
            "Work": ["work", "job", "office", "boss", "meeting", "career", "colleague", "deadline"],
            "Relationships": ["relationship", "boyfriend", "girlfriend", "partner", "husband", "wife", "love", "divorce", "breakup"],
            "Unknown entities": ["shadow", "entity", "figure", "unknown", "presence", "creature", "demon", "ghost", "spirit"]
        }

    def preprocess(self, text: str) -> str:
        tokens = re.findall(r"[a-z0-9]+", str(text).lower())
        return " ".join(self._lemma(token) for token in tokens if token not in self.stop_words)

    @staticmethod
    def _lemma(token: str) -> str:
        """Small deterministic inflection normalizer; avoids external corpus downloads."""
        if len(token) > 4 and token.endswith("ies"):
            return token[:-3] + "y"
        if len(token) > 5 and token.endswith("ing"):
            root = token[:-3]
            return root[:-1] if len(root) > 2 and root[-1] == root[-2] else root
        if len(token) > 4 and token.endswith("ed"):
            root = token[:-2]
            return root[:-1] if len(root) > 2 and root[-1] == root[-2] else root
        if len(token) > 3 and token.endswith("s") and not token.endswith("ss"):
            return token[:-1]
        return token

    def vader_analyze(self, text: str) -> dict:
        scores = self.analyzer.polarity_scores(str(text))
        compound = scores["compound"]
        label = "Positive" if compound >= .05 else "Negative" if compound <= -.05 else "Neutral"
        return {**scores, "label": label}

    def symbol_match(self, text: str) -> dict:
        text = str(text).lower()
        return {symbol: sum(len(re.findall(rf"\b{re.escape(word)}\b", text)) for word in words)
                for symbol, words in self.dream_symbol_lexicon.items()
                if any(re.search(rf"\b{re.escape(word)}\b", text) for word in words)}

    def compute_tfidf_similarity(self, query_clean: str, corpus_clean_texts: list, top_n: int = 5):
        if not corpus_clean_texts or not query_clean.strip():
            return []
        try:
            vectorizer = TfidfVectorizer()
            matrix = vectorizer.fit_transform(list(corpus_clean_texts) + [query_clean])
            scores = cosine_similarity(matrix[-1], matrix[:-1])[0]
        except ValueError:  # Empty vocabulary in the available narratives.
            return []
        indices = np.argsort(scores)[::-1][:top_n]
        return [{"index": int(i), "score": float(scores[i])} for i in indices]


nlp_service = NLPService()
