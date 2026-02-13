
import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Skeleton } from '@mui/material';

// Icons
import CategoryIcon from '@mui/icons-material/Category';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

// Project Components
import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import ModernEmptyState from 'components/tba/ModernEmptyState';
import MedicalCategoryForm from 'components/medical/MedicalCategoryForm';

// Services
import { useTableRefresh } from 'contexts/TableRefreshContext';
import { updateMedicalCategory } from 'services/api/medical-categories.service';
import { useMedicalCategoryDetails } from 'hooks/useMedicalCategories';

const MedicalCategoryEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { triggerRefresh } = useTableRefresh();

  // Fetch details
  const { data: categoryData, loading: loadingCategory, error: loadError } = useMedicalCategoryDetails(id);

  const handleBack = useCallback(() => navigate('/medical-categories'), [navigate]);

  const handleSubmit = useCallback(
    async (formData) => {
      await updateMedicalCategory(id, formData);
      triggerRefresh();
      navigate('/medical-categories');
    },
    [id, navigate, triggerRefresh]
  );

  // Loading State
  if (loadingCategory) {
    return (
      <Box>
        <ModernPageHeader
          title="تعديل تصنيف طبي"
          subtitle="تحديث بيانات التصنيف"
          icon={CategoryIcon}
          breadcrumbs={[{ label: 'التصنيفات الطبية', path: '/medical-categories' }, { label: 'تعديل' }]}
        />
        <MainCard>
          <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
        </MainCard>
      </Box>
    );
  }

  // Error State
  if (loadError || !categoryData) {
    return (
      <Box>
        <ModernPageHeader
          title="تعديل تصنيف طبي"
          subtitle="تحديث بيانات التصنيف"
          icon={CategoryIcon}
          breadcrumbs={[{ label: 'التصنيفات الطبية', path: '/medical-categories' }, { label: 'تعديل' }]}
        />
        <MainCard>
          <ModernEmptyState
            icon={ErrorOutlineIcon}
            title="خطأ في التحميل"
            description={loadError?.message || 'لم يتم العثور على التصنيف المطلوب'}
            action={
              <Button variant="outlined" onClick={handleBack} startIcon={<ArrowBackIcon />}>
                العودة للقائمة
              </Button>
            }
          />
        </MainCard>
      </Box>
    );
  }

  return (
    <Box>
      <ModernPageHeader
        title="تعديل تصنيف طبي"
        subtitle={`تحديث بيانات: ${categoryData.name}`}
        icon={CategoryIcon}
        breadcrumbs={[{ label: 'التصنيفات الطبية', path: '/medical-categories' }, { label: 'تعديل' }]}
        actions={
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack}>
            العودة للقائمة
          </Button>
        }
      />

      <MainCard>
        <MedicalCategoryForm
          initialValues={categoryData}
          isEditMode={true}
          onSubmit={handleSubmit}
          onCancel={handleBack}
        />
      </MainCard>
    </Box>
  );
};

export default MedicalCategoryEdit;
