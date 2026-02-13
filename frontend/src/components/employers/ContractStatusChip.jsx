import React from 'react';
import { Chip } from '@mui/material';
import PropTypes from 'prop-types';

/**
 * Contract Status Chip Component
 * 
 * Displays benefit policy status with appropriate colors.
 * Status mapping:
 * - DRAFT: Grey (policy being prepared)
 * - ACTIVE: Green (currently effective)
 * - EXPIRED: Orange (past end date)
 * - SUSPENDED: Yellow (temporarily halted)
 * - CANCELLED: Red (permanently cancelled)
 */
const ContractStatusChip = ({ status }) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'DRAFT':
        return {
          label: 'مسودة',
          color: 'default',
          variant: 'outlined'
        };
      case 'ACTIVE':
        return {
          label: 'ساري',
          color: 'success',
          variant: 'filled'
        };
      case 'EXPIRED':
        return {
          label: 'منتهي',
          color: 'warning',
          variant: 'filled'
        };
      case 'SUSPENDED':
        return {
          label: 'معلق',
          color: 'info',
          variant: 'outlined'
        };
      case 'CANCELLED':
        return {
          label: 'ملغي',
          color: 'error',
          variant: 'filled'
        };
      default:
        return {
          label: status || 'غير معروف',
          color: 'default',
          variant: 'outlined'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Chip
      label={config.label}
      color={config.color}
      variant={config.variant}
      size="small"
      sx={{ fontWeight: 600 }}
    />
  );
};

ContractStatusChip.propTypes = {
  status: PropTypes.oneOf(['DRAFT', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED']).isRequired
};

export default ContractStatusChip;
