// ---------------------------------------------------------------
// Teacher allowlist — SINGLE SOURCE OF TRUTH
//
// Every page that gates teacher-only features (edit.html,
// index-teacher.html, announcements-edit.html, auth.js) checks
// against this same list, by email address.
//
// To give a Firebase Authentication account teacher access,
// add its exact sign-in email below and save. No other file
// needs to change.
// ---------------------------------------------------------------
const TEACHER_EMAILS = [
  "jashwantnukala2025.comp@mmcoe.edu.in",
  "teacher2@school.com"
];

function isTeacherEmail(email) {
  return !!email && TEACHER_EMAILS.includes(email);
}
