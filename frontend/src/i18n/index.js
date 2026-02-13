import arAuth from './ar/auth.json';
import arCommon from './ar/common.json';
import arRbac from './ar/rbac.json';
import enAuth from './en/auth.json';
import enCommon from './en/common.json';
import enRbac from './en/rbac.json';

// Merge all module translations
export const messages = {
    ar: {
        ...arAuth,
        ...arCommon,
        // Add more modules here as they are created
    },
    en: {
        ...enAuth,
        ...enCommon,
    }
};

// Flatten utility (needed for react-intl if files are nested)
export const flattenMessages = (nestedMessages, prefix = '') => {
    return Object.keys(nestedMessages).reduce((messages, key) => {
        const value = nestedMessages[key];
        const prefixedKey = prefix ? `${prefix}.${key}` : key;

        if (typeof value === 'string') {
            messages[prefixedKey] = value;
        } else {
            Object.assign(messages, flattenMessages(value, prefixedKey));
        }

        return messages;
    }, {});
};

export default messages;
