import type { ExerciseType } from '../types/api';

/**
 * Exercise types offered by the demo backend. Every code has a matching
 * thumbnail in /public/exercise-thumbnails and a Slovak name in AddExerciseForm.
 */
const codesByCategory: Record<string, string[]> = {
  Chest: [
    'BAND_RESISTED_PUSH_UP', 'BENCH_PRESS', 'CABLE_CHEST_FLY', 'CHEST_DIP', 'CHEST_PRESS_MACHINE', 'CLOSE_GRIP_BENCH_PRESS',
    'DECLINE_BENCH_PRESS', 'DIAMOND_PUSH_UP', 'DUMBBELL_BENCH_PRESS', 'DUMBBELL_FLY', 'DUMBBELL_PULLOVER', 'FLAT_DUMBBELL_PRESS',
    'FLOOR_PRESS', 'INCLINE_BENCH_PRESS', 'INCLINE_DUMBBELL_PRESS', 'PEC_DECK', 'PIN_PRESS', 'PLATE_PRESS', 'PUSH_UP',
    'RING_DIP', 'SMITH_MACHINE_BENCH_PRESS', 'WEIGHTED_DIP',
  ],
  Back: [
    'ASSISTED_PULL_UP', 'BACK_EXTENSION', 'BAND_PULL_APART', 'BARBELL_ROW', 'BARBELL_SHRUG', 'CABLE_PULLOVER', 'CABLE_ROW',
    'CHIN_UP', 'DEADLIFT', 'DEFICIT_DEADLIFT', 'DUMBBELL_ROW', 'FACE_PULL', 'INVERTED_ROW', 'JEFFERSON_CURL', 'LANDMINE_ROW',
    'LAT_PULLDOWN', 'MACHINE_ROW', 'MUSCLE_UP', 'PENDLAY_ROW', 'PULL_UP', 'RACK_PULL', 'RENEGADE_ROW', 'RING_ROW', 'ROPE_CLIMB',
    'SCAPULAR_PULL_UP', 'SEATED_CABLE_ROW', 'SHRUG', 'SINGLE_ARM_CABLE_ROW', 'SUMO_DEADLIFT', 'T_BAR_ROW', 'TRAP_BAR_DEADLIFT',
    'TRX_ROW', 'WEIGHTED_PULL_UP',
  ],
  Shoulders: [
    'ARNOLD_PRESS', 'BENT_OVER_REVERSE_FLY', 'CABLE_LATERAL_RAISE', 'DUMBBELL_SHOULDER_PRESS', 'FRONT_RAISE', 'HALF_KNEELING_PRESS',
    'HANDSTAND_PUSH_UP', 'LANDMINE_PRESS', 'LATERAL_RAISE', 'MACHINE_LATERAL_RAISE', 'PLATE_RAISE', 'PRONE_Y_RAISE', 'PUSH_PRESS',
    'REAR_DELT_FLY', 'SEATED_DUMBBELL_PRESS', 'SHOULDER_PRESS', 'STRICT_PRESS', 'UPRIGHT_ROW', 'Z_PRESS',
  ],
  Arms: [
    'BARBELL_CURL', 'BICEPS_CURL', 'CABLE_BICEPS_CURL', 'CABLE_TRICEPS_EXTENSION', 'CONCENTRATION_CURL', 'EZ_BAR_CURL', 'HAMMER_CURL',
    'LYING_TRICEPS_EXTENSION', 'OVERHEAD_CABLE_TRICEPS_EXTENSION', 'OVERHEAD_TRICEPS_EXTENSION', 'PLATE_PINCH', 'PREACHER_CURL',
    'REVERSE_WRIST_CURL', 'SKULL_CRUSHER', 'TRICEPS_DIP', 'TRICEPS_PUSHDOWN', 'WRIST_CURL', 'WRIST_ROLLER',
  ],
  Legs: [
    'AIR_SQUAT', 'BARBELL_LUNGE', 'BULGARIAN_SPLIT_SQUAT', 'CALF_RAISE', 'DONKEY_CALF_RAISE', 'DUMBBELL_LUNGE', 'FRONT_RACK_LUNGE',
    'FRONT_SQUAT', 'GOBLET_SQUAT', 'GOOD_MORNING', 'HACK_SQUAT', 'HIP_ADDUCTION', 'KETTLEBELL_GOBLET_LUNGE', 'LEG_CURL',
    'LEG_EXTENSION', 'LEG_PRESS', 'LUNGE', 'MACHINE_CALF_RAISE', 'NORDIC_HAMSTRING_CURL', 'OVERHEAD_SQUAT', 'PAUSE_SQUAT',
    'PISTOL_SQUAT', 'REVERSE_LUNGE', 'ROMANIAN_DEADLIFT', 'SAFETY_BAR_SQUAT', 'SEATED_CALF_RAISE', 'SEATED_LEG_CURL',
    'SINGLE_LEG_DEADLIFT', 'SISSY_SQUAT', 'SMITH_MACHINE_SQUAT', 'SPANISH_SQUAT', 'SQUAT', 'STANDING_CALF_RAISE', 'STEP_UP',
    'WALKING_LUNGE', 'WALL_SIT', 'ZERCHER_SQUAT',
  ],
  Glutes: [
    'BARBELL_GLUTE_BRIDGE', 'BARBELL_HIP_THRUST', 'CABLE_PULL_THROUGH', 'CLAMSHELL', 'GLUTE_BRIDGE', 'GLUTE_KICKBACK',
    'HIP_ABDUCTION', 'HIP_THRUST', 'MACHINE_HIP_THRUST',
  ],
  Core: [
    'AB_WHEEL_ROLLOUT', 'BICYCLE_CRUNCH', 'CABLE_CRUNCH', 'CRUNCH', 'DEAD_BUG', 'GHD_SIT_UP', 'HANGING_LEG_RAISE', 'KNEE_RAISE',
    'LANDMINE_ROTATION', 'LYING_LEG_RAISE', 'PLANK', 'REVERSE_CRUNCH', 'RUSSIAN_TWIST', 'SIDE_PLANK', 'SIT_UP', 'V_UP',
  ],
  'Full body': [
    'BATTLE_ROPES', 'BEAR_CRAWL', 'BOX_JUMP', 'BURPEE', 'CLEAN', 'CLEAN_AND_JERK', 'FARMERS_CARRY', 'HANG_CLEAN', 'HIGH_PULL',
    'KETTLEBELL_CLEAN', 'KETTLEBELL_SNATCH', 'KETTLEBELL_SWING', 'KETTLEBELL_TURKISH_GET_UP', 'MEDICINE_BALL_SLAM',
    'MOUNTAIN_CLIMBER', 'POWER_CLEAN', 'POWER_SNATCH', 'SLED_PUSH', 'SNATCH', 'SPLIT_JERK', 'THRUSTER', 'WALL_BALL', 'YOKE_WALK',
  ],
  Cardio: ['ASSAULT_BIKE', 'BIKE', 'ELLIPTICAL', 'JUMP_ROPE', 'ROWING_MACHINE', 'RUNNING', 'STAIR_CLIMBER', 'TREADMILL'],
};

const nameOverrides: Record<string, string> = {
  EZ_BAR_CURL: 'EZ Bar Curl',
  FARMERS_CARRY: "Farmer's Carry",
  GHD_SIT_UP: 'GHD Sit-Up',
  T_BAR_ROW: 'T-Bar Row',
  TRX_ROW: 'TRX Row',
  V_UP: 'V-Up',
};

function exerciseName(code: string) {
  return (
    nameOverrides[code] ??
    code
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .replace(/\bPush Up\b/, 'Push-Up')
      .replace(/\bPull Up\b/, 'Pull-Up')
      .replace(/\bChin Up\b/, 'Chin-Up')
      .replace(/\bSit Up\b/, 'Sit-Up')
      .replace(/\bGet Up\b/, 'Get-Up')
      .replace(/\bStep Up\b/, 'Step-Up')
      .replace(/\bMuscle Up\b/, 'Muscle-Up')
  );
}

/** Stable id so persisted demo data keeps pointing at the right exercise type across reloads. */
export function demoExerciseTypeId(code: string) {
  return `demo-type-${code.toLowerCase().replace(/_/g, '-')}`;
}

export type DemoExerciseTypeRecord = Omit<ExerciseType, 'timesTrained'>;

const CATALOG_TIMESTAMP = '2025-01-01T00:00:00.000Z';

export const demoExerciseTypes: DemoExerciseTypeRecord[] = Object.entries(codesByCategory).flatMap(([category, codes]) =>
  codes.map((code) => ({
    id: demoExerciseTypeId(code),
    code,
    name: exerciseName(code),
    category,
    createdAt: CATALOG_TIMESTAMP,
    updatedAt: CATALOG_TIMESTAMP,
  }))
);
