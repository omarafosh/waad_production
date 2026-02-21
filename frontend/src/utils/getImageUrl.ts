export enum ImagePath {
  LANDING = 'landing',
  USERS = 'users',
  ECOMMERCE = 'e-commerce',
  PROFILE = 'profile',
  CLIENTS = 'clients',
  CHANGELOG = 'change-log',
  WORKSPACE = 'workspace'
}

// ==============================|| NEW URL - GET IMAGE URL ||============================== //

export function getImageUrl(name: string, path: ImagePath | string): string {
  return new URL(`../assets/images/${path}/${name}`, import.meta.url).href;
}
