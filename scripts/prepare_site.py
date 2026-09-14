"""Prepare an allowlisted static Pages artifact; never publishes anything."""
from pathlib import Path
import json
import os
import re
import shutil
from delivery import ROOT, verified_files

def main():
    font_files = verified_files()
    repository = os.environ.get("GITHUB_REPOSITORY", "")
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9-]*/[A-Za-z0-9_.-]+", repository):
        raise ValueError("GITHUB_REPOSITORY=소유자/저장소 환경 변수가 필요합니다.")
    if repository.split("/")[1] in {".", ".."}:
        raise ValueError("저장소 이름이 올바르지 않습니다.")
    output = ROOT / "_site"
    if output.exists():
        shutil.rmtree(output)
    output.mkdir()
    files = [ROOT / "index.html", ROOT / ".nojekyll", ROOT / "PROVENANCE.md", *font_files]
    files.extend(path for path in (ROOT / "assets").rglob("*") if path.is_file())
    for source in files:
        destination = output / source.relative_to(ROOT)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, destination)
    config = {"repository": repository}
    (output / "site-config.js").write_text("window.NOTHUMAN_SITE_CONFIG = Object.freeze(" + json.dumps(config) + ");\n", encoding="utf-8")
    print(json.dumps({"output": str(output), "repository": repository, "files": len(files) + 1, "published": False}, ensure_ascii=False))

if __name__ == "__main__":
    main()
