#!/usr/bin/env python3
"""Copy the course materials into the SS-Courses site.

usage: python3 tools/import.py "<path>/materials" .

From the materials folder (the layout the materials build writes):
  6 - Data for SS-Courses/course.js     -> data/course.js     (window.SSC = {...})
  6 - Data for SS-Courses/images/       -> data/images/
  1 - Lessons, 2 - Homeworks, 3 - Answers, 4 - Checks,
  5 - Practice files, 7 - Projects      -> materials/<same name>/
Paths inside course.js stay as they are: images are relative to data/, files to materials/.
Only changed files are copied, so re-running after a materials update is quick.
"""
import filecmp, json, os, shutil, sys

FOLDERS = ["1 - Lessons", "2 - Homeworks", "3 - Answers", "4 - Checks", "5 - Practice files", "7 - Projects"]
DATA = "6 - Data for SS-Courses"


def sync(src, dst):
    n = 0
    for root, _, files in os.walk(src):
        rel = os.path.relpath(root, src)
        for f in files:
            if f.startswith(".") or f.startswith("~$"):
                continue
            s = os.path.join(root, f)
            d = os.path.normpath(os.path.join(dst, rel, f))
            if os.path.exists(d) and filecmp.cmp(s, d, shallow=False):
                continue
            os.makedirs(os.path.dirname(d), exist_ok=True)
            shutil.copyfile(s, d)
            n += 1
    return n


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    mat, site = sys.argv[1], sys.argv[2]
    data = os.path.join(mat, DATA)
    with open(os.path.join(data, "course.json"), encoding="utf-8") as fh:
        course = json.load(fh)
    os.makedirs(os.path.join(site, "data"), exist_ok=True)
    with open(os.path.join(site, "data", "course.js"), "w", encoding="utf-8") as fh:
        fh.write("/* MS Office Mastery course data, version %s, from \"%s/course.json\". Run tools/import.py to update. */\n" % (course.get("version"), DATA))
        fh.write("window.SSC = " + json.dumps(course, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print("course.js: version", course.get("version"), "-", len(course["lessons"]), "lessons,", len(course["checks"]), "checks,", len(course["projects"]), "projects")
    print("images:", sync(os.path.join(data, "images"), os.path.join(site, "data", "images")), "copied")
    for f in FOLDERS:
        src = os.path.join(mat, f)
        if os.path.isdir(src):
            print(f + ":", sync(src, os.path.join(site, "materials", f)), "copied")
    missing = []
    def need(p):
        if p and not os.path.exists(os.path.join(site, "materials", p)):
            missing.append(p)
    for w in course["weeks"]:
        need(w["deck"].get("pdf")); need(w["deck"].get("pptx"))
    for l in course["lessons"]:
        for v in l["files"].values():
            if isinstance(v, dict):
                for p in v.values(): need(p)
            else:
                need(v)
    for im in course["images"].values():
        if not os.path.exists(os.path.join(site, "data", im["file"])):
            missing.append("data/" + im["file"])
    print("missing files:", len(missing))
    for m in missing[:20]:
        print("  ", m)


if __name__ == "__main__":
    main()
