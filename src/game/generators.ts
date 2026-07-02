// Générateurs aléatoires à consonance locale : de quoi improviser un PNJ,
// une rumeur de taverne ou la météo du delta en une seconde.

const FIRST_NAMES = [
  'Maël', 'Tréwan', 'Kerys', 'Aelis', 'Bran', 'Solenn', 'Ronec', 'Ysolt',
  'Gwion', 'Mira', 'Talwen', 'Orin', 'Berec', 'Nolwenn', 'Yann', 'Derya',
  'Kaelig', 'Morwen', 'Sten', 'Enora', 'Judoc', 'Riwal', 'Azenor', 'Corentin',
]

const EPITHETS = [
  'du Bac', 'Trois-Doigts', 'la Grise', 'de la Vase', 'Longue-Vue', 'le Taiseux',
  'Fille-du-Flot', 'au Sel', 'Pied-Sûr', 'la Nasse', 'des Quais', 'Deux-Marées',
  'le Rapiéceux', 'Voix-Basse', 'du Vieux Pont', 'Main-Froide',
]

const RUMORS = [
  'On aurait vu des lumières sous l\'eau près de l\'Île du Temple, trois nuits de suite.',
  'Les taxes portuaires vont encore bouger — la Guilde des Armateurs dîne à l\'Île Haute ces temps-ci.',
  'Un docker jure que la vase a bougé toute seule à marée basse, comme si elle respirait.',
  'La fille Valdrek paierait bien, dit-on, pour des langues discrètes et des oreilles fines.',
  'Frère Omric ? Mort, vous dites ? Ma cousine l\'a croisé au marché il y a un mois à peine.',
  'Le Maelstrom cherche un nouveau videur — l\'ancien a disparu une nuit de brume.',
  'Des barques sans lanterne filent vers Roz Fall après minuit. Personne ne les arraisonne.',
  'Le Grand Prêtre ne dort plus, à ce qu\'on raconte. Il fait doubler les cierges du sanctuaire.',
  'Le jeune Lord Cael a deux nouveaux conseillers. Personne ne sait d\'où ils sortent.',
  'Un pêcheur a remonté un filet plein d\'ossements. Il a tout rejeté et refuse d\'en parler.',
  'Les Voix du Fleuve recrutent dans la Vieille Ville. Ils disent que le fleuve est en colère.',
  'Une chambre de l\'Île des Plaisirs serait restée fermée depuis quinze jours, payée d\'avance en or.',
]

const WEATHER = [
  'Brume épaisse sur le fleuve — on n\'y voit pas d\'une rive à l\'autre.',
  'Crachin persistant. Les pavés glissent, les capuchons restent levés.',
  'Grand soleil, chose rare — tout Aberkaer est dehors et les quais grouillent.',
  'Vent d\'ouest chargé de sel. Les bacs tanguent, les traversées se font rares.',
  'Orage au large — le tonnerre roule sur le delta et les cales se remplissent.',
  'Marée exceptionnellement basse : la vase découverte pue et fume au soleil.',
  'Froid humide qui transperce les manteaux. Les braseros des quais sont pris d\'assaut.',
  'Ciel bas et jaune. Les anciens disent que le fleuve « couve » quelque chose.',
]

const ENCOUNTERS: Record<string, string[]> = {
  'Île du Négoce': [
    'Une dispute éclate entre un armateur et des dockers — une caisse s\'est ouverte, son contenu a disparu.',
    'Un crieur public annonce une prime pour toute information sur des vols d\'entrepôt.',
    'Un marchand pressé bouscule les PJ et perd un document scellé sans s\'en apercevoir.',
  ],
  'Vieille Ville': [
    'Des enfants jouent à « l\'Œil du Fond » : l\'un fait le monstre, les autres fuient en riant.',
    'Une procession improvisée des Voix du Fleuve bloque la ruelle, cantiques et regards méfiants.',
    'Une vieille femme agrippe un PJ : « Le fleuve t\'a regardé. Il ne regarde pas tout le monde. »',
  ],
  'Île Haute': [
    'Une patrouille de la garde Valdrek contrôle les visiteurs — les PJ devront justifier leur présence.',
    'Un jardinier discret propose de vendre ce qu\'il entend depuis les haies des grandes maisons.',
    'Maren Valdrek passe en litière fermée ; une main gantée écarte brièvement le rideau.',
  ],
  'Basse Ville': [
    'Un concours de bras de fer déborde de la taverne de la garnison — on parie fort.',
    'Un forgeron refuse une commande étrange : « Des crochets pareils, c\'est pas pour pêcher honnête. »',
    'Deux gardes hors service se plaignent : on leur a demandé de ne plus patrouiller certains quais la nuit.',
  ],
  'Île du Temple': [
    'Une cérémonie de l\'Onde bat son plein — un prêtre dévisage les PJ un peu trop longtemps.',
    'Un novice paniqué cherche « Frère Elian, disparu depuis matines ». Les aînés le font taire.',
    'À marée basse, une odeur de vase monte des soubassements du temple. Personne ne semble la remarquer.',
  ],
  'Île des Plaisirs': [
    'Un troubadour chante une ballade moqueuse sur « le jeune lord et ses ombres » — la salle rit jaune.',
    'Une partie de cartes tourne mal : quelqu\'un jure que le mort au tapis « était déjà froid ».',
    'Une courtisane glisse aux PJ qu\'un client parlait dans son sommeil « de la chose sous le temple ».',
  ],
  'Roz Fall': [
    'Des yeux suivent les PJ depuis les pontons. Une barque s\'éloigne sans bruit.',
    'Un passeur propose ses services : « Aller simple, on ne pose pas de questions. Retour, ça se négocie. »',
    'Le Fil Gris fait passer un message : Isla sait que vous êtes là. C\'est elle qui décide si vous repartez.',
  ],
}

export const ISLAND_NAMES = Object.keys(ENCOUNTERS)

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

export const generateName = () => `${pick(FIRST_NAMES)} ${pick(EPITHETS)}`
export const generateRumor = () => pick(RUMORS)
export const generateWeather = () => pick(WEATHER)
export const generateEncounter = (island: string) => pick(ENCOUNTERS[island] ?? RUMORS)
