import prisma from "../config/database.js";

// In-memory cache for permissions (simple Map)
const permissionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if user has permission for a resource action
 * @param {string} userId - User ID
 * @param {string} resource - Resource name (e.g., "STUDENT")
 * @param {string} action - Action name (e.g., "VIEW", "CREATE")
 * @returns {Promise<boolean>}
 */

export async function hasPermission(userId, resource, action) {
  try {
    // Check cache first
    const cacheKey = `${userId}:${resource}:${action}`;
    const cached = permissionCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.value;
    }

    // Fetch from database
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: {
              where: { resource },
            },
          },
        },
      },
    });

    // Check if ANY of user's roles has the permission
    const allowed = userRoles.some((userRole) =>
      userRole.role.permissions.some(
        (perm) =>
          perm.actions.includes(action) || perm.actions.includes("MANAGE"),
      ),
    );

    // Cache the result
    permissionCache.set(cacheKey, {
      value: allowed,
      timestamp: Date.now(),
    });

    return allowed;
  } catch (error) {
    console.error("Permission check error:", error);
    return false;
  }
}


/**
 * Get all permissions for a user (grouped by resource)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Grouped permissions by resource
 * 
 * Example return:
 * {
 *   "STUDENT": ["VIEW", "CREATE"],
 *   "TEACHER": ["VIEW"],
 *   "INSTITUTION": ["VIEW", "UPDATE"]
 * }
 */

export async function getUserPermissions(userId) {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: true,
        },
      },
    },
  });

  const allPermissions = {};

  userRoles.forEach((userRole) => {
    userRole.role.permissions.forEach((perm) => {
      if (!allPermissions[perm.resource]) {
        allPermissions[perm.resource] = new Set();
      }
      perm.actions.forEach((action) => {
        allPermissions[perm.resource].add(action);
      });
    });
  });

  // Convert Sets to Arrays
  Object.keys(allPermissions).forEach((resource) => {
    allPermissions[resource] = Array.from(allPermissions[resource]);
  });

  return allPermissions;
}

/**
 * Get user's roles
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of role objects
 */

export async function getUserRoles(userId) {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
  });

  return userRoles.map((ur) => ur.role);
}


/**
 * Check if user has a specific role
 * @param {string} userId - User ID
 * @param {string} roleName - Role name (e.g., "TEACHER")
 * @returns {Promise<boolean>}
 */

export async function hasRole(userId, roleName) {
  const userRole = await prisma.userRole.findFirst({
    where: {
      userId,
      role: {
        name: roleName,
      },
    },
  });

  return !!userRole;
}

/**
 * Clear permission cache for a specific user
 * Call this when user's roles or permissions change
 * @param {string} userId - User ID
 */

export function clearUserPermissionCache(userId) {
  // Find all cache keys for this user
  const keysToDelete = [];
  for (const key of permissionCache.keys()) {
    if (key.startsWith(`${userId}:`)) {
      keysToDelete.push(key);
    }
  }

  // Delete all cached permissions for this user
  keysToDelete.forEach((key) => permissionCache.delete(key));
}

/**
 * Clear all permission cache
 * Call this when role permissions change
 */

export function clearAllPermissionCache() {
  permissionCache.clear();
}