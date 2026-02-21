# 🚀 UNIFIED DATA TABLE - QUICK START

## Installation
```javascript
import { UnifiedDataTable } from 'components/common';
```

## Minimum Example
```javascript
const columns = [
  { field: 'id', headerName: 'ID', width: 80 },
  { field: 'name', headerName: 'الاسم', flex: 1 }
];

<UnifiedDataTable
  columns={columns}
  rows={data}
  totalCount={100}
  paginationModel={{ page: 0, pageSize: 10 }}
  onPaginationModelChange={(model) => {
    setPage(model.page);
    setPageSize(model.pageSize);
  }}
/>
```

## Column Format (MUI DataGrid)
```javascript
{
  field: 'columnName',           // Field name in data
  headerName: 'العنوان',         // Display name
  width: 150,                    // Fixed width (OR use flex)
  flex: 1,                       // Flexible width
  sortable: true,                // Can sort
  renderCell: (params) => {}     // Custom renderer
}
```

## Common Patterns

### With Search
```javascript
<UnifiedDataTable
  searchTerm={searchTerm}
  onSearchChange={setSearchTerm}
  {...otherProps}
/>
```

### With Filters
```javascript
<UnifiedDataTable
  filterComponents={
    <>
      <FormControl size="small">
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="active">Active</MenuItem>
        </Select>
      </FormControl>
    </>
  }
  {...otherProps}
/>
```

### With Actions
```javascript
{
  field: 'actions',
  headerName: 'Actions',
  width: 120,
  sortable: false,
  renderCell: (params) => (
    <IconButton onClick={(e) => {
      e.stopPropagation();
      handleEdit(params.row.id);
    }}>
      <EditIcon />
    </IconButton>
  )
}
```

## CRITICAL RULES
1. ❌ NO custom tables in pages
2. ❌ NO filter inputs INSIDE table
3. ✅ Use ONLY UnifiedDataTable
4. ✅ Filters in `filterComponents` prop
5. ✅ Actions in column `renderCell`

## Full Documentation
See: `/UNIFIED_DATA_TABLE_DOCUMENTATION.md`
