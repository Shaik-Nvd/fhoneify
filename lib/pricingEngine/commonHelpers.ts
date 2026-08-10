export const COMMON_BONUSES = {
  box: 380,
  missingChargerPenalty: 80,
  missingChargerA34Penalty: 280,
  chargerOnlyBonus: 280,
  floorPrice: 100
};

export const COMMON_FUNCTIONAL_PENALTIES: Record<string, number> = {
  fingerprint: 0.15,
  battery_service: 0.15,
  battery_health: 0.05,
  front_camera: 0.1253,
  back_camera: 0.223,
  wifi: 0.12,
  speaker: 0.1,
  audio_receiver: 0.1,
  charging: 0.1,
  microphone: 0.1,
  face: 0.05,
  volume: 0.05,
  power: 0.05,
  camera_glass: 0.05,
  bluetooth: 0.05,
  silent: 0.02,
  vibrator: 0.02,
  proximity: 0.02,
  s_pen: 0.08,
  hinge: 0.2
};

export function applyCompetitorUplift(basePrice: number, exactCashifyPrice: number): number {
  let upliftPercent = 1;
  if (basePrice <= 20000) upliftPercent = 1.08;
  else if (basePrice <= 50000) upliftPercent = 1.06;
  else upliftPercent = 1.04;

  let fhoneifyExtra = exactCashifyPrice * (upliftPercent - 1);
  if (fhoneifyExtra > 2000) fhoneifyExtra = 2000;
  if (fhoneifyExtra < 100 && exactCashifyPrice > 1200) fhoneifyExtra = 100;

  return Math.max(Math.round(exactCashifyPrice + fhoneifyExtra), COMMON_BONUSES.floorPrice);
}
