import { useState, useCallback } from 'react';
import memberService, { MemberV3 } from '../services/member.service';

/**
 * Custom hook for Member Module state and operations.
 */
export const useMembersV3 = () => {
    const [members, setMembers] = useState<MemberV3[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchMembers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await memberService.getActiveMembers();
            setMembers(data);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch members');
        } finally {
            setLoading(false);
        }
    }, []);

    const registerPrincipal = async (member: MemberV3) => {
        setLoading(true);
        try {
            const newMember = await memberService.registerPrincipal(member);
            setMembers(prev => [...prev, newMember]);
            return newMember;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const deleteMember = async (id: number) => {
        setLoading(true);
        try {
            await memberService.deleteMember(id);
            setMembers(prev => prev.filter(m => m.id !== id));
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const importMembers = async (file: File) => {
        setLoading(true);
        try {
            await memberService.importMembers(file);
            await fetchMembers(); // Refresh list after import
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        members,
        loading,
        error,
        fetchMembers,
        registerPrincipal,
        deleteMember,
        importMembers,
        exportMembers: memberService.exportMembers.bind(memberService),
        downloadTemplate: memberService.downloadTemplate.bind(memberService)
    };
};
