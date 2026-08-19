// Reputation score: 0-100, average of all star ratings (contribution/punctual/skill) across all reviews received.
export function avgScore(reviews) {
  if (!reviews || reviews.length === 0) return null;
  const flat = reviews.flatMap((r) => [r.contribution, r.punctual, r.skill]);
  return Math.round((flat.reduce((a, b) => a + b, 0) / flat.length / 5) * 100);
}

function normalize(s) {
  return s.trim().toLowerCase();
}

// Skill overlap score (0-100) between a post's needed skills (array of strings)
// and a candidate's skills (array of {name, level 1-3}).
// A needed skill counts as matched if it's a substring match either way against
// one of the candidate's skill names (case-insensitive). Matched skills contribute
// their level (scaled to 0-100) to the score; unmatched needed skills contribute 0.
export function skillOverlapScore(skillsNeeded, candidateSkills) {
  if (!skillsNeeded || skillsNeeded.length === 0) return 50; // no explicit requirement -> neutral
  const cand = (candidateSkills || []).map((s) => ({ name: normalize(s.name), level: s.level }));
  let total = 0;
  for (const needed of skillsNeeded) {
    const n = normalize(needed);
    const match = cand.find((c) => c.name.includes(n) || n.includes(c.name));
    if (match) {
      total += (match.level / 3) * 100; // level 1..3 -> 33/66/100
    }
  }
  return Math.round(total / skillsNeeded.length);
}

const SKILL_WEIGHT = 0.65;
const REPUTATION_WEIGHT = 0.35;

// Ranks candidates for a post. Each candidate: { id, name, skills, reviews, category, year }
export function rankCandidates(post, candidates) {
  return candidates
    .map((c) => {
      const skillScore = skillOverlapScore(post.skillsNeeded, c.skills);
      const rep = avgScore(c.reviews);
      const repScore = rep === null ? 40 : rep; // neutral-ish default for new users
      const total = Math.round(skillScore * SKILL_WEIGHT + repScore * REPUTATION_WEIGHT);
      return {
        id: c.id,
        name: c.name,
        year: c.year,
        category: c.category,
        skills: c.skills,
        reputation: rep,
        skillScore,
        reputationScoreUsed: repScore,
        matchScore: total,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}
