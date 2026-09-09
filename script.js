

// ---------- DATA ----------
let skillsData = [];
let skillsByPath = {};
let selectedSkills = [];
let skillNameSet = new Set();
let sharpMindAssignments = [];

let eventsData = [];
let editingEventIndex = null;

// Per-path / profession tiers inferred from skills + main tier
let pathTierMap = {};

// Selected-skills sort state
let skillSortState = {
  column: "default", // "default" | "tier" | "path" | "skill"
  direction: "asc" // "asc" | "desc"
};

// Dirty flag for unsaved changes
let isDirty = false;

// ---------- DOM REFS ----------
const skillPathSelect = document.getElementById("skillPath");
const skillSelect = document.getElementById("skillSelect");
const skillFreeFlag = document.getElementById("skillFreeFlag");
const addSkillBtn = document.getElementById("addSkillBtn");
const skillDescription = document.getElementById("skillDescription");
const selectedSkillsBody = document.getElementById("selectedSkillsBody");
const totalSkillCostSpan = document.getElementById("totalSkillCost");

const addEventBtn = document.getElementById("addEventBtn");
const eventsBody = document.getElementById("eventsBody");
const totalEventPointsSpan = document.getElementById("totalEventPoints");
const qualifyingEventsCountSpan = document.getElementById("qualifyingEventsCount");
const eventsUntilNextTierSpan = document.getElementById("eventsUntilNextTier");

const eventNameInput = document.getElementById("eventNameInput");
const eventDateInput = document.getElementById("eventDateInput");
const eventTypeSelect = document.getElementById("eventTypeSelect");
const eventNpcInput = document.getElementById("eventNpcInput");
const eventMotInput = document.getElementById("eventMotInput");
const eventBonusInput = document.getElementById("eventBonusInput");

const tierInput = document.getElementById("tier");
const totalSkillPointsInput = document.getElementById("totalSkillPoints");

const saveCharacterBtn = document.getElementById("saveCharacterBtn");
const loadCharacterBtn = document.getElementById("loadCharacterBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");
const loadCharacterFile = document.getElementById("loadCharacterFile");

const organizationsContainer = document.getElementById(
  "organizationsContainer"
);

const characterNameInput = document.getElementById("characterName");
const playerNameInput = document.getElementById("playerName");
const pathDisplaySelect = document.getElementById("pathDisplay");
const mainPathTierBox = document.getElementById("mainPathTierBox");

const factionSelect = document.getElementById("faction");

const secondaryPathsDisplay = document.getElementById("secondaryPathsDisplay");
const professionsDisplay = document.getElementById("professionsDisplay");

// Milestone checkboxes
const artificerMilestone2Checkbox = document.getElementById(
  "artificerMilestone2"
);
const artificerMilestone3Checkbox = document.getElementById(
  "artificerMilestone3"
);
const bardMilestone2Checkbox = document.getElementById("bardMilestone2");
const bardMilestone3Checkbox = document.getElementById("bardMilestone3");
const scholarMilestone2Checkbox = document.getElementById("scholarMilestone2");
const scholarMilestone3Checkbox = document.getElementById("scholarMilestone3");

// Modal
const skillModal = document.getElementById("skillModal");
const skillModalTitle = document.getElementById("skillModalTitle");
const skillModalBody = document.getElementById("skillModalBody");
const skillModalClose = document.getElementById("skillModalClose");

// Unspent SP header
const unspentSkillPointsHeader = document.getElementById(
  "unspentSkillPointsHeader"
);

// ---------- DIRTY HELPERS ----------
function markDirty() {
  isDirty = true;
}

function markClean() {
  isDirty = false;
}

window.addEventListener("beforeunload", function (e) {
  if (!isDirty) return;
  e.preventDefault();
  e.returnValue = "";
});

// ---------- HELPERS ----------
function getOrganizations() {
  return Array.from(
    organizationsContainer.querySelectorAll('input[type="checkbox"]:checked')
  ).map((cb) => cb.value);
}

function setOrganizations(values) {
  const set = new Set(values || []);
  organizationsContainer
    .querySelectorAll('input[type="checkbox"]')
    .forEach((cb) => {
      cb.checked = set.has(cb.value);
    });
}

function getCurrentTier() {
  return parseInt(tierInput.value, 10) || 0;
}

function normalizeSkillName(name) {
  return (name || "")
    .toLowerCase()
    .replace(/[\.\,\;\:\!\?]+$/g, "")
    .trim();
}

function getSkillTemplateName(record) {
  return (record && (record.baseName || record.name)) || "";
}

// Recompute per-path tiers and update Secondary/Profession fields
function updatePathAndProfessionDisplays() {
  const mainPath = pathDisplaySelect.value || "";
  const charTier = getCurrentTier();

  const tiers = {};

  // Tier inferred from skills
  selectedSkills.forEach((sk) => {
    if (!sk.path) return;
    const t = parseInt(sk.tier || 0, 10) || 0;
    if (!tiers[sk.path] || t > tiers[sk.path]) {
      tiers[sk.path] = t;
    }
  });

  // Main path gets character tier from events
  if (mainPath) {
    tiers[mainPath] = charTier;
  }

  pathTierMap = tiers;
  window.pathTierMap = tiers;

  const secondaryParts = [];
  const professionParts = [];

  Object.keys(tiers).forEach((path) => {
    const t = tiers[path];
    if (path === mainPath) return;

    if (PROFESSION_NAMES.has(path)) {
      // Professions: Artificer [2], Bard [1]
      const label = `${path} [${t}]`;
      professionParts.push(label);
    } else {
      // Secondary paths: Healer [2], Rogue [2]
      const label = `${path} [${t}]`;
      secondaryParts.push(label);
    }
  });

  secondaryPathsDisplay.value = secondaryParts.join(", ");
  professionsDisplay.value = professionParts.join(", ");

  // Show main path tier in the box next to the Path dropdown
  if (mainPathTierBox) {
    const t = tiers[mainPath] || charTier;
    mainPathTierBox.value = mainPath && t > 0 ? t : "";
  }
}

function computeSkillCost(record) {
  const mainPath = pathDisplaySelect.value || "";
  const tier = record.tier || 0;
  const free = !!record.free;
  const path = record.path || "";

  if (free) return 0;

  const isMainPath = path === mainPath;
  const isProfession = PROFESSION_NAMES.has(path);

if (isMainPath || isProfession) {
  if (tier === 0) return 0;
  return tier;
} else {
  // Secondary path cost: Tier 0 = 2 SP, higher tiers = 2 × tier
  if (tier === 0) return 2;
  return tier * 2;
}
}

function getMilestonesForPath(path) {
  let milestones = 1;

  if (path === "Bard") {
    if (bardMilestone2Checkbox && bardMilestone2Checkbox.checked) {
      milestones++;
    }
    if (bardMilestone3Checkbox && bardMilestone3Checkbox.checked) {
      milestones++;
    }
  } else if (path === "Artificer") {
    if (artificerMilestone2Checkbox && artificerMilestone2Checkbox.checked) {
      milestones++;
    }
    if (artificerMilestone3Checkbox && artificerMilestone3Checkbox.checked) {
      milestones++;
    }
  } else if (path === "Scholar") {
    if (scholarMilestone2Checkbox && scholarMilestone2Checkbox.checked) {
      milestones++;
    }
    if (scholarMilestone3Checkbox && scholarMilestone3Checkbox.checked) {
      milestones++;
    }
  }

  return milestones;
}

// Uses depend on the tier of the specific path/profession
function computeSkillUses(skill) {
  if (!skill) return null;

  const periodicity = (skill.periodicity || "").trim();
  const base =
    typeof skill.usesBasePerDay === "number"
      ? skill.usesBasePerDay
      : parseFloat(skill.usesBasePerDay || "0") || 0;
  const perExtra =
    typeof skill.usesPerExtraTier === "number"
      ? skill.usesPerExtraTier
      : parseFloat(skill.usesPerExtraTier || "0") || 0;
  const startTier = parseInt(skill.usesScaleStartTier || "0", 10) || 0;

  const perMilestone1 = !!skill.perMilestone1;
  const perMilestone2 = !!skill.perMilestone2;

  const path = skill.path || "";

  // Resolve effective tier for this path/profession
  const map = window.pathTierMap || {};
  let effectiveTier =
    typeof map[path] === "number" ? map[path] : getCurrentTier();

// Special-case: Scrolls & Potions uses the highest of Mage or Healer tier
try {
  const normName = normalizeSkillName(skill.name);
  if (normName === normalizeSkillName("Scrolls & Potions")) {
    const mageTier = typeof map["Mage"] === "number" ? map["Mage"] : 0;
    const healerTier = typeof map["Healer"] === "number" ? map["Healer"] : 0;
    effectiveTier = Math.max(mageTier, healerTier);
  }
} catch (e) {
  // no-op
}


  if (
    periodicity.toLowerCase().includes("unlimited") ||
    (!base && !perExtra && !startTier && !perMilestone1 && !perMilestone2)
  ) {
    const label = periodicity || "Unlimited";
    return { display: "∞", numeric: Infinity, periodicity: label };
  }

  // Milestone-based logic (Bard/Artificer/Scholar)
  if (
    (perMilestone1 || perMilestone2) &&
    (path === "Bard" || path === "Artificer" || path === "Scholar")
  ) {
    const milestones = getMilestonesForPath(path);
    const label = periodicity || "Per Event Day";

    if (perMilestone1 && perMilestone2) {
      const perMilestoneBase = base || 1;
      const total = perMilestoneBase * milestones;
      return {
        display: `${total} × ${label}`,
        numeric: total,
        periodicity: label
      };
    }

    if (!perMilestone1 && perMilestone2) {
      const baseUses = base || 1;
      const hasSecondOrMore = milestones > 1;
      const total = baseUses + (hasSecondOrMore ? 1 : 0);
      return {
        display: `${total} × ${label}`,
        numeric: total,
        periodicity: label
      };
    }

    if (perMilestone1 && !perMilestone2) {
      const perMilestoneBase = base || 1;
      const total = perMilestoneBase * milestones;
      return {
        display: `${total} × ${label}`,
        numeric: total,
        periodicity: label
      };
    }
  }

  // Linear scaling
  let total = base;

  if (effectiveTier > startTier && perExtra) {
    const delta = effectiveTier - startTier;
    total += delta * perExtra;
  }

  if (Number.isFinite(total) && total > 0) {
    total = Math.floor(total + 1e-6);
  } else {
    total = 0;
  }

  if (!periodicity) {
    return { display: String(total), numeric: total, periodicity: "" };
  }

  return {
    display: `${total} × ${periodicity}`,
    numeric: total,
    periodicity
  };
}


function getScholarTierFromSelected() {
  let maxTier = 0;
  (selectedSkills || []).forEach((sk) => {
    if (sk.path === "Scholar") {
      const t = parseInt(sk.tier || 0, 10) || 0;
      if (t > maxTier) maxTier = t;
    }
  });
  return maxTier;
}

function buildSharpMindNotes(path, name) {
  if (!path || !sharpMindAssignments.length) return "";

  const asTarget = sharpMindAssignments.filter(
    (a) => a.targetPath === path && a.targetName === name
  );

  const asSource = sharpMindAssignments.filter(
    (a) => a.sharpPath === path
  );

  const parts = [];

  if (asTarget.length) {
    const tiers = Array.from(
      new Set(asTarget.map((a) => parseInt(a.sharpTier || 0, 10) || 0))
    ).sort((a, b) => a - b);
    const tierLabel = tiers.map((t) => `Scholar Tier ${t}`).join(", ");
    const bonus = asTarget.length;
    parts.push(
      `This skill has been enhanced by Sharp Mind (${tierLabel}): +${bonus} use(s) per day.`
    );
  }

  if (asSource.length && /^Sharp Mind\b/.test(name || "")) {
    const targets = asSource.map(
      (a) => `${a.targetName} (Tier ${a.targetTier || 0})`
    );
    const tierSet = Array.from(
      new Set(asSource.map((a) => parseInt(a.sharpTier || 0, 10) || 0))
    ).sort((a, b) => a - b);
    const tierLabel = tierSet.map((t) => `Scholar Tier ${t}`).join(", ");
    parts.push(
      `This Sharp Mind (${tierLabel}) is applied to: ${targets.join(", ")}.`
    );
  }

  return parts.join("\n");
}

function handleSharpMindSelection(sharpMindRecord) {
  const pathSelect = document.getElementById("pathDisplay");
  const mainPath = pathSelect ? (pathSelect.value || "") : "";

  if (!mainPath) {
    alert("Sharp Mind: Please choose your main Path in Basic Information first.");
    return;
  }

  const scholarTier = getScholarTierFromSelected();

  const alreadyBoosted = new Set(
    sharpMindAssignments.map((a) => `${a.targetPath}::${a.targetName}`)
  );

  const eligible = (selectedSkills || []).filter((sk) => {
    if (sk.path !== mainPath) return false;
    const key = `${sk.path}::${sk.name}`;
    if (alreadyBoosted.has(key)) return false;
    const t = parseInt(sk.tier || 0, 10) || 0;
    if (scholarTier > 0 && t > scholarTier) return false;
    return true;
  });

  if (!eligible.length) {
    alert(
      "Sharp Mind: You have no eligible Main Path skills to apply this to.\n\n" +
        "It cannot be applied to the same skill more than once,\n" +
        "and cannot be applied to a Main Path skill above your Scholar tier."
    );
    return;
  }

  const listText = eligible
    .map((s, i) => `${i + 1}. ${s.name} (Tier ${s.tier || 0})`)
    .join("\n");

  const choiceStr = prompt(
    "Sharp Mind: choose a Main Path skill to enhance.\n\n" +
      listText +
      "\n\nEnter the number of the skill (or Cancel to leave Sharp Mind unassigned):"
  );

  if (choiceStr === null) {
    return;
  }

  const index = parseInt(choiceStr, 10) - 1;
  if (isNaN(index) || index < 0 || index >= eligible.length) {
    alert("Sharp Mind: invalid choice. No skill was enhanced.");
    // Remove the just-added Sharp Mind if the choice was invalid
    const idx = selectedSkills.indexOf(sharpMindRecord);
    if (idx !== -1) {
      selectedSkills.splice(idx, 1);
      markDirty();
      populateSkillSelect();
      recomputeTotals();
    }
    return;
  }

  const target = eligible[index];

  const assignment = {
    sharpPath: sharpMindRecord.path,
    sharpName: "", // filled after rename
    sharpTier: parseInt(sharpMindRecord.tier || 0, 10) || 0,
    targetPath: target.path,
    targetName: target.name,
    targetTier: parseInt(target.tier || 0, 10) || 0
  };
  sharpMindAssignments.push(assignment);

  try {
    if (sharpMindRecord && target && sharpMindRecord.name) {
      const originalName = sharpMindRecord.name;
      const newName = `${originalName} - ${target.name}`;
      sharpMindRecord.name = newName;
      assignment.sharpName = newName;
      if (typeof renderSelectedSkills === "function") {
        renderSelectedSkills();
      }
    }
  } catch (e) {
    console.warn("Sharp Mind rename error:", e);
  }

  alert(
    "Sharp Mind applied:\\n\\n" +
      `Source: ${sharpMindRecord.name} (Scholar Tier ${sharpMindRecord.tier || "?"})
` +
      `Target: ${target.name} (Tier ${target.tier || 0})\\n\\n` +
      "Uses/day in the table remain the base value; see notes in descriptions/details."
  );
}
// ----- Prereq parsing -----
// Supports exact skill names plus AND/OR expressions. AND/OR inside square
// brackets are treated as part of the skill name, not as operators.
// Oxford-comma prerequisite lists such as "A, B, and C" or "A, B, or C"
// are also supported without breaking skill names that themselves contain commas.

const ARTIFICER_EXPERTISES = new Set([
  "gems",
  "runes",
  "weaponry",
  "armor",
  "alchemy",
  "construct",
  "clothing",
  "wondrous items"
]);

function normalizeExpertiseName(value) {
  let norm = normalizeSkillName(value)
    .replace(/^\[|\]$/g, "")
    .trim();
  if (norm === "constructs") norm = "construct";
  return norm;
}

function getBracketValues(name) {
  const values = [];
  const re = /\[([^\]]+)\]/g;
  let match;
  while ((match = re.exec(name || "")) !== null) {
    match[1]
      .split(/\s*,\s*|\s+or\s+/i)
      .map((v) => normalizeExpertiseName(v))
      .filter(Boolean)
      .forEach((v) => values.push(v));
  }
  return values;
}

function getArtificerExpertisesForSkill(record) {
  if (!record || record.path !== "Artificer") return [];

  // For [Any] skills, the replacement text is an object/skill name, not an
  // expertise category, so use the original template and do not count [Any].
  const templateName = getSkillTemplateName(record);
  if (/\[Any\]/i.test(templateName)) return [];

  return Array.from(
    new Set(
      getBracketValues(templateName).filter((value) =>
        ARTIFICER_EXPERTISES.has(value)
      )
    )
  );
}

function getOwnedAttuneExpertises(skillList = selectedSkills) {
  const result = new Set();
  (skillList || []).forEach((record) => {
    if (!record || record.path !== "Artificer") return;
    const templateName = getSkillTemplateName(record);
    if (!/^Attune\b/i.test(templateName)) return;
    getArtificerExpertisesForSkill(record).forEach((e) => result.add(e));
  });
  return result;
}

function countArtificerSkillsWithExpertise(expertise, skillList = selectedSkills) {
  const target = normalizeExpertiseName(expertise);
  return (skillList || []).filter(
    (record) =>
      record &&
      record.path === "Artificer" &&
      getArtificerExpertisesForSkill(record).includes(target)
  ).length;
}

function countTopLevelCommas(expr) {
  let squareDepth = 0;
  let parenDepth = 0;
  let count = 0;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === "[") squareDepth++;
    else if (ch === "]" && squareDepth > 0) squareDepth--;
    else if (ch === "(") parenDepth++;
    else if (ch === ")" && parenDepth > 0) parenDepth--;
    else if (ch === "," && squareDepth === 0 && parenDepth === 0) count++;
  }
  return count;
}

function findFinalTopLevelConjunction(expr) {
  let squareDepth = 0;
  let parenDepth = 0;
  let finalOp = null;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === "[") {
      squareDepth++;
      continue;
    }
    if (ch === "]" && squareDepth > 0) {
      squareDepth--;
      continue;
    }
    if (ch === "(") {
      parenDepth++;
      continue;
    }
    if (ch === ")" && parenDepth > 0) {
      parenDepth--;
      continue;
    }
    if (squareDepth || parenDepth) continue;

    const rest = expr.slice(i);
    const m = rest.match(/^\s*(and|or)\b/i);
    if (m) {
      finalOp = m[1].toUpperCase();
      i += m[0].length - 1;
    }
  }
  return finalOp;
}

function normalizeOxfordPrereqCommas(expr) {
  const commaCount = countTopLevelCommas(expr);
  if (commaCount < 2) return expr;

  const conjunction = findFinalTopLevelConjunction(expr);
  if (!conjunction) return expr;

  // Only convert a comma list when the final conjunction is itself preceded
  // by a comma (A, B, and C / A, B, or C). This preserves names such as
  // "Repair Armor, non-metal AND ...".
  const lower = expr.toLowerCase();
  const marker = `, ${conjunction.toLowerCase()} `;
  if (!lower.includes(marker)) return expr;

  let squareDepth = 0;
  let parenDepth = 0;
  let out = "";
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === "[") squareDepth++;
    else if (ch === "]" && squareDepth > 0) squareDepth--;
    else if (ch === "(") parenDepth++;
    else if (ch === ")" && parenDepth > 0) parenDepth--;

    if (ch === "," && squareDepth === 0 && parenDepth === 0) {
      out += ` ${conjunction} `;
    } else {
      out += ch;
    }
  }

  // "A OR B OR or C" can result after replacing the comma before the final
  // conjunction. Collapse a duplicated conjunction cleanly.
  return out.replace(
    new RegExp(`\\b${conjunction}\\s+${conjunction}\\b`, "gi"),
    conjunction
  );
}

function splitByTopLevelOperator(expr, opWord) {
  const parts = [];
  let squareDepth = 0;
  let parenDepth = 0;
  let start = 0;
  const target = opWord.toLowerCase();

  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === "[") {
      squareDepth++;
      continue;
    }
    if (ch === "]" && squareDepth > 0) {
      squareDepth--;
      continue;
    }
    if (ch === "(") {
      parenDepth++;
      continue;
    }
    if (ch === ")" && parenDepth > 0) {
      parenDepth--;
      continue;
    }
    if (squareDepth || parenDepth) continue;

    const before = i === 0 ? " " : expr[i - 1];
    const candidate = expr.slice(i, i + target.length);
    const after = expr[i + target.length] || " ";
    if (
      candidate.toLowerCase() === target &&
      !/[A-Za-z0-9_]/.test(before) &&
      !/[A-Za-z0-9_]/.test(after)
    ) {
      parts.push(expr.slice(start, i).trim());
      i += target.length - 1;
      start = i + 1;
    }
  }

  parts.push(expr.slice(start).trim());
  return parts.filter(Boolean);
}

function parsePrereqExpression(prereqRaw) {
  if (!prereqRaw) return null;
  let raw = String(prereqRaw).trim();
  if (!raw) return null;

  raw = normalizeOxfordPrereqCommas(raw);

  // OR of AND groups, with operators recognized only outside brackets/parens.
  const orGroups = splitByTopLevelOperator(raw, "OR");
  if (orGroups.length > 1) {
    const groups = orGroups.map((g) => splitByTopLevelOperator(g, "AND"));
    return { type: "OR_OF_AND", groups };
  }

  const andList = splitByTopLevelOperator(raw, "AND");
  return { type: "AND", skills: andList };
}

function matchesAnyTemplate(record, reqName) {
  const req = String(reqName || "").trim();
  if (!/\[Any\]/i.test(req)) return false;

  const template = getSkillTemplateName(record);
  if (normalizeSkillName(template) === normalizeSkillName(req)) return true;

  // Backward compatibility for saved characters created before baseName was
  // stored: match the displayed replacement value in the [Any] position.
  const escaped = req.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = escaped.replace(/\\\[Any\\\]/gi, "\\[[^\\]]+\\]");
  return new RegExp(`^${pattern}$`, "i").test(record.name || "");
}

function checkPrerequisitesForSkill(skill, skillList = selectedSkills) {
  const prereqRaw = (skill && skill.prereq ? String(skill.prereq) : "").trim();
  if (!prereqRaw) return { ok: true };

  // These Masterwork requirements are intentionally player/GM verified rather
  // than tracked by the character sheet.
  if (/^10\s+Artificer\s+Schematics\s+associated\s+with\s+\(Expertise\)\.?$/i.test(prereqRaw)) {
    return { ok: true };
  }

  const parsed = parsePrereqExpression(prereqRaw);
  if (!parsed) return { ok: true };

  function evaluateRequirement(reqName) {
    const req = String(reqName || "").trim().replace(/[.;]+$/g, "").trim();
    if (!req) return { ok: true };

    let m = req.match(/^(\d+)\s+(?:Artificer\s+)?skills?\s+with\s+\[([^\]]+)\]$/i);
    if (m) {
      const needed = parseInt(m[1], 10) || 0;
      const expertise = normalizeExpertiseName(m[2]);
      const have = countArtificerSkillsWithExpertise(expertise, skillList);
      return {
        ok: have >= needed,
        label: `${needed} skills with [${m[2]}] (you have ${have})`
      };
    }

    m = req.match(/^(\d+)\s+Artificer\s+Skills?\s+of\s+\(Expertise\)$/i);
    if (m) {
      const needed = parseInt(m[1], 10) || 0;
      const ownedAttunes = Array.from(getOwnedAttuneExpertises(skillList));
      const totals = ownedAttunes.map((expertise) => ({
        expertise,
        count: countArtificerSkillsWithExpertise(expertise, skillList)
      }));
      const ok = totals.some((item) => item.count >= needed);
      const detail = totals.length
        ? totals.map((item) => `${item.expertise}: ${item.count}`).join(", ")
        : "no Attune expertises selected";
      return {
        ok,
        label: `${needed} Artificer Skills matching one of your Attune expertises (${detail})`
      };
    }

    // Generic (Expertise): candidate must have at least one category matching
    // an Attune expertise already owned.
    if (/^\(Expertise\)$/i.test(req)) {
      const candidateExpertises = getArtificerExpertisesForSkill(skill);
      const ownedAttunes = getOwnedAttuneExpertises(skillList);
      const ok = candidateExpertises.some((e) => ownedAttunes.has(e));
      return { ok, label: "a matching Attune expertise" };
    }

    // Family prerequisites used by the updated Artificer rules.
    if (/^Masterwork$/i.test(req)) {
      const ok = (skillList || []).some(
        (record) =>
          record &&
          record.path === "Artificer" &&
          /^Masterwork:/i.test(getSkillTemplateName(record))
      );
      return { ok, label: "one Masterwork skill" };
    }

    if (/^Permanency$/i.test(req)) {
      const ok = (skillList || []).some(
        (record) =>
          record &&
          record.path === "Artificer" &&
          /^Permanency\b/i.test(getSkillTemplateName(record))
      );
      return { ok, label: "Permanency" };
    }

    const ok = (skillList || []).some((record) => {
      if (!record) return false;
      if (/\[Any\]/i.test(req)) return matchesAnyTemplate(record, req);
      return (
        normalizeSkillName(getSkillTemplateName(record)) ===
          normalizeSkillName(req) ||
        normalizeSkillName(record.name) === normalizeSkillName(req)
      );
    });

    return { ok, label: req };
  }

  if (parsed.type === "AND") {
    const results = (parsed.skills || []).map(evaluateRequirement);
    const missing = results.filter((result) => !result.ok);
    if (missing.length) {
      return {
        ok: false,
        message:
          "This skill requires ALL of the following:\n" +
          missing.map((result) => result.label).join("\n")
      };
    }
    return { ok: true };
  }

  const groups = parsed.groups || [];
  if (!groups.length) return { ok: true };

  const evaluatedGroups = groups.map((group) =>
    (group || []).map(evaluateRequirement)
  );
  const groupSatisfied = evaluatedGroups.some(
    (group) => group.length && group.every((result) => result.ok)
  );

  if (groupSatisfied) return { ok: true };

  const groupLabels = evaluatedGroups.map((group) =>
    group.map((result) => result.label).join(" AND ")
  );
  return {
    ok: false,
    message:
      "This skill requires ONE of the following sets:\n" +
      groupLabels.map((g) => "• " + g).join("\n")
  };
}

// ---------- SKILLS LOADING ----------
function buildSkillsStructures(rows) {
  skillsData = [];
  skillsByPath = {};
  skillNameSet = new Set();

  rows.forEach((r) => {
    const name = (r["Skill Name"] || "").trim();
    const path = (r["Path"] || "").trim();
    if (!name || !path) return;

    const skill = {
      name,
      path,
      description: r["Description"] || "",
      augment: r["Augment"] || "",
      special: r["Special"] || "",
      tier: parseInt(r["Tier"], 10) || 0,
      limitations: r["Limitations"] || "",
      phys: r["Phys Rep"] || "",
      prereq: r["Prerequisite"] || "",
      usesBasePerDay: r["Uses Base Per Day"]
        ? parseFloat(r["Uses Base Per Day"]) || 0
        : 0,
      usesPerExtraTier: r["Uses Per Extra Tier"]
        ? parseFloat(r["Uses Per Extra Tier"]) || 0
        : 0,
      usesScaleStartTier: r["Uses Scale Start Tier"]
        ? parseInt(r["Uses Scale Start Tier"], 10) || 0
        : 0,
      periodicity: r["Periodicity"] || "",
      perMilestone1:
        (r["Per Milestone 1"] || "").trim().toUpperCase() === "Y",
      perMilestone2:
        (r["Per Milestone 2"] || "").trim().toUpperCase() === "Y"
    };

    skillsData.push(skill);
    skillNameSet.add(normalizeSkillName(name));
    if (!skillsByPath[path]) skillsByPath[path] = [];
    skillsByPath[path].push(skill);
  });

  const paths = Object.keys(skillsByPath).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );

  skillPathSelect.innerHTML =
    '<option value="">-- Select Path / Profession --</option>';
  paths.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    skillPathSelect.appendChild(opt);
  });

  populateSkillSelect();
  updatePathAndProfessionDisplays();
}

function populateSkillSelect() {
  const path = skillPathSelect.value;
  skillSelect.innerHTML = '<option value="">-- Select Skill --</option>';
  skillDescription.value = "";

  let skills = [];
  if (path && skillsByPath[path]) {
    skills = skillsByPath[path];
  } else {
    skills = skillsData;
  }

  const usedKeys = new Set(
    selectedSkills.map((sk) => `${sk.path}::${sk.name}`)
  );

  skills.forEach((s) => {
    const key = `${s.path}::${s.name}`;
    if (usedKeys.has(key)) return;
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = `Tier ${s.tier || 0}: ${s.name}`;
    skillSelect.appendChild(opt);
  });
}

function updateSkillDescriptionFromSelect() {
  const val = skillSelect.value;
  if (!val) {
    skillDescription.value = "";
    return;
  }
  const [path, name] = val.split("::");
  const skill = (skillsByPath[path] || []).find((s) => s.name === name);
  if (!skill) {
    skillDescription.value = "";
    return;
  }

  let desc = skill.description || "";
  if (skill.augment) desc += `\n\nAugment: ${skill.augment}`;
  if (skill.special) desc += `\n\nSpecial: ${skill.special}`;
  if (skill.limitations) desc += `\n\nLimitations: ${skill.limitations}`;
  if (skill.phys) desc += `\n\nPhys Rep: ${skill.phys}`;
  if (skill.prereq) desc += `\n\nPrerequisite: ${skill.prereq}`;

  const usesInfo = computeSkillUses(skill);
  if (usesInfo && usesInfo.display) {
    desc += `\n\nUsage: ${usesInfo.display}`;
  }

  const note = buildSharpMindNotes(path, name);
  if (note) {
    desc += `\n\n${note}`;
  }

  skillDescription.value = desc.trim();
}

// ---------- SORTED SKILLS ----------
function defaultSkillSort(arr) {
  const mainPath = pathDisplaySelect.value || "";

  return arr.slice().sort((a, b) => {
    const aMain = a.path === mainPath ? 0 : 1;
    const bMain = b.path === mainPath ? 0 : 1;
    if (aMain !== bMain) return aMain - bMain;

    if (!aMain && !bMain) {
      const pathCmp = a.path.localeCompare(b.path, undefined, {
        sensitivity: "base"
      });
      if (pathCmp !== 0) return pathCmp;
    }

    const tierDiff = (a.tier || 0) - (b.tier || 0);
    if (tierDiff !== 0) return tierDiff;

    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

function getSortedSelectedSkills() {
  const arr = selectedSkills || [];

  if (skillSortState.column === "default") {
    return defaultSkillSort(arr);
  }

  const dir = skillSortState.direction === "desc" ? -1 : 1;

  return arr.slice().sort((a, b) => {
    let va, vb;

    if (skillSortState.column === "tier") {
      va = parseInt(a.tier || 0, 10);
      vb = parseInt(b.tier || 0, 10);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return (
        a.name.toLowerCase().localeCompare(b.name.toLowerCase()) * dir
      );
    }

    if (skillSortState.column === "path") {
      va = a.path.toLowerCase();
      vb = b.path.toLowerCase();
      const cmp = va.localeCompare(vb);
      if (cmp !== 0) return cmp * dir;
      const ta = parseInt(a.tier || 0, 10);
      const tb = parseInt(b.tier || 0, 10);
      if (ta !== tb) return (ta - tb) * dir;
      return (
        a.name.toLowerCase().localeCompare(b.name.toLowerCase()) * dir
      );
    }

    if (skillSortState.column === "skill") {
      va = a.name.toLowerCase();
      vb = b.name.toLowerCase();
      const cmp = va.localeCompare(vb);
      if (cmp !== 0) return cmp * dir;
      const ta = parseInt(a.tier || 0, 10);
      const tb = parseInt(b.tier || 0, 10);
      if (ta !== tb) return (ta - tb) * dir;
      return (
        a.path.toLowerCase().localeCompare(b.path.toLowerCase()) * dir
      );
    }

    return 0;
  });
}

function updateSkillSortHeaderIndicators() {
  const thTier = document.getElementById("thTier");
  const thPath = document.getElementById("thPath");
  const thSkill = document.getElementById("thSkill");

  const all = [thTier, thPath, thSkill];
  all.forEach((th) => {
    if (!th) return;
    const baseLabel =
      th.id === "thTier"
        ? "Tier"
        : th.id === "thPath"
        ? "Path/Profession"
        : "Skill";
    th.textContent = baseLabel;
  });

  const dirSymbol = skillSortState.direction === "desc" ? "▼" : "▲";

  if (skillSortState.column === "tier" && thTier) {
    thTier.textContent = `Tier ${dirSymbol}`;
  }
  if (skillSortState.column === "path" && thPath) {
    thPath.textContent = `Path/Profession ${dirSymbol}`;
  }
  if (skillSortState.column === "skill" && thSkill) {
    thSkill.textContent = `Skill ${dirSymbol}`;
  }
}

function attachSkillSortHandlers() {
  const thTier = document.getElementById("thTier");
  const thPath = document.getElementById("thPath");
  const thSkill = document.getElementById("thSkill");
  const resetBtn = document.getElementById("resetSkillSortBtn");

  if (thTier) {
    thTier.addEventListener("click", () => {
      if (skillSortState.column === "tier") {
        skillSortState.direction =
          skillSortState.direction === "asc" ? "desc" : "asc";
      } else {
        skillSortState.column = "tier";
        skillSortState.direction = "asc";
      }
      renderSelectedSkills();
      updateSkillSortHeaderIndicators();
      markDirty();
    });
  }

  if (thPath) {
    thPath.addEventListener("click", () => {
      if (skillSortState.column === "path") {
        skillSortState.direction =
          skillSortState.direction === "asc" ? "desc" : "asc";
      } else {
        skillSortState.column = "path";
        skillSortState.direction = "asc";
      }
      renderSelectedSkills();
      updateSkillSortHeaderIndicators();
      markDirty();
    });
  }

  if (thSkill) {
    thSkill.addEventListener("click", () => {
      if (skillSortState.column === "skill") {
        skillSortState.direction =
          skillSortState.direction === "asc" ? "desc" : "asc";
      } else {
        skillSortState.column = "skill";
        skillSortState.direction = "asc";
      }
      renderSelectedSkills();
      updateSkillSortHeaderIndicators();
      markDirty();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      skillSortState = { column: "default", direction: "asc" };
      renderSelectedSkills();
      updateSkillSortHeaderIndicators();
      markDirty();
    });
  }
}

// ---------- SKILL DETAIL MODAL ----------
function closeSkillModal() {
  if (!skillModal) return;
  skillModal.classList.add("hidden");
}

function showSkillDetail(selectedRecord) {
  if (!skillModal || !skillModalTitle || !skillModalBody) return;

  let recordToUse = selectedRecord;
  let fullSharpMindName = null;

  try {
    if (
      selectedRecord &&
      selectedRecord.path === "Scholar" &&
      /^Sharp Mind\b/.test(selectedRecord.name || "")
    ) {
      fullSharpMindName = selectedRecord.name;
      recordToUse = Object.assign({}, selectedRecord, { name: "Sharp Mind" });
    }
  } catch (e) {
    console.warn("Sharp Mind pre-call detail logic error:", e);
  }

  const { path, name } = recordToUse;
  const list = skillsByPath[path] || [];
  const lookupName = getSkillTemplateName(recordToUse);
  const skill = list.find((s) => s.name === lookupName);
  if (!skill) {
    alert("No detailed information found for this skill.");
    return;
  }

  const usesInfo = computeSkillUses(skill);

  const titleText =
    fullSharpMindName || selectedRecord.name || skill.name || "Skill";
  skillModalTitle.textContent = titleText;

  let html = "";
  html += `<p><strong>Path/Profession:</strong> ${escapeHtml(
    skill.path || ""
  )}</p>`;
  html += `<p><strong>Tier:</strong> ${escapeHtml(String(skill.tier || 0))}</p>`;

  html += formatMultiLineBlock("Description", skill.description);
  html += formatMultiLineBlock("Augment", skill.augment);
  html += formatMultiLineBlock("Special", skill.special);
  html += formatMultiLineBlock("Limitations", skill.limitations);
  html += formatMultiLineBlock("Phys Rep", skill.phys);
  html += formatMultiLineBlock("Prerequisite", skill.prereq);

  if (usesInfo && usesInfo.display) {
    html += `<p><strong>Uses:</strong> ${escapeHtml(usesInfo.display)}</p>`;
  }

  const note = buildSharpMindNotes(selectedRecord.path, selectedRecord.name);
  if (note) {
    html += `<p>${escapeHtml(note)}</p>`;
  }

  if (!html.trim()) {
    html = "<p>No additional information.</p>";
  }

  skillModalBody.innerHTML = html;
  skillModal.classList.remove("hidden");
}

// ---------- ADD / RENDER SELECTED SKILLS ----------
function addSelectedSkill() {
  const val = skillSelect.value;
  if (!val) {
    alert("Please choose a skill first.");
    return;
  }

  const mainPath = pathDisplaySelect.value || "";
  if (!mainPath) {
    alert(
      "Please choose your main Path in Basic Information before selecting skills."
    );
    return;
  }

  const [path, name] = val.split("::");
  const skill = (skillsByPath[path] || []).find((s) => s.name === name);
  if (!skill) {
    alert("Could not find data for this skill.");
    return;
  }

  const currentTier = getCurrentTier();
  const isMainPathSkill = path === mainPath;
  const isExplicitProfession = PROFESSION_NAMES.has(path);
  const isProfessionSkill = isExplicitProfession;
  const isSecondaryPathSkill = !isMainPathSkill && !isProfessionSkill;

  // Recompute totals (and pathTierMap) before checks
  recomputeTotals();
  const available =
    parseInt(totalSkillPointsInput.value, 10) >= 0
      ? parseInt(totalSkillPointsInput.value, 10)
      : 0;

  // Profession gating
  if (isProfessionSkill) {
    if (currentTier < 3) {
      alert("You must be at least Tier 3 to purchase profession skills.");
      return;
    }
    if (skill.tier > currentTier) {
      alert(
        `You are Tier ${currentTier}. You cannot take a Tier ${skill.tier} profession skill yet.`
      );
      return;
    }
    if (skill.tier > 1) {
      const prevTier = skill.tier - 1;
      const hasPrev = selectedSkills.some(
        (sk) => sk.path === path && sk.tier === prevTier
      );
      if (!hasPrev) {
        alert(
          `You must have at least one Tier ${prevTier} ${path} skill before purchasing a Tier ${skill.tier} ${path} skill.`
        );
        return;
      }
    }

    // --- Artificer-specific Attune rules ---
    if (path === "Artificer") {
      const isAttune = /^Attune\b/i.test(skill.name);

      const hasAnyArtificer = selectedSkills.some(
        (sk) => sk.path === "Artificer"
      );

      // 1) First Artificer skill must be an Attune
      if (!hasAnyArtificer && !isAttune) {
        alert(
          "Your first Artificer skill must be an Attune. Choose one Attune expertise before taking other Artificer skills."
        );
        return;
      }

      // 2) You can only have a number of Attune skills equal to your Artificer tier
      if (isAttune) {
        const existingAttunes = selectedSkills.filter(
          (sk) => sk.path === "Artificer" && /^Attune\b/i.test(getSkillTemplateName(sk))
        ).length;

        const map = window.pathTierMap || {};
        const currentArtificerTier =
          typeof map["Artificer"] === "number" ? map["Artificer"] : 0;

        const newArtificerTier = Math.max(
          currentArtificerTier,
          skill.tier || 0
        );

        if (existingAttunes >= newArtificerTier) {
          alert(
            `You can only have a number of Attune skills equal to your Artificer tier.\n\n` +
              `Current Artificer tier (including this purchase): ${newArtificerTier}\n` +
              `Existing Attune skills: ${existingAttunes}`
          );
          return;
        }
      }

      // An Artificer may choose only one Masterwork skill.
      if (/^Masterwork:/i.test(skill.name)) {
        const existingMasterwork = selectedSkills.find(
          (sk) =>
            sk.path === "Artificer" &&
            /^Masterwork:/i.test(getSkillTemplateName(sk))
        );
        if (existingMasterwork) {
          alert(
            `You may only choose one Masterwork skill. You already have ${existingMasterwork.name}.`
          );
          return;
        }
      }
    }

    // --- Scholar-specific "Sharp Mind" rules ---
    if (path === "Scholar") {
      const isSharpMindSkill = /^Sharp Mind\b/i.test(skill.name);

      if (isSharpMindSkill) {
        const existingSharpMinds = selectedSkills.filter(
          (sk) => sk.path === "Scholar" && /^Sharp Mind\b/i.test(sk.name)
        ).length;

        const map = window.pathTierMap || {};
        const currentScholarTier =
          typeof map["Scholar"] === "number" ? map["Scholar"] : 0;

        const newScholarTier = Math.max(
          currentScholarTier,
          skill.tier || 0
        );

        if (existingSharpMinds >= newScholarTier) {
          alert(
            `You can only have a number of Sharp Mind skills equal to your Scholar tier.\n\n` +
              `Current Scholar tier (including this purchase): ${newScholarTier}\n` +
              `Existing Sharp Mind skills: ${existingSharpMinds}`
          );
          return;
        }
      }
    }
  }

  // Main path gating
  if (isMainPathSkill && skill.tier > currentTier) {
    alert(
      `You are Tier ${currentTier}. You cannot take a Tier ${skill.tier} skill on your main path yet.`
    );
    return;
  }

  // Secondary path gating
if (isSecondaryPathSkill) {
  let allowedSecondaryTier = 0;
  if (currentTier >= 10) {
    allowedSecondaryTier = 5;
  } else if (currentTier >= 8) {
    allowedSecondaryTier = 4;
  } else if (currentTier >= 6) {
    allowedSecondaryTier = 3;
  } else if (currentTier >= 4) {
    allowedSecondaryTier = 2;
  } else if (currentTier >= 2) {
    allowedSecondaryTier = 1;
  } else {
    allowedSecondaryTier = 0;
  }

    if (allowedSecondaryTier === 0) {
      alert("You cannot choose skills from other paths until you reach Tier 2.");
      return;
    }

    if (skill.tier > allowedSecondaryTier) {
      alert(
        `At Tier ${currentTier}, you may choose secondary-path skills up to Tier ${allowedSecondaryTier}, but this skill is Tier ${skill.tier}.`
      );
      return;
    }
  }

  const prereqCheck = checkPrerequisitesForSkill(skill);
  if (!prereqCheck.ok) {
    alert(
      prereqCheck.message ||
        "You do not meet the prerequisites for this skill."
    );
    return;
  }

  const free = skillFreeFlag.checked;
  const isSharpMindSkill =
    path === "Scholar" && /^Sharp Mind\b/i.test(skill.name);

  let displayName = name;
  let anyValue = null;
  const hasAnyPlaceholder = /\[Any\]/i.test(name);

  if (hasAnyPlaceholder) {
    const entered = prompt(
      `Enter what should replace [Any] for ${name}:`,
      ""
    );
    if (entered === null) return;

    anyValue = entered.trim();
    if (anyValue.startsWith("[") && anyValue.endsWith("]")) {
      anyValue = anyValue.slice(1, -1).trim();
    }
    if (!anyValue) {
      alert("Please enter a value for [Any]. The skill was not added.");
      return;
    }

    displayName = name.replace(/\[Any\]/gi, `[${anyValue}]`);
  }

  const already = selectedSkills.find(
    (sk) => sk.path === path && normalizeSkillName(sk.name) === normalizeSkillName(displayName)
  );
  if (already) {
    alert("That skill is already in your list.");
    return;
  }

  const candidateRecord = {
    name: displayName,
    path,
    tier: skill.tier,
    free
  };
  if (hasAnyPlaceholder) {
    candidateRecord.baseName = name;
    candidateRecord.anyValue = anyValue;
  }
  const candidateCost = computeSkillCost(candidateRecord);

  if (candidateCost > available) {
    alert(
      `You don't have enough Skill Points for this skill.\n\nCost: ${candidateCost} SP\nAvailable: ${available} SP`
    );
    return;
  }

  selectedSkills.push(candidateRecord);
  markDirty();

  skillFreeFlag.checked = false;
  populateSkillSelect();
  recomputeTotals();

  if (isSharpMindSkill) {
    const last = selectedSkills[selectedSkills.length - 1];
    if (last) {
      handleSharpMindSelection(last);
    }
  }
}

function renderSelectedSkills() {
  selectedSkillsBody.innerHTML = "";

  const sorted = getSortedSelectedSkills();

  sorted.forEach((sk) => {
    const tr = document.createElement("tr");

    const tdMinus = document.createElement("td");
    const minusBtn = document.createElement("button");
    minusBtn.textContent = "−";
    minusBtn.className = "button small secondary";
    minusBtn.title = "Remove skill";
    minusBtn.style.minWidth = "32px";
    minusBtn.addEventListener("click", () => {
      const originalIndex = selectedSkills.findIndex(
        (s) =>
          s.name === sk.name &&
          s.path === sk.path &&
          s.tier === sk.tier &&
          s.free === sk.free
      );
      if (originalIndex === -1) return;

      const skillToRemove = selectedSkills[originalIndex];

      // Extra Attune safety: do not allow removing the last Attune
      // if there are other Artificer skills left.
      if (
        skillToRemove.path === "Artificer" &&
        /^Attune\b/i.test(getSkillTemplateName(skillToRemove))
      ) {
        const remainingAttunes = selectedSkills.filter((s, idx) => {
          if (idx === originalIndex) return false;
          return (
            s.path === "Artificer" &&
            /^Attune\b/i.test(getSkillTemplateName(s))
          );
        }).length;

        const remainingNonAttuneArtificer = selectedSkills.filter(
          (s, idx) => {
            if (idx === originalIndex) return false;
            return (
              s.path === "Artificer" &&
              !/^Attune\b/i.test(getSkillTemplateName(s))
            );
          }
        ).length;

        if (remainingAttunes === 0 && remainingNonAttuneArtificer > 0) {
          alert(
            "You must have at least one Attune skill if you have other Artificer skills."
          );
          return;
        }
      }

      // Sharp Mind safety: do not allow removing a Scholar skill
      // if that would leave more Sharp Mind skills than your Scholar tier.
      if (skillToRemove.path === "Scholar") {
        const remainingSkills = selectedSkills.filter(
          (s, idx) => idx !== originalIndex
        );

        let remainingScholarTier = 0;
        remainingSkills.forEach((s) => {
          if (s.path === "Scholar") {
            const t = parseInt(s.tier || 0, 10) || 0;
            if (t > remainingScholarTier) remainingScholarTier = t;
          }
        });

        const remainingSharpMinds = remainingSkills.filter(
          (s) => s.path === "Scholar" && /^Sharp Mind\b/i.test(s.name)
        ).length;

        if (remainingSharpMinds > remainingScholarTier) {
          alert(
            "You cannot remove this Scholar skill because it would leave you with more Sharp Mind skills than your Scholar Tier."
          );
          return;
        }
      }

      if (confirm("Are you sure you want to remove this skill?")) {
        // Clean up any Sharp Mind assignments that reference this skill
        sharpMindAssignments = sharpMindAssignments.filter((a) => {
          if (
            a.sharpPath === skillToRemove.path &&
            a.sharpName === skillToRemove.name
          ) {
            return false;
          }
          if (
            a.targetPath === skillToRemove.path &&
            a.targetName === skillToRemove.name
          ) {
            return false;
          }
          return true;
        });

        selectedSkills.splice(originalIndex, 1);
        markDirty();
        populateSkillSelect();
        recomputeTotals();
      }
    });
    tdMinus.appendChild(minusBtn);
    tr.appendChild(tdMinus);

    const tdTier = document.createElement("td");
    tdTier.textContent = sk.tier;
    tdTier.classList.add("tier-cell");
    tr.appendChild(tdTier);

    const tdPath = document.createElement("td");
    tdPath.textContent = sk.path;
    tr.appendChild(tdPath);

    const tdName = document.createElement("td");
    tdName.textContent = sk.name;
    tdName.classList.add("skill-clickable");
    tdName.title = "Click for full details";
    tdName.addEventListener("click", () => {
      showSkillDetail(sk);
    });
    tr.appendChild(tdName);

    let usesDisplay = "—";
    const metaSkillList = skillsByPath[sk.path] || [];
    const metaSkill = metaSkillList.find(
      (s) => s.name === getSkillTemplateName(sk)
    );
    if (metaSkill) {
      const usesInfo = computeSkillUses(metaSkill);
      if (usesInfo) {
        if (usesInfo.numeric === Infinity) {
          usesDisplay = "Unlimited";
        } else if (usesInfo.display) {
          usesDisplay = usesInfo.display;
        } else if (usesInfo.periodicity) {
          usesDisplay = usesInfo.periodicity;
        }
      }
    }

    const tdUses = document.createElement("td");
    tdUses.textContent = usesDisplay;
    tr.appendChild(tdUses);

    const tdCost = document.createElement("td");
    const tag = document.createElement("span");
    const cost = computeSkillCost(sk);
    if (cost === 0) {
      tag.classList.add("tag", "free");
      tag.textContent = "Free";
    } else {
      tag.classList.add("tag", "paid");
      tag.textContent = `-${cost} SP`;
    }
    tdCost.appendChild(tag);
    tr.appendChild(tdCost);

    selectedSkillsBody.appendChild(tr);
  });

  const totalCost = selectedSkills.reduce(
    (sum, sk) => sum + computeSkillCost(sk),
    0
  );
  totalSkillCostSpan.textContent = totalCost;

  updatePathAndProfessionDisplays();
}

// ---------- EVENTS ----------
function addEventFromInputs() {
  const name = eventNameInput.value.trim();
  const date = eventDateInput.value;
  const type = eventTypeSelect.value;
  const npc = !!eventNpcInput.checked;
  const mot = !!eventMotInput.checked;
  const bonus = parseInt(eventBonusInput.value, 10) || 0;

  if (!type) {
    alert("Please choose an event type.");
    return;
  }

  const ev = {
    name,
    date,
    type,
    npc,
    merchantOT: mot,
    bonusSP: bonus,
    skillPoints: 0
  };

  if (
    editingEventIndex !== null &&
    editingEventIndex >= 0 &&
    editingEventIndex < eventsData.length
  ) {
    eventsData[editingEventIndex] = ev;
  } else {
    eventsData.push(ev);
  }

  editingEventIndex = null;
  addEventBtn.textContent = "Add Event";

  eventNameInput.value = "";
  eventDateInput.value = "";
  eventTypeSelect.value = "";
  eventNpcInput.checked = false;
  eventMotInput.checked = false;
  eventBonusInput.value = "0";

  markDirty();
  recomputeTotals();
}

function renderEvents() {
  eventsBody.innerHTML = "";

  const labels = [
    "",
    "Name",
    "Date",
    "Type",
    "NPC?",
    "Merchant OT?",
    "Bonus SP",
    "Skill Pts"
  ];

  eventsData.forEach((ev) => {
    const tr = document.createElement("tr");

    const tdButtons = document.createElement("td");
    tdButtons.dataset.label = labels[0];

    const minusBtn = document.createElement("button");
    minusBtn.textContent = "−";
    minusBtn.className = "button small secondary";
    minusBtn.title = "Remove event";
    minusBtn.style.minWidth = "28px";
    minusBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to remove this event?")) {
        const idx = eventsData.indexOf(ev);
        if (idx !== -1) {
          eventsData.splice(idx, 1);
          markDirty();
          if (editingEventIndex === idx) {
            editingEventIndex = null;
            addEventBtn.textContent = "Add Event";
          }
          recomputeTotals();
        }
      }
    });

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.className = "button small secondary";
    editBtn.style.minWidth = "40px";
    editBtn.style.marginLeft = "4px";
    editBtn.title = "Edit event";
    editBtn.addEventListener("click", () => {
      const idx = eventsData.indexOf(ev);
      if (idx === -1) return;
      editingEventIndex = idx;

      eventNameInput.value = ev.name || "";
      eventDateInput.value = ev.date || "";
      eventTypeSelect.value = ev.type || "";
      eventNpcInput.checked = !!ev.npc;
      eventMotInput.checked = !!ev.merchantOT;
      eventBonusInput.value =
        ev.bonusSP != null && ev.bonusSP !== "" ? String(ev.bonusSP) : "0";

      addEventBtn.textContent = "Update Event";

      try {
        eventNameInput.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      } catch (e) {
        eventNameInput.scrollIntoView();
      }
      eventNameInput.focus();
    });

    tdButtons.appendChild(minusBtn);
    tdButtons.appendChild(editBtn);
    tr.appendChild(tdButtons);

    function addCell(text, labelIndex) {
      const td = document.createElement("td");
      td.textContent = text;
      td.dataset.label = labels[labelIndex] || "";
      tr.appendChild(td);
    }

    addCell(ev.name || "", 1);
    addCell(formatDateDisplay(ev.date || ""), 2);
    addCell(ev.type || "", 3);
    addCell(ev.npc ? "Yes" : "", 4);
    addCell(ev.merchantOT ? "Yes" : "", 5);
    addCell(
      ev.bonusSP != null && ev.bonusSP !== "" ? String(ev.bonusSP) : "",
      6
    );
    addCell(ev.skillPoints != null ? String(ev.skillPoints) : "0", 7);

    eventsBody.appendChild(tr);
  });
}

// ---------- TOTALS & TIER ----------
function computeTierFromEvents(qualifyingCount) {
  // Correct progression:
  // Tier 0 = 0–1 events
  // Tier 1 = 2 events
  // Tier 2 = 4 events
  // Tier 3 = 7 events
  // Tier 4 = 11 events
  // etc...

  const count = Math.max(0, parseInt(qualifyingCount, 10) || 0);
  let tier = 0;

  for (let nextTier = 1; nextTier <= 10; nextTier++) {
    const totalNeeded =
      1 + (nextTier * (nextTier + 1)) / 2;

    if (count >= totalNeeded) {
      tier = nextTier;
    } else {
      break;
    }
  }

  return Math.min(tier, 10);
}

function computeEventsToNextTier(qualifyingCount, currentTier) {
  if (currentTier >= 10) return 0;

  const count = Math.max(0, parseInt(qualifyingCount, 10) || 0);
  const nextTier = currentTier + 1;

  const totalNeeded =
    1 + (nextTier * (nextTier + 1)) / 2;

  const remaining = totalNeeded - count;
  return remaining > 0 ? remaining : 0;
}


function recomputeTotals() {
  let totalEventPoints = 0;
  let qualifyingCount = 0;

  eventsData.forEach((ev) => {
    const type = ev.type || "";
    const base = EVENT_BASE_POINTS[type] || 0;
    const npc = ev.npc ? 1 : 0;
    const mot = ev.merchantOT ? 1 : 0;
    const bonus = ev.bonusSP ? parseInt(ev.bonusSP, 10) || 0 : 0;
    const total = base + npc + mot + bonus;
    ev.skillPoints = total;
    totalEventPoints += total;
    if (QUALIFYING_FOR_TIER.has(type)) {
      qualifyingCount++;
    }
  });

  totalEventPointsSpan.textContent = totalEventPoints;
  qualifyingEventsCountSpan.textContent = qualifyingCount;

  const tier = computeTierFromEvents(qualifyingCount);
  tierInput.value = tier;

  if (eventsUntilNextTierSpan) {
    const remaining = computeEventsToNextTier(qualifyingCount, tier);
    eventsUntilNextTierSpan.textContent = remaining;
  }

  const totalSkillCost = selectedSkills.reduce(
    (sum, sk) => sum + computeSkillCost(sk),
    0
  );
  totalSkillCostSpan.textContent = totalSkillCost;

  const available = Math.max(0, totalEventPoints - totalSkillCost);
  totalSkillPointsInput.value = available;

  if (unspentSkillPointsHeader) {
    unspentSkillPointsHeader.textContent = available;
  }

  updatePathAndProfessionDisplays();
  renderEvents();
  renderSelectedSkills();
}

// ---------- SAVE / LOAD CHARACTER ----------
function collectCharacterState() {
  const organizations = getOrganizations();

  const events = eventsData.map((ev) => ({
    name: ev.name || "",
    date: ev.date || "",
    type: ev.type || "",
    npc: !!ev.npc,
    merchantOT: !!ev.merchantOT,
    bonusSP: ev.bonusSP ? parseInt(ev.bonusSP, 10) || 0 : 0,
    skillPoints: ev.skillPoints ? parseInt(ev.skillPoints, 10) || 0 : 0
  }));

  const professions = Array.from(
    new Set(
      selectedSkills
        .map((sk) => sk.path)
        .filter((p) => PROFESSION_NAMES.has(p))
    )
  );

  return {
    version: 17,
    characterName: characterNameInput.value || "",
    playerName: playerNameInput.value || "",
    pathDisplay: pathDisplaySelect.value || "",
    faction: factionSelect.value || "",
    professions,
    organizations,
    selectedSkills: selectedSkills.slice(),
    events,
    artificerMilestone2: !!(
      artificerMilestone2Checkbox && artificerMilestone2Checkbox.checked
    ),
    artificerMilestone3: !!(
      artificerMilestone3Checkbox && artificerMilestone3Checkbox.checked
    ),
    bardMilestone2: !!(bardMilestone2Checkbox && bardMilestone2Checkbox.checked),
    bardMilestone3: !!(bardMilestone3Checkbox && bardMilestone3Checkbox.checked),
    scholarMilestone2: !!(
      scholarMilestone2Checkbox && scholarMilestone2Checkbox.checked
    ),
    scholarMilestone3: !!(
      scholarMilestone3Checkbox && scholarMilestone3Checkbox.checked
    ),
    skillSortState: skillSortState
  };
}

function applyCharacterState(state) {
  if (!state || typeof state !== "object") return;

  characterNameInput.value = state.characterName || "";
  playerNameInput.value = state.playerName || "";
  pathDisplaySelect.value = state.pathDisplay || "";
  factionSelect.value = state.faction || "";

  const orgs = state.organizations;
  if (Array.isArray(orgs)) {
    setOrganizations(orgs);
  }

  if (artificerMilestone2Checkbox) {
    artificerMilestone2Checkbox.checked = !!state.artificerMilestone2;
  }
  if (artificerMilestone3Checkbox) {
    artificerMilestone3Checkbox.checked = !!state.artificerMilestone3;
  }
  if (bardMilestone2Checkbox) {
    bardMilestone2Checkbox.checked = !!state.bardMilestone2;
  }
  if (bardMilestone3Checkbox) {
    bardMilestone3Checkbox.checked = !!state.bardMilestone3;
  }
  if (scholarMilestone2Checkbox) {
    scholarMilestone2Checkbox.checked = !!state.scholarMilestone2;
  }
  if (scholarMilestone3Checkbox) {
    scholarMilestone3Checkbox.checked = !!state.scholarMilestone3;
  }

  selectedSkills = Array.isArray(state.selectedSkills)
    ? state.selectedSkills.slice()
    : [];

  if (state.skillSortState) {
    skillSortState = state.skillSortState;
  } else {
    skillSortState = { column: "default", direction: "asc" };
  }

  eventsData = Array.isArray(state.events)
    ? state.events.map((ev) => ({
        name: ev.name || "",
        date: ev.date || "",
        type: ev.type || "",
        npc: !!ev.npc,
        merchantOT: !!ev.merchantOT,
        bonusSP: ev.bonusSP ? parseInt(ev.bonusSP, 10) || 0 : 0,
        skillPoints: ev.skillPoints ? parseInt(ev.skillPoints, 10) || 0 : 0
      }))
    : [];

  editingEventIndex = null;
  addEventBtn.textContent = "Add Event";

  recomputeTotals();
  updateSkillSortHeaderIndicators();
  markClean();
}

function saveCharacter() {
  const state = collectCharacterState();
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  const defaultName =
    state.characterName && state.characterName.trim()
      ? state.characterName.trim()
      : "larp_character";

  let baseName = prompt("Enter a name for this character file:", defaultName);
  if (!baseName) {
    URL.revokeObjectURL(url);
    return;
  }
  baseName = baseName.replace(/[^a-z0-9_\-]+/gi, "_");

  a.href = url;
  a.download = baseName + ".json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  markClean();
}

function handleLoadCharacterFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const state = JSON.parse(ev.target.result);
      applyCharacterState(state);
    } catch (err) {
      alert("Could not read character file. Is it a valid JSON save?");
    }
  };
  reader.readAsText(file);
}

// ---------- CSV AUTO-LOAD ----------
function tryAutoLoadCSV() {
  fetch("larp_skills.csv")
    .then((res) => {
      if (!res.ok) throw new Error("No CSV found");
      return res.text();
    })
    .then((text) => {
      const rows = parseCSV(text);
      if (!rows.length) throw new Error("Empty CSV");
      buildSkillsStructures(rows);
    })
    .catch(() => {
      console.warn(
        "Could not auto-load larp_skills.csv. Make sure it's alongside index.html."
      );
    });
}

// ---------- INIT ----------
window.addEventListener("DOMContentLoaded", () => {
  tryAutoLoadCSV();

  addEventBtn.addEventListener("click", () => {
    addEventFromInputs();
  });

  addSkillBtn.addEventListener("click", () => {
    addSelectedSkill();
  });

  skillPathSelect.addEventListener("change", () => {
    populateSkillSelect();
    skillDescription.value = "";
  });

  skillSelect.addEventListener("change", updateSkillDescriptionFromSelect);

  saveCharacterBtn.addEventListener("click", saveCharacter);

  loadCharacterBtn.addEventListener("click", () => {
    loadCharacterFile.click();
  });
  loadCharacterFile.addEventListener("change", handleLoadCharacterFile);

  exportPdfBtn.addEventListener("click", () => {
    if (typeof window.exportCharacterPDF === "function") {
      window.exportCharacterPDF();
    } else {
      alert("PDF export is not available. Make sure pdf-export.js is loaded.");
    }
  });

  pathDisplaySelect.addEventListener("change", () => {
    markDirty();
    recomputeTotals();
  });

  characterNameInput.addEventListener("input", markDirty);
  playerNameInput.addEventListener("input", markDirty);
  factionSelect.addEventListener("change", markDirty);

  organizationsContainer
    .querySelectorAll('input[type="checkbox"]')
    .forEach((cb) => {
      cb.addEventListener("change", markDirty);
    });

  function onMilestoneChange() {
    markDirty();
    updateSkillDescriptionFromSelect();
    recomputeTotals();
  }
  if (artificerMilestone2Checkbox)
    artificerMilestone2Checkbox.addEventListener("change", onMilestoneChange);
  if (artificerMilestone3Checkbox)
    artificerMilestone3Checkbox.addEventListener("change", onMilestoneChange);
  if (bardMilestone2Checkbox)
    bardMilestone2Checkbox.addEventListener("change", onMilestoneChange);
  if (bardMilestone3Checkbox)
    bardMilestone3Checkbox.addEventListener("change", onMilestoneChange);
  if (scholarMilestone2Checkbox)
    scholarMilestone2Checkbox.addEventListener("change", onMilestoneChange);
  if (scholarMilestone3Checkbox)
    scholarMilestone3Checkbox.addEventListener("change", onMilestoneChange);

  attachSkillSortHandlers();
  updateSkillSortHeaderIndicators();

  // Modal close handlers
  if (skillModalClose) {
    skillModalClose.addEventListener("click", closeSkillModal);
  }
  if (skillModal) {
    skillModal.addEventListener("click", (e) => {
      if (e.target === skillModal) {
        closeSkillModal();
      }
    });
  }
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && skillModal && !skillModal.classList.contains("hidden")) {
      closeSkillModal();
    }
  });

  recomputeTotals();
  markClean();
});
