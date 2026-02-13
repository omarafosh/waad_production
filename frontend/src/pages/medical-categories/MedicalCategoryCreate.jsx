
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button } from '@mui/material';

// Icons
import CategoryIcon from '@mui/icons-material/Category';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// Project Components
import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import MedicalCategoryForm from 'components/medical/MedicalCategoryForm';

// Services
import { useTableRefresh } from 'contexts/TableRefreshContext';
import { createMedicalCategory } from 'services/api/medical-categories.service';

const MedicalCategoryCreate = () => {
  const navigate = useNavigate();
  const { triggerRefresh } = useTableRefresh();

  const handleBack = useCallback(() => navigate('/medical-categories'), [navigate]);

  const handleSubmit = useCallback(
    async (formData) => {
      await createMedicalCategory(formData);
      triggerRefresh();
      navigate('/medical-categories');
    },
    [navigate, triggerRefresh]
  );

  return (
    <Box>
      <ModernPageHeader
        title="إضافة تصنيف طبي جديد"
        subtitle="أضف تصنيفاً رئيسياً أو فرعياً للخدمات الطبية"
        icon={CategoryIcon}
        breadcrumbs={[{ label: 'التصنيفات الطبية', path: '/medical-categories' }, { label: 'إضافة جديد' }]}
        actions={
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack}>
            العودة للقائمة
          </Button>
        }
      />

      <MainCard>
        <MedicalCategoryForm
          isEditMode={false}
          onSubmit={handleSubmit}
          onCancel={handleBack}
        />
      </MainCard>
    </Box>
  );
};

export default MedicalCategoryCreate;
