// src/data/characters.js
//
// Central roster: 7 themes x 7 Elo-tier opponents each.
// Each character maps to a Stockfish strength config plus a "personality"
// bias used to flavor move selection among near-equal candidates (via MultiPV)
// so different characters feel different without needing separate trained models.

export const ELO_TIERS = [300, 750, 1200, 1650, 2100, 2550, 3000];

/**
 * personality fields:
 *  - aggression: 0..1, biases toward sharper/tactical lines when eval is close
 *  - patience: 0..1, biases toward quiet/positional lines when eval is close
 *  - blunderFlavor: cosmetic only, used by coach copy ("the Sapling hesitates...")
 */
export const THEMES = {
  nature: {
    id: 'nature',
    label: 'Nature',
    boardColors: { light: '#e9edc9', dark: '#588157' },
    accent: '#3a5a40',
    characters: [
      { id: 'sapling', name: 'Sapling', elo: 300, aggression: 0.2, patience: 0.3, blurb: 'Barely rooted, still learning which way is up.' },
      { id: 'sprout-warden', name: 'Sprout Warden', elo: 750, aggression: 0.3, patience: 0.4, blurb: 'Guards its patch of soil with simple plans.' },
      { id: 'bramble-knight', name: 'Bramble Knight', elo: 1200, aggression: 0.5, patience: 0.4, blurb: 'Thorny and a little reckless in the open.' },
      { id: 'elder-oak', name: 'Elder Oak', elo: 1650, aggression: 0.4, patience: 0.7, blurb: 'Old enough to know patience wins fights.' },
      { id: 'ancient-treant', name: 'Ancient Treant', elo: 2100, aggression: 0.45, patience: 0.75, blurb: 'Has watched a thousand seasons of openings.' },
      { id: 'forest-titan', name: 'Forest Titan', elo: 2550, aggression: 0.6, patience: 0.6, blurb: 'Strikes like a falling redwood.' },
      { id: 'world-tree-avatar', name: 'World Tree Avatar', elo: 3000, aggression: 0.55, patience: 0.65, blurb: 'Every root is a calculated line.' },
    ],
  },
  archery: {
    id: 'archery',
    label: 'Archery',
    boardColors: { light: '#f4e3c1', dark: '#7c5c3e' },
    accent: '#a3672b',
    characters: [
      { id: 'apprentice-archer', name: 'Apprentice Archer', elo: 300, aggression: 0.3, patience: 0.2, blurb: 'Still flinches at the loose string.' },
      { id: 'forest-scout', name: 'Forest Scout', elo: 750, aggression: 0.4, patience: 0.3, blurb: 'Quick shots, quicker mistakes.' },
      { id: 'longbowman', name: 'Longbowman', elo: 1200, aggression: 0.5, patience: 0.4, blurb: 'Trades shots without much of a plan.' },
      { id: 'marksman-captain', name: 'Marksman Captain', elo: 1650, aggression: 0.55, patience: 0.5, blurb: 'Picks off loose pieces at range.' },
      { id: 'royal-huntsman', name: 'Royal Huntsman', elo: 2100, aggression: 0.6, patience: 0.55, blurb: 'Never wastes an arrow or a tempo.' },
      { id: 'master-of-the-hunt', name: 'Master of the Hunt', elo: 2550, aggression: 0.65, patience: 0.55, blurb: 'Sees the kill shot ten moves out.' },
      { id: 'legendary-sharpshooter', name: 'Legendary Sharpshooter', elo: 3000, aggression: 0.6, patience: 0.6, blurb: 'One opening, one plan, one result.' },
    ],
  },
  soldiers: {
    id: 'soldiers',
    label: 'Soldiers',
    boardColors: { light: '#d8d3c5', dark: '#4a5d4e' },
    accent: '#6b705c',
    characters: [
      { id: 'recruit', name: 'Recruit', elo: 300, aggression: 0.4, patience: 0.2, blurb: 'Charges first, thinks later.' },
      { id: 'footsoldier', name: 'Footsoldier', elo: 750, aggression: 0.45, patience: 0.3, blurb: 'Holds the line, mostly.' },
      { id: 'sergeant', name: 'Sergeant', elo: 1200, aggression: 0.5, patience: 0.4, blurb: 'Knows formations, not finesse.' },
      { id: 'captain', name: 'Captain', elo: 1650, aggression: 0.5, patience: 0.55, blurb: 'Plans the attack three moves ahead.' },
      { id: 'commander', name: 'Commander', elo: 2100, aggression: 0.55, patience: 0.6, blurb: 'Coordinates every piece like a unit.' },
      { id: 'general', name: 'General', elo: 2550, aggression: 0.5, patience: 0.7, blurb: 'Wins the war before the first shot.' },
      { id: 'field-marshal', name: 'Field Marshal', elo: 3000, aggression: 0.5, patience: 0.7, blurb: 'No weakness left to exploit.' },
    ],
  },
  medieval: {
    id: 'medieval',
    label: 'Medieval',
    boardColors: { light: '#ece0c8', dark: '#5c4530' },
    accent: '#8a6d3b',
    characters: [
      { id: 'squire', name: 'Squire', elo: 300, aggression: 0.3, patience: 0.2, blurb: 'Holds the sword wrong but tries hard.' },
      { id: 'knight-in-training', name: 'Knight-in-Training', elo: 750, aggression: 0.4, patience: 0.3, blurb: 'Eager to joust, light on technique.' },
      { id: 'knight', name: 'Knight', elo: 1200, aggression: 0.5, patience: 0.4, blurb: 'Honor-bound, occasionally reckless.' },
      { id: 'baron', name: 'Baron', elo: 1650, aggression: 0.45, patience: 0.55, blurb: 'Plays for territory, not glory.' },
      { id: 'duke', name: 'Duke', elo: 2100, aggression: 0.5, patience: 0.6, blurb: 'Commands the board like a fiefdom.' },
      { id: 'kings-champion', name: "King's Champion", elo: 2550, aggression: 0.55, patience: 0.6, blurb: 'Undefeated for a reason.' },
      { id: 'the-sovereign', name: 'The Sovereign', elo: 3000, aggression: 0.5, patience: 0.65, blurb: 'Rules every square it touches.' },
    ],
  },
  space: {
    id: 'space',
    label: 'Space',
    boardColors: { light: '#cfd8e3', dark: '#1f2a44' },
    accent: '#3e5c76',
    characters: [
      { id: 'cadet-drone', name: 'Cadet Drone', elo: 300, aggression: 0.3, patience: 0.2, blurb: 'Firmware still has bugs.' },
      { id: 'scout-bot', name: 'Scout-bot', elo: 750, aggression: 0.4, patience: 0.3, blurb: 'Maps the board, misjudges the threats.' },
      { id: 'pilot-ai', name: 'Pilot AI', elo: 1200, aggression: 0.5, patience: 0.4, blurb: 'Flies the lines a little too fast.' },
      { id: 'strike-commander', name: 'Strike Commander', elo: 1650, aggression: 0.55, patience: 0.5, blurb: 'Calculates trajectories, including yours.' },
      { id: 'fleet-admiral', name: 'Fleet Admiral', elo: 2100, aggression: 0.5, patience: 0.6, blurb: 'Coordinates every unit at once.' },
      { id: 'star-marshal', name: 'Star Marshal', elo: 2550, aggression: 0.55, patience: 0.6, blurb: 'Sees ten moves further than light reaches.' },
      { id: 'the-singularity', name: 'The Singularity', elo: 3000, aggression: 0.5, patience: 0.65, blurb: 'Already calculated this conversation.' },
    ],
  },
  mythical: {
    id: 'mythical',
    label: 'Mythical',
    boardColors: { light: '#e6d9f2', dark: '#3b2854' },
    accent: '#6a4c93',
    characters: [
      { id: 'imp', name: 'Imp', elo: 300, aggression: 0.5, patience: 0.1, blurb: 'Chaotic and easily distracted.' },
      { id: 'goblin-tactician', name: 'Goblin Tactician', elo: 750, aggression: 0.5, patience: 0.3, blurb: 'Sneaky, not always smart.' },
      { id: 'orc-warlord', name: 'Orc Warlord', elo: 1200, aggression: 0.65, patience: 0.3, blurb: 'Smashes first, regrets later.' },
      { id: 'sorcerer', name: 'Sorcerer', elo: 1650, aggression: 0.45, patience: 0.6, blurb: 'Prefers quiet traps to brute force.' },
      { id: 'dragon-knight', name: 'Dragon Knight', elo: 2100, aggression: 0.6, patience: 0.5, blurb: 'Fire first, questions never.' },
      { id: 'lich-king', name: 'Lich King', elo: 2550, aggression: 0.45, patience: 0.7, blurb: 'Has all the time in the world, literally.' },
      { id: 'ancient-dragon', name: 'Ancient Dragon', elo: 3000, aggression: 0.55, patience: 0.65, blurb: 'Has hoarded centuries of winning lines.' },
    ],
  },
  pirates: {
    id: 'pirates',
    label: 'Pirates',
    boardColors: { light: '#e8dcc0', dark: '#2b4a5e' },
    accent: '#c08a3e',
    characters: [
      { id: 'cabin-boy', name: 'Cabin Boy', elo: 300, aggression: 0.3, patience: 0.2, blurb: 'Still learning port from starboard.' },
      { id: 'deckhand', name: 'Deckhand', elo: 750, aggression: 0.4, patience: 0.3, blurb: 'Brave, but reads the map upside down.' },
      { id: 'first-mate', name: 'First Mate', elo: 1200, aggression: 0.5, patience: 0.4, blurb: 'Runs the ship, not the strategy.' },
      { id: 'privateer', name: 'Privateer', elo: 1650, aggression: 0.55, patience: 0.45, blurb: 'Opportunistic and a little greedy.' },
      { id: 'pirate-captain', name: 'Pirate Captain', elo: 2100, aggression: 0.6, patience: 0.5, blurb: 'Takes the board the way they take ships.' },
      { id: 'ghost-captain', name: 'Ghost Captain', elo: 2550, aggression: 0.5, patience: 0.65, blurb: 'Already lost once, won\u2019t make the same mistake.' },
      { id: 'the-kraken', name: 'The Kraken', elo: 3000, aggression: 0.55, patience: 0.6, blurb: 'Drags every plan to the depths.' },
    ],
  },
};

export function getTheme(themeId) {
  return THEMES[themeId];
}

export function getCharacter(themeId, characterId) {
  const theme = THEMES[themeId];
  if (!theme) return null;
  return theme.characters.find((c) => c.id === characterId) || null;
}

export function listThemes() {
  return Object.values(THEMES);
}
