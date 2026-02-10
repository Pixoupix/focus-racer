export const runnerFacts = [
  "Le record du monde du marathon : 2h00min35s par Kelvin Kiptum !",
  "Usain Bolt atteignait 44.72 km/h en pointe sur 100m.",
  "Un marathonien elite fait environ 43 000 pas pendant une course.",
  "Le trail le plus long du monde : la Barkley Marathons, 160 km sans GPS.",
  "Le coeur d'un coureur bat en moyenne 2.5 milliards de fois dans sa vie.",
  "Courir 1 km brule environ 1 kcal par kg de poids corporel.",
  "Le marathon etait autrefois de 40 km. Les 2.195 km supplementaires viennent des JO de Londres 1908.",
  "Eliud Kipchoge a couru un marathon en moins de 2h (1h59min40s) en 2019.",
  "Les chaussures de course modernes contiennent plus de technologie qu'un satellite des annees 60.",
  "Le parkrun le plus rapide du monde : 13min48s sur 5 km.",
  "Un coureur amateur parcourt en moyenne 1 500 km par an.",
  "La UTMB fait 171 km avec 10 000 m de denivele positif autour du Mont-Blanc.",
];

export function getFactForMilestone(percent: number): string | null {
  const milestoneIndex = Math.floor(percent / 10) - 1;
  if (milestoneIndex >= 0 && milestoneIndex < runnerFacts.length) {
    return runnerFacts[milestoneIndex];
  }
  return null;
}
