/**
 * Chronic Conditions Service
 * خدمة إدارة الأمراض المزمنة للأعضاء
 */
import api from 'utils/axios';

const BASE_URL = '/chronic-conditions';

/**
 * Get all chronic condition types
 * الحصول على جميع أنواع الأمراض المزمنة
 */
export const getConditionTypes = async () => {
  const response = await api.get(`${BASE_URL}/condition-types`);
  return response.data;
};

/**
 * Get all coverage statuses
 * الحصول على جميع حالات التغطية
 */
export const getCoverageStatuses = async () => {
  const response = await api.get(`${BASE_URL}/coverage-statuses`);
  return response.data;
};

/**
 * Create a new chronic condition for a member
 * إضافة مرض مزمن جديد للعضو
 */
export const createCondition = async (data) => {
  const response = await api.post(BASE_URL, data);
  return response.data;
};

/**
 * Get condition by ID
 * الحصول على مرض مزمن بالمعرف
 */
export const getConditionById = async (id) => {
  const response = await api.get(`${BASE_URL}/${id}`);
  return response.data;
};

/**
 * Get all conditions for a member
 * الحصول على جميع الأمراض المزمنة للعضو
 */
export const getConditionsByMemberId = async (memberId) => {
  const response = await api.get(`${BASE_URL}/member/${memberId}`);
  return response.data;
};

/**
 * Get conditions for a member (paginated)
 * الحصول على الأمراض المزمنة للعضو مع صفحات
 */
export const getConditionsByMemberIdPaged = async (memberId, page = 0, size = 10, sort = 'createdAt,desc') => {
  const response = await api.get(`${BASE_URL}/member/${memberId}/paged`, {
    params: { page, size, sort }
  });
  return response.data;
};

/**
 * Update a chronic condition
 * تحديث بيانات المرض المزمن
 */
export const updateCondition = async (id, data) => {
  const response = await api.put(`${BASE_URL}/${id}`, data);
  return response.data;
};

/**
 * Delete a chronic condition (soft delete)
 * حذف المرض المزمن
 */
export const deleteCondition = async (id) => {
  const response = await api.delete(`${BASE_URL}/${id}`);
  return response.data;
};

/**
 * Update coverage status
 * تحديث حالة التغطية
 */
export const updateCoverageStatus = async (id, status, reason = null) => {
  const params = { status };
  if (reason) params.reason = reason;
  const response = await api.patch(`${BASE_URL}/${id}/coverage-status`, null, { params });
  return response.data;
};

/**
 * Verify documentation
 * التحقق من المستندات الطبية
 */
export const verifyDocumentation = async (id) => {
  const response = await api.patch(`${BASE_URL}/${id}/verify-documentation`);
  return response.data;
};

/**
 * Check if member has chronic conditions
 * التحقق من وجود أمراض مزمنة للعضو
 */
export const hasChronicConditions = async (memberId) => {
  const response = await api.get(`${BASE_URL}/member/${memberId}/has-conditions`);
  return response.data;
};

/**
 * Validate claim for chronic condition
 * التحقق من صلاحية المطالبة للمرض المزمن
 */
export const validateClaim = async (memberId, conditionType, claimAmount = null) => {
  const params = { memberId, conditionType };
  if (claimAmount) params.claimAmount = claimAmount;
  const response = await api.get(`${BASE_URL}/validate-claim`, { params });
  return response.data;
};

/**
 * Check if condition is covered
 * التحقق من تغطية المرض المزمن
 */
export const isConditionCovered = async (memberId, conditionType) => {
  const response = await api.get(`${BASE_URL}/member/${memberId}/is-covered`, {
    params: { conditionType }
  });
  return response.data;
};

/**
 * Get conditions pending review
 * الحصول على الأمراض المزمنة قيد المراجعة
 */
export const getPendingReview = async () => {
  const response = await api.get(`${BASE_URL}/pending-review`);
  return response.data;
};

/**
 * Search conditions with filters
 * البحث في الأمراض المزمنة
 */
export const searchConditions = async ({ conditionType, coverageStatus, employerId, verified, page = 0, size = 10, sort = 'createdAt,desc' }) => {
  const params = { page, size, sort };
  if (conditionType) params.conditionType = conditionType;
  if (coverageStatus) params.coverageStatus = coverageStatus;
  if (employerId) params.employerId = employerId;
  if (verified !== undefined) params.verified = verified;
  
  const response = await api.get(`${BASE_URL}/search`, { params });
  return response.data;
};

/**
 * Get statistics
 * الحصول على إحصائيات الأمراض المزمنة
 */
export const getStatistics = async () => {
  const response = await api.get(`${BASE_URL}/statistics`);
  return response.data;
};

export default {
  getConditionTypes,
  getCoverageStatuses,
  createCondition,
  getConditionById,
  getConditionsByMemberId,
  getConditionsByMemberIdPaged,
  updateCondition,
  deleteCondition,
  updateCoverageStatus,
  verifyDocumentation,
  hasChronicConditions,
  validateClaim,
  isConditionCovered,
  getPendingReview,
  searchConditions,
  getStatistics
};
