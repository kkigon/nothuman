"""CI-only Release publishing. Existing public assets are never overwritten."""
import json
import os
import re
import subprocess
from delivery import ROOT, ASSET_NAME, sha256

def gh(*args, check=True):
    result = subprocess.run(["gh", *args], check=False, text=True, capture_output=True)
    if check and result.returncode:
        raise RuntimeError(result.stderr.strip() or "GitHub CLI request failed.")
    return result

def api(endpoint, check=True):
    return gh("api", endpoint, "-H", "X-GitHub-Api-Version: 2026-03-10", check=check)

def check_existing_tag(repository, tag, target):
    response = api("repos/" + repository + "/git/ref/tags/" + tag, check=False)
    if response.returncode:
        if "HTTP 404" in response.stderr:
            return False
        raise RuntimeError(response.stderr)
    reference = json.loads(response.stdout)["object"]
    for _ in range(10):
        if reference["type"] != "tag":
            break
        reference = json.loads(api("repos/" + repository + "/git/tags/" + reference["sha"]).stdout)["object"]
    if reference["type"] != "commit" or reference["sha"] != target:
        raise RuntimeError("기존 태그의 커밋이 이번 실행과 다릅니다. 기존 태그와 같은 커밋에서 실행하거나 새 태그를 사용하세요.")
    return True

def main():
    if os.environ.get("GITHUB_ACTIONS") != "true":
        raise RuntimeError("게시 스크립트는 GitHub Actions 안에서만 실행합니다.")
    repository = os.environ["GITHUB_REPOSITORY"]
    tag = os.environ["RELEASE_TAG"]
    target = os.environ["GITHUB_SHA"]
    if not re.fullmatch(r"v[0-9][A-Za-z0-9._-]*", tag):
        raise ValueError("릴리즈 태그는 v1.0.0 같은 형식이어야 합니다.")
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9-]*/[A-Za-z0-9_.-]+", repository):
        raise ValueError("저장소 이름이 올바르지 않습니다.")
    outputs = [ROOT / "dist" / ASSET_NAME, ROOT / "dist" / (ASSET_NAME + ".sha256")]
    if any(not path.is_file() for path in outputs):
        raise FileNotFoundError("make_release.py로 ZIP을 먼저 만들어야 합니다.")
    tag_exists = check_existing_tag(repository, tag, target)
    # The REST /releases/tags endpoint cannot find a draft's pending tag.
    # GitHub CLI resolves both published releases and drafts through GraphQL.
    response = gh("release", "view", tag, "--repo", repository, "--json", "databaseId", check=False)
    if response.returncode:
        if "release not found" not in response.stderr.lower():
            raise RuntimeError(response.stderr)
        payload = ROOT / "dist" / "release-request.json"
        payload.write_text(json.dumps({"tag_name": tag, "target_commitish": target, "name": "휴먼아님명조체 " + tag,
            "body": "휴먼아님명조체 무료 글꼴입니다.\n\n아래 **NotHumanMyeongjo-fonts.zip**에 설치용 TTF, 웹용 WOFF2, 지원 문자 목록과 SIL Open Font License 1.1 이용 조건이 들어 있습니다.\n\nZIP 다운로드는 사이트의 누적 다운로드 수에 포함됩니다.",
            "draft": True, "prerelease": False}, ensure_ascii=False), encoding="utf-8")
        release = json.loads(gh("api", "repos/" + repository + "/releases", "--method", "POST", "--input", str(payload), "-H", "X-GitHub-Api-Version: 2026-03-10").stdout)
    else:
        release_id = json.loads(response.stdout)["databaseId"]
        if type(release_id) is not int:
            raise RuntimeError("릴리즈 ID가 올바르지 않습니다.")
        release = json.loads(api("repos/" + repository + "/releases/" + str(release_id)).stdout)
    if release.get("draft") and release.get("target_commitish") != target:
        raise RuntimeError("중단된 초안 릴리즈의 대상 커밋이 다릅니다. 원래 커밋에서 재실행하거나 새 태그를 사용하세요.")
    if not release.get("draft") and not tag_exists:
        raise RuntimeError("공개 릴리즈의 원래 태그를 확인할 수 없습니다. 새 태그를 사용하세요.")
    existing = {asset["name"]: asset for asset in release["assets"]}
    # Re-runs preserve the existing asset ID and download_count. A changed file
    # requires a new tag, rather than --clobber (which deletes the old asset).
    for output in outputs:
        if output.name in existing:
            digest = existing[output.name].get("digest")
            if not isinstance(digest, str) or not digest.startswith("sha256:"):
                raise RuntimeError("기존 자산의 SHA256을 확인할 수 없습니다. 자산을 덮어쓰지 않고 중단합니다. 새 태그를 사용하세요.")
            if digest != "sha256:" + sha256(output):
                raise RuntimeError("이미 게시된 " + output.name + "의 내용이 다릅니다. 다운로드 집계를 보존하려면 새 태그를 사용하세요.")
        else:
            gh("release", "upload", tag, str(output), "--repo", repository)
    if release.get("draft"):
        gh("release", "edit", tag, "--repo", repository, "--draft=false")
    print("Release ready: https://github.com/" + repository + "/releases/tag/" + tag)

if __name__ == "__main__":
    main()
