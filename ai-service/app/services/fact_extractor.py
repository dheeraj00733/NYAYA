import re
import logging
from typing import List, Dict, Any
from app.core.database import get_db_connection

logger = logging.getLogger("nyayaflow.ai.fact_extractor")

class LegalFactExtractor:
    @staticmethod
    def extract_from_pages(pages: List[Dict[str, Any]], case_id: str, document_id: str) -> List[Dict[str, Any]]:
        """
        Parses pages with regex patterns and heuristic legal entity recognition
        to extract structured legal facts with page citations and excerpts.
        """
        extracted_facts = []

        full_text_pages = [(p.get("page_number", 1), p.get("text", "")) for p in pages]

        for page_num, text in full_text_pages:
            if not text:
                continue

            # 1. Court Name
            court_match = re.search(r"(IN THE (?:HIGH COURT OF [A-Z\s]+|SUPREME COURT OF [A-Z\s]+|DISTRICT COURT [A-Z\s]+|TRIBUNAL [A-Z\s]+))", text, re.IGNORECASE)
            if court_match:
                court_name = court_match.group(1).strip()
                extracted_facts.append({
                    "fact_type": "court",
                    "key_field": "Presiding Court",
                    "fact_value": court_name,
                    "confidence_score": 0.98,
                    "source_page": page_num,
                    "excerpt": text[max(0, court_match.start() - 20): min(len(text), court_match.end() + 40)].strip()
                })

            # 2. Case / Petition / FIR Number
            case_no_match = re.search(r"((?:W\.?P\.?|WRIT PETITION|CRL\.?\s*A\.?|CIVIL APPEAL|SUIT|ARB-COMM|ARB|FIR)\s*(?:\([A-Z]+\))?\s*NO\.?\s*[\w\d\/\-]+(?:\s*OF\s*\d{4})?)", text, re.IGNORECASE)
            if case_no_match:
                extracted_facts.append({
                    "fact_type": "case_number",
                    "key_field": "Case/Filing Identifier",
                    "fact_value": case_no_match.group(1).strip(),
                    "confidence_score": 0.95,
                    "source_page": page_num,
                    "excerpt": text[max(0, case_no_match.start() - 20): min(len(text), case_no_match.end() + 40)].strip()
                })

            # 3. Petitioner / Claimant / Appellant
            petitioner_match = re.search(r"(?:IN THE MATTER OF[:\s]+|BETWEEN[:\s]+)([A-Z0-9\s\.\,\(\)\&]{4,60}?)(?:\s*\.\.\.\s*(?:PETITIONER|CLAIMANT|APPELLANT|PLAINTIFF))", text, re.IGNORECASE)
            if petitioner_match:
                extracted_facts.append({
                    "fact_type": "petitioner",
                    "key_field": "Petitioner / Claimant",
                    "fact_value": petitioner_match.group(1).replace("\n", " ").strip(),
                    "confidence_score": 0.96,
                    "source_page": page_num,
                    "excerpt": text[max(0, petitioner_match.start() - 10): min(len(text), petitioner_match.end() + 30)].strip()
                })

            # 4. Respondent / Defendant
            respondent_match = re.search(r"(?:VERSUS|AGAINST)[:\s]+([A-Z0-9\s\.\,\(\)\&]{4,60}?)(?:\s*\.\.\.\s*(?:RESPONDENT|DEFENDANT|APPELLEE))", text, re.IGNORECASE)
            if respondent_match:
                extracted_facts.append({
                    "fact_type": "respondent",
                    "key_field": "Respondent / Defendant",
                    "fact_value": respondent_match.group(1).replace("\n", " ").strip(),
                    "confidence_score": 0.94,
                    "source_page": page_num,
                    "excerpt": text[max(0, respondent_match.start() - 10): min(len(text), respondent_match.end() + 30)].strip()
                })

            # 5. Advocates / Legal Counsel
            advocate_match = re.search(r"(?:Through|Advocate|Counsel for [A-Za-z]+)[:\s]+((?:Adv\.?|Mr\.?|Ms\.?|Senior Adv\.?)\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)", text)
            if advocate_match:
                extracted_facts.append({
                    "fact_type": "advocate",
                    "key_field": "Legal Counsel",
                    "fact_value": advocate_match.group(1).strip(),
                    "confidence_score": 0.92,
                    "source_page": page_num,
                    "excerpt": text[max(0, advocate_match.start() - 10): min(len(text), advocate_match.end() + 40)].strip()
                })

            # 6. Statutory Provisions & Legal Sections
            sections = re.findall(r"((?:Section|Sec\.)\s+\d+[\w\(\)]*(?:\s+of\s+(?:the\s+)?[\w\s]{3,35}(?:Act|Code|Rules)?)?|Article\s+\d+[\w\(\)]*)", text, re.IGNORECASE)
            for s in sections[:3]:
                clean_sec = s.strip().replace("\n", " ")
                if len(clean_sec) > 6:
                    extracted_facts.append({
                        "fact_type": "legal_section",
                        "key_field": "Referenced Legal Section",
                        "fact_value": clean_sec,
                        "confidence_score": 0.90,
                        "source_page": page_num,
                        "excerpt": f"Citation reference on page {page_num}: '{clean_sec}'"
                    })

            # 7. Dates (Order, Filing, Next Hearing)
            date_matches = re.findall(r"(?:ORDER DATED|DATED|LIST ON|FILED ON)[:\s]+(\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4}|\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})", text, re.IGNORECASE)
            for d in date_matches:
                extracted_facts.append({
                    "fact_type": "hearing_date",
                    "key_field": "Key Proceeding Date",
                    "fact_value": d.strip(),
                    "confidence_score": 0.88,
                    "source_page": page_num,
                    "excerpt": f"Noted proceeding date '{d}' on page {page_num}"
                })

            # 8. Relief / Directives / Outcome
            outcome_match = re.search(r"((?:no coercive steps shall be taken|quashing of FIR|permanent injunction|award in the sum of|petition is dismissed|appeal is allowed|relief sought)[^\.\n]{10,120}\.)", text, re.IGNORECASE)
            if outcome_match:
                extracted_facts.append({
                    "fact_type": "outcome",
                    "key_field": "Judicial Directive / Claim",
                    "fact_value": outcome_match.group(1).replace("\n", " ").strip(),
                    "confidence_score": 0.93,
                    "source_page": page_num,
                    "excerpt": outcome_match.group(1).replace("\n", " ").strip()
                })

        # Deduplicate facts by (fact_type, fact_value)
        unique_facts = []
        seen = set()
        for f in extracted_facts:
            key = (f["fact_type"], f["fact_value"].lower())
            if key not in seen:
                seen.add(key)
                unique_facts.append(f)

        logger.info(f"Extracted {len(unique_facts)} unique legal facts from document {document_id}")
        return unique_facts

    @staticmethod
    def persist_facts(facts: List[Dict[str, Any]], case_id: str, document_id: str):
        """
        Saves extracted facts into PostgreSQL extracted_facts table.
        """
        if not facts:
            return

        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    insert_query = """
                        INSERT INTO extracted_facts (
                            document_id, case_id, fact_type, key_field, fact_value,
                            confidence_score, source_page, excerpt, is_verified
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, FALSE)
                    """
                    for f in facts:
                        cur.execute(insert_query, (
                            document_id,
                            case_id,
                            f["fact_type"],
                            f["key_field"],
                            f["fact_value"],
                            f["confidence_score"],
                            f["source_page"],
                            f.get("excerpt", "")
                        ))
                    conn.commit()
                    logger.info(f"Persisted {len(facts)} facts to database for document {document_id}")
        except Exception as e:
            logger.error(f"Failed to persist extracted facts to database: {e}")
