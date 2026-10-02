export interface PetConfig {
  id: string;
  name: string;
  jsonKey: string;
  imageSrc: string;
  icon: string;
}

export const PET_CONFIGS: PetConfig[] = [
  { id: 'chinchilla', name: 'Chinchilla', jsonKey: 'chinchilla', imageSrc: '/pets/chinchilla.png', icon: '🐭' },
  { id: 'cockatiel', name: 'Cockatiel', jsonKey: 'cockatiel', imageSrc: '/pets/cockatiel.png', icon: '🦜' },
  { id: 'pigeon', name: 'Pigeon', jsonKey: 'pigeon', imageSrc: '/pets/pigeon.png', icon: '🐦' },
  { id: 'poodle', name: 'Poodle', jsonKey: 'poodle', imageSrc: '/pets/poodle.png', icon: '🐩' },
  { id: 'pug', name: 'Pug', jsonKey: 'pug', imageSrc: '/pets/pug.png', icon: '🐶' },
  { id: 'hedgehog', name: 'Hedgehog', jsonKey: 'hedgehog', imageSrc: '/pets/hedgehog.png', icon: '🦔' },
  { id: 'bunny', name: 'Bunny', jsonKey: 'bunny', imageSrc: '/pets/bunny.png', icon: '🐰' },
  { id: 'kitty', name: 'Kitty', jsonKey: 'cat', imageSrc: '/pets/cat.png', icon: '🐱' },
];

export const DEFAULT_PET_ID = 'chinchilla';

export function getPetConfig(petId: string): PetConfig {
  return PET_CONFIGS.find(p => p.id === petId) || PET_CONFIGS[0];
}
