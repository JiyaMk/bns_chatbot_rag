import uuid
import re
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from vector_store import VectorStore
from groq_client import call_llm
import requests
import math
from memory import Memory
from metadata_store import MetadataStore
from dotenv import load_dotenv
import os

load_dotenv()

metadata_store = MetadataStore()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "Backend is running 🚀"}

vector_store_instance = None

def get_vector_store():
    global vector_store_instance
    if vector_store_instance is None:
        vector_store_instance = VectorStore()
    return vector_store_instance
memories = {}
# Cached retrieval from first user message (ensures we keep theft/snatching etc. from "stole my chain")
initial_retrievals = {}

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # km
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)

    a = (
        math.sin(dLat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dLon / 2) ** 2
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def get_memory(session_id: str | None) -> Memory:
    """Get or create memory for a session."""
    sid = session_id or str(uuid.uuid4())
    if sid not in memories:
        memories[sid] = Memory()
    return memories[sid], sid


# Request/Response models
class NearbyPoliceRequest(BaseModel):
    lat: float
    lon: float
    radius: int = 5000  # meters

class MessageRequest(BaseModel):
    message: str
    session_id: str | None = None


class ResetRequest(BaseModel):
    session_id: str | None = None


class VerdictRequest(BaseModel):
    session_id: str | None = None


SYSTEM_PROMPT = """
You are a legal assistant for Bharatiya Nyaya Sanhita (BNS). Use ONLY the retrieved sections.

**Your process:**

1. **Analyse the retrieved sections** - For each section, identify what facts or conditions are needed to determine if it applies. (e.g. value of property for theft, use of force for robbery, relationship for domestic violence, etc.)

2. **Ask section-specific questions** - Ask questions that help you verify whether each retrieved section applies or not. Focus on the legal elements in each section. Ask only what you need to decide. You may ask 1-2 questions per turn, but ask until you have complete understanding.

3. **Include or exclude sections** - Once you have enough information:
   - Include a section if the user's facts satisfy its legal conditions.
   - Exclude a section if the facts show it does not apply. (e.g. chain worth >5000 means the "value less than 5000" provision does not apply.)

4. Do not ask same question more than once, if the user has not answered any question you asked simply move on with the given detail. But don't ask same question or variations of the same question again.

5. **Give the final answer** - Return ONLY the sections that apply. Format each as (plain text, no tables):

Section [number] - [title]
What it means: [1-2 sentences in plain English]
Why it applies to you: [1 sentence]
Punishment: [if mentioned]

Separate sections with a blank line. Do not invent sections. Do not include sections that do not apply.

5. **If NONE of the retrieved sections apply:** Say: "The sections I have access to don't clearly match your situation. Your situation may still be covered under BNS. I recommend consulting a lawyer who can review the full law and your specific case."

**IMPORTANT:** Before concluding "none apply", re-check each retrieved section. If the user describes theft, snatching, robbery, hurt, assault, threats, or similar - at least one section likely applies. Compare each section's legal conditions carefully. Only say "none apply" when truly no retrieved section matches.

**Rules:** Do not ask about evidence, recordings, or witnesses. Ask only what the legal conditions require.
"""

def extract_section_numbers(text):
    # Finds patterns like "Section 323"
    matches = re.findall(r"Section\s+(\d+)", text)
    return list(set(matches))

@app.post("/api/message")
def chat(req: MessageRequest):
    memory, session_id = get_memory(req.session_id)
    user_input = req.message

    memory.add("user", user_input)

    # Retrieval: use full conversation + cached initial query
    history = memory.get()
    user_messages = [m["content"] for m in history if m["role"] == "user"]
    full_query = " ".join(user_messages)

    # Expand query with legal synonyms to improve retrieval (stole->theft, snatched->snatching, etc.)
    def expand_query(q):
        q = q.lower()
        extras = []
        if any(w in q for w in ["stole", "stolen", "steal", "thief", "theft"]): extras.append("theft")
        if any(w in q for w in ["snatch", "snatched"]): extras.append("snatching")
        if any(w in q for w in ["hurt", "hit", "injured", "pain"]): extras.append("hurt")
        if any(w in q for w in ["threat", "threaten"]): extras.append("criminal intimidation")
        if any(w in q for w in ["assault", "attack"]): extras.append("assault")
        return " ".join([q] + extras) if extras else q

    if len(user_messages) == 1:
        # First message: retrieve and cache for this session
        q1 = expand_query(user_messages[0])
        vs = get_vector_store()
        initial_retrievals[session_id] = vs.retrieve(q1, top_k=10)
        retrieved_sections = initial_retrievals[session_id]
    else:
        # Later: retrieve with full conversation, merge with initial (never lose theft/snatching from "stole my chain")
        vs = get_vector_store()
        fresh = vs.retrieve(expand_query(full_query), top_k=15)
        initial = initial_retrievals.get(session_id, [])
        seen = set()
        merged = []
        for doc in initial + fresh:
            if doc not in seen:
                seen.add(doc)
                merged.append(doc)
        retrieved_sections = merged[:20]  # cap total

    context = "\n\n".join(retrieved_sections)

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend(history[:-1])  # Exclude current user msg - it goes in the structured block below

    messages.append(
        {
            "role": "user",
            "content": f"""
User Query: {user_input}

Retrieved Sections:
{context}
""",
        }
    )

    try:
        response = call_llm(messages)
    except Exception:
        response = "Error contacting AI service. Please try again."

    if response is None or not str(response).strip():
        response = (
            "I'm having trouble getting a response right now. "
            "Please try again, or rephrase your message."
        )
    else:
        sections_found = extract_section_numbers(response)

        if sections_found:
            enriched_sections = []

            for sec in sections_found:
                meta_list = metadata_store.get(sec)

                if meta_list:
                    meta = meta_list[0]
                    punishment = meta.get("Punishment", "Not specified")
                    cognizable = meta.get("Cognizable?", "Not specified")
                    bailable = meta.get("Bailable?", "Not specified")
                    triable = meta.get("Triable By", "Not specified")
                else:
                    punishment = "Not specified"
                    cognizable = "Not specified"
                    bailable = "Not specified"
                    triable = "Not specified"

                enriched_sections.append(
                    f"""
    Section {sec}
    Punishment: {punishment}
    Cognizable?: {cognizable}
    Bailable?: {bailable}
    Triable By: {triable}
    """
                )

            enrichment_text = "\n".join(enriched_sections)

            # SECOND LLM CALL — integrate cleanly
            formatting_prompt = f"""
    Original Explanation:
    {response}

    Official Procedural Details:
    {enrichment_text}

    Rewrite the explanation so that for EACH section,
    the punishment, cognizable status, bailable status,
    and triable court are integrated inside that section's block.

    Format:

    Section [number] - [title]
    What it means: ...
    Why it applies to you: ...
    Punishment: ...
    Cognizable?: ...
    Bailable?: ...
    Triable By: ...

    Do not repeat sections.
    Do not separate procedural details at the bottom.
    Return clean formatted text only.
    """

            response = call_llm([{"role": "system", "content": formatting_prompt}])

    memory.add("assistant", response)
 
    retrieved_section_numbers = []

    for doc in retrieved_sections:
      nums = extract_section_numbers(doc)
      retrieved_section_numbers.extend(nums)

    retrieved_section_numbers = list(set(retrieved_section_numbers))

    return {
    "session_id": session_id,
    "response": response,
    "bot": response,
    "retrieved_sections": retrieved_section_numbers,
    "retrieved_docs": retrieved_sections
    }


@app.post("/api/reset")
def reset(req: ResetRequest):
    sid = req.session_id or str(uuid.uuid4())
    if sid in memories:
        del memories[sid]
    if sid in initial_retrievals:
        del initial_retrievals[sid]
    memories[sid] = Memory()
    return {"session_id": sid}


@app.post("/api/verdict")
def verdict(req: VerdictRequest):
    """Return the last assistant message as the verdict for the session."""
    if not req.session_id or req.session_id not in memories:
        return {"verdict": "No conversation history for this session."}
    history = memories[req.session_id].get()
    # Last assistant message
    for msg in reversed(history):
        if msg["role"] == "assistant":
            return {"verdict": msg["content"]}
    return {"verdict": "No verdict available yet."}

@app.post("/api/nearby-police")
def nearby_police(req: NearbyPoliceRequest):
    try:
        query = f"""
        [out:json];
        node["amenity"="police"](around:{req.radius},{req.lat},{req.lon});
        out;
        """

        response = requests.post(
            "https://overpass-api.de/api/interpreter",
            data=query,
            timeout=10
        )

        data = response.json()

        stations = []

        for element in data.get("elements", []):
            distance = haversine(
                req.lat,
                req.lon,
                element["lat"],
                element["lon"]
            )

            stations.append({
                "id": element["id"],
                "name": element.get("tags", {}).get("name", "Police Station"),
                "latitude": element["lat"],
                "longitude": element["lon"],
                "distance_km": round(distance, 2),
                "google_maps_url": f"https://www.google.com/maps?q={element['lat']},{element['lon']}"
            })

        stations.sort(key=lambda x: x["distance_km"])

        return {
            "count": len(stations),
            "radius_meters": req.radius,
            "stations": stations[:5]
        }

    except Exception:
        return {
            "count": 0,
            "stations": [],
            "error": "Unable to fetch nearby police stations at this time."
        }
