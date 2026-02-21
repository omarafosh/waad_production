import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * 🏢 Employer Filter Store - Zustand State Management
 * 
 * المترجم: متجر لإدارة فلتر جهة العمل (Employer/Partner) بشكل عالمي في التطبيق
 * 
 * REFACTOR (2026-02-20): 
 * - Converted from React Context to Zustand for better performance and simplicity.
 * - Native persist middleware used for robust localStorage management.
 * - Logic preserved for naming normalization and migration fallback.
 */

export interface Employer {
    id: number | string;
    label?: string;
    name?: string;
    nameAr?: string;
    nameArabic?: string;
    code?: string;
}

export interface EmployerFilterState {
    selectedEmployerId: number | string | null;
    selectedEmployer: Employer | null;
    isFilterActive: boolean;

    // Actions
    setEmployer: (partner: Employer | null) => void;
    clearFilter: () => void;
}

export const useEmployerFilterStore = create<EmployerFilterState>()(
    persist(
        (set, get) => ({
            // State
            selectedEmployerId: null,
            selectedEmployer: null,
            isFilterActive: false,

            // Actions
            setEmployer: (partner: Employer | null) => {
                if (!partner) {
                    set({
                        selectedEmployerId: null,
                        selectedEmployer: null,
                        isFilterActive: false
                    });
                    return;
                }

                const normalizedName = partner.label || partner.name || partner.nameAr || partner.nameArabic;
                const normalizedEmployer = {
                    id: partner.id,
                    label: normalizedName,
                    name: normalizedName,
                    code: partner.code
                };

                set({
                    selectedEmployerId: partner.id,
                    selectedEmployer: normalizedEmployer,
                    isFilterActive: true
                });
            },

            clearFilter: () => {
                set({
                    selectedEmployerId: null,
                    selectedEmployer: null,
                    isFilterActive: false
                });

                // Clean up legacy keys manually once
                try {
                    localStorage.removeItem('tba_selected_partner_id');
                    localStorage.removeItem('tba_selected_partner');
                    localStorage.removeItem('tba_selected_employer_id');
                    localStorage.removeItem('tba_selected_employer');
                } catch (e) {
                    // ignore
                }
            }
        }),
        {
            name: 'tba-employer-filter-storage',
            storage: createJSONStorage(() => localStorage),
            // MIGRATION: Restore from old keys if new storage is empty
            onRehydrateStorage: () => (state) => {
                if (state && !state.selectedEmployerId) {
                    try {
                        const savedId = localStorage.getItem('tba_selected_partner_id') || localStorage.getItem('tba_selected_employer_id');
                        const savedData = localStorage.getItem('tba_selected_partner') || localStorage.getItem('tba_selected_employer');

                        if (savedId && savedData) {
                            const parsed = JSON.parse(savedData);
                            state.setEmployer({
                                id: savedId,
                                ...parsed
                            });
                        }
                    } catch (e) {
                        console.warn('[EmployerFilterStore] Migration failed:', e);
                    }
                }
            }
        }
    )
);

/**
 * Hook to access employer filter (for backward compatibility)
 */
export const useEmployerFilter = () => {
    const store = useEmployerFilterStore();
    return {
        selectedEmployerId: store.selectedEmployerId,
        selectedEmployer: store.selectedEmployer,
        isFilterActive: store.isFilterActive,
        setEmployer: store.setEmployer,
        clearFilter: store.clearFilter
    };
};

export default useEmployerFilterStore;
