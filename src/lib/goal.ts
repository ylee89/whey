export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type GoalType = "cut" | "maintain" | "bulk";

// grams of protein per kg of bodyweight
const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 0.8,
  light: 1.0,
  moderate: 1.4,
  active: 1.7,
  very_active: 2.0,
};

const GOAL_MODIFIER: Record<GoalType, number> = {
  cut: 1.15,
  maintain: 1.0,
  bulk: 1.1,
};

export function calculateProteinGoal(
  weightKg: number,
  activity: ActivityLevel,
  goal: GoalType,
): number {
  if (!weightKg || weightKg <= 0) return 0;
  const grams = weightKg * ACTIVITY_FACTOR[activity] * GOAL_MODIFIER[goal];
  return Math.round(grams);
}

export function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
