import {
    Box,
    Paper,
    Typography,
    Badge,
    IconButton,
    CircularProgress
} from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { MemberAvatar } from '../../../components/tba';
import { MEMBERS_AR } from 'locales/ar/members.ar';
import { useImageCompression } from 'hooks/useImageCompression';

/**
 * PhotoUploadSection Component
 * مكون رفع وعرض الصورة الشخصية للمنتفع
 * 
 * @param {Object} props
 * @param {Object} props.member - بيانات المنتفع
 * @param {string} props.photoPreview - معاينة الصورة
 * @param {Function} props.onPhotoChange - دالة معالجة تغيير الصورة
 * @param {Function} props.setError - دالة تعيين الخطأ
 */
const PhotoUploadSection = ({ member, photoPreview, onPhotoChange, setError }) => {
    const { compressImage, validateImage, isCompressing } = useImageCompression();

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // التحقق من صحة الصورة
        const validation = validateImage(file);
        if (!validation.isValid) {
            setError('photo', validation.errors.join('. '));
            return;
        }

        try {
            // ضغط الصورة
            const compressedFile = await compressImage(file);

            // إنشاء معاينة
            const reader = new FileReader();
            reader.onloadend = () => {
                onPhotoChange(compressedFile, reader.result);
            };
            reader.readAsDataURL(compressedFile);
        } catch (error) {
            console.error('Error processing image:', error);
            setError('photo', MEMBERS_AR.errors.photoUploadFailed);
        }
    };

    return (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', height: '100%', bgcolor: 'grey.50', borderStyle: 'dashed' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Box sx={{ position: 'relative', mb: 2 }}>
                    <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={
                            <IconButton
                                color="primary"
                                aria-label="upload picture"
                                component="label"
                                disabled={isCompressing}
                                sx={{
                                    bgcolor: 'background.paper',
                                    boxShadow: 2,
                                    '&:hover': { bgcolor: 'background.paper' },
                                    width: 40,
                                    height: 40,
                                    border: '2px solid white'
                                }}
                            >
                                <input hidden accept="image/*" type="file" onChange={handleFileChange} />
                                {isCompressing ? (
                                    <CircularProgress size={20} />
                                ) : (
                                    <CloudUploadIcon sx={{ fontSize: 22 }} />
                                )}
                            </IconButton>
                        }
                    >
                        <MemberAvatar
                            member={{
                                fullName: member?.fullName || '',
                                photoUrl: photoPreview || member?.photoUrl
                            }}
                            size={140}
                            sx={{
                                fontSize: '3.5rem',
                                border: '4px solid',
                                borderColor: 'background.paper',
                                boxShadow: 3
                            }}
                        />
                    </Badge>
                </Box>

                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    {MEMBERS_AR.info.dragDropPhoto}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {MEMBERS_AR.info.supportedFormats}
                </Typography>
            </Box>
        </Paper>
    );
};

export default PhotoUploadSection;
