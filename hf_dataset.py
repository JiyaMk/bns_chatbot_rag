from datasets import load_dataset
import pandas as pd

# Replace with exact dataset name
dataset_name = "navaneeth005/BNS_detailed"

print("Downloading dataset...")
dataset = load_dataset(dataset_name)

print("Dataset structure:")
print(dataset)

# Most datasets have "train" split
if "train" in dataset:
    df = dataset["train"].to_pandas()
else:
    # If no train split, use first available split
    split_name = list(dataset.keys())[0]
    df = dataset[split_name].to_pandas()

print("Saving to CSV...")
df.to_csv("bns_metadata.csv", index=False)

print("Saved as bns_metadata.csv")
print("Columns are:")
print(df.columns)
print("\nSample rows:")
print(df.head())