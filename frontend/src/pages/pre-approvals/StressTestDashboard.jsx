import { useState, useMemo } from 'react';
import { Box, Button, Typography, Paper, Alert, Stack, CircularProgress } from '@mui/material';
import { DataGenerator } from 'infrastructure/mocks/DataGenerator';
import { FixedSizeList as List } from 'react-window';
import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import { Storage as StorageIcon, FlashOn as FlashIcon } from '@mui/icons-material';

const StressTestDashboard = () => {
    const [data, setData] = useState([]);
    const [generating, setGenerating] = useState(false);
    const [stats, setStats] = useState(null);

    const generateData = (count) => {
        setGenerating(true);
        const start = performance.now();

        // Generate in chunks to avoid UI freeze
        setTimeout(() => {
            const records = DataGenerator.generatePreApprovals(count);
            const end = performance.now();
            setData(records);
            setStats({
                count,
                time: ((end - start) / 1000).toFixed(2),
                memory: (JSON.stringify(records).length / 1024 / 1024).toFixed(2)
            });
            setGenerating(false);
        }, 100);
    };

    const Row = ({ index, style }) => {
        const item = data[index];
        return (
            <div style={{ ...style, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
                <Typography variant="body2" sx={{ width: 80 }}>#{index + 1}</Typography>
                <Typography variant="body2" sx={{ width: 150, fontWeight: 'bold' }}>{item.diagnosisCode}</Typography>
                <Typography variant="body2" sx={{ flex: 1 }}>{item.notes.substring(0, 50)}...</Typography>
                <Typography variant="body2" sx={{ width: 100, textAlign: 'right' }}>{item.totalAmount} د.ل</Typography>
            </div>
        );
    };

    return (
        <Box sx={{ p: 0 }}>
            <ModernPageHeader
                title="اختبار ضغط السجلات الضخمة (100k)"
                icon={<StorageIcon />}
                actions={
                    <Stack direction="row" spacing={2}>
                        <Button variant="outlined" onClick={() => generateData(10000)} disabled={generating}>10k سجل</Button>
                        <Button variant="contained" color="warning" startIcon={<FlashIcon />} onClick={() => generateData(100000)} disabled={generating}>100k سجل (ضغط عالي)</Button>
                    </Stack>
                }
            />

            <MainCard sx={{ height: 'calc(100vh - 230px)', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderBottom: '1px solid #ddd' }}>
                    {stats ? (
                        <Alert severity="success">
                            تم توليد <strong>{stats.count.toLocaleString()}</strong> سجل في <strong>{stats.time} ثانية</strong>. حجم البيانات التقريبي: <strong>{stats.memory} MB</strong>.
                        </Alert>
                    ) : (
                        <Typography variant="body2" color="text.secondary">اضغط على الأزرار أعلاه لبدء اختبار الأداء وتوليد البيانات الوهمية.</Typography>
                    )}
                </Box>

                <Box sx={{ flex: 1, minHeight: 0 }}>
                    {generating ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
                            <CircularProgress />
                            <Typography>جاري توليد البيانات ومعالجة الذاكرة...</Typography>
                        </Box>
                    ) : data.length > 0 ? (
                        <>
                            <Box sx={{ display: 'flex', bgcolor: 'primary.lighter', p: 1.5, fontWeight: 'bold', borderBottom: '2px solid' }}>
                                <Typography variant="subtitle2" sx={{ width: 80 }}>التسلسل</Typography>
                                <Typography variant="subtitle2" sx={{ width: 150 }}>الكود</Typography>
                                <Typography variant="subtitle2" sx={{ flex: 1 }}>الملاحظات / التفاصيل</Typography>
                                <Typography variant="subtitle2" sx={{ width: 100, textAlign: 'right' }}>القيمة</Typography>
                            </Box>
                            <List
                                height={500}
                                itemCount={data.length}
                                itemSize={50}
                                width="100%"
                            >
                                {Row}
                            </List>
                        </>
                    ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <Typography color="text.secondary">لا توجد بيانات حالياً. ابدأ الاختبار.</Typography>
                        </Box>
                    )}
                </Box>
            </MainCard>
        </Box>
    );
};

export default StressTestDashboard;
