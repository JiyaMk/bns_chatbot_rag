import pandas as pd
import requests
import re
import time
import json
import os
import matplotlib.pyplot as plt
from simulator_llm import simulate_user

API_URL = "http://localhost:8000/api/message"
RESET_URL = "http://localhost:8000/api/reset"

DATASET = "bns_evaluation.xlsx"

RESULT_FILE = "evaluation_results.xlsx"
LOG_FILE = "conversation_logs.json"
PROGRESS_FILE = "evaluation_progress.json"
CHART_FILE = "evaluation_metrics_chart.png"

BATCH_SIZE = 3
MAX_TURNS = 5
DELAY = 7


# -----------------------------
# SECTION EXTRACTION
# -----------------------------

def normalize_section(sec):
    """
    Converts subsection like 112(2) → 112
    """
    sec = re.findall(r"\d{1,3}", str(sec))
    return sec[0] if sec else None


def extract_sections(text):

    if text is None:
        return []

    text = str(text)

    matches = re.findall(
        r"(?:section|sec\.?)\s*(\d{1,3})(?:\(\d+\))?",
        text,
        flags=re.IGNORECASE
    )

    sections = []

    for m in matches:
        s = normalize_section(m)

        if s and 1 <= int(s) <= 358:
            sections.append(s)

    return list(set(sections))


def extract_ground_truth(text):

    if text is None:
        return []

    text = str(text)

    matches = re.findall(
        r"\b(\d{1,3})\(\d+\)|\b(\d{1,3})\b",
        text
    )

    sections = []

    for m in matches:

        sec = m[0] if m[0] else m[1]

        if sec and 1 <= int(sec) <= 358:
            sections.append(sec)

    return list(set(sections))


def extract_retrieved_sections(docs):

    sections = []

    for d in docs:

        if isinstance(d, dict):
            text = str(d.get("content", ""))
        else:
            text = str(d)

        # Pattern 1: Section 306
        matches1 = re.findall(
            r"(?:section|sec\.?)\s*(\d{1,3})",
            text,
            flags=re.IGNORECASE
        )

        # Pattern 2: 306. Title of law
        matches2 = re.findall(
            r"\b(\d{1,3})\.\s+[A-Z]",
            text
        )

        matches = matches1 + matches2

        for m in matches:

            if 1 <= int(m) <= 358:
                sections.append(m)

    return list(set(sections))


# -----------------------------
# QUESTION NORMALIZATION
# -----------------------------

def normalize_question(text):

    if text is None:
        return ""

    text = str(text).lower()
    text = re.sub(r"[^\w\s]", "", text)

    return text.strip()


def detect_repeated_questions(bot_messages):

    seen = set()
    repeats = 0

    for msg in bot_messages:

        if msg is None:
            continue

        norm = normalize_question(msg)

        if not norm:
            continue

        if norm in seen:
            repeats += 1
        else:
            seen.add(norm)

    return repeats


# -----------------------------
# PROGRESS MANAGEMENT
# -----------------------------

def load_progress():

    if not os.path.exists(PROGRESS_FILE):
        return 0

    with open(PROGRESS_FILE) as f:
        data = json.load(f)

    return data.get("index", 0)


def save_progress(index):

    with open(PROGRESS_FILE, "w") as f:
        json.dump({"index": index}, f)


# -----------------------------
# LOG MANAGEMENT
# -----------------------------

def load_logs():

    if os.path.exists(LOG_FILE):

        with open(LOG_FILE) as f:
            return json.load(f)

    return {}


def save_logs(logs):

    with open(LOG_FILE, "w") as f:
        json.dump(logs, f, indent=2)


# -----------------------------
# API CALL WITH RETRY
# -----------------------------

def call_api_with_retry(payload, max_retries=5):

    retries = 0

    while retries < max_retries:

        try:
            r = requests.post(API_URL, json=payload)

            if r.status_code == 429:
                print("Rate limit hit... waiting 10s")
                time.sleep(10)
                retries += 1
                continue

            if r.status_code != 200:
                print("Bad response:", r.status_code)
                time.sleep(5)
                retries += 1
                continue

            return r.json()

        except Exception as e:

            print("Request failed:", e)
            retries += 1
            time.sleep(5)

    print("Max retries reached for API call.")
    return {"response": ""}


# -----------------------------
# RUN SINGLE CASE
# -----------------------------

def run_case(row):

    case_id = row["Case_ID"]
    opening = row["Opening_Query"]
    scenario = row["Full_Scenario"]

    priority_section = normalize_section(row["Priority_Section"])
    ground_truth = extract_ground_truth(row["Ground_Truth_Sections"])

    try:
        requests.post(RESET_URL)
    except:
        pass

    session_id = None
    conversation = []
    bot_messages = []
    predicted = []
    retrieved_sections = []

    user_message = opening

    for turn in range(MAX_TURNS):

        payload = {
            "message": user_message,
            "session_id": session_id
        }

        retry_count = 0
        MAX_RETRIES = 3

        while retry_count < MAX_RETRIES:

            data = call_api_with_retry(payload)

            session_id = data.get("session_id")

            bot_reply = data.get("response", "")

            if bot_reply and "trouble getting a response" not in bot_reply.lower():
                break

            print("Bot response failed. Retrying...")
            retry_count += 1
            time.sleep(5)

        if retry_count == MAX_RETRIES:
            print("Bot failed too many times. Skipping turn.")
            bot_reply = ""

        conversation.append({"user": user_message})
        conversation.append({"bot": bot_reply})

        bot_messages.append(bot_reply)

        retrieved_docs = (
            data.get("retrieved_sections")
            or data.get("documents")
            or data.get("retrieved_docs")
            or data.get("sources")
            or []
        )

        retrieved_sections = list(
            set(
                retrieved_sections +
                extract_retrieved_sections(retrieved_docs)
            )
        )

        sections = extract_sections(bot_reply)

        sections = list(set(sections))

        if len(sections) > 3:
            sections = sections[:3]

        if sections:
            predicted = sections
            break

        # simulate user reply
        try:
            user_message = simulate_user(bot_reply, scenario)
        except:
            user_message = "I am not sure."

        time.sleep(DELAY)

    print("Ground Truth:", ground_truth)
    print("Retrieved:", retrieved_sections)

    truth = {priority_section}
    pred = set(predicted)
    top1_correct = int(priority_section in predicted[:1])
    top3_correct = int(priority_section in predicted[:3])
    retrieved = set(retrieved_sections)

    tp = len(truth & pred)

    precision = tp / len(pred) if pred else 0
    recall = tp / len(truth) if truth else 0

    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0

    retrieval_recall = round(
        len(set(ground_truth) & retrieved) / len(ground_truth),
        3
    ) if ground_truth else 0

    reasoning_correct = int(priority_section in pred)

    repeat_count = detect_repeated_questions(bot_messages)

    print(
        "Expected:", priority_section,
        "Predicted:", predicted,
        "Correct:", reasoning_correct
    )

    return {

        "Case_ID": case_id,
        "Expected": priority_section,
        "Predicted": ",".join(predicted),

        "Precision": precision,
        "Recall": recall,
        "F1": f1,

        "Retrieval_Recall": retrieval_recall,
        "Reasoning_Correct": reasoning_correct,

        "Turns": len(conversation) // 2,
        "Repeated_Questions": repeat_count,

        "Top1_Accuracy": top1_correct,
        "Top3_Accuracy": top3_correct,

        "Conversation": conversation
    }

# -----------------------------
# SAVE RESULTS
# -----------------------------

def save_results(results):

    new_df = pd.DataFrame(results)

    if os.path.exists(RESULT_FILE):

        old_df = pd.read_excel(RESULT_FILE)

        combined = pd.concat([old_df, new_df])

        combined = combined.drop_duplicates(subset=["Case_ID"], keep="last")

    else:

        combined = new_df

    combined.drop(columns=["Conversation"]).to_excel(RESULT_FILE, index=False)


# -----------------------------
# SUMMARY METRICS
# -----------------------------

def generate_summary():

    if not os.path.exists(RESULT_FILE):
        return

    df = pd.read_excel(RESULT_FILE)

    summary = {

    "Retrieval Recall": df["Retrieval_Recall"].mean(),

    "Section Accuracy": df["Reasoning_Correct"].mean(),

    "Top1 Accuracy": df["Top1_Accuracy"].mean(),
    "Top3 Accuracy": df["Top3_Accuracy"].mean(),

    "Precision": df["Precision"].mean(),
    "Recall": df["Recall"].mean(),
    "F1 Score": df["F1"].mean(),

    "Average Turns": df["Turns"].mean(),

    "Repeated Question Rate": df["Repeated_Questions"].mean()
}
    print("\n===== SYSTEM EVALUATION SUMMARY =====\n")

    for k, v in summary.items():
        print(f"{k}: {round(v,3)}")

    return summary


# -----------------------------
# CHART GENERATION
# -----------------------------

def generate_chart():

    if not os.path.exists(RESULT_FILE):
        return

    df = pd.read_excel(RESULT_FILE)

    metrics = [

    df["Precision"].mean(),
    df["Recall"].mean(),
    df["F1"].mean(),
    df["Retrieval_Recall"].mean(),
    df["Top3_Accuracy"].mean()

]

    labels = ["Precision", "Recall", "F1", "Retrieval Recall", "Top3 Accuracy"]

    plt.figure()

    plt.bar(labels, metrics)

    plt.title("BNS Legal Assistant Evaluation")

    plt.ylabel("Score")

    plt.savefig(CHART_FILE)


# -----------------------------
# MAIN
# -----------------------------

def main():

    df = pd.read_excel(DATASET)

    start_index = load_progress()

    if start_index >= len(df):

        print("All cases evaluated.")

        generate_summary()

        return

    batch = df.iloc[start_index:start_index + BATCH_SIZE]

    print("Running cases:", batch["Case_ID"].tolist())

    logs = load_logs()

    results = []

    for _, row in batch.iterrows():

        result = run_case(row)

        print("Completed case:", result["Case_ID"])

        results.append(result)

        logs[str(result["Case_ID"])] = result["Conversation"]

    save_results(results)

    save_logs(logs)

    new_index = start_index + len(batch)

    save_progress(new_index)

    generate_chart()

    generate_summary()

    print("\nBatch finished")

    print("Next start index:", new_index)

    print("Results saved to:", RESULT_FILE)
    print("Logs saved to:", LOG_FILE)
    print("Chart saved to:", CHART_FILE)


if __name__ == "__main__":
    main()