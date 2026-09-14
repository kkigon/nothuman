"""Small, dependency-free checks shared by the Pages and Release workflows."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
ASSET_NAME = "NotHumanMyeongjo-fonts.zip"
FONT_FILES = [
    "fonts/NotHumanMyeongjo-Regular.ttf",
    "fonts/NotHumanMyeongjo-Regular.woff2",
    "fonts/repertoire.json",
    "FONT-LICENSE.txt",
]


def verified_files():
    files = [ROOT / name for name in FONT_FILES]
    for path in files:
        if not path.is_file() or path.stat().st_size == 0:
            raise ValueError(f"필수 배포 파일이 없습니다: {path.relative_to(ROOT)}")
    if files[0].read_bytes()[:4] not in (b"\x00\x01\x00\x00", b"OTTO"):
        raise ValueError("TTF 헤더가 올바르지 않습니다.")
    if files[1].read_bytes()[:4] != b"wOF2":
        raise ValueError("WOFF2 헤더가 올바르지 않습니다.")
    data = json.loads(files[2].read_text(encoding="utf-8"))
    codes = data.get("codepoints") if isinstance(data, dict) else None
    if not isinstance(codes, list) or not codes:
        raise ValueError("repertoire.json에 비어 있지 않은 codepoints 배열이 필요합니다.")
    if any(type(cp) is not int or cp < 0 or cp > 0x10FFFF or 0xD800 <= cp <= 0xDFFF for cp in codes):
        raise ValueError("repertoire.json의 코드포인트가 올바르지 않습니다.")
    if len(set(codes)) != len(codes):
        raise ValueError("repertoire.json에 중복 코드포인트가 있습니다.")
    records = data.get("fontFiles")
    if not isinstance(records, dict):
        raise ValueError("repertoire.json에 실제 폰트 파일의 fontFiles 해시 기록이 필요합니다.")
    for path in files[:2]:
        record = records.get(path.name, {})
        if record.get("sha256") != sha256(path) or record.get("bytes") != path.stat().st_size:
            raise ValueError("지원 목록과 폰트 파일의 해시가 다릅니다: " + path.name)
    if "SIL OPEN FONT LICENSE" not in files[3].read_text(encoding="utf-8").upper():
        raise ValueError("FONT-LICENSE.txt에서 SIL Open Font License를 확인하지 못했습니다.")
    return files


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
