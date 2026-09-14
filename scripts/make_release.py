"""Build a deterministic font ZIP locally. Does not call GitHub or publish."""
import hashlib
import json
import zipfile
from delivery import ROOT, ASSET_NAME, verified_files

README = """휴먼아님명조체 · NotHumanMyeongjo

사람이 쓴 듯, 사람이 쓰지 않은 글자.
익숙한 실루엣에 AI의 서툰 손길을 남긴 디스플레이 글꼴입니다.

설치: fonts/NotHumanMyeongjo-Regular.ttf를 더블클릭해 설치합니다.
앱의 서체 목록에서 휴먼아님명조체 또는 NotHumanMyeongjo를 선택하세요.
웹용 WOFF2와 실제 지원 문자 목록도 fonts 폴더에 있습니다.

SIL Open Font License 1.1로 제공합니다.
전체 사용·수정·배포 조건은 FONT-LICENSE.txt를 확인하세요.

SHA256.json에는 이 패키지에 포함된 파일의 검증용 해시가 있습니다.
"""

def main():
    files = [*verified_files(), ROOT / "PROVENANCE.md"]
    entries = {str(path.relative_to(ROOT)): path.read_bytes() for path in files}
    entries["README.txt"] = README.encode("utf-8")
    manifest = {name: {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()} for name, data in sorted(entries.items())}
    entries["SHA256.json"] = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    destination = ROOT / "dist"
    destination.mkdir(exist_ok=True)
    output = destination / ASSET_NAME
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in sorted(entries.items()):
            info = zipfile.ZipInfo("NotHumanMyeongjo/" + name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data, compresslevel=9)
    with zipfile.ZipFile(output) as archive:
        assert archive.testzip() is None
        for name, item in manifest.items():
            assert hashlib.sha256(archive.read("NotHumanMyeongjo/" + name)).hexdigest() == item["sha256"], name
    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    (destination / (ASSET_NAME + ".sha256")).write_text(digest + "  " + ASSET_NAME + "\n", encoding="utf-8")
    print(json.dumps({"file": str(output), "bytes": output.stat().st_size, "sha256": digest, "entryHashes": "passed", "published": False}, ensure_ascii=False))

if __name__ == "__main__":
    main()
