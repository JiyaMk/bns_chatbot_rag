from groq_client import client
import time

SIMULATOR_MODEL = "llama-3.1-8b-instant"


def simulate_user(question, scenario):

    prompt = f"""
You are simulating a victim answering a legal chatbot.

Scenario:
{scenario}

Chatbot question:
{question}

Rules:
- Answer ONLY using the scenario.
- If information is missing say "I am not sure".
- Never mention legal sections.
- Never mention punishments.
- Never ask questions.
- Answer in one short sentence.

Victim answer:
"""

    while True:

        try:

            response = client.chat.completions.create(
                model=SIMULATOR_MODEL,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3
            )

            answer = response.choices[0].message.content.strip()

            if not answer:
                answer = "I am not sure."

            # safety filters
            lower = answer.lower()

            if "section" in lower:
                answer = "I am not sure."

            if "punishment" in lower:
                answer = "I am not sure."

            if answer.endswith("?"):
                answer = "I am not sure."

            # delay to avoid rate limits
            time.sleep(2)

            return answer

        except Exception as e:

            print("Simulator error:", e)
            print("Retrying in 5 seconds...")

            time.sleep(5)