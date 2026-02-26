import pandas as pd
import re

class MetadataStore:
    def __init__(self, path=r"data\bns_metadata.csv"):
        self.df = pd.read_csv(path)

        # Clean section numbers
        self.df["Section"] = self.df["Section"].astype(str).apply(self.clean_section)

        # Group by Section to handle duplicates
        grouped = self.df.groupby("Section")

        self.metadata = {}

        for section, group in grouped:
            self.metadata[section] = group.to_dict(orient="records")

    def clean_section(self, text):
        match = re.search(r"\d+", str(text))
        return match.group() if match else None

    def get(self, section_number):
        section_number = self.clean_section(section_number)
        return self.metadata.get(section_number, [])