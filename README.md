**Nirnaya Bot**

Nirnaya Bot is an AI-powered legal assistant designed to help users understand and navigate the Bharatiya Nyaya Sanhita (BNS), 2023. The system takes a user’s complaint in natural language and maps it to relevant legal sections with clear explanations. It focuses on improving accessibility to legal knowledge by combining advanced NLP techniques with structured legal reasoning.

**Objectives**

1. To interpret user complaints written in natural language and identify applicable BNS sections accurately.
2. To provide clear and simple explanations for each legal section to improve user understanding.
3. To assist users in understanding their legal rights and possible actions without requiring prior legal knowledge.
4. To build an empathetic and interactive system that can handle sensitive legal queries responsibly.


**System Features**

**1. Complaint Mapping:** Converts user input into relevant BNS sections using intelligent NLP-based processing.

**2. Legal Justification:** Provides explanations for why a particular section is applicable to the given case.

**3. Multiturn Interaction:** Asks clarifying questions when user input is incomplete or ambiguous.

**4. Procedural Insight:** Offers additional details such as type of offence (bailable, cognizable, etc.).

**5. User-Friendly Interface:** Designed for simple and clear interaction, even for non-technical users.


**Technical Approach**

The system is built using a Hybrid Retrieval-Augmented Generation (RAG) architecture combined with rule-based reasoning. It integrates semantic understanding and keyword-based matching to improve accuracy
User input is first processed using NLP techniques to extract key legal components such as actions and intent. This refined information is then used for retrieval from a structured legal knowledge base using both dense vector search (for meaning) and lexical search (for exact terms).

The retrieved results are further analyzed using a language model that evaluates their relevance based on legal reasoning. This layered approach ensures that the system produces accurate, context-aware, and explainable outputs while reducing incorrect or misleading responses.

**1 Hybrid RAG Architecture**
The system is built on a Hybrid Retrieval-Augmented Generation (RAG) architecture that combines multiple retrieval and reasoning techniques to ensure both accuracy and reliability in legal predictions.

i. Dense Semantic Retrieval (Vector Embeddings): The system uses transformer-based embedding models to convert legal text and user queries into high-dimensional vectors. This allows the system to understand the meaning and context of the user’s complaint rather than relying only on exact words. It helps in capturing variations in natural language and improves retrieval of conceptually relevant legal sections.

ii. Lexical Retrieval (BM25): Alongside semantic search, the system uses BM25-based keyword matching. This ensures that exact legal terms, section numbers, and domain-specific keywords are not missed. It acts as a complementary mechanism to semantic retrieval, especially in cases where precise terminology is important.

iii. Large Language Model (LLM) for Reasoning: After retrieval, a Large Language Model is used to analyze and evaluate the candidate legal sections. The LLM performs reasoning by comparing extracted facts from the user input with the legal definitions and conditions of each section. It helps in filtering irrelevant results and selecting the most appropriate sections.

This hybrid combination ensures that the system benefits from both deep contextual understanding and precise keyword matching, while also providing explainable and logically consistent outputs.

**2. Multi-Stage Processing Pipeline**

The system follows a structured, multi-stage pipeline to convert raw user input into meaningful legal output:

i. Input Processing: The system accepts a user’s complaint in natural language. The text is preprocessed to remove noise, normalize format, and prepare it for further analysis.

ii. Legal Fact Extraction: Key legal elements are extracted from the input, such as:
        
        Actions performed (Actus Reus)
        
        Intent or mental state (Mens Rea)
        
        Contextual details like victim, location, or medium of crime

This step transforms unstructured input into structured legal information.

iii. Query Transformation: The extracted information is converted into formal legal terminology. This bridges the gap between everyday language and legal vocabulary, improving retrieval accuracy.

iv. Hybrid Retrieval: The transformed query is used to retrieve relevant BNS sections using:

        Semantic search (vector similarity)
        
        Lexical search (BM25 keyword matching)

This ensures both conceptual relevance and exact matches are captured.

v. Reranking using Legal Signals: Retrieved results are re-ranked based on predefined legal indicators such as type of crime (violent, cyber, sexual, property-related, etc.). This step improves prioritization of the most relevant sections.

vi. LLM-Based Evaluation (Reasoning Layer): A language model evaluates the top candidate sections by comparing their legal conditions with the extracted facts. It ensures that the selected sections logically match the scenario described by the user.

vii. Response Generation: The final output is generated by combining the selected legal sections with clear explanations. The response is designed to be understandable, informative, and helpful for the user.

**Processing Pipeline**
1. Data Collection: Legal data is gathered from BNS sections, structured legal documents, and supporting legal resources.
2. Data Processing: Text is cleaned, normalized, and tokenized while handling legal terminology carefully.
3. Knowledge Representation: Legal concepts are structured using rule-based mappings and categorized signals for better reasoning.
4. Training and Optimization: Models are fine-tuned on legal text, with parameter tuning to improve accuracy and relevance.

**Final Model Design and Selection**

A hybrid model is selected that combines machine learning, deep learning, and large language models. This approach balances accuracy, interpretability, and adaptability. Semantic models handle understanding of user input, while retrieval mechanisms ensure factual correctness, and the language model performs final reasoning and explanation.

Performance and Result Generation

The system is designed to deliver fast and accurate results, with response times typically within a few seconds. Performance is evaluated using metrics such as accuracy, precision, recall, and F1-score to ensure reliable predictions.

**The final output**

Relevant BNS sections

Clear explanation for each section

Context aware reasoning

This ensures that the results are both technically correct and easily understandable for the user.
