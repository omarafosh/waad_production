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
                    <Box
                        key={category.id}
                        onDragOver={handleDragOver}
                        onDragEnter={() => handleDragEnter(category.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleInternalDrop(e, category)}
                        sx={{
                            mb: 1,
                            borderRadius: 1,
                            border: isOver ? `2px dashed ${primaryTeal}` : '1px solid transparent',
                            bgcolor: isOver ? 'rgba(0, 128, 128, 0.08)' : 'transparent',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <ListItemButton
                            onClick={() => handleToggle(category.id)}
                            sx={{
                                borderRadius: 1,
                                bgcolor: selectedId === category.id ? 'rgba(0, 128, 128, 0.04)' : 'transparent',
                                '&:hover': { bgcolor: 'rgba(0, 128, 128, 0.08)' }
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

                        <Collapse in={openNodes[category.id] || isOver} timeout="auto" unmountOnExit>
                            <Box sx={{ pl: 4, py: 1, borderLeft: '1px dashed', borderColor: 'divider', ml: 2 }}>
                                {isOver && (
                                    <Typography variant="caption" color={primaryTeal} sx={{ mb: 1, display: 'block', fontWeight: 600 }}>
                                        أفلت هنا للربط بهذا التصنيف 🎯
                                    </Typography>
                                )}

                                <ListItemButton
                                    onClick={() => onSelect?.(category)}
                                    sx={{
                                        borderRadius: 1,
                                        mt: 0.5,
                                        bgcolor: selectedId === category.id ? 'rgba(0, 128, 128, 0.1)' : 'transparent'
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
                    </Box>
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
