/**
 * Medical Catalog Page — Unified hierarchical view of medical categories and services.
 *
 * Features:
 *  - Category accordion tree (expand / collapse)
 *  - Debounced search (code, name_ar, name_en, aliases)
 *  - Toggle: Show Master Only
 *  - Expand All / Collapse All
 *  - isMaster badge + Active/Inactive chip per service
 *
 * RTL Arabic-first layout.
 * Access: SUPER_ADMIN, DATA_ENTRY.
 */
import { useState, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Badge,
  Box,
  Button,
  ButtonGroup,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import FilterListIcon from '@mui/icons-material/FilterList';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import ClearIcon from '@mui/icons-material/Clear';

import { getCatalogTree, searchCatalog, getSpecialties } from 'services/medical/medicalCatalog.service';

// ─── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce(fn, delay = 350) {
  const timer = useRef(null);
  return useCallback(
    (...args) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fn(...args), delay);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fn, delay]
  );
}

// ─── Status chip ──────────────────────────────────────────────────────────────
function StatusChip({ active }) {
  return (
    <Chip
      label={active ? 'نشط' : 'غير نشط'}
      size="small"
      color={active ? 'success' : 'default'}
      variant="outlined"
      sx={{ fontSize: '0.7rem', height: 20 }}
    />
  );
}

// ─── Master badge ─────────────────────────────────────────────────────────────
function MasterBadge() {
  return (
    <Tooltip title="خدمة رئيسية (Master)">
      <StarIcon sx={{ fontSize: 14, color: 'warning.main', ml: 0.5, verticalAlign: 'middle' }} />
    </Tooltip>
  );
}

// ─── Service row ──────────────────────────────────────────────────────────────
function ServiceRow({ service }) {
  const label = service.nameAr || service.nameEn || service.code;
  return (
    <ListItem
      disableGutters
      divider
      sx={{ py: 0.5, px: 1.5, '&:last-child': { borderBottom: 0 } }}
    >
      <ListItemText
        primary={
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 80, color: 'text.secondary', fontSize: '0.75rem' }}>
              {service.code}
            </Typography>
            <Typography variant="body2" sx={{ flex: 1 }}>
              {label}
              {service.isMaster && <MasterBadge />}
            </Typography>
            <StatusChip active={service.active} />
          </Stack>
        }
        secondary={
          service.nameEn || service.specialtyNameAr ? (
            <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'inherit' }}>
              {service.nameEn ?? ''}
              {service.specialtyNameAr ? `  •  ${service.specialtyNameAr}` : ''}
            </Typography>
          ) : null
        }
      />
    </ListItem>
  );
}

// ─── Category accordion ───────────────────────────────────────────────────────
function CategoryAccordion({ category, expanded, onToggle }) {
  const label = category.nameAr || category.nameEn || category.code;
  const count = category.services?.length ?? 0;

  return (
    <Accordion
      expanded={expanded}
      onChange={onToggle}
      disableGutters
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '8px !important',
        mb: 1,
        '&:before': { display: 'none' }
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          bgcolor: 'grey.50',
          borderRadius: expanded ? '8px 8px 0 0' : '8px',
          minHeight: 48
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1, pr: 1 }}>
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', fontFamily: 'monospace', minWidth: 80 }}>
            {category.code}
          </Typography>
          <Typography variant="subtitle2" sx={{ flex: 1 }}>
            {label}
          </Typography>
          <Chip
            size="small"
            label={count}
            color="primary"
            variant="filled"
            sx={{ height: 20, fontSize: '0.7rem', borderRadius: 2, fontWeight: 700 }}
          />
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0 }}>
        {count > 0 ? (
          <List dense disablePadding>
            {category.services.map((svc) => (
              <ServiceRow key={svc.id} service={svc} />
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            لا توجد خدمات مرتبطة
          </Typography>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

// ─── Search result row ────────────────────────────────────────────────────────
function SearchResultRow({ item }) {
  const label = item.nameAr || item.nameEn || item.code;
  return (
    <ListItem
      disableGutters
      divider
      sx={{ py: 0.75, px: 1.5, '&:last-child': { borderBottom: 0 } }}
    >
      <ListItemText
        primary={
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 80, color: 'text.secondary', fontSize: '0.75rem' }}>
              {item.code}
            </Typography>
            <Typography variant="body2" sx={{ flex: 1 }}>
              {label}
              {item.isMaster && <MasterBadge />}
            </Typography>
            <StatusChip active={item.active} />
          </Stack>
        }
        secondary={
          item.categoryNameAr || item.specialtyNameAr ? (
            <Typography variant="caption" color="text.disabled">
              {item.categoryCode ? `${item.categoryCode} — ${item.categoryNameAr}` : ''}
              {item.specialtyNameAr ? `  •  ${item.specialtyNameAr}` : ''}
            </Typography>
          ) : null
        }
      />
    </ListItem>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MedicalCatalogPage() {
  // Search state
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Filters
  const [masterOnly, setMasterOnly] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState(''); // specialty code or '' = all

  // Accordion expansion set
  const [expandedIds, setExpandedIds] = useState(new Set());

  // ── Data queries ─────────────────────────────────────────────────────────
  const { data: tree = [], isLoading: treeLoading, error: treeError } = useQuery({
    queryKey: ['medical-catalog-tree'],
    queryFn: getCatalogTree,
    staleTime: 5 * 60 * 1000 // 5 min
  });

  const { data: specialties = [] } = useQuery({
    queryKey: ['medical-specialties'],
    queryFn: getSpecialties,
    staleTime: 10 * 60 * 1000 // 10 min — specialties change infrequently
  });

  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ['medical-catalog-search', searchQuery],
    queryFn: () => searchCatalog(searchQuery),
    enabled: searchQuery.trim().length > 0,
    staleTime: 60 * 1000 // 1 min
  });

  // ── Debounced search ──────────────────────────────────────────────────────
  const fireSearch = useCallback((val) => setSearchQuery(val), []);
  const debouncedSearch = useDebounce(fireSearch, 350);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    debouncedSearch(val);
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  // ── Tree filtering ────────────────────────────────────────────────────────
  const filteredTree = tree
    .map((cat) => ({
      ...cat,
      services: (cat.services ?? []).filter((s) => {
        if (masterOnly && !s.isMaster) return false;
        if (selectedSpecialty && s.specialtyCode !== selectedSpecialty) return false;
        return true;
      })
    }))
    .filter((cat) => cat.services.length > 0);

  // ── Expand / Collapse All ─────────────────────────────────────────────────
  const allIds = filteredTree.map((c) => c.categoryId);

  const expandAll = () => setExpandedIds(new Set(allIds));
  const collapseAll = () => setExpandedIds(new Set());

  const toggleCategory = (id) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalCategories = filteredTree.length;
  const totalServices = filteredTree.reduce((acc, c) => acc + (c.services?.length ?? 0), 0);

  const isSearchMode = searchQuery.trim().length > 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box dir="rtl" sx={{ p: { xs: 1, md: 2 }, maxWidth: 960, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            الكتالوج الطبي الموحد
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Unified Medical Catalog
          </Typography>
        </Box>

        {!isSearchMode && !treeLoading && (
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              size="small"
              label={`${totalCategories} تصنيف`}
              color="primary"
              variant="outlined"
            />
            <Chip
              size="small"
              label={`${totalServices} خدمة`}
              color="secondary"
              variant="outlined"
            />
          </Stack>
        )}
      </Stack>

      {/* Search + Toolbar */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2.5} alignItems="flex-start">
        {/* Search box */}
        <TextField
          size="small"
          placeholder="ابحث برمز الخدمة، الاسم، أو الاسم البديل..."
          value={searchInput}
          onChange={handleSearchChange}
          sx={{ flex: 1, minWidth: 220 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {searchLoading ? <CircularProgress size={16} /> : <SearchIcon fontSize="small" />}
              </InputAdornment>
            ),
            endAdornment: searchInput ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={clearSearch}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null
          }}
        />

        {/* Action buttons — only in tree mode */}
        {!isSearchMode && (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {/* Specialty filter */}
            {specialties.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel id="specialty-filter-label">تخصص</InputLabel>
                <Select
                  labelId="specialty-filter-label"
                  value={selectedSpecialty}
                  label="تخصص"
                  onChange={(e) => {
                    setSelectedSpecialty(e.target.value);
                    setExpandedIds(new Set());
                  }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {specialties.map((sp) => (
                    <MenuItem key={sp.code} value={sp.code}>
                      {sp.nameAr}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Button
              size="small"
              variant={masterOnly ? 'contained' : 'outlined'}
              color="warning"
              startIcon={<FilterListIcon />}
              onClick={() => setMasterOnly((v) => !v)}
            >
              {masterOnly ? 'الكل' : 'الرئيسية فقط'}
            </Button>

            <ButtonGroup size="small" variant="outlined">
              <Button startIcon={<UnfoldMoreIcon />} onClick={expandAll}>
                توسيع الكل
              </Button>
              <Button startIcon={<UnfoldLessIcon />} onClick={collapseAll}>
                طي الكل
              </Button>
            </ButtonGroup>
          </Stack>
        )}
      </Stack>

      {/* Error */}
      {treeError && !isSearchMode && (
        <Alert severity="error" sx={{ mb: 2 }}>
          تعذّر تحميل الكتالوج. يرجى المحاولة لاحقاً.
        </Alert>
      )}

      {/* Search mode */}
      {isSearchMode && (
        <Box>
          {searchLoading ? (
            <Stack alignItems="center" py={4}>
              <CircularProgress size={28} />
            </Stack>
          ) : searchResults.length === 0 ? (
            <Alert severity="info">لا توجد نتائج مطابقة للبحث "{searchQuery}"</Alert>
          ) : (
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                overflow: 'hidden'
              }}
            >
              <Box sx={{ px: 1.5, py: 1, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary">
                  {searchResults.length} نتيجة{searchResults.length === 50 ? ' (الحد الأقصى)' : ''}
                </Typography>
              </Box>
              <List dense disablePadding>
                {searchResults.map((item) => (
                  <SearchResultRow key={item.id} item={item} />
                ))}
              </List>
            </Box>
          )}
        </Box>
      )}

      {/* Tree mode */}
      {!isSearchMode && (
        <>
          {treeLoading ? (
            <Stack spacing={1}>
              {[...Array(5)].map((_, i) => (
                <Box
                  key={i}
                  sx={{ height: 48, bgcolor: 'grey.100', borderRadius: 2, animation: 'pulse 1.5s infinite' }}
                />
              ))}
            </Stack>
          ) : filteredTree.length === 0 ? (
            <Alert severity="info">
              {masterOnly ? 'لا توجد خدمات رئيسية مصنّفة حالياً.' : 'الكتالوج فارغ. ستظهر التصنيفات والخدمات بعد إدخال البيانات.'}
            </Alert>
          ) : (
            <Box>
              {filteredTree.map((category) => (
                <CategoryAccordion
                  key={category.categoryId}
                  category={category}
                  expanded={expandedIds.has(category.categoryId)}
                  onToggle={() => toggleCategory(category.categoryId)}
                />
              ))}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
