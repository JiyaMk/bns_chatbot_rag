import faiss
import pickle
import numpy as np
from sentence_transformers import SentenceTransformer

class VectorStore:

    def __init__(self):
        self.model = SentenceTransformer("all-MiniLM-L6-v2")
        self.index = faiss.read_index("faiss_index.bin")

        with open("documents.pkl", "rb") as f:
            self.documents = pickle.load(f)

    def retrieve(self, query, top_k=3):

        query_vec = self.model.encode(query).astype("float32").reshape(1, -1)

        distances, indices = self.index.search(query_vec, top_k)

        return [self.documents[i] for i in indices[0]]
