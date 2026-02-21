import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

MODEL = "openai/gpt-oss-20b"   # Free Groq model

def call_llm(messages):
    """Call Groq LLM. Returns response text or None on failure."""
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": m["role"], "content": m["content"]} for m in messages],
            temperature=0,
            tool_choice="none",
        )

        text = response.choices[0].message.content
        return text.strip() if text else None
    except Exception as e:
        print(f"LLM error: {e}")
        return None
