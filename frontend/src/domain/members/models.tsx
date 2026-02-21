import dayjs from 'dayjs';

export const MemberInitialValues = {
    fullName: '',
    nationalNumber: '',
    birthDate: null,
    gender: '',
    nationality: 'ليبي',
    maritalStatus: '',
    phone: '',
    email: '',
    address: '',
    employerId: '',
    employeeNumber: '',
    joinDate: null,
    occupation: '',
    policyNumber: '',
    status: 'ACTIVE',
    startDate: dayjs().format('YYYY-MM-DD'),
    endDate: null,
    notes: '',
    isFastTrack: false,
    isVip: false,
    isUrgent: false,
    emergencyNotes: '',
    noEmployer: false,
    photoFile: null,
    dependents: []
};

export const GENDERS = {
    MALE: 'MALE',
    FEMALE: 'FEMALE'
};

export const MARITAL_STATUSES = {
    SINGLE: 'SINGLE',
    MARRIED: 'MARRIED',
    DIVORCED: 'DIVORCED',
    WIDOWED: 'WIDOWED'
};
