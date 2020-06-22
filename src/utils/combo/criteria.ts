import { get, sumBy } from "lodash";

import { Criteria } from "./filter";
import { MoveID, Character } from "../melee";

/**
 * MatchesPortNumber ensures the player performing the combo is a specific port.
 */
export const MatchesPortNumber: Criteria = (combo, settings, options) => {
  const player = settings.players.find((player) => player.playerIndex === combo.playerIndex);
  return options.portFilter.includes(player.port);
};

export const MatchesPlayerName: Criteria = (combo, settings, options, metadata) => {
  if (options.nameTags.length === 0) {
    return true;
  }

  const player = settings.players.find((player) => player.playerIndex === combo.playerIndex);
  const netplayName: string | null = get(metadata, ["players", player.playerIndex, "names", "netplay"], null) || null;
  const playerTag = player.nametag || null;

  const matchesPlayerTag = playerTag !== null && options.nameTags.includes(playerTag);
  const matchesNetplayName = netplayName !== null && options.nameTags.includes(netplayName);
  const exactMatch = matchesPlayerTag || matchesNetplayName;
  if (!options.fuzzyNameTagMatching || netplayName === null) {
    return exactMatch;
  }

  // Replace the netplay names with underscores and coerce to lowercase
  // Smashladder internally represents spaces as underscores when writing SLP files
  const fuzzyNetplayName = netplayName.toLowerCase();
  const matchedFuzzyTag = options.nameTags.find((tag) => {
    const lowerSearch = tag.toLowerCase();
    const fuzzySearch = tag.split(" ").join("_").toLowerCase();
    return lowerSearch === fuzzyNetplayName || fuzzySearch === fuzzyNetplayName;
  });
  return matchedFuzzyTag !== undefined;
};

export const MatchesCharacter: Criteria = (combo, settings, options) => {
  if (options.characterFilter.length === 0) {
    return true;
  }

  const player = settings.players.find((player) => player.playerIndex === combo.playerIndex);
  const matchesCharacter = options.characterFilter.includes(player.characterId);
  return matchesCharacter;
};

export const ExcludesChainGrabs: Criteria = (combo, settings, options) => {
  if (!options.excludeChainGrabs) {
    return true;
  }

  const player = settings.players.find((player) => player.playerIndex === combo.playerIndex);
  if (!options.chainGrabbers.includes(player.characterId)) {
    return true;
  }

  const numUpThrowPummels = combo.moves.filter(
    ({ moveId }) => moveId === MoveID.U_THROW || moveId === MoveID.GRAB_PUMMEL,
  ).length;
  const numMoves = combo.moves.length;
  const isChainGrab = numUpThrowPummels / numMoves >= options.chainGrabThreshold;
  // Continue with processing if the combo is not a chain grab
  return !isChainGrab;
};

export const ExcludesWobbles: Criteria = (combo, settings, options) => {
  if (!options.excludeWobbles) {
    return true;
  }

  const player = settings.players.find((player) => player.playerIndex === combo.playerIndex);
  if (player.characterId !== Character.ICE_CLIMBERS) {
    // Continue processing if the character is not Ice Climbers
    return true;
  }

  const wobbles = [];
  let pummels = 0;
  combo.moves.forEach(({ moveId }) => {
    if (moveId === MoveID.GRAB_PUMMEL) {
      pummels++;
    } else {
      wobbles.push(pummels);
      pummels = 0;
    }
  });
  wobbles.push(pummels);
  const wobbled = wobbles.some((pummelCount) => pummelCount > options.wobbleThreshold);
  // Only continue processing if the combo is not a wobble
  return !wobbled;
};

export const SatisfiesMinComboLength: Criteria = (combo, settings, options) => {
  const numMoves = combo.moves.length;
  return numMoves >= options.minComboLength;
};

export const SatisfiesMinComboPercent: Criteria = (combo, settings, options) => {
  const player = settings.players.find((player) => player.playerIndex === combo.playerIndex);

  const minComboPercent = options.perCharacterMinComboPercent[player.characterId] || options.minComboPercent;
  const totalComboPercent = combo.endPercent - combo.startPercent;
  // Continue only if the total combo percent was greater than the threshold
  return totalComboPercent > minComboPercent;
};

export const ExcludesLargeSingleHit: Criteria = (combo, settings, options) => {
  const totalDmg = sumBy(combo.moves, ({ damage }) => damage);
  const largeSingleHit = combo.moves.some(({ damage }) => damage / totalDmg >= options.largeHitThreshold);
  return !largeSingleHit;
};

export const ExcludesCPUs: Criteria = (combo, settings, options) => {
  if (!options.excludeCPUs) {
    return true;
  }
  const cpu = settings.players.some((player) => player.type != 0);
  return !cpu;
};

export const IsOneVsOne: Criteria = (combo, settings) => {
  return settings.players.length === 2;
};

export const ComboDidKill: Criteria = (combo, settings, options) => {
  return !options.comboMustKill || combo.didKill;
};

export const ALL_CRITERIA: Criteria[] = [
  MatchesPortNumber,
  MatchesPlayerName,
  MatchesCharacter,
  ExcludesChainGrabs,
  ExcludesWobbles,
  SatisfiesMinComboLength,
  SatisfiesMinComboPercent,
  ExcludesLargeSingleHit,
  ExcludesCPUs,
  IsOneVsOne,
  ComboDidKill,
];