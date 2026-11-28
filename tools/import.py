#!/usr/bin/env python3
"""Copy a course's materials into the SS-Courses site.

usage:
  python3 tools/import.py "<path>/materials" .                          # MS Office Mastery
  python3 tools/import.py "<path>/materials-adobe" . --course adobe --webp

From the materials folder (the layout the materials build writes):
  6 - Data for SS-Courses/course.json   -> <data>/course.js   (window.SSC = {...})
  6 - Data for SS-Courses/images/       -> <data>/images/
  1 - Lessons, 2 - Homeworks, 3 - Answers, 4 - Checks,
  5 - Practice files, 7 - Projects      -> <files>/<same name>/
where <data> and <files> come from COURSES below (keep them in step with courses.js).
--webp stores the screenshots as WebP (about 5x smaller) and points course.js at them.
Paths inside course.js stay relative: images to <data>/, files to <files>/.
Only changed files are copied, so re-running after a materials update is quick.
"""
import argparse, filecmp, json, os, shutil, sys

COURSES = {
    "office": {"data": "data", "files": "materials"},
    "adobe": {"data": "data/adobe", "files": "materials-adobe"},
}
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


def webp_images(course, src_dir, dst_dir):
    from PIL import Image
    n = 0
    for im in course["images"].values():
        rel = im["file"]                                   # images/w01/x.png
        src = os.path.join(src_dir, rel)
        out_rel = os.path.splitext(rel)[0] + ".webp"
        dst = os.path.join(dst_dir, out_rel)
        im["file"] = out_rel
        if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
            continue
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with Image.open(src) as img:
            img.convert("RGB").save(dst, "WEBP", quality=86, method=6)
        n += 1
    return n


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("materials")
    ap.add_argument("site")
    ap.add_argument("--course", default="office", choices=sorted(COURSES))
    ap.add_argument("--webp", action="store_true")
    a = ap.parse_args()
    cfg = COURSES[a.course]
    data_src = os.path.join(a.materials, DATA)
    data_dst = os.path.join(a.site, cfg["data"])
    files_dst = os.path.join(a.site, cfg["files"])
    with open(os.path.join(data_src, "course.json"), encoding="utf-8") as fh:
        course = json.load(fh)
    os.makedirs(data_dst, exist_ok=True)
    if a.webp:
        print("images (webp):", webp_images(course, data_src, data_dst), "converted")
    else:
        print("images:", sync(os.path.join(data_src, "images"), os.path.join(data_dst, "images")), "copied")
    with open(os.path.join(data_dst, "course.js"), "w", encoding="utf-8") as fh:
        fh.write("/* %s course data, version %s, from \"%s/course.json\". Run tools/import.py to update. */\n" % (course.get("title"), course.get("version"), DATA))
        fh.write("window.SSC = " + json.dumps(course, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print("course.js:", course.get("title"), "version", course.get("version"), "-", len(course["lessons"]), "lessons,", len(course["checks"]), "checks,", len(course["projects"]), "projects")
    for f in FOLDERS:
        src = os.path.join(a.materials, f)
        if os.path.isdir(src):
            print(f + ":", sync(src, os.path.join(files_dst, f)), "copied")
    missing = []

    def need(p):
        if p and not os.path.exists(os.path.join(files_dst, p)):
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
        if not os.path.exists(os.path.join(data_dst, im["file"])):
            missing.append(cfg["data"] + "/" + im["file"])
    print("missing files:", len(missing))
    for m in missing[:20]:
        print("  ", m)


if __name__ == "__main__":
    main()
