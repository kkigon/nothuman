# 휴먼아님명조체 · NotHumanMyeongjo

무료 글꼴 사이트를 GitHub Pages에 올릴 수 있도록 준비한 폴더입니다. **저장소 생성, GitHub 업로드, 실제 사이트 배포는 아직 하지 않았습니다.** 이 폴더의 내용물을 새 저장소의 최상위에 그대로 넣으면 됩니다.

사이트에서는 문장 입력, 원문 비교, 한글·영어·숫자·기호 예문, 크기·자간·배경 조절, 실제 지원 문자 검색과 무료 다운로드를 제공합니다. 폰트는 SIL Open Font License 1.1로 배포하며 자세한 조건은 [FONT-LICENSE.txt](FONT-LICENSE.txt)에 있습니다.

실제 이미지 모델, 안내 글꼴, 완성 문자 생성 방식과 결과 범위는 [제작 출처](PROVENANCE.md)에 기록했습니다.

## 처음 배포하기

1. GitHub에서 새 **공개 저장소**를 만듭니다. 저장소 이름은 자유롭게 정하세요. GitHub Free에서도 공개 저장소의 Pages를 사용할 수 있습니다.
2. **이 README가 있는 폴더의 내용물**을 저장소 최상위에 올립니다. `github-upload` 폴더째로 감싸지 말고 `index.html`과 `.github/`가 최상위에 있게 하세요. 숨김 폴더인 `.github/`도 반드시 포함합니다. 기본 브랜치는 `main`으로 사용합니다.
3. 저장소 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 선택합니다.
4. **Actions → Publish font ZIP → Run workflow**에서 `main` 브랜치와 새 태그 `v1.0.0`을 입력해 실행합니다. TTF·WOFF2·지원 목록·이용 조건을 묶은 `NotHumanMyeongjo-fonts.zip`이 공개 Release에 등록됩니다.
5. **Actions → Deploy GitHub Pages → Run workflow**를 실행합니다. 완료되면 실행 결과의 `github-pages` 환경 또는 Settings → Pages에서 사이트 주소를 확인합니다.
6. 사이트에서 실제 글꼴 표시, 무료 ZIP 다운로드, 누적 다운로드 수를 확인합니다. Release를 만들지 않은 상태에서는 TTF 직접 받기가 대신 나타나며 ZIP 집계는 ‘배포 전’으로 표시됩니다.

저장소 이름을 코드에 직접 적거나 토큰을 사이트에 넣을 필요가 없습니다. Pages workflow가 `GITHUB_REPOSITORY`에서 현재 소유자/저장소를 읽어 배포용 `site-config.js`에 자동으로 넣습니다. 저장소를 옮기거나 이름을 바꾸면 Pages를 다시 배포하세요.

GitHub 웹 업로드에서 숨김 `.github` 폴더가 빠지기 쉬우므로 GitHub Desktop이나 Git으로 올린 뒤 저장소 파일 목록에서 `.github/workflows/pages.yml`과 `release.yml`이 보이는지 확인하세요. GitHub Actions가 조직 정책으로 제한되어 있다면 해당 저장소에서 Actions 실행과 workflow의 쓰기 권한을 허용해야 합니다.

## 다운로드 수의 뜻

**공개 GitHub Releases에서 이름이 정확히 `NotHumanMyeongjo-fonts.zip`인 자산의 `download_count` 합계**입니다. 초안은 제외하고 공개된 사전 공개판도 합산합니다. 같은 자산 ID가 페이지에 중복되면 한 번만 셉니다. 고유 사용자 수나 설치 수가 아니며 반복 다운로드가 포함될 수 있습니다.

- 사이트의 큰 버튼은 공개일이 가장 최근인 정식 폰트 ZIP으로 연결합니다. 정식판이 없으면 최근 사전 공개 ZIP을 사용합니다. GitHub의 수동 ‘최신 릴리즈’ 지정은 별도로 추적하지 않습니다.
- **Pages의 TTF·WOFF2 직접 파일 다운로드는 집계되지 않습니다.** 큰 버튼이 직접 TTF 받기로 바뀐 경우도 집계에서 제외됩니다.
- 공개 API를 브라우저에서 토큰 없이 조회합니다. 모든 페이지를 확인한 뒤에만 전체 합계를 표시하며, 한 페이지라도 실패하면 부분 합계나 임의의 0을 표시하지 않습니다.
- 결과는 방문자 브라우저에 최대 10분간 저장하고 확인 시각을 표시합니다. API 제한(403/429)이 발생하면 `Retry-After` 또는 제한 해제 시각까지 다시 요청하지 않습니다. 다음 방문 때 재확인합니다.
- 무인증 GitHub API는 기본적으로 접속 IP당 시간당 60회 제한이 있습니다. 저장소가 연결된 상태에서 집계만 실패하면 큰 버튼은 GitHub의 공식 최신 Release ZIP 주소를 유지합니다. 해당 주소의 파일 존재는 확인하지 못한 상태이므로, 파일이 열리지 않을 때 사용할 TTF 직접 받기도 제공합니다. 첫 Release가 없음을 API로 확인했거나 저장소가 미설정일 때는 큰 버튼이 직접 TTF 받기로 바뀝니다.
- 집계 대상 자산을 삭제하면 해당 자산의 다운로드 수가 합계에서 사라집니다. 기존 파일을 교체하지 말고 **새 태그로 새 Release**를 추가하세요.

첫 Release가 공개된 직후 이미 열린 사이트에는 최대 10분 캐시가 남을 수 있습니다. 새 방문 환경에서 확인하거나 캐시가 만료된 뒤 새로고침하세요.

## 글꼴이나 사이트를 업데이트하기

사이트 문구·색·레이아웃은 `index.html`, `assets/site.css`, `assets/site.js`를 수정한 뒤 `main`에 올리면 자동 배포됩니다. GitHub Actions는 이 폴더의 파일만으로 사이트를 만듭니다.

글꼴은 아래 네 파일을 함께 교체하고 새 태그(예: `v1.0.1`)로 **Publish font ZIP**을 실행하세요.

- `fonts/NotHumanMyeongjo-Regular.ttf`
- `fonts/NotHumanMyeongjo-Regular.woff2`
- `fonts/repertoire.json`
- `FONT-LICENSE.txt`

`repertoire.json`은 실제 배포 폰트의 cmap에서 얻은 정수 `codepoints` 배열과, `fontFiles` 안의 TTF·WOFF2 파일별 `sha256`·`bytes` 기록을 담습니다. 글꼴을 교체할 때 목록과 해시도 다시 만들어 함께 제공해야 합니다. 빌드 과정에서 지원 목록의 해시와 실제 파일이 일치하는지 검사합니다. 사이트는 한글 범위를 추정해 표시하지 않고 이 목록을 사용합니다. 입력은 NFC로 정규화하며, 목록에 없는 문자는 기본 글꼴과 주황 밑줄로 구분합니다. 공백·줄바꿈과 제어 문자는 탐색 그리드에서 제외합니다.

`v*` 태그를 Git으로 push해도 Release workflow가 실행됩니다. 기존 태그로 재실행할 때는 태그의 커밋과 workflow 실행 커밋이 같아야 합니다. ZIP 내용이 같으면 기존 자산을 유지하고, 내용이 다르면 기존 다운로드 수를 지우지 않고 실패하며 새 태그를 요구합니다. 기존 자산은 GitHub가 제공하는 SHA256으로 검사하므로 검증 때문에 ZIP을 다시 다운로드하지 않습니다. 이 workflow는 `--clobber`로 자산을 덮어쓰지 않습니다.

## 로컬 확인과 파일 구성

Python 3와 Node.js 20 이상이면 됩니다. 별도 npm 패키지나 이미지 생성 모델은 필요 없습니다.

```sh
node --test tests/*.test.mjs
python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/make_release.py
python3 -m http.server 8000 --bind 127.0.0.1
```

마지막 명령 뒤 브라우저에서 `http://127.0.0.1:8000`을 열면 됩니다. `index.html`을 파일로 더블클릭하면 모듈·지원 목록의 로딩이 브라우저 정책에 막힐 수 있습니다. 로컬 기본 설정에는 GitHub 저장소가 연결되지 않아 다운로드 집계가 ‘확인 불가’로 표시되는 것이 정상입니다.

`make_release.py`는 `dist/`에 ZIP과 SHA256 파일을 만들 뿐 게시하지 않습니다. `prepare_site.py`는 `GITHUB_REPOSITORY=소유자/저장소` 환경 변수가 있을 때 `_site/`에 배포용 정적 파일만 모읍니다. `publish_release.py`는 GitHub Actions 안에서만 실행되며 Actions의 토큰으로 Release를 게시합니다. 토큰은 브라우저에 전달하지 않습니다.

| 경로 | 역할 |
| --- | --- |
| `index.html`, `assets/` | 화면·문자 입력기·다운로드 집계 |
| `site-config.js` | 로컬 기본 설정; Pages 빌드 때 저장소 정보 자동 주입 |
| `fonts/`, `FONT-LICENSE.txt` | 실제 무료 배포 글꼴과 이용 조건 |
| `.github/workflows/pages.yml` | 정적 사이트 빌드 및 Pages 배포 |
| `.github/workflows/release.yml` | 태그 push 또는 수동 실행으로 ZIP 공개 |
| `scripts/` | 파일 검사, Pages 준비, ZIP 제작 및 Release 게시 |
| `tests/` | 지원 문자·검색·페이지네이션·집계 실패 처리 검사 |

이 폴더에는 AI 원본 이미지, 모델 가중치, Python 실행 환경, 과거 글꼴 묶음이 들어가지 않습니다. `_site/`와 `dist/`는 다시 만들 수 있는 출력이므로 저장소에 올리지 않습니다.

## 검증 범위

현재 준비 작업의 자동 검사는 JavaScript 로직·문법, HTML 참조, 배포 파일과 ZIP의 무결성 검사입니다. 실제 GitHub 저장소, Pages URL, Release 업로드 및 브라우저 렌더링은 배포 후 확인해야 합니다. 사용자의 컴퓨터에서 실제 배포 완료를 주장하지 않습니다.

## GitHub 공식 안내

- [GitHub Pages 사용자 workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub Pages 제공 범위](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages)
- [Releases API와 자산의 download_count](https://docs.github.com/en/rest/releases/releases?apiVersion=2026-03-10)
- [API 페이지네이션](https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api)
- [API 호출 제한](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)
- [GitHub CLI의 Release 만들기](https://cli.github.com/manual/gh_release_create)
