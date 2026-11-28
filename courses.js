/* SS-Courses: the list of courses on this site. Each course has its own data file (window.SSC),
 * screenshots folder and materials folder, written by tools/import.py --course <id>.
 * Only the chosen course's data is loaded (it is large); the choice is kept in localStorage
 * ("ssc_course") and can be set with ?course=<id> in the address.
 */
window.SSC_COURSES = [
  {
    id: "office",
    data: "data/course.js",            // window.SSC
    base: "data/",                     // screenshots: base + image.file
    files: "materials/",               // decks, homework, answers, checks, practice files, projects
    title: "MS Office Mastery",
    titleUz: "MS Office: noldan ustagacha",
    titleEn: "MS Office: from zero to expert",
    blurbUz: "12 hafta, 36 dars: Word, Excel, PowerPoint, Outlook va Teams. Har bir koʻnikma rasmli qadamlar bilan, har bir darsda mashqlar, amaliy ish va uy vazifasi.",
    blurbEn: "12 weeks, 36 lessons: Word, Excel, PowerPoint, Outlook and Teams. Every skill shown step by step with screenshots, with practice, a hands-on task and homework in every lesson.",
    apps: ["word", "excel", "ppt", "outlook", "teams"],
    color: "#2F3BD9",
  },
  {
    id: "adobe",
    data: "data/adobe/course.js",
    base: "data/adobe/",
    files: "materials-adobe/",
    title: "Adobe Creative Mastery",
    titleUz: "Adobe: noldan ustagacha",
    titleEn: "Adobe: from zero to expert",
    blurbUz: "12 hafta, 36 dars: Photoshop, Illustrator, Premiere Pro va After Effects. Har bir koʻnikma rasmli qadamlar bilan, har bir darsda mashqlar, amaliy ish va uy vazifasi.",
    blurbEn: "12 weeks, 36 lessons: Photoshop, Illustrator, Premiere Pro and After Effects. Every skill shown step by step with screenshots, with practice, a hands-on task and homework in every lesson.",
    apps: ["ps", "ai", "pr", "ae"],
    color: "#FA0F00",
    hero: "linear-gradient(135deg,#E3261E 0%,#7A1430 55%,#0B1030 100%)",
  },
];
(function(){
  var list = window.SSC_COURSES, id = null;
  try {
    var m = /[?&]course=([a-z0-9-]+)/.exec(location.search);
    if (m) { id = m[1]; localStorage.setItem("ssc_course", id); history.replaceState(null, "", location.pathname + location.hash); }
    else id = localStorage.getItem("ssc_course");
  } catch (e) {}
  var c = list.filter(function(x){ return x.id === id; })[0] || list[0];
  window.SSC_COURSE = c;
  document.write('<script src="' + c.data + '?v=' + (c.v || 2) + '"><\/script>');
})();
