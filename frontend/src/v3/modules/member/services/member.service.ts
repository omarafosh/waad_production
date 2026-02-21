import BaseApiService from '../../../core/services/BaseApiService';

export interface MemberV3 {
    id?: number;
    fullName: string;
    civilId: string;
    cardNumber?: string;
    barcode?: string;
    birthDate?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    status?: string;
    parent?: MemberV3;
    dependents?: MemberV3[];
    relationship?: string;
    isPrincipal: boolean;
}

/**
 * Service for Member Module (V3).
 * Extends BaseApiService to inherit unified request/error logic.
 */
class MemberService extends BaseApiService {
    constructor() {
        super('/members');
    }

    async getActiveMembers(): Promise<MemberV3[]> {
        return this.get<MemberV3[]>();
    }

    async registerPrincipal(member: MemberV3): Promise<MemberV3> {
        return this.post<MemberV3>('/principal', member);
    }

    async addDependent(principalId: number, dependent: MemberV3): Promise<MemberV3> {
        return this.post<MemberV3>(`/${principalId}/dependents`, dependent);
    }

    async deleteMember(id: number): Promise<void> {
        return this.delete(`/${id}`);
    }

    // --- Excel Utilities ---

    async downloadTemplate(): Promise<void> {
        const data = await this.get<Blob>('/template', { responseType: 'blob' });
        this.downloadFile(data, 'member_template.xlsx');
    }

    async exportMembers(): Promise<void> {
        const data = await this.get<Blob>('/export', { responseType: 'blob' });
        this.downloadFile(data, 'members_export.xlsx');
    }

    async importMembers(file: File): Promise<string> {
        const formData = new FormData();
        formData.append('file', file);
        return this.post<string>('/import', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    }

    private downloadFile(blob: Blob, filename: string) {
        const url = window.URL.createObjectURL(new Blob([blob]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
    }
}

export const memberServiceV3 = new MemberService();
export default memberServiceV3;
