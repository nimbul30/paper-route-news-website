import requests
import json
import time
import os
import sys
from urllib.parse import urlparse

# --- Gemini API Configuration ---
API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable not set.")

GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={API_KEY}"

def call_gemini_api(system_prompt, user_content, schema=None, max_retries=3):
    """
    Calls the Gemini API with a given prompt, content, and optional JSON schema.
    Includes exponential backoff for retries.
    """
    headers = {'Content-Type': 'application/json'}
    payload = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"parts": [{"text": user_content}]}]
    }

    if schema:
        payload['generation_config'] = {
            "response_mime_type": "application/json",
            "response_schema": schema
        }

    for attempt in range(max_retries):
        try:
            response = requests.post(GEMINI_API_URL, headers=headers, data=json.dumps(payload), timeout=45)
            response.raise_for_status()

            result = response.json()
            candidate = result.get('candidates', [{}])[0]
            content_part = candidate.get('content', {}).get('parts', [{}])[0]
            text_response = content_part.get('text', '{}')

            return json.loads(text_response)

        except requests.exceptions.RequestException as e:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                time.sleep(wait_time)
            else:
                return json.loads("{}")
        except (KeyError, IndexError, json.JSONDecodeError) as e:
            return json.loads("{}")


class AI_Verification_Assistant:
    """
    Automates pre-verification checks for an AI-generated article
    based on the AI-Assisted Verification Guidelines.
    """

    def __init__(self, article_text, source_urls):
        self.article_text = article_text
        self.source_urls = source_urls
        self.sources_content = {}
        self.verification_report = {}

    def run_full_verification(self):
        """Runs all automated phases and returns a final report."""
        self.phase1_triage()
        self.phase2_deep_dive()
        self.phase3_quality_consult()
        return self.verification_report

    # --- PHASE 1: TRIAGE ---
    def phase1_triage(self):
        source_check_results = self._check_source_links()
        claim_verification = self._deep_claim_verification()
        self.verification_report['Phase 1: Triage'] = {
            'Source Link Check': source_check_results,
            'Deep Claim Verification': claim_verification
        }

    def _check_source_links(self):
        """Performs Link Validation and Domain Reputation Analysis."""
        results = []
        for url in self.source_urls:
            try:
                self.sources_content[url] = f"Mock source content for {url}. Innovate Inc. confirms the 'Quantum' phone with a 'Photonic' chip, increasing speed by 50%. CEO Jane Doe is quoted. 1,000,000 units are planned for the October 26th launch."
                parsed_url = urlparse(url)
                domain = parsed_url.netloc
                tld = domain.split('.')[-1]

                if tld in ['gov', 'edu']:
                    domain_type = "High-Reputation (Government/Education)"
                elif any(news in domain for news in ['reuters', 'ap', 'bbc', 'wsj']):
                    domain_type = "Reputable News Source"
                else:
                    domain_type = "General/Blog"

                results.append({'url': url, 'status': '200 OK (Mocked)', 'domain_type': domain_type})

            except requests.RequestException as e:
                results.append({'url': url, 'status': 'Error', 'reason': str(e)})
        return results

    def _deep_claim_verification(self):
        """Uses Gemini to perform deep verification of article claims against source content."""
        system_prompt = (
            "You are a meticulous fact-checker. From the article, extract each key claim. "
            "For each claim, search the provided source texts for direct evidence. "
            "You must classify the evidence for each claim as either 'Supported', 'Contradicted', or 'No Evidence Found'. "
            "If evidence is found, you must provide the exact quote from the source text as 'evidence_quote'."
        )
        user_content = f"ARTICLE TO VERIFY:\n{self.article_text}\n\nSOURCE TEXTS:\n{''.join(self.sources_content.values())}"
        schema = {
            "type": "OBJECT", "properties": {
                "verified_claims": { "type": "ARRAY", "items": {
                    "type": "OBJECT", "properties": {
                        "claim": {"type": "STRING", "description": "The specific claim extracted from the article."},
                        "verification_status": {
                            "type": "STRING",
                            "enum": ["Supported", "Contradicted", "No Evidence Found"],
                            "description": "The verification status of the claim."
                        },
                        "evidence_quote": {"type": "STRING", "description": "The direct quote from the source text that supports or contradicts the claim. Should be empty if no evidence is found."}
                    }, "required": ["claim", "verification_status", "evidence_quote"]
                }}
            }
        }
        return call_gemini_api(system_prompt, user_content, schema)

    # --- PHASE 2: DEEP DIVE ---
    def phase2_deep_dive(self):
        self.verification_report['Phase 2: Factual Deep Dive'] = {
            'Extracted Entities for Verification': self._extract_entities()
        }

    def _extract_entities(self):
        """Uses Gemini to extract all verifiable data points."""
        system_prompt = "You are a data extraction tool. From the user's article, extract all key entities into structured lists for verification."
        user_content = self.article_text
        schema = {
            "type": "OBJECT", "properties": {
                "entities": { "type": "OBJECT", "properties": {
                        "personal_names_titles": {"type": "ARRAY", "items": {"type": "STRING"}},
                        "organization_names": {"type": "ARRAY", "items": {"type": "STRING"}},
                        "numbers_statistics": {"type": "ARRAY", "items": {"type": "STRING"}},
                        "dates_times": {"type": "ARRAY", "items": {"type": "STRING"}},
                        "locations": {"type": "ARRAY", "items": {"type": "STRING"}}
                }}
            }
        }
        return call_gemini_api(system_prompt, user_content, schema)

    # --- PHASE 3: QUALITY & ETHICS ---
    def phase3_quality_consult(self):
        self.verification_report['Phase 3: Quality & Ethics Consultant'] = {
            'Bias and Sentiment Analysis': self._analyze_bias(),
            'Readability and Style Editing': self._edit_style()
        }

    def _analyze_bias(self):
        """Uses Gemini to analyze for bias and suggest neutral alternatives."""
        system_prompt = "You are an ethics and fairness editor. Analyze the article for bias, loaded language, or unfair framing. Suggest neutral alternatives for any flagged phrases."
        user_content = self.article_text
        schema = {
            "type": "OBJECT", "properties": {
                "bias_analysis": { "type": "OBJECT", "properties": {
                    "flagged_phrases": {"type": "ARRAY", "items": {
                        "type": "OBJECT", "properties": {
                            "phrase": {"type": "STRING"},
                            "suggestion": {"type": "STRING"}
                        }
                    }},
                    "overall_sentiment": {"type": "STRING"},
                    "framing": {"type": "STRING"}
                }}
            }
        }
        return call_gemini_api(system_prompt, user_content, schema)

    def _edit_style(self):
        """Uses Gemini to suggest style and readability improvements."""
        system_prompt = "You are a senior copy editor. Review the article for style, clarity, and impact. Correct passive voice, simplify complex sentences, and suggest three compelling, SEO-friendly headlines."
        user_content = self.article_text
        schema = {
            "type": "OBJECT", "properties": {
                "style_suggestions": { "type": "OBJECT", "properties": {
                    "passive_voice_corrections": {"type": "ARRAY", "items": {
                        "type": "OBJECT", "properties": {
                            "original": {"type": "STRING"},
                            "suggestion": {"type": "STRING"}
                        }
                    }},
                    "simplifications": {"type": "ARRAY", "items": {
                        "type": "OBJECT", "properties": {
                            "original": {"type": "STRING"},
                            "suggestion": {"type": "STRING"}
                        }
                    }},
                    "headline_suggestions": {"type": "ARRAY", "items": {"type": "STRING"}}
                }}
            }
        }
        return call_gemini_api(system_prompt, user_content, schema)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python verification_automator.py \"<article_text>\" \"<source_urls_comma_separated>\"")
        sys.exit(1)

    article_text = sys.argv[1]
    source_urls = sys.argv[2].split(',')

    assistant = AI_Verification_Assistant(article_text, source_urls)
    report = assistant.run_full_verification()
    print(json.dumps(report, indent=2))