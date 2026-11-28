# SS-Courses — Software Squad courses

**Software Squad**'s course platform, with two courses that each take a student from beginner to almost expert in
12 weeks (36 lessons, 12 checks including the final exam, 4 portfolio projects):

- **MS Office Mastery**: Word, Excel, PowerPoint, Outlook and Teams
- **Adobe Creative Mastery**: Photoshop, Illustrator, Premiere Pro and After Effects

Students pick a course under **Kurslar** (or open the site with `?course=adobe`). Each course keeps its own progress. Built like speakup-v1: one static
site, no build step, the same Firebase accounts, Uzbek interface with an English switch, light/dark theme, installable on a phone.

## What's inside

- **Bosh sahifa (Home)**: the 12-week plan by app, progress, XP, streak and how the course is graded.
- **Darslar (Lessons)**: every lesson page has 9 tabs:
  - **Dars**: hook, goals, a warm-up on earlier lessons, the lesson's slides as thumbnails and the **presenter**
    (full screen, ← →, F fullscreen, O outline, A answer slides for teachers, B black screen, swipe on phones).
    Slides are drawn from the week deck's PDF, so they look exactly like PowerPoint.
  - **Atamalar (Terms)**: the 16 terms with a listen button, flashcards (EN→UZ / UZ→EN), memory hooks and the term quiz.
  - **Qanday qilinadi (How-to)**: each skill with its menu path, shortcut keys, numbered steps and the screenshot.
    Clicking a step highlights that spot on the screenshot. Extra shots and captions sit under it. Click a picture to enlarge it.
  - **Mashq A–H (Practice)**: the 8 exercises from course.json, checked at once: choose, match, true/false (with the corrected
    sentence), order (drag or ↑↓), gap fill with a word bank, find the mistake, and **label the screenshot**.
  - **Tugmani top (Find the button)**: a click-the-right-place game on the lesson's screenshots. The numbers are covered,
    and targets come from the image marks (`box`) in course.json.
  - **Amaliy ish (Hands-on task)**: the practice file to download, the steps, the result screenshot and a self-check list,
    followed by the case study and the class game.
  - **Chiqish chiptasi (Exit ticket)**: 5 quick questions.
  - **Uy vazifasi (Homework)**: 6 exercises done and checked on the page (once each), plus the computer task with its file and
    requirements, and "hand in". Students can also download the DOCX/PDF to print.
  - **Xulosa (Summary)**: recap, mnemonic, shortcut table, common mistakes and tips.
- **Takrorlash (Review)**: a Leitner queue (boxes at 1, 2, 4, 7 and 15 days) with every opened lesson's terms and every wrong answer.
- **Nazorat (Checks)**: the test part of each weekly check and the final exam as a timed online test (the first attempt counts),
  and the practical part with its file and marking scheme.
- **Loyihalar (Projects)**: brief, deliverables with tick lists, examples, timeline, rubric and starter files.
- **Materiallar**: every file, searchable. Answer keys, paper checks and grading sheets appear only in teacher mode.
- **Natijalarim (My progress)**: XP, streak, activity calendar, 15 badges and an estimated final grade using the course weights
  (homework 30%, projects 30%, checks 20%, final exam 20%, certificate from 70%).
- **Panel (teacher dashboard)**: students × lessons heat map, check scores with practical marks, project marks, homework task marks,
  final grades and certificate status, common mistakes, and CSV export.

## Accounts and data

Signing in is optional: progress is always saved in the browser. When a student signs in (with the same accounts as SpeakUp),
progress syncs to Firebase under `ssc/progress/{uid}/{course}`, and teachers give marks under `ssc/grades/{uid}/{course}`.
**Before the cloud part works**, add the `ssc` node from [`firebase/ssc-rules.json`](firebase/ssc-rules.json) to SpeakUp's
`database.rules.json` (same Firebase project) and deploy the rules. Teacher mode turns on by itself for owner, manager and
teacher accounts. On a classroom computer it can also be switched on under Settings.

## Run

`python3 -m http.server 8770` in this folder, then open http://localhost:8770. Any static host works (GitHub Pages, Netlify, Render static site).

## Courses

`courses.js` lists the courses: where each one's data, screenshots and files live, its title, apps and colours.
Only the chosen course's data file is loaded.

| course | data | files |
|---|---|---|
| office | `data/course.js`, `data/images/` | `materials/` |
| adobe | `data/adobe/course.js`, `data/adobe/images/` (WebP) | `materials-adobe/` |

## Update the content

The materials are built in the project's materials folders (`materials/6 - Data for SS-Courses/course.json` plus the decks, homework,
answers, checks, practice files and projects). To bring a new version in:

```
python3 tools/import.py "<path>/materials" .                                  # MS Office Mastery
python3 tools/import.py "<path>/materials-adobe" . --course adobe --webp      # Adobe Creative Mastery
```

It writes `data/course.js`, copies the screenshots to `data/images/` and the files to `materials/`, and lists anything missing.

## Files

```
index.html               page shell
courses.js               the course list; loads the chosen course's data
app.js                   router, home, weeks, lesson page (all 9 tabs)
shared/ssc-core.js       settings, progress store, XP/streak/badges, review queue, answer checking
shared/ssc-practice.js   exercise engine (7 exercise types, practice / homework / test modes)
shared/ssc-present.js    presenter and slide thumbnails (pdf.js)
shared/ssc-pages.js      review, checks, projects, materials, my progress, settings
shared/ssc-dashboard.js  teacher dashboard
shared/ssc-cloud.js      Firebase sign-in and sync
shared/ssc.css           all styles
data/course.js           course data (window.SSC), data/images/ screenshots
materials/               decks, homework, answer keys, checks, practice files, projects
firebase/ssc-rules.json  database rules for the ssc node
tools/import.py          content import
```
