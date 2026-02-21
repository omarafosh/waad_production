/**
 * Reviewer Companies Page - DEFERRED
 *
 * This module is planned for a future phase of the system.
 * Business workflow for multi-reviewer companies is not yet finalized.
 *
 * Status: DEFERRED to Phase C
 * Last Updated: 2024-12-21
 */

import { Box } from '@mui/material';
import { ScheduleOutlined } from '@ant-design/icons';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import ModernEmptyState from 'components/tba/ModernEmptyState';

export default function ReviewerCompaniesPage() {
  return (
    <Box>
      {/* Page Header */}
      <ModernPageHeader title="شركات المراجعة الطبية" subtitle="إدارة شركات المراجعة الطبية والفحص" />

      {/* Deferred Module Notice */}
      <ModernEmptyState
        icon={ScheduleOutlined}
        title="شركات المراجعة الطبية"
        description="هذه الوحدة مخطط لها ضمن مراحل لاحقة من النظام، وسيتم تفعيلها بعد استقرار التشغيل الأساسي."
        height={400}
      />
    </Box>
  );
}
