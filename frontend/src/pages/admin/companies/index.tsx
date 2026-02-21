// NOTE: Admin Companies module - Deferred to Phase C
// Super Admin company management not yet finalized
// Last Updated: 2024-12-21

import { Box } from '@mui/material';
import { ScheduleOutlined } from '@ant-design/icons';
import MainCard from 'components/MainCard';
import ModernEmptyState from 'components/tba/ModernEmptyState';
import RBACGuard from 'components/tba/RBACGuard';

const CompaniesList = () => {
  return (
    <RBACGuard permission="COMPANY_VIEW">
      <MainCard title="إدارة الشركات">
        <ModernEmptyState
          icon={ScheduleOutlined}
          title="إدارة الشركات"
          description="هذه الوحدة مخطط لها ضمن مراحل لاحقة من النظام"
          height={300}
        />
      </MainCard>
    </RBACGuard>
  );
};

export default CompaniesList;
