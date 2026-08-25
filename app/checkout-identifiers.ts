export const checkoutIdentifiers = [
  'email',
  'username',
  'minecraft_username',
  'minecraft_uid',
  'minecraft_uuid',
  'minecraft_full_uuid',
  'steam_id',
  'steam_id2',
  'steam_id64',
  'steam_username',
  'discord_id',
  'discord_username',
  'epic_id',
  'eos_id',
  'eosid',
  'fivem_citizen_id',
  'fivem_live_id',
  'fivem_licence',
  'ingame_username',
  'rust_username',
  'PlayerName',
  'ue4_id',
  'ue5id',
  'arkse_username',
  'arksa_username',
  'hytale_username',
  'hytale_uuid',
  '7dtd_username',
  'zomboid_username',
  'unturned_username',
  'gmod_username',
  'csgo_username',
] as const;

export type CheckoutIdentifier = typeof checkoutIdentifiers[number];

const identifierLabels: Partial<Record<CheckoutIdentifier, string>> = {
  email: 'EMAIL ADDRESS',
  username: 'ACCOUNT USERNAME',
  minecraft_username: 'MINECRAFT USERNAME',
  minecraft_uid: 'MINECRAFT USERNAME',
  minecraft_uuid: 'MINECRAFT UUID',
  minecraft_full_uuid: 'MINECRAFT FULL UUID',
  steam_id: 'STEAM ID',
  steam_id2: 'STEAM ID2',
  steam_id64: 'STEAM ID64',
  steam_username: 'STEAM USERNAME',
  discord_id: 'DISCORD USER ID',
  discord_username: 'DISCORD USERNAME',
  epic_id: 'EPIC GAMES ID',
  eos_id: 'EOS ID',
  eosid: 'EOS ID',
  fivem_citizen_id: 'FIVEM CITIZEN ID',
  fivem_live_id: 'FIVEM LIVE ID',
  fivem_licence: 'FIVEM LICENCE',
  ingame_username: 'IN-GAME USERNAME',
  rust_username: 'RUST USERNAME',
  PlayerName: 'PLAYER NAME',
  ue4_id: 'UNREAL PLAYER ID',
  ue5id: 'ARK SURVIVAL ASCENDED ID',
  arkse_username: 'ARK SURVIVAL EVOLVED USERNAME',
  arksa_username: 'ARK SURVIVAL ASCENDED USERNAME',
  hytale_username: 'HYTALE USERNAME',
  hytale_uuid: 'HYTALE UUID',
  '7dtd_username': '7 DAYS TO DIE USERNAME',
  zomboid_username: 'PROJECT ZOMBOID USERNAME',
  unturned_username: 'UNTURNED USERNAME',
  gmod_username: 'GARRY\'S MOD USERNAME',
  csgo_username: 'COUNTER-STRIKE USERNAME',
};

export function identifierLabel(identifier: CheckoutIdentifier) {
  return identifierLabels[identifier] || identifier.replaceAll('_', ' ').toUpperCase();
}

export function identifierField(identifier: CheckoutIdentifier) {
  const label = identifierLabel(identifier);
  return {
    label,
    placeholder: identifier === 'email' ? 'you@example.com' : `Enter your ${label.toLowerCase()}`,
    type: identifier === 'email' ? 'email' as const : 'text' as const,
    autoComplete: identifier === 'email' ? 'email' : identifier === 'username' ? 'username' : 'off',
  };
}
