"""Offline Release tests: no GitHub request or publication is performed."""
import contextlib, hashlib, io, json, os, subprocess, sys, tempfile, unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
import publish_release
from delivery import ASSET_NAME
SHA="a"*40
REPO="sample-owner/font-site"
TAG="v1.0.0"
def result(data=None,error="",code=0):
    return subprocess.CompletedProcess([],code,json.dumps(data) if data is not None else "",error)

class ReleaseFlowTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(prefix="nothuman-release-fixture-")
        self.root=Path(self.temp.name)
        (self.root/"dist").mkdir()
        self.outputs=[self.root/"dist"/ASSET_NAME,self.root/"dist"/(ASSET_NAME+".sha256")]
        for index,path in enumerate(self.outputs):path.write_bytes(("fixture "+str(index)).encode())
        self.calls=[]
        self.env=patch.dict(os.environ,{"GITHUB_ACTIONS":"true","GITHUB_REPOSITORY":REPO,"RELEASE_TAG":TAG,"GITHUB_SHA":SHA})
        self.root_patch=patch.object(publish_release,"ROOT",self.root)
        self.env.start();self.root_patch.start()
    def tearDown(self):
        self.root_patch.stop();self.env.stop();self.temp.cleanup()
    def metadata(self,draft=True,target=SHA,assets=None):
        return {"id":99,"draft":draft,"target_commitish":target,"assets":assets or []}
    def assets(self):
        return [{"name":path.name,"digest":"sha256:"+hashlib.sha256(path.read_bytes()).hexdigest()} for path in self.outputs]
    def run_flow(self,tag_exists=False,lookup="draft",metadata=None,tag_sha=SHA,annotated=False):
        metadata=metadata or self.metadata()
        def fake(*args,check=True):
            self.calls.append(args)
            if args[:2]==("api","repos/"+REPO+"/git/ref/tags/"+TAG):
                return result({"object":{"type":"tag" if annotated else "commit","sha":"tag-object" if annotated else tag_sha}}) if tag_exists else result(error="gh: Not Found (HTTP 404)",code=1)
            if args[:2]==("api","repos/"+REPO+"/git/tags/tag-object"):
                return result({"object":{"type":"commit","sha":tag_sha}})
            if args[:2]==("release","view"):
                return result(error="release not found",code=1) if lookup=="missing" else result({"databaseId":99})
            if args[:2]==("api","repos/"+REPO+"/releases/99"):return result(metadata)
            if args[:2]==("api","repos/"+REPO+"/releases") and "--method" in args:
                body=json.loads(Path(args[args.index("--input")+1]).read_text())
                self.assertEqual(body["target_commitish"],SHA);self.assertTrue(body["draft"])
                return result(self.metadata())
            if args[:2] in (("release","upload"),("release","edit")):return result()
            raise AssertionError("Unexpected CLI call: "+repr(args))
        with patch.object(publish_release,"gh",fake),contextlib.redirect_stdout(io.StringIO()):publish_release.main()
    def test_new_release_uses_create_response(self):
        self.run_flow(lookup="missing")
        self.assertEqual(sum(call[:2]==("release","upload") for call in self.calls),2)
        self.assertEqual(self.calls[-1][:2],("release","edit"))
        self.assertFalse(any("/releases/tags/" in value for call in self.calls for value in call))
    def test_pending_draft_resumes_by_database_id(self):
        self.run_flow()
        self.assertTrue(any(call[:2]==("api","repos/"+REPO+"/releases/99") for call in self.calls))
        self.assertFalse(any("--method" in call for call in self.calls))
        self.assertEqual(self.calls[-1][:2],("release","edit"))
    def test_identical_public_assets_no_download_or_upload(self):
        self.run_flow(tag_exists=True,metadata=self.metadata(False,assets=self.assets()))
        self.assertFalse(any(call[:2] in (("release","download"),("release","upload"),("release","edit")) for call in self.calls))
    def test_annotated_tag_resolves_to_commit(self):
        self.run_flow(tag_exists=True,annotated=True,metadata=self.metadata(False,assets=self.assets()))
        self.assertTrue(any(call[:2]==("api","repos/"+REPO+"/git/tags/tag-object") for call in self.calls))
    def test_existing_tag_commit_mismatch_stops(self):
        with self.assertRaisesRegex(RuntimeError,"기존 태그의 커밋"):self.run_flow(tag_exists=True,tag_sha="b"*40)
        self.assertFalse(any(call[0]=="release" for call in self.calls))
    def test_draft_target_mismatch_stops(self):
        with self.assertRaisesRegex(RuntimeError,"초안 릴리즈의 대상 커밋"):self.run_flow(metadata=self.metadata(target="b"*40))
        self.assertFalse(any(call[:2]==("release","upload") for call in self.calls))
    def test_changed_asset_requires_new_tag(self):
        assets=self.assets();assets[0]["digest"]="sha256:"+"0"*64
        with self.assertRaisesRegex(RuntimeError,"내용이 다릅니다"):self.run_flow(tag_exists=True,metadata=self.metadata(False,assets=assets))
        self.assertFalse(any(call[:2]==("release","upload") for call in self.calls))
    def test_missing_digest_does_not_download_zip(self):
        assets=self.assets();assets[0]["digest"]=None
        with self.assertRaisesRegex(RuntimeError,"SHA256을 확인할 수 없습니다"):self.run_flow(tag_exists=True,metadata=self.metadata(False,assets=assets))
        self.assertFalse(any(call[:2]==("release","download") for call in self.calls))
    def test_published_release_without_tag_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError,"원래 태그"):self.run_flow(metadata=self.metadata(False,assets=self.assets()))
    def test_local_invocation_cannot_publish(self):
        with patch.dict(os.environ,{"GITHUB_ACTIONS":"false"}),patch.object(publish_release,"gh") as fake:
            with self.assertRaisesRegex(RuntimeError,"GitHub Actions"):publish_release.main()
            fake.assert_not_called()
if __name__=="__main__":unittest.main()

