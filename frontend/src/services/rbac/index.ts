/**
 * RBAC Services Index
 * Central export for all RBAC (Role-Based Access Control) services
 *
 * These services handle entity CRUD operations for:
 * - Users
 * - Roles
 * - Permissions
 */

export { default as usersService } from './users.service';
export { default as rolesService } from './roles.service';
export { default as permissionsService } from './permissions.service';

// Named exports for convenience
export { usersService as UsersService } from './users.service';
export { rolesService as RolesService } from './roles.service';
export { permissionsService as PermissionsService } from './permissions.service';
