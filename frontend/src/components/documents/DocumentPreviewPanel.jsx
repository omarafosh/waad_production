
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    IconButton,
    CircularProgress
} from '@mui/material';
import { Close as CloseIcon, Download as DownloadIcon } from '@mui/icons-material';

const DocumentPreviewPanel = ({ open, onClose, document, onDownload }) => {
    const [loading, setLoading] = useState(true);
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        if (open && document) {
            // If document has a direct url, use it.
            // Otherwise we might need to rely on onDownload to get a blob URL.
            // For now, let's assume the parent might pass a url or we just show metadata.
            // If onDownload is passed and returns a URL/Blob, we use it.
            setLoading(false);
        }
    }, [open, document]);

    const handleDownload = () => {
        if (onDownload && document) {
            onDownload(document);
        }
    };

    if (!document) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">{document.name || 'مستند'}</Typography>
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{
                        color: (theme) => theme.palette.grey[500],
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{ minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                        معاينة {document.type || 'الملف'}
                    </Typography>
                    {/* Placeholder for actual preview logic */}
                    <Typography variant="caption" color="text.secondary">
                        {document.fileKey}
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleDownload} startIcon={<DownloadIcon />}>
                    تحميل
                </Button>
                <Button onClick={onClose}>إغلاق</Button>
            </DialogActions>
        </Dialog>
    );
};

export default DocumentPreviewPanel;
