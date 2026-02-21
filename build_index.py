import pandas as pd
import numpy as np
import faiss
import pickle
from sentence_transformers import SentenceTransformer

print("Loading model...")
model = SentenceTransformer("all-MiniLM-L6-v2")

print("Reading dataset...")
df = pd.read_csv("data/bns_sections.csv")

documents = []
embeddings = []

print("Generating embeddings...")

for _, row in df.iterrows():

    section = str(row.get("Section", "")).strip()
    title = str(row.get("Section_name", "")).strip()
    chapter = str(row.get("Chapter_name", "")).strip()
    description = str(row.get("Description", "")).strip()

    text = f"""
Section: {section}
Title: {title}
Chapter: {chapter}
Description:
{description}
"""

    documents.append(text)
    embeddings.append(model.encode(text))

embeddings = np.array(embeddings).astype("float32")

print("Building FAISS index...")
dimension = embeddings.shape[1]
index = faiss.IndexFlatL2(dimension)
index.add(embeddings)

print("Saving index and documents...")
faiss.write_index(index, "faiss_index.bin")

with open("documents.pkl", "wb") as f:
    pickle.dump(documents, f)

print("Index built successfully.")
