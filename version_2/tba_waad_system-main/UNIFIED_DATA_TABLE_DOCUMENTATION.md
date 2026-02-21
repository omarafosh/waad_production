# 📊 UNIFIED DATA TABLE SYSTEM - DOCUMENTATION

## 🎯 Overview

**UnifiedDataTable** is the **ONLY** table component used in the TBA WAAD Medical TPA system. It provides a consistent, professional, and enterprise-grade data presentation across the entire application.

## 🏗️ Architecture

### Design Principles
- ✅ **Single Source of Truth**: ONE component for ALL data lists
- ✅ **Soft Mint Green Header**: Professional medical color scheme (#e8f5e9)
- ✅ **Toolbar-based Operations**: Search, filters, and actions at the top (NO in-table inputs)
- ✅ **Desktop-first**: 100% width occupation for maximum data visibility
- ✅ **RTL Support**: Full Arabic language support with proper text direction
- ✅ **Epic/Cerner Standards**: Matches professional HIS/TPA visual identity

### Technology Stack
- **MUI X DataGrid** (v8.21.0) - Enterprise data grid component
- **Material-UI** - UI component library
- **React** - Frontend framework

## 🎨 Visual Identity

### Color Scheme
```javascript
{
  header: {
    background: '#e8f5e9',  // Soft mint green
    text: '#1b5e20',         // Dark green
    border: '#c8e6c9'        // Light green border
  },
  row: {
    hover: 'rgba(76, 175, 80, 0.08)',      // Light green hover
    selected: 'rgba(76, 175, 80, 0.12)'    // Selected row
  }
}
```

### Layout
```
┌─────────────────────────────────────────────────────────┐
│ TOOLBAR (Search, Filters, Actions, Export)             │
├─────────────────────────────────────────────────────────┤
│ HEADER (Soft Mint Green)                               │
├─────────────────────────────────────────────────────────┤
│ ROW 1                                                   │
│ ROW 2                                                   │
│ ...                                                     │
├─────────────────────────────────────────────────────────┤
│ FOOTER (Pagination, Row Count)                         │
└─────────────────────────────────────────────────────────┘
```

## 📦 Installation

The component is located in:
```
/src/components/common/UnifiedDataTable.jsx
```

Import it using:
```javascript
import { UnifiedDataTable } from 'components/common';
```

## 🔧 Usage

### Basic Example

```javascript
import { UnifiedDataTable } from 'components/common';

function MembersList() {
  const [members, setMembers] = useState([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Define columns in MUI DataGrid format
  const columns = [
    {
      field: 'id',
      headerName: 'الرقم',
      width: 80
    },
    {
      field: 'fullName',
      headerName: 'الاسم',
      flex: 1,
      minWidth: 200
    },
    {
      field: 'cardNumber',
      headerName: 'رقم البطاقة',
      width: 150,
      renderCell: (params) => (
        <Chip label={params.value} color="primary" size="small" />
      )
    },
    {
      field: 'status',
      headerName: 'الحالة',
      width: 120,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={params.value === 'ACTIVE' ? 'success' : 'default'}
          size="small"
        />
      )
    }
  ];

  return (
    <UnifiedDataTable
      columns={columns}
      rows={members}
      totalCount={totalCount}
      loading={false}
      paginationModel={{ page, pageSize }}
      onPaginationModelChange={(model) => {
        setPage(model.page);
        setPageSize(model.pageSize);
      }}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      onRefresh={fetchMembers}
      showRefreshButton={true}
    />
  );
}
```

### Advanced Example with Filters and Actions

```javascript
function MembersListAdvanced() {
  const [employerId, setEmployerId] = useState('');
  const [status, setStatus] = useState('');
  
  const filterComponents = (
    <>
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel>جهة العمل</InputLabel>
        <Select
          value={employerId}
          onChange={(e) => setEmployerId(e.target.value)}
          label="جهة العمل"
        >
          <MenuItem value="">الكل</MenuItem>
          <MenuItem value="1">شركة A</MenuItem>
          <MenuItem value="2">شركة B</MenuItem>
        </Select>
      </FormControl>
      
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>الحالة</InputLabel>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          label="الحالة"
        >
          <MenuItem value="">الكل</MenuItem>
          <MenuItem value="ACTIVE">نشط</MenuItem>
          <MenuItem value="SUSPENDED">معلق</MenuItem>
        </Select>
      </FormControl>
    </>
  );
  
  return (
    <UnifiedDataTable
      columns={columns}
      rows={members}
      totalCount={totalCount}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      filterComponents={filterComponents}
      onAdd={() => navigate('/members/add')}
      addButtonText="إضافة مستفيد"
      showAddButton={true}
      showRefreshButton={true}
      onRefresh={fetchMembers}
      onRowClick={(params) => navigate(`/members/${params.row.id}`)}
    />
  );
}
```

## 📖 API Reference

### Props

#### Data Props
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `columns` | `Array<Column>` | ✅ Yes | - | Column definitions (MUI DataGrid format) |
| `rows` | `Array<Object>` | ✅ Yes | `[]` | Data rows to display |
| `loading` | `Boolean` | No | `false` | Show loading skeleton |
| `totalCount` | `Number` | No | `rows.length` | Total count for pagination |
| `getRowId` | `Function` | No | `(row) => row.id` | Extract unique row ID |

#### Pagination Props
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `paginationModel` | `Object` | No | `{ page: 0, pageSize: 10 }` | Current page and page size |
| `onPaginationModelChange` | `Function` | No | - | Pagination change handler |
| `pageSizeOptions` | `Array<Number>` | No | `[8, 16, 24, 32, 50]` | Page size options |

#### Sorting Props
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `sortModel` | `Array` | No | `[]` | Current sort configuration |
| `onSortModelChange` | `Function` | No | - | Sort change handler |

#### Toolbar Props
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `searchTerm` | `String` | No | `''` | Global search term |
| `onSearchChange` | `Function` | No | - | Search change handler |
| `onRefresh` | `Function` | No | - | Refresh button handler |
| `showRefreshButton` | `Boolean` | No | `true` | Show refresh button |
| `onAdd` | `Function` | No | - | Add button handler |
| `addButtonText` | `String` | No | `'إضافة'` | Add button text |
| `showAddButton` | `Boolean` | No | `false` | Show add button |
| `customActions` | `ReactNode` | No | - | Custom action buttons |
| `filterComponents` | `ReactNode` | No | - | Custom filter components |

#### Interaction Props
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `onRowClick` | `Function` | No | - | Row click handler |
| `checkboxSelection` | `Boolean` | No | `false` | Enable row selection |
| `onRowSelectionModelChange` | `Function` | No | - | Selection change handler |
| `rowSelectionModel` | `Array` | No | `[]` | Selected row IDs |

#### Styling Props
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `height` | `String/Number` | No | `'calc(100vh - 280px)'` | Table height |
| `minHeight` | `Number` | No | `400` | Minimum height |
| `autoHeight` | `Boolean` | No | `false` | Auto-adjust height |
| `density` | `'compact'|'standard'|'comfortable'` | No | `'standard'` | Row density |

### Column Definition

```javascript
{
  field: 'id',                    // Data field name (required)
  headerName: 'الرقم',            // Column header text
  width: 100,                     // Fixed width (optional)
  flex: 1,                        // Flexible width (optional)
  minWidth: 80,                   // Minimum width
  sortable: true,                 // Enable sorting
  filterable: true,               // Enable filtering
  renderCell: (params) => {},     // Custom cell renderer
  valueGetter: (params) => {},    // Custom value getter
  align: 'left',                  // Cell alignment
  headerAlign: 'center'           // Header alignment
}
```

### Column renderCell Parameters

```javascript
renderCell: (params) => {
  // params.value - Cell value
  // params.row - Full row object
  // params.field - Column field name
  // params.id - Row ID
  return <CustomComponent />;
}
```

## 🎨 Styling

### Custom Chips in Cells

```javascript
{
  field: 'status',
  headerName: 'الحالة',
  width: 120,
  renderCell: (params) => {
    const statusColors = {
      ACTIVE: 'success',
      SUSPENDED: 'warning',
      TERMINATED: 'error'
    };
    
    return (
      <Chip
        label={params.value}
        color={statusColors[params.value]}
        size="small"
      />
    );
  }
}
```

### Icons in Cells

```javascript
{
  field: 'actions',
  headerName: 'إجراءات',
  width: 150,
  sortable: false,
  renderCell: (params) => (
    <Stack direction="row" spacing={0.5}>
      <IconButton 
        size="small" 
        onClick={() => handleView(params.row.id)}
      >
        <VisibilityIcon fontSize="small" />
      </IconButton>
      <IconButton 
        size="small" 
        onClick={() => handleEdit(params.row.id)}
      >
        <EditIcon fontSize="small" />
      </IconButton>
    </Stack>
  )
}
```

## 🚨 CRITICAL RULES

### ❌ NEVER DO THIS
```javascript
// ❌ Creating custom table in pages
<Table>
  <TableHead>...</TableHead>
</Table>

// ❌ Using other table libraries
import DataTable from 'react-data-table-component';

// ❌ In-table filter inputs
<TableCell>
  <TextField placeholder="Search..." />
</TableCell>

// ❌ Multiple table components
import { GenericTable } from 'old-components';
```

### ✅ ALWAYS DO THIS
```javascript
// ✅ Use UnifiedDataTable ONLY
import { UnifiedDataTable } from 'components/common';

// ✅ Filters in toolbar
<UnifiedDataTable
  filterComponents={<YourFilters />}
/>

// ✅ Consistent visual identity
// Component automatically applies soft mint green header
```

## 📝 Migration Guide

### From GenericDataTable (TanStack)

**Before:**
```javascript
const columns = [
  {
    id: 'avatar',
    header: 'الصورة',
    cell: ({ row }) => <Avatar src={row.original.avatar} />
  },
  {
    accessorKey: 'fullName',
    header: 'الاسم',
    cell: ({ getValue }) => getValue()
  }
];

<GenericDataTable
  columns={columns}
  data={members}
  tableState={tableState}
  onRowClick={(row) => navigate(`/members/${row.id}`)}
/>
```

**After:**
```javascript
const columns = [
  {
    field: 'avatar',
    headerName: 'الصورة',
    renderCell: (params) => <Avatar src={params.row.avatar} />
  },
  {
    field: 'fullName',
    headerName: 'الاسم'
  }
];

<UnifiedDataTable
  columns={columns}
  rows={members}
  paginationModel={{ page, pageSize }}
  onPaginationModelChange={(model) => {
    setPage(model.page);
    setPageSize(model.pageSize);
  }}
  onRowClick={(params) => navigate(`/members/${params.row.id}`)}
/>
```

### From MUI Table

**Before:**
```javascript
<TableContainer>
  <Table>
    <TableHead>
      <TableRow>
        <TableCell>الاسم</TableCell>
        <TableCell>الحالة</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {rows.map((row) => (
        <TableRow key={row.id}>
          <TableCell>{row.name}</TableCell>
          <TableCell>{row.status}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</TableContainer>
<TablePagination ... />
```

**After:**
```javascript
const columns = [
  { field: 'name', headerName: 'الاسم', flex: 1 },
  { field: 'status', headerName: 'الحالة', width: 120 }
];

<UnifiedDataTable
  columns={columns}
  rows={rows}
  paginationModel={{ page, pageSize }}
  onPaginationModelChange={(model) => {
    setPage(model.page);
    setPageSize(model.pageSize);
  }}
/>
```

## 🎯 Best Practices

### 1. Column Widths
```javascript
// ✅ Use flex for responsive columns
{ field: 'description', headerName: 'الوصف', flex: 1 }

// ✅ Fixed width for small columns
{ field: 'id', headerName: 'ID', width: 80 }

// ✅ Minimum width for flexible columns
{ field: 'name', headerName: 'الاسم', flex: 1, minWidth: 150 }
```

### 2. Action Columns
```javascript
{
  field: 'actions',
  headerName: 'إجراءات',
  width: 150,
  sortable: false,
  filterable: false,
  renderCell: (params) => (
    <Stack direction="row" spacing={0.5}>
      {/* Stop propagation to prevent row click */}
      <IconButton 
        onClick={(e) => {
          e.stopPropagation();
          handleEdit(params.row.id);
        }}
      >
        <EditIcon fontSize="small" />
      </IconButton>
    </Stack>
  )
}
```

### 3. Server-side Operations
```javascript
<UnifiedDataTable
  // Always set paginationMode and sortingMode to "server"
  paginationMode="server"
  sortingMode="server"
  rowCount={totalCount}  // Total from backend
  onPaginationModelChange={handlePageChange}
  onSortModelChange={handleSortChange}
/>
```

### 4. Custom Cell Formatting
```javascript
{
  field: 'createdAt',
  headerName: 'تاريخ الإنشاء',
  width: 150,
  renderCell: (params) => {
    const date = new Date(params.value);
    return date.toLocaleDateString('ar-SA');
  }
}
```

## 📦 Components Location

```
/src/components/common/
├── UnifiedDataTable.jsx    # Main component
└── index.js                # Exports
```

## 🔗 Related Components

- **ModernPageHeader**: Page title and breadcrumbs
- **MainCard**: Content container
- **MemberAvatar**: Avatar component for members

## 📚 Additional Resources

- [MUI DataGrid Documentation](https://mui.com/x/react-data-grid/)
- [Material-UI Components](https://mui.com/material-ui/)

## 🆘 Support

For issues or questions:
1. Check this documentation first
2. Review migrated examples (e.g., UnifiedMembersList)
3. Contact TBA WAAD development team

---

**Version**: 1.0.0  
**Last Updated**: 2026-02-08  
**Author**: TBA WAAD Development Team
