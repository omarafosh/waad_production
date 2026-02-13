// NOTE: Admin Roles module - Deferred to Phase C
// Role-based access control not yet finalized
// Last Updated: 2024-12-21

import { Box } from '@mui/material';
import { ScheduleOutlined } from '@ant-design/icons';
import MainCard from 'components/MainCard';
import ModernEmptyState from 'components/tba/ModernEmptyState';
import RBACGuard from 'components/tba/RBACGuard';

const RolesList = () => {
  return (
    <RBACGuard permission="ROLE_VIEW">
      <MainCard title="الأدوار والصلاحيات">
        <ModernEmptyState
          icon={ScheduleOutlined}
          title="الأدوار والصلاحيات"
          description="هذه الوحدة مخطط لها ضمن مراحل لاحقة من النظام"
          height={300}
        />
      </MainCard>
    </RBACGuard>
  );
};

export default RolesList;
