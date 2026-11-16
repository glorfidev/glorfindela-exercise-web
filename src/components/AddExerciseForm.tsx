import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { CreateTrainingExerciseRequest, ExerciseType } from '../types/api';
import Button from './Button';

type Props = {
  exerciseTypes: ExerciseType[];
  nextPosition: number;
  onSubmit: (request: CreateTrainingExerciseRequest) => Promise<void>;
  onCancel: () => void;
};

export default function AddExerciseForm({ exerciseTypes, nextPosition, onSubmit, onCancel }: Props) {
  const sortedExerciseTypes = useMemo(
    () =>
      [...exerciseTypes].sort((a, b) => {
        const byTimesTrained = b.timesTrained - a.timesTrained;
        return byTimesTrained !== 0 ? byTimesTrained : a.name.localeCompare(b.name);
      }),
    [exerciseTypes]
  );
  const [exerciseTypeId, setExerciseTypeId] = useState(sortedExerciseTypes[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(5);
  const [saving, setSaving] = useState(false);
  const selectedExercise = sortedExerciseTypes.find((type) => type.id === exerciseTypeId);

  useEffect(() => {
    if (!exerciseTypeId && sortedExerciseTypes[0]) {
      setExerciseTypeId(sortedExerciseTypes[0].id);
    }
  }, [exerciseTypeId, sortedExerciseTypes]);

  useEffect(() => {
    setVisibleCount(5);
  }, [query]);

  const matchingExerciseTypes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return normalizedQuery
      ? sortedExerciseTypes.filter((type) =>
          [type.name, type.category ?? '', type.code, slovakExerciseName(type)]
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery)
        )
      : sortedExerciseTypes;
  }, [query, sortedExerciseTypes]);

  const visibleExerciseTypes = matchingExerciseTypes.slice(0, visibleCount);
  const hasMoreExerciseTypes = visibleCount < matchingExerciseTypes.length;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        exerciseTypeId,
        position: nextPosition,
        rating: null,
        note: null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-ink">Exercise type</span>
          <div className="focus-within:ring-mint-200/80 flex items-center gap-2 rounded-2xl border border-mint-100 bg-white px-4 py-3 text-base text-ink shadow-sm transition focus-within:ring-4 sm:text-sm">
            <Search size={16} className="shrink-0 text-muted" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={selectedExercise ? `${selectedExercise.name} · ${slovakExerciseName(selectedExercise)}` : 'Search exercise'}
              className="w-full bg-transparent text-base text-ink placeholder:text-muted/60 focus:outline-none sm:text-sm"
            />
          </div>
        </label>
        <div className="mt-2 h-[min(28rem,52vh)] space-y-2 overflow-y-auto pr-1 sm:h-[28rem]">
          {visibleExerciseTypes.map((type) => {
            const selected = type.id === exerciseTypeId;

            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setExerciseTypeId(type.id)}
                className={`focus-ring flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition ${
                  selected ? 'bg-mint-300 text-ink shadow-sm' : 'bg-mint-50 text-ink hover:bg-mint-100'
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/70 text-muted/80 shadow-sm">
                    <ExerciseTypePicture type={type} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{type.name}</span>
                    <span className="block truncate text-xs font-medium text-muted">{slovakExerciseName(type)}</span>
                  </span>
                </span>
                <span className="ml-auto shrink-0 text-xs font-bold text-muted">{type.category ?? type.code}</span>
              </button>
            );
          })}
          {matchingExerciseTypes.length === 0 && <p className="rounded-2xl bg-mint-50 px-4 py-3 text-sm font-medium text-muted">No exercise found.</p>}
          {hasMoreExerciseTypes && (
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + 5)}
              className="focus-ring w-full rounded-2xl bg-white px-4 py-3 text-sm font-bold text-muted shadow-sm transition hover:bg-mint-50 hover:text-ink"
            >
              Show more results
            </button>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving || !exerciseTypeId}>
          {saving ? 'Saving' : 'Add Exercise'}
        </Button>
      </div>
    </form>
  );
}

export function ExerciseTypePicture({ type }: { type: ExerciseType }) {
  const [thumbnailAvailable, setThumbnailAvailable] = useState(true);
  const thumbnailSrc = `/exercise-thumbnails/${type.code}.png`;

  if (!thumbnailAvailable) {
    return <span className="size-8 rounded-lg border border-dashed border-muted/30 bg-muted/10" aria-hidden="true" />;
  }

  return (
    <img
      src={thumbnailSrc}
      alt=""
      className="size-full object-cover"
      loading="lazy"
      onError={() => setThumbnailAvailable(false)}
    />
  );
}

const slovakExerciseNames: Record<string, string> = {
  AB_WHEEL_ROLLOUT: 'Rolovanie s kolieskom',
  AIR_SQUAT: 'Drep s vlastnou váhou',
  ASSISTED_PULL_UP: 'Zhyb s dopomocou',
  ARNOLD_PRESS: 'Arnoldov tlak',
  ASSAULT_BIKE: 'Air bike',
  BACK_EXTENSION: 'Extenzia chrbta',
  BAND_PULL_APART: 'Rozťahovanie gumy',
  BAND_RESISTED_PUSH_UP: 'Klik s odporovou gumou',
  BARBELL_CURL: 'Bicepsový zdvih s veľkou činkou',
  BARBELL_GLUTE_BRIDGE: 'Mostík s veľkou činkou',
  BARBELL_HIP_THRUST: 'Hip thrust s veľkou činkou',
  BARBELL_LUNGE: 'Výpad s veľkou činkou',
  BARBELL_ROW: 'Príťah veľkej činky v predklone',
  BARBELL_SHRUG: 'Krčenie ramien s veľkou činkou',
  BATTLE_ROPES: 'Lanové vlny',
  BIKE: 'Bicykel',
  BENCH_PRESS: 'Tlaky na lavičke',
  BENT_OVER_REVERSE_FLY: 'Rozpažovanie v predklone',
  BEAR_CRAWL: 'Medvedia chôdza',
  BICEPS_CURL: 'Bicepsový zdvih',
  BICYCLE_CRUNCH: 'Bicyklové skracovačky',
  BOX_JUMP: 'Výskok na box',
  BULGARIAN_SPLIT_SQUAT: 'Bulharský drep',
  BURPEE: 'Angličák',
  CABLE_BICEPS_CURL: 'Bicepsový zdvih na kladke',
  CABLE_CHEST_FLY: 'Rozpažovanie na kladke',
  CABLE_CRUNCH: 'Skracovačky na kladke',
  CABLE_LATERAL_RAISE: 'Upažovanie na kladke',
  CABLE_PULLOVER: 'Pullover na kladke',
  CABLE_PULL_THROUGH: 'Pull-through na kladke',
  CABLE_ROW: 'Príťah na kladke',
  CABLE_TRICEPS_EXTENSION: 'Tricepsová extenzia na kladke',
  CALF_RAISE: 'Výpony lýtok',
  CHEST_DIP: 'Dipy na hrudník',
  CHEST_PRESS_MACHINE: 'Tlaky na stroji',
  CHIN_UP: 'Zhyb podhmatom',
  CLAMSHELL: 'Mušľa',
  CLEAN: 'Premiestnenie',
  CLEAN_AND_JERK: 'Premiestnenie a nadhod',
  CLOSE_GRIP_BENCH_PRESS: 'Bench úzkym úchopom',
  CONCENTRATION_CURL: 'Koncentrovaný bicepsový zdvih',
  CRUNCH: 'Skracovačky',
  DEAD_BUG: 'Dead bug',
  DEADLIFT: 'Mŕtvy ťah',
  DECLINE_BENCH_PRESS: 'Bench na šikmej lavičke hlavou dole',
  DEFICIT_DEADLIFT: 'Mŕtvy ťah z deficitu',
  DIAMOND_PUSH_UP: 'Diamantový klik',
  DONKEY_CALF_RAISE: 'Donkey výpony lýtok',
  DUMBBELL_BENCH_PRESS: 'Tlaky s jednoručkami na lavičke',
  DUMBBELL_FLY: 'Rozpažovanie s jednoručkami',
  DUMBBELL_LUNGE: 'Výpad s jednoručkami',
  DUMBBELL_PULLOVER: 'Pullover s jednoručkou',
  DUMBBELL_ROW: 'Príťah jednoručky',
  DUMBBELL_SHOULDER_PRESS: 'Tlaky s jednoručkami nad hlavu',
  ELLIPTICAL: 'Eliptický trenažér',
  EZ_BAR_CURL: 'Bicepsový zdvih s EZ činkou',
  FACE_PULL: 'Face pull',
  FARMERS_CARRY: 'Farmárska chôdza',
  FLAT_DUMBBELL_PRESS: 'Tlaky s jednoručkami na rovnej lavičke',
  FLOOR_PRESS: 'Tlaky na zemi',
  FRONT_RAISE: 'Predpažovanie',
  FRONT_RACK_LUNGE: 'Výpad s činkou v prednom držaní',
  FRONT_SQUAT: 'Predný drep',
  GHD_SIT_UP: 'GHD sed-ľah',
  GLUTE_BRIDGE: 'Mostík na zadok',
  GLUTE_KICKBACK: 'Zanožovanie',
  GOBLET_SQUAT: 'Goblet drep',
  GOOD_MORNING: 'Good morning',
  HACK_SQUAT: 'Hack drep',
  HALF_KNEELING_PRESS: 'Tlak v polokľaku',
  HAMMER_CURL: 'Kladivový zdvih',
  HANG_CLEAN: 'Premiestnenie z visu',
  HANGING_LEG_RAISE: 'Zdvíhanie nôh vo vise',
  HANDSTAND_PUSH_UP: 'Klik v stojke',
  HIGH_PULL: 'Vysoký príťah',
  HIP_ABDUCTION: 'Unožovanie na stroji',
  HIP_ADDUCTION: 'Priťahovanie nôh na stroji',
  HIP_THRUST: 'Hip thrust',
  INCLINE_BENCH_PRESS: 'Bench na šikmej lavičke',
  INCLINE_DUMBBELL_PRESS: 'Tlaky s jednoručkami na šikmej lavičke',
  INVERTED_ROW: 'Austrálsky zhyb',
  JEFFERSON_CURL: 'Jeffersonov predklon',
  JUMP_ROPE: 'Švihadlo',
  KETTLEBELL_CLEAN: 'Kettlebell premiestnenie',
  KETTLEBELL_GOBLET_LUNGE: 'Goblet výpad s kettlebellom',
  KETTLEBELL_SNATCH: 'Kettlebell trh',
  KETTLEBELL_SWING: 'Kettlebell swing',
  KETTLEBELL_TURKISH_GET_UP: 'Turecký vztyk s kettlebellom',
  KNEE_RAISE: 'Zdvíhanie kolien',
  LANDMINE_PRESS: 'Landmine tlak',
  LANDMINE_ROTATION: 'Landmine rotácia',
  LANDMINE_ROW: 'Landmine príťah',
  LAT_PULLDOWN: 'Sťahovanie kladky',
  LATERAL_RAISE: 'Upažovanie',
  LEG_CURL: 'Zakopávanie',
  LEG_EXTENSION: 'Predkopávanie',
  LEG_PRESS: 'Leg press',
  LUNGE: 'Výpad',
  LYING_LEG_RAISE: 'Zdvíhanie nôh v ľahu',
  LYING_TRICEPS_EXTENSION: 'Tricepsová extenzia v ľahu',
  MACHINE_CALF_RAISE: 'Výpony lýtok na stroji',
  MACHINE_HIP_THRUST: 'Hip thrust na stroji',
  MACHINE_LATERAL_RAISE: 'Upažovanie na stroji',
  MACHINE_ROW: 'Príťah na stroji',
  MEDICINE_BALL_SLAM: 'Hod medicinbalom o zem',
  MOUNTAIN_CLIMBER: 'Horolezec',
  MUSCLE_UP: 'Muscle-up',
  NORDIC_HAMSTRING_CURL: 'Nordické zakopávanie',
  OVERHEAD_SQUAT: 'Drep s činkou nad hlavou',
  OVERHEAD_CABLE_TRICEPS_EXTENSION: 'Tricepsová extenzia nad hlavou na kladke',
  OVERHEAD_TRICEPS_EXTENSION: 'Tricepsová extenzia nad hlavou',
  PAUSE_SQUAT: 'Drep s pauzou',
  PEC_DECK: 'Pec deck',
  PENDLAY_ROW: 'Pendlay príťah',
  PIN_PRESS: 'Pin press',
  PISTOL_SQUAT: 'Drep na jednej nohe',
  PLANK: 'Plank',
  PLATE_PINCH: 'Pinch grip s kotúčmi',
  PLATE_PRESS: 'Tlaky s kotúčom',
  PLATE_RAISE: 'Predpažovanie s kotúčom',
  POWER_CLEAN: 'Silové premiestnenie',
  POWER_SNATCH: 'Silový trh',
  PREACHER_CURL: 'Bicepsový zdvih na opierke',
  PRONE_Y_RAISE: 'Y zdvih v ľahu',
  PULL_UP: 'Zhyb',
  PUSH_PRESS: 'Výrazový tlak',
  PUSH_UP: 'Klik',
  RACK_PULL: 'Rack pull',
  REAR_DELT_FLY: 'Rozpažovanie na zadné ramená',
  RENEGADE_ROW: 'Renegade row',
  REVERSE_CRUNCH: 'Obrátené skracovačky',
  REVERSE_LUNGE: 'Zadný výpad',
  REVERSE_WRIST_CURL: 'Obrátený zápästný zdvih',
  RING_DIP: 'Dipy na kruhoch',
  RING_ROW: 'Príťah na kruhoch',
  ROPE_CLIMB: 'Šplh na lane',
  ROMANIAN_DEADLIFT: 'Rumunský mŕtvy ťah',
  ROWING_MACHINE: 'Veslovací trenažér',
  RUNNING: 'Beh',
  RUSSIAN_TWIST: 'Ruský twist',
  SAFETY_BAR_SQUAT: 'Drep so safety barom',
  SCAPULAR_PULL_UP: 'Lopatkový zhyb',
  SEATED_CALF_RAISE: 'Výpony lýtok v sede',
  SEATED_CABLE_ROW: 'Príťah spodnej kladky v sede',
  SEATED_DUMBBELL_PRESS: 'Tlaky s jednoručkami v sede',
  SEATED_LEG_CURL: 'Zakopávanie v sede',
  SHOULDER_PRESS: 'Tlak nad hlavu',
  SHRUG: 'Krčenie ramien',
  SIDE_PLANK: 'Bočný plank',
  SINGLE_ARM_CABLE_ROW: 'Príťah jednoručne na kladke',
  SINGLE_LEG_DEADLIFT: 'Mŕtvy ťah na jednej nohe',
  SISSY_SQUAT: 'Sissy drep',
  SIT_UP: 'Sed-ľah',
  SKULL_CRUSHER: 'Skull crusher',
  SLED_PUSH: 'Tlačenie saní',
  SMITH_MACHINE_BENCH_PRESS: 'Bench na multipresse',
  SMITH_MACHINE_SQUAT: 'Drep na multipresse',
  SNATCH: 'Trh',
  SPANISH_SQUAT: 'Španielsky drep',
  SPLIT_JERK: 'Výrazový nadhod do výpadu',
  STAIR_CLIMBER: 'Schodový trenažér',
  STANDING_CALF_RAISE: 'Výpony lýtok v stoji',
  SQUAT: 'Drep',
  STEP_UP: 'Výstup na lavičku',
  STRICT_PRESS: 'Striktný tlak',
  SUMO_DEADLIFT: 'Sumo mŕtvy ťah',
  T_BAR_ROW: 'T-bar príťah',
  THRUSTER: 'Thruster',
  TRAP_BAR_DEADLIFT: 'Mŕtvy ťah s trap barom',
  TREADMILL: 'Bežecký pás',
  TRICEPS_DIP: 'Tricepsový dip',
  TRICEPS_PUSHDOWN: 'Tricepsové stláčanie kladky',
  TRX_ROW: 'TRX príťah',
  UPRIGHT_ROW: 'Príťah činky k brade',
  V_UP: 'V-sklapovačky',
  WALKING_LUNGE: 'Chôdza vo výpadoch',
  WALL_BALL: 'Hod medicinbalom o stenu',
  WALL_SIT: 'Sed pri stene',
  WEIGHTED_DIP: 'Dipy so záťažou',
  WEIGHTED_PULL_UP: 'Zhyb so záťažou',
  WRIST_CURL: 'Zápästný zdvih',
  WRIST_ROLLER: 'Wrist roller',
  YOKE_WALK: 'Yoke walk',
  Z_PRESS: 'Z press',
  ZERCHER_SQUAT: 'Zercher drep',
};

export function slovakExerciseName(type: ExerciseType) {
  return slovakExerciseNames[type.code] ?? type.name;
}
