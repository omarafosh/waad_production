import React, { useState } from 'react';
import {
    Box,
    Typography,
    Collapse,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    ChevronLeft as ChevronLeftIcon,
    Inventory as CategoryIcon,
    CheckCircle as CheckIcon,
    Label as ServiceIcon
} from '@mui/icons-material';

const DictionaryTree = ({ searchTerm, categories, onSelect, selectedId, onDrop }) => {
    const [openNodes, setOpenNodes] = useState({});
    const [dragOverNode, setDragOverNode] = useState(null);

    const handleToggle = (id) => {
        setOpenNodes((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    // Filter categories based on search term
    const filteredCategories = React.useMemo(() => {
        if (!searchTerm) return categories;
        const lowerTerm = searchTerm.toLowerCase();
        return categories.filter(cat =>
            cat.name.toLowerCase().includes(lowerTerm) ||
            cat.description?.toLowerCase().includes(lowerTerm)
        );
    }, [categories, searchTerm]);

    // --- DnD Drop Handlers ---
    const handleDragOver = (e) => {
        e.preventDefault(); // Required to allow drop
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDragEnter = (id) => {
        setDragOverNode(id);
    };

    const handleDragLeave = () => {
        setDragOverNode(null);
    };

    const handleInternalDrop = (e, targetCategory) => {
        e.preventDefault();
        setDragOverNode(null);
        const serviceId = e.dataTransfer.getData('serviceId');
        if (serviceId) {
            onDrop?.(targetCategory);
        }
    };

    // Brand Color
    const primaryTeal = '#008080';

    return (
        <List
            sx={{ width: '100%', bgcolor: 'background.paper' }}
            component="nav"
            dense
        >
            {filteredCategories.map((category) => {
                const isOver = dragOverNode === category.id;

                return (
                    <React.Fragment key={category.id}>
                        <ListItemButton
                            onClick={() => handleToggle(category.id)}
                            onDragOver={handleDragOver}
                            onDragEnter={() => handleDragEnter(category.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleInternalDrop(e, category)}
                            sx={{
                                borderRadius: 2,
                                mb: 0.5,
                                border: isOver ? `2px dashed ${primaryTeal}` : '2px solid transparent',
                                bgcolor: isOver ? '#E0F2F1' : selectedId === category.id ? '#F0FDF4' : 'transparent',
                                transition: 'all 0.2s',
                                '&:hover': { bgcolor: '#F1F5F9' }
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 32 }}>
                                <CategoryIcon fontSize="small" sx={{ color: isOver ? primaryTeal : 'text.secondary' }} />
                            </ListItemIcon>
                            <ListItemText
                                primary={
                                    <Typography variant="body2" fontWeight={selectedId === category.id || isOver ? 700 : 500}>
                                        {category.name}
                                    </Typography>
                                }
                                secondary={category.code && <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>{category.code}</Typography>}
                            />
                            {openNodes[category.id] ? <ExpandMoreIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
                        </ListItemButton>

                        <Collapse in={openNodes[category.id]} timeout="auto" unmountOnExit>
                            <Box sx={{ pl: 4, py: 1, borderLeft: '1px dashed', borderColor: 'divider', ml: 2 }}>
                                <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
                                    قم بإسقاط الخدمة هنا للربط بهذا التصنيف...
                                </Typography>

                                <ListItemButton
                                    onClick={() => onSelect?.(category)}
                                    sx={{
                                        borderRadius: 1,
                                        mt: 0.5,
                                        bgcolor: selectedId === category.id ? '#E0F2F1' : 'transparent'
                                    }}
                                >
                                    <ListItemIcon sx={{ minWidth: 32 }}>
                                        <ServiceIcon fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText primary={<Typography variant="caption" fontWeight={600}>تأكيد الربط</Typography>} />
                                    {selectedId === category.id && <CheckIcon fontSize="small" sx={{ color: primaryTeal }} />}
                                </ListItemButton>
                            </Box>
                        </Collapse>
                    </React.Fragment>
                );
            })}

            {filteredCategories.length === 0 && (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="textSecondary">لا توجد نتائج مطابقة</Typography>
                </Box>
            )}
        </List>
    );
};

export default DictionaryTree;
