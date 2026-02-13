import { Box, Typography, Button, Collapse, Stack } from '@mui/material';
import { useState } from 'react';
import { ContentCopy } from '@mui/icons-material';
import copy from 'copy-to-clipboard';

const JSONView = ({ data, title }) => {
    const [open, setOpen] = useState(false);

    if (!data) return null;

    const handleCopy = () => {
        copy(JSON.stringify(data, null, 2));
    };

    return (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1, mb: 1, bgcolor: '#f9f9f9', direction: 'ltr' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                    {title}
                </Typography>
                <Stack direction="row" spacing={1}>
                    <Button size="small" onClick={() => setOpen(!open)}>
                        {open ? 'إخفاء' : 'عرض JSON'}
                    </Button>
                    {open && (
                        <IconButton size="small" onClick={handleCopy}>
                            <ContentCopy sx={{ fontSize: 16 }} />
                        </IconButton>
                    )}
                </Stack>
            </Stack>
            <Collapse in={open}>
                <Box
                    component="pre"
                    sx={{
                        mt: 1,
                        p: 1.5,
                        bgcolor: '#1e1e1e',
                        color: '#d4d4d4',
                        borderRadius: 0.5,
                        fontSize: 12,
                        overflow: 'auto',
                        maxHeight: 300,
                        fontFamily: 'monospace'
                    }}
                >
                    {JSON.stringify(data, null, 2)}
                </Box>
            </Collapse>
        </Box>
    );
};

export default JSONView;
