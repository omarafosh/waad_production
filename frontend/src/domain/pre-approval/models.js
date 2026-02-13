/**
 * Pre-Approval Domain Model
 */

export const PreApprovalInitialValues = {
    memberId: null,
    visitId: null,
    providerId: null,
    medicalServiceId: null,
    diagnosisCode: '',
    diagnosisDescription: '',
    doctorName: '',
    notes: '',
    services: [] // For multi-service selection
};

export const VisitTypeLabels = {
    'OUTPATIENT': 'عيادة خارجية',
    'INPATIENT': 'تنويم',
    'EMERGENCY': 'طوارئ',
    'DENTAL': 'أسنان',
    'OPTICAL': 'بصريات'
};
