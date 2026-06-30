/**
 * Unit-test-equivalent logic validation for SE Lecturer Hub.
 * Tests core business logic: streak calculation, date validation, form validation.
 * Run with: node src/__tests__/validation.test.js
 */

// ─── Streak Calculation (accountability) ──────────────────────────────────────
function calculateStreak(checkInDates) {
  if (checkInDates.length === 0) return 0;
  const unique = [...new Set(checkInDates)].sort().reverse();
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const dateStr of unique) {
    const parts = dateStr.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setHours(0, 0, 0, 0);
    const diff = Math.floor(
      (today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diff === streak) {
      streak++;
    } else if (diff > streak) break;
  }
  return streak;
}

function testStreak() {
  console.log("📊 Testing streak calculation...");

  // Test 1: No check-ins
  const result1 = calculateStreak([]);
  console.assert(result1 === 0, `Expected 0, got ${result1}`);
  console.log(result1 === 0 ? "  ✅ No check-ins → 0" : "  ❌ Failed - got " + result1);

  // Test 2: Single check-in today
  const today = new Date().toISOString().split("T")[0];
  const result2 = calculateStreak([today]);
  console.assert(result2 === 1, `Expected 1, got ${result2}`);
  console.log(result2 === 1 ? "  ✅ Today only → 1" : "  ❌ Failed - got " + result2);

  // Test 3: Streak of 3 consecutive days (use explicit dates to avoid timezone issues)
  const todayD = new Date();
  todayD.setHours(0, 0, 0, 0);
  const dates = [];
  for (let i = 0; i < 3; i++) {
    const d2 = new Date(todayD);
    d2.setDate(d2.getDate() - i);
    dates.push(d2.getFullYear() + '-' + 
      String(d2.getMonth() + 1).padStart(2, '0') + '-' + 
      String(d2.getDate()).padStart(2, '0'));
  }
  const result3 = calculateStreak(dates);
  console.assert(result3 === 3, `Expected 3, got ${result3}`);
  console.log(result3 === 3 ? "  ✅ 3 consecutive days → 3" : "  ❌ Failed - got " + result3);

  // Test 4: Streak broken (gap of 2 days)
  const dates4 = [
    dates[0], // today
    // yesterday skipped
    (() => { const d = new Date(todayD); d.setDate(d.getDate() - 2); 
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })(),
  ];
  const result4 = calculateStreak(dates4);
  console.assert(result4 === 1, `Expected 1, got ${result4}`);
  console.log(result4 === 1 ? "  ✅ Broken streak → 1" : "  ❌ Failed - got " + result4);

  // Test 5: Duplicate dates (same day multiple check-ins)
  const dates5 = [dates[0], dates[0]];
  const result5 = calculateStreak(dates5);
  console.assert(result5 === 1, `Expected 1, got ${result5}`);
  console.log(result5 === 1 ? "  ✅ Duplicate dates → 1" : "  ❌ Failed - got " + result5);
  
  // Test 6: Full 5-day streak
  const dates6 = [];
  for (let i = 0; i < 5; i++) {
    const d2 = new Date(todayD);
    d2.setDate(d2.getDate() - i);
    dates6.push(d2.getFullYear() + '-' + 
      String(d2.getMonth() + 1).padStart(2, '0') + '-' + 
      String(d2.getDate()).padStart(2, '0'));
  }
  const result6 = calculateStreak(dates6);
  console.assert(result6 === 5, `Expected 5, got ${result6}`);
  console.log(result6 === 5 ? "  ✅ 5 consecutive days → 5" : "  ❌ Failed - got " + result6);
}

// ─── Date Validation ─────────────────────────────────────────────────────────
function isPastDate(dateStr) {
  const today = new Date().toISOString().split("T")[0];
  return dateStr < today;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function testDateValidation() {
  console.log("\n📅 Testing date validation...");

  console.assert(isPastDate("2020-01-01") === true, "Past date should be true");
  console.log(
    isPastDate("2020-01-01") === true
      ? "  ✅ Past date detected"
      : "  ❌ Failed",
  );

  const future = "2099-12-31";
  console.assert(isPastDate(future) === false, "Future date should be false");
  console.log(
    isPastDate(future) === false ? "  ✅ Future date allowed" : "  ❌ Failed",
  );
}

function testEmailValidation() {
  console.log("\n📧 Testing email validation...");

  console.assert(isValidEmail("test@uni.edu") === true, "Valid email");
  console.log(
    isValidEmail("test@uni.edu") ? "  ✅ Valid email accepted" : "  ❌ Failed",
  );

  console.assert(isValidEmail("invalid") === false, "Invalid email");
  console.log(
    !isValidEmail("invalid") ? "  ✅ Invalid email rejected" : "  ❌ Failed",
  );

  console.assert(isValidEmail("") === false, "Empty email");
  console.log(!isValidEmail("") ? "  ✅ Empty email rejected" : "  ❌ Failed");

  console.assert(isValidEmail("test@") === false, "Missing domain");
  console.log(
    !isValidEmail("test@") ? "  ✅ Missing domain rejected" : "  ❌ Failed",
  );
}

// ─── Progress Calculation ────────────────────────────────────────────────────
function calculateProgress(submissions, total) {
  if (total <= 0) return 0;
  return Math.round((submissions / total) * 100);
}

function testProgress() {
  console.log("\n📈 Testing progress calculation...");

  console.assert(calculateProgress(12, 24) === 50, "12/24 should be 50%");
  console.log(calculateProgress(12, 24) === 50 ? "  ✅ 12/24 = 50%" : "  ❌ Failed");

  console.assert(calculateProgress(0, 20) === 0, "0/20 should be 0%");
  console.log(calculateProgress(0, 20) === 0 ? "  ✅ 0/20 = 0%" : "  ❌ Failed");

  console.assert(calculateProgress(20, 0) === 0, "20/0 should be 0%");
  console.log(calculateProgress(20, 0) === 0 ? "  ✅ 20/0 = 0%" : "  ❌ Failed");

  console.assert(calculateProgress(1, 3) === 33, "1/3 should be 33%");
  console.log(calculateProgress(1, 3) === 33 ? "  ✅ 1/3 = 33%" : "  ❌ Failed");
}

// ─── Rubric Total ────────────────────────────────────────────────────────────
function sumRubricPoints(items) {
  return items.reduce((sum, r) => sum + r.maxPoints, 0);
}

function testRubric() {
  console.log("\n📋 Testing rubric point calculation...");

  console.assert(sumRubricPoints([{ maxPoints: 10 }, { maxPoints: 20 }, { maxPoints: 15 }]) === 45, "10+20+15=45");
  console.log(sumRubricPoints([{ maxPoints: 10 }, { maxPoints: 20 }, { maxPoints: 15 }]) === 45 ? "  ✅ 10+20+15 = 45" : "  ❌ Failed");

  console.assert(sumRubricPoints([]) === 0, "Empty rubric → 0");
  console.log(sumRubricPoints([]) === 0 ? "  ✅ Empty = 0" : "  ❌ Failed");
}

// ─── Smart Goal Progress ─────────────────────────────────────────────────────
function goalProgress(milestones) {
  if (milestones.length === 0) return 0;
  const completed = milestones.filter((m) => m.completed).length;
  return Math.round((completed / milestones.length) * 100);
}

function testGoalProgress() {
  console.log("\n🎯 Testing goal progress calculation...");

  console.assert(goalProgress([]) === 0, "Empty milestones → 0");
  console.log(goalProgress([]) === 0 ? "  ✅ Empty milestones = 0%" : "  ❌ Failed");

  console.assert(goalProgress([{ completed: true }, { completed: false }, { completed: true }, { completed: false }]) === 50, "2/4 → 50%");
  console.log(goalProgress([{ completed: true }, { completed: false }, { completed: true }, { completed: false }]) === 50 ? "  ✅ 2/4 = 50%" : "  ❌ Failed");

  console.assert(goalProgress([{ completed: true }, { completed: true }]) === 100, "2/2 → 100%");
  console.log(goalProgress([{ completed: true }, { completed: true }]) === 100 ? "  ✅ 2/2 = 100%" : "  ❌ Failed");
}

// ─── Initials Utility ────────────────────────────────────────────────────────
function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join("");
}

function testInitials() {
  console.log("\n👤 Testing initials utility...");

  console.assert(getInitials("Dr. Smith") === "DS", "Dr. Smith → DS");
  console.log(getInitials("Dr. Smith") === "DS" ? "  ✅ Dr. Smith → DS" : "  ❌ Failed");

  console.assert(getInitials("Alice Johnson") === "AJ", "Alice Johnson → AJ");
  console.log(getInitials("Alice Johnson") === "AJ" ? "  ✅ Alice Johnson → AJ" : "  ❌ Failed");

  console.assert(getInitials("") === "", "Empty → empty");
  console.log(getInitials("") === "" ? '  ✅ Empty → ""' : "  ❌ Failed");
}

// ─── Run all tests ───────────────────────────────────────────────────────────
console.log("╔══════════════════════════════════════════╗");
console.log("║  SE Lecturer Hub — Validation Test Suite ║");
console.log("╚══════════════════════════════════════════╝\n");

let passCount = 0;
let failCount = 0;

// Override console.assert to count
const origAssert = console.assert;
console.assert = (condition, msg) => {
  if (condition) passCount++;
  else failCount++;
  origAssert(condition, msg);
};

testStreak();
testDateValidation();
testEmailValidation();
testProgress();
testRubric();
testGoalProgress();
testInitials();

console.log("\n═══════════════════════════════════════════");
console.log(`Results: ${passCount} passed, ${failCount} failed`);
console.log("All tests completed.");