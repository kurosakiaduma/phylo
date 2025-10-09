"""
Gender Identity Configuration for Phylo

This file defines comprehensive gender identity options with associated colors
for inclusive representation across the application.

The color scheme uses Tailwind CSS color names for consistency.
"""

from typing import TypedDict, List

class GenderOption(TypedDict):
    value: str
    label: str
    color: str  # Tailwind color class
    description: str

# Comprehensive gender identity options
GENDER_OPTIONS: List[GenderOption] = [
    {
        "value": "woman",
        "label": "Woman",
        "color": "pink",
        "description": "Identifies as a woman"
    },
    {
        "value": "man",
        "label": "Man",
        "color": "blue",
        "description": "Identifies as a man"
    },
    {
        "value": "non-binary",
        "label": "Non-binary",
        "color": "purple",
        "description": "Identifies outside the gender binary"
    },
    {
        "value": "genderqueer",
        "label": "Genderqueer",
        "color": "violet",
        "description": "Gender identity that is not exclusively masculine or feminine"
    },
    {
        "value": "genderfluid",
        "label": "Genderfluid",
        "color": "indigo",
        "description": "Gender identity that varies over time"
    },
    {
        "value": "agender",
        "label": "Agender",
        "color": "gray",
        "description": "Without gender or gender neutral"
    },
    {
        "value": "bigender",
        "label": "Bigender",
        "color": "teal",
        "description": "Identifies as two genders"
    },
    {
        "value": "transgender-woman",
        "label": "Transgender Woman",
        "color": "rose",
        "description": "A woman who was assigned male at birth"
    },
    {
        "value": "transgender-man",
        "label": "Transgender Man",
        "color": "sky",
        "description": "A man who was assigned female at birth"
    },
    {
        "value": "two-spirit",
        "label": "Two-Spirit",
        "color": "amber",
        "description": "Indigenous North American term for gender variant people"
    },
    {
        "value": "intersex",
        "label": "Intersex",
        "color": "emerald",
        "description": "Born with sex characteristics that don't fit typical binary notions"
    },
    {
        "value": "gender-non-conforming",
        "label": "Gender Non-conforming",
        "color": "lime",
        "description": "Does not conform to gender norms"
    },
    {
        "value": "gender-questioning",
        "label": "Gender Questioning",
        "color": "yellow",
        "description": "Exploring or questioning gender identity"
    },
    {
        "value": "androgyne",
        "label": "Androgyne",
        "color": "cyan",
        "description": "Combination of masculine and feminine characteristics"
    },
    {
        "value": "demigirl",
        "label": "Demigirl",
        "color": "fuchsia",
        "description": "Partially identifies as a woman"
    },
    {
        "value": "demiboy",
        "label": "Demiboy",
        "color": "lightBlue",
        "description": "Partially identifies as a man"
    },
    {
        "value": "pangender",
        "label": "Pangender",
        "color": "orange",
        "description": "Identifies with many or all genders"
    },
    {
        "value": "neutrois",
        "label": "Neutrois",
        "color": "slate",
        "description": "Neutral or null gender"
    },
    {
        "value": "prefer-not-to-say",
        "label": "Prefer not to say",
        "color": "neutral",
        "description": "Prefers not to disclose gender identity"
    },
    {
        "value": "other",
        "label": "Other",
        "color": "stone",
        "description": "Gender identity not listed"
    },
]

# Common pronoun options
PRONOUN_OPTIONS: List[str] = [
    "she/her",
    "he/him",
    "they/them",
    "she/they",
    "he/they",
    "ze/hir",
    "ze/zir",
    "xe/xem",
    "ey/em",
    "fae/faer",
    "per/pers",
    "ve/ver",
    "ne/nem",
    "co/cos",
    "it/its",
    "any pronouns",
    "ask me",
    "other",
]

# Event type options
EVENT_TYPES: List[str] = [
    "birthday",
    "anniversary",
    "wedding",
    "engagement",
    "birth",
    "death",
    "graduation",
    "baptism",
    "bar-mitzvah",
    "bat-mitzvah",
    "confirmation",
    "retirement",
    "immigration",
    "relocation",
    "military-service",
    "achievement",
    "reunion",
    "custom",
]

# Helper function to get gender color
def get_gender_color(gender_value: str) -> str:
    """
    Get the Tailwind color class for a given gender value.
    
    Args:
        gender_value: The gender value to look up
        
    Returns:
        Tailwind color class (e.g., 'pink', 'blue', 'purple')
    """
    for option in GENDER_OPTIONS:
        if option["value"] == gender_value:
            return option["color"]
    return "gray"  # Default fallback


# Helper function to get gender label
def get_gender_label(gender_value: str) -> str:
    """
    Get the display label for a given gender value.
    
    Args:
        gender_value: The gender value to look up
        
    Returns:
        Display label for the gender
    """
    for option in GENDER_OPTIONS:
        if option["value"] == gender_value:
            return option["label"]
    return gender_value.title()  # Fallback to capitalized value
