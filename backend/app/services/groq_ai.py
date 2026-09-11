import base64
import json
import logging
from typing import Optional

from groq import AsyncGroq
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger(__name__)

class AITriageResult(BaseModel):
    category: str
    confidence: float
    severity: int
    suggested_title: str
    suggested_description: str
    suggested_department: str
    reasoning: str
    is_valid_civic_issue: bool

VALID_CATEGORIES = [
    "POTHOLE", "ILLEGAL_DUMP", "BROKEN_STREETLIGHT", "WATER_LEAK", 
    "DAMAGED_SIDEWALK", "FALLEN_TREE", "OPEN_MANHOLE", "DRAINAGE", 
    "ROAD_DAMAGE", "OTHER"
]

VALID_DEPARTMENTS = [
    "Public Works & Roads", "Sanitation & Waste", "Electricity & Streetlighting", 
    "Water Supply & Sewerage", "Emergency & Safety", "General Maintenance"
]

def parse_severity(val) -> int:
    if isinstance(val, int) and 1 <= val <= 5:
        return val
    try:
        val_str = str(val).lower()
        if "critical" in val_str or "5" in val_str:
            return 5
        elif "severe" in val_str or "4" in val_str or "high" in val_str:
            return 4
        elif "moderate" in val_str or "3" in val_str or "medium" in val_str:
            return 3
        elif "minor" in val_str or "2" in val_str:
            return 2
        return 1
    except Exception:
        return 3

def parse_category(val: str) -> str:
    cleaned = str(val).upper().replace(" ", "_").replace("-", "_")
    for cat in VALID_CATEGORIES:
        if cat in cleaned or cleaned in cat:
            return cat
    return "OTHER"

async def analyze_civic_image(
    image_bytes: Optional[bytes] = None,
    mime_type: str = 'image/jpeg',
    title: str = "",
    description: str = ""
) -> AITriageResult:
    try:
        client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        
        system_prompt = """You are an AI assistant analyzing civic infrastructure defects for the Fixora civic platform.
Analyze the report and return a JSON object with EXACTLY these keys:
- category: One of [POTHOLE, ILLEGAL_DUMP, BROKEN_STREETLIGHT, WATER_LEAK, DAMAGED_SIDEWALK, FALLEN_TREE, OPEN_MANHOLE, DRAINAGE, ROAD_DAMAGE, OTHER]
- confidence: A float between 0.0 and 1.0 indicating confidence
- severity: An integer from 1 to 5 (1=Low, 2=Moderate, 3=Substantial, 4=Severe, 5=Critical)
- suggested_title: A short, professional title for the issue
- suggested_description: A detailed, professional, and well-written complaint description (2-3 sentences) detailing the observed physical defect, hazards to pedestrians or vehicular traffic, and requesting prompt municipal action.
- suggested_department: One of [Public Works & Roads, Sanitation & Waste, Electricity & Streetlighting, Water Supply & Sewerage, Emergency & Safety, General Maintenance]
- reasoning: A brief explanation of the assessment
- is_valid_civic_issue: boolean true if this is a genuine civic/public infrastructure problem
"""
        user_prompt = f"Analyze this civic defect report. Title: '{title}'. Description: '{description}'."
        if not title and not description:
            user_prompt = "Analyze this reported civic infrastructure defect and classify its category, severity, title, detailed description, and department."

        response = await client.chat.completions.create(
            model="openai/gpt-oss-120b",
            max_tokens=500,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        data = json.loads(content)
        
        category_parsed = parse_category(data.get("category", "OTHER"))
        default_desc = f"A visible {category_parsed.lower().replace('_', ' ')} has been reported at this location. It presents a noticeable disruption and safety risk to local pedestrians and road commuters. Prompt municipal inspection and corrective repair are requested."

        return AITriageResult(
            category=category_parsed,
            confidence=float(data.get("confidence", 0.85)),
            severity=parse_severity(data.get("severity", 3)),
            suggested_title=str(data.get("suggested_title") or title or f"Reported {category_parsed.title().replace('_', ' ')}"),
            suggested_description=str(data.get("suggested_description") or data.get("reasoning") or default_desc),
            suggested_department=str(data.get("suggested_department") or "Public Works & Roads"),
            reasoning=str(data.get("reasoning") or "Automated triage via Groq AI."),
            is_valid_civic_issue=bool(data.get("is_valid_civic_issue", True))
        )
        
    except Exception as e:
        logger.error(f"Error analyzing defect with Groq (openai/gpt-oss-120b): {e}")
        cat = "OTHER"
        return AITriageResult(
            category=cat,
            confidence=0.5,
            severity=3,
            suggested_title=title or "Uncategorized Civic Defect",
            suggested_description=description or "A civic infrastructure defect has been reported at this location requiring municipal inspection and resolution.",
            suggested_department="General Maintenance",
            reasoning="Fallback triage applied.",
            is_valid_civic_issue=True
        )


async def generate_issue_description(category: str, title: str = "", address: str = "", severity: int = 3) -> str:
    """Generate or enhance a high-quality civic issue description using Groq AI."""
    cat_clean = category.lower().replace("_", " ")
    default_text = (
        f"A prominent {cat_clean} has been identified at this location, creating an active safety hazard for both "
        f"pedestrians and vehicular traffic. The deteriorating condition presents an urgent need for official municipal "
        f"inspection and resurfacing/repair to restore safe public transit."
    )
    try:
        client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        prompt = (
            f"Write a clear, professional, and detailed civic complaint description (2-3 sentences) for a municipal report.\n"
            f"- Defect Category: {category}\n"
            f"- Issue Title: {title or category}\n"
            f"- Location: {address or 'Public street/area'}\n"
            f"- Severity Level: {severity} out of 5\n"
            f"Describe the structural hazard, risks to public safety/transit, and politely request timely municipal intervention. Return ONLY the description text."
        )
        response = await client.chat.completions.create(
            model="openai/gpt-oss-120b",
            max_tokens=250,
            messages=[
                {"role": "system", "content": "You are a professional municipal engineering assistant. Write concise, clear, and articulate citizen defect descriptions."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2
        )
        text = response.choices[0].message.content.strip().strip('"')
        text = (
            text.replace('\u202f', ' ')
            .replace('\u00a0', ' ')
            .replace('\u2011', '-')
            .replace('\u2013', '-')
            .replace('\u2014', '-')
            .replace('\u2018', "'")
            .replace('\u2019', "'")
            .replace('\u201c', '"')
            .replace('\u201d', '"')
        )
        return text if len(text) > 20 else default_text
    except Exception as e:
        logger.error(f"Error generating description with Groq: {e}")
        return default_text
