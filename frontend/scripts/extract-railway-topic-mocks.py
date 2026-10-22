import json
import re
from pathlib import Path

import pypdfium2 as pdfium


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "mock-pdfs" / "mock-question-bank.json"

PDF_SOURCES = [
    {
        "path": Path(r"C:\Users\aloks\Downloads\Telegram Desktop\General_Awareness_English.pdf"),
        "group_id": "railway-general-awareness-english",
        "group_title": "Railway Full Mock - General Awareness",
        "category": "Railway",
        "subject": "General Awareness",
        "language": "English",
        "heading_pattern": r"([A-Za-z& ,.\-]+?)\s*\(Q-\d+\)",
    },
    {
        "path": Path(r"C:\Users\aloks\Downloads\Telegram Desktop\Railway_Complete_General_Science_English_New_.pdf"),
        "group_id": "railway-general-science-english",
        "group_title": "Railway Full Mock - General Science",
        "category": "Railway",
        "subject": "General Science",
        "language": "English",
        "heading_pattern": r"([A-Za-z& ,.\-]+?(?:\s*\([A-Za-z ]+\))?)\s*\(total\s+Q\s*-\s*\d+\)",
    },
]


def slugify(value):
    return re.sub(r"[^a-z0-9]+", "-", str(value or "").lower()).strip("-")


def clean_text(value):
    value = str(value or "")
    value = value.replace("\u00a0", " ")
    value = value.replace("W hich", "Which").replace("w hich", "which")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def normalize_topic(value, fallback):
    topic = clean_text(value)
    topic = re.sub(r"^(?:Sr\.?\s*No\.?|Subject|Topic Name|Link)\s+", "", topic, flags=re.I)
    topic = topic.strip(" :-")
    return topic if 3 <= len(topic) <= 90 else fallback


def answer_to_index(value):
    letter = str(value or "").strip().upper()[:1]
    return "ABCD".find(letter) if letter in "ABCD" else None


def find_option_labels(block):
    labels = []
    for match in re.finditer(r"\(([A-D])\)|\[([A-D])\]|([A-D])\)", block):
        letter = next(group for group in match.groups() if group)
        labels.append((letter, match.start(), match.end()))

    sequence = []
    next_letter = "A"
    for label in labels:
        if label[0] == next_letter:
            sequence.append(label)
            if next_letter == "D":
                return sequence
            next_letter = chr(ord(next_letter) + 1)
        elif label[0] == "A":
            sequence = [label]
            next_letter = "B"
    return []


def strip_option_tail(value):
    value = re.split(r"\b(?:Correct\s+Ans|Ans)\s*:", value, maxsplit=1, flags=re.I)[0]
    value = re.sub(r"\s*\d{2}/\d{2}/\d{4}.*$", "", value)
    value = re.sub(r"\s*\bRRB\s*$", "", value, flags=re.I)
    return clean_text(value).strip(" .:-")


def parse_question_block(block, topic, source_prefix, question_number):
    answer_match = re.search(r"\b(?:Correct\s+Ans|Ans)\s*:\s*\(?([A-D])\)?", block, flags=re.I)
    labels = find_option_labels(block)
    if not answer_match or len(labels) != 4:
        return None

    question_start = re.match(r"Q?\d{1,5}\)\s*", block)
    if not question_start:
        return None

    question_text = clean_text(block[question_start.end():labels[0][1]])
    question_text = re.sub(r"https?://\S+", "", question_text).strip(" .:-")
    if len(question_text) < 12:
        return None

    options = []
    for index, (_, _, label_end) in enumerate(labels):
        next_start = labels[index + 1][1] if index < 3 else answer_match.start()
        option = strip_option_tail(block[label_end:next_start])
        options.append(option)

    if any(len(option) < 1 for option in options):
        return None

    answer_index = answer_to_index(answer_match.group(1))
    if answer_index is None:
        return None

    return {
        "id": f"{source_prefix}-{question_number}",
        "section": topic,
        "question": question_text,
        "options": options,
        "answer": answer_index,
        "explanation": f"Answer key from source PDF: option {answer_match.group(1).upper()}."
    }


def split_question_blocks(text):
    matches = list(re.finditer(r"(?<![A-Za-z0-9])Q?\d{1,5}\)\s*(?=[A-Z_])", text))
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        yield text[match.start():end]


def extract_topic_tests(source):
    path = source["path"]
    document = pdfium.PdfDocument(str(path))
    topic = source["subject"]
    tests_by_topic = {}
    counts_by_topic = {}

    for page_index in range(len(document)):
        page = document[page_index]
        text_page = page.get_textpage()
        text = clean_text(text_page.get_text_range() or "")
        text_page.close()
        page.close()
        if not text:
            continue

        heading_match = re.search(source["heading_pattern"], text, flags=re.I)
        if heading_match:
            topic = normalize_topic(heading_match.group(1), source["subject"])

        topic_key = slugify(topic)
        source_prefix = f"{source['group_id']}-{topic_key}"[:70].strip("-")
        tests_by_topic.setdefault(topic, [])
        counts_by_topic.setdefault(topic, 0)

        for block in split_question_blocks(text):
            counts_by_topic[topic] += 1
            question = parse_question_block(block, topic, source_prefix, counts_by_topic[topic])
            if question:
                tests_by_topic[topic].append(question)

    tests = []
    for topic_name, questions in tests_by_topic.items():
        if not questions:
            continue
        tests.append(
            {
                "id": f"{source['group_id']}-{slugify(topic_name)}"[:90].strip("-"),
                "title": f"{source['subject']} - {topic_name}",
                "category": source["category"],
                "subject": source["subject"],
                "topic": topic_name,
                "language": source["language"],
                "mockType": "topic",
                "mockGroupId": source["group_id"],
                "mockGroupTitle": source["group_title"],
                "sourcePdf": path.name,
                "questions": questions,
            }
        )
    return tests


def main():
    existing = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else []
    group_ids = {source["group_id"] for source in PDF_SOURCES}
    preserved = [test for test in existing if test.get("mockGroupId") not in group_ids]

    generated = []
    for source in PDF_SOURCES:
        if not source["path"].exists():
            raise FileNotFoundError(source["path"])
        generated.extend(extract_topic_tests(source))

    all_tests = preserved + generated
    OUT.write_text(json.dumps(all_tests, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "preservedTests": len(preserved),
                "generatedTests": len(generated),
                "generatedQuestions": sum(len(test["questions"]) for test in generated),
                "totalTests": len(all_tests),
                "totalQuestions": sum(len(test.get("questions", [])) for test in all_tests),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
