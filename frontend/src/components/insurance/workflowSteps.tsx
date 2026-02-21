/**
 * Workflow Step Definitions
 * For Claims and Pre-Approvals timeline visualization
 */

export const CLAIM_WORKFLOW_STEPS = {
  ar: [
    { key: 'SUBMITTED', label: 'مقدمة', labelEn: 'Submitted' },
    { key: 'RECEIVED', label: 'مستلمة', labelEn: 'Received' },
    { key: 'PENDING_REVIEW', label: 'قيد المراجعة', labelEn: 'Under Review' },
    { key: 'RETURNED_FOR_INFO', label: 'مطلوب مستندات', labelEn: 'Documents Required' },
    { key: 'APPROVED', label: 'موافق عليها', labelEn: 'Approved' },
    { key: 'PARTIALLY_APPROVED', label: 'موافق جزئياً', labelEn: 'Partially Approved' },
    { key: 'REJECTED', label: 'مرفوضة', labelEn: 'Rejected' },
    { key: 'SETTLED', label: 'مسددة', labelEn: 'Settled' }
  ],
  en: [
    { key: 'SUBMITTED', label: 'Submitted', labelEn: 'Submitted' },
    { key: 'RECEIVED', label: 'Received', labelEn: 'Received' },
    { key: 'PENDING_REVIEW', label: 'Under Review', labelEn: 'Under Review' },
    { key: 'RETURNED_FOR_INFO', label: 'Documents Required', labelEn: 'Documents Required' },
    { key: 'APPROVED', label: 'Approved', labelEn: 'Approved' },
    { key: 'PARTIALLY_APPROVED', label: 'Partially Approved', labelEn: 'Partially Approved' },
    { key: 'REJECTED', label: 'Rejected', labelEn: 'Rejected' },
    { key: 'SETTLED', label: 'Settled', labelEn: 'Settled' }
  ]
};

export const PREAPPROVAL_WORKFLOW_STEPS = {
  ar: [
    { key: 'SUBMITTED', label: 'مقدم', labelEn: 'Submitted' },
    { key: 'RECEIVED', label: 'مستلم', labelEn: 'Received' },
    { key: 'MEDICAL_REVIEW', label: 'المراجعة الطبية', labelEn: 'Medical Review' },
    { key: 'PENDING_DOCUMENTS', label: 'مطلوب مستندات', labelEn: 'Documents Required' },
    { key: 'APPROVED', label: 'موافق عليه', labelEn: 'Approved' },
    { key: 'REJECTED', label: 'مرفوض', labelEn: 'Rejected' }
  ],
  en: [
    { key: 'SUBMITTED', label: 'Submitted', labelEn: 'Submitted' },
    { key: 'RECEIVED', label: 'Received', labelEn: 'Received' },
    { key: 'MEDICAL_REVIEW', label: 'Medical Review', labelEn: 'Medical Review' },
    { key: 'PENDING_DOCUMENTS', label: 'Documents Required', labelEn: 'Documents Required' },
    { key: 'APPROVED', label: 'Approved', labelEn: 'Approved' },
    { key: 'REJECTED', label: 'Rejected', labelEn: 'Rejected' }
  ]
};

/**
 * Get workflow steps based on current status
 * Returns only relevant steps (removes branching paths based on current state)
 */
export const getWorkflowSteps = (type, currentStatus, language = 'ar') => {
  const allSteps =
    type === 'claim'
      ? CLAIM_WORKFLOW_STEPS[language] || CLAIM_WORKFLOW_STEPS.ar
      : PREAPPROVAL_WORKFLOW_STEPS[language] || PREAPPROVAL_WORKFLOW_STEPS.ar;

  // For claim workflow, determine the path based on status
  if (type === 'claim') {
    const baseSteps = ['SUBMITTED', 'RECEIVED', 'PENDING_REVIEW'];

    if (currentStatus === 'RETURNED_FOR_INFO') {
      return allSteps.filter((s) => [...baseSteps, 'RETURNED_FOR_INFO', 'PENDING_REVIEW'].includes(s.key));
    }

    if (currentStatus === 'APPROVED' || currentStatus === 'SETTLED') {
      return allSteps.filter((s) => [...baseSteps, 'APPROVED', 'SETTLED'].includes(s.key));
    }

    if (currentStatus === 'PARTIALLY_APPROVED') {
      return allSteps.filter((s) => [...baseSteps, 'PARTIALLY_APPROVED', 'SETTLED'].includes(s.key));
    }

    if (currentStatus === 'REJECTED') {
      return allSteps.filter((s) => [...baseSteps, 'REJECTED'].includes(s.key));
    }

    // Default: show path to approval
    return allSteps.filter((s) => [...baseSteps, 'APPROVED', 'SETTLED'].includes(s.key));
  }

  // For pre-approval workflow
  const baseSteps = ['SUBMITTED', 'RECEIVED', 'MEDICAL_REVIEW'];

  if (currentStatus === 'PENDING_DOCUMENTS') {
    return allSteps.filter((s) => [...baseSteps, 'PENDING_DOCUMENTS', 'MEDICAL_REVIEW'].includes(s.key));
  }

  if (currentStatus === 'APPROVED') {
    return allSteps.filter((s) => [...baseSteps, 'APPROVED'].includes(s.key));
  }

  if (currentStatus === 'REJECTED') {
    return allSteps.filter((s) => [...baseSteps, 'REJECTED'].includes(s.key));
  }

  // Default: show path to approval
  return allSteps.filter((s) => [...baseSteps, 'APPROVED'].includes(s.key));
};

/**
 * Map backend status to workflow step
 */
export const mapStatusToWorkflowStep = (backendStatus) => {
  const statusMap = {
    // Claim statuses
    PENDING_REVIEW: 'PENDING_REVIEW',
    PREAPPROVED: 'RECEIVED',
    APPROVED: 'APPROVED',
    PARTIALLY_APPROVED: 'PARTIALLY_APPROVED',
    REJECTED: 'REJECTED',
    RETURNED_FOR_INFO: 'RETURNED_FOR_INFO',
    CANCELLED: 'REJECTED',

    // Pre-approval statuses
    PENDING: 'MEDICAL_REVIEW',
    PENDING_DOCUMENTS: 'PENDING_DOCUMENTS'
  };

  return statusMap[backendStatus] || backendStatus;
};

export default {
  CLAIM_WORKFLOW_STEPS,
  PREAPPROVAL_WORKFLOW_STEPS,
  getWorkflowSteps,
  mapStatusToWorkflowStep
};
