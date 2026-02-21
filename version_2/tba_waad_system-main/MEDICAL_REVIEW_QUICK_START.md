# 🚀 Quick Start: Medical Review UX System

## ⚡ 5-Minute Implementation Guide

### Step 1: Import (10 seconds)
```jsx
import {
  UnifiedAttachmentViewer,
  MedicalDecisionPanel,
  MedicalReviewLayout
} from 'components/medical-review';
```

### Step 2: Prepare Data (2 minutes)
```jsx
// Transform attachments to unified format
const attachments = rawAttachments.map(att => ({
  id: att.id,
  fileName: att.fileName,
  fileSize: att.fileSize,
  mimeType: att.contentType,
  url: `/api/files/${att.fileKey}/preview`,
  downloadUrl: `/api/files/${att.fileKey}/download`
}));
```

### Step 3: Build Center Panel (2 minutes)
```jsx
const centerPanel = (
  <Stack spacing={2}>
    <Card>
      <CardContent>
        <Typography variant="subtitle2">معلومات المريض</Typography>
        {/* Your patient data here */}
      </CardContent>
    </Card>
    
    <Card>
      <CardContent>
        <Typography variant="subtitle2">بيانات التأمين</Typography>
        {/* Your policy data here */}
      </CardContent>
    </Card>
    
    {/* Add more sections as needed */}
  </Stack>
);
```

### Step 4: Assemble Layout (30 seconds)
```jsx
return (
  <MedicalReviewLayout
    leftPanel={
      <UnifiedAttachmentViewer
        attachments={attachments}
        onDownload={handleDownload}
      />
    }
    centerPanel={centerPanel}
    rightPanel={
      <MedicalDecisionPanel
        status={claim.status}
        notes={medicalNotes}
        onNotesChange={setMedicalNotes}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestInfo={handleRequestInfo}
      />
    }
    documentsCount={attachments.length}
  />
);
```

### Step 5: Done! ✅

---

## 📋 Copy-Paste Template

```jsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Stack, Card, CardContent, Typography } from '@mui/material';
import {
  UnifiedAttachmentViewer,
  MedicalDecisionPanel,
  MedicalReviewLayout
} from 'components/medical-review';

const YourViewPage = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [medicalNotes, setMedicalNotes] = useState('');

  // Fetch data
  useEffect(() => {
    // Your fetch logic here
  }, [id]);

  // Decision handlers
  const handleApprove = async (notes) => {
    // Your approve logic
  };

  const handleReject = async (notes) => {
    // Your reject logic
  };

  const handleRequestInfo = async (notes) => {
    // Your request info logic
  };

  const handleDownload = (attachment) => {
    window.open(attachment.downloadUrl, '_blank');
  };

  // Center panel content
  const centerPanel = (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Typography variant="subtitle2">Section 1</Typography>
          {/* Your content */}
        </CardContent>
      </Card>
      
      {/* Add more sections */}
    </Stack>
  );

  return (
    <MedicalReviewLayout
      leftPanel={
        <UnifiedAttachmentViewer
          attachments={attachments}
          onDownload={handleDownload}
        />
      }
      centerPanel={centerPanel}
      rightPanel={
        <MedicalDecisionPanel
          status={data?.status}
          notes={medicalNotes}
          onNotesChange={setMedicalNotes}
          onApprove={handleApprove}
          onReject={handleReject}
          onRequestInfo={handleRequestInfo}
        />
      }
      documentsCount={attachments.length}
    />
  );
};

export default YourViewPage;
```

---

## 🎯 Common Patterns

### Pattern 1: Collapsible Sections
```jsx
const SectionCard = ({ title, children, defaultExpanded = true }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  return (
    <Card>
      <CardContent>
        <Stack
          direction="row"
          justifyContent="space-between"
          onClick={() => setExpanded(!expanded)}
          sx={{ cursor: 'pointer' }}
        >
          <Typography variant="subtitle2">{title}</Typography>
          <Chip label={expanded ? 'إخفاء' : 'عرض'} size="small" />
        </Stack>
        {expanded && children}
      </CardContent>
    </Card>
  );
};
```

### Pattern 2: Info Row
```jsx
const InfoRow = ({ label, value }) => (
  <Box sx={{ mb: 1.5 }}>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={500}>
      {value || '-'}
    </Typography>
  </Box>
);
```

### Pattern 3: Services Table
```jsx
<TableContainer>
  <Table size="small">
    <TableBody>
      {services.map((service, index) => (
        <TableRow key={index}>
          <TableCell>{service.name}</TableCell>
          <TableCell align="right">
            {service.quantity} × {formatCurrency(service.price)}
          </TableCell>
          <TableCell align="right">
            {formatCurrency(service.total)}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</TableContainer>
```

---

## 🔧 Troubleshooting

### Issue: Documents not showing
**Check**:
- Attachment format matches expected structure
- `url` and `downloadUrl` are valid
- MIME types are correct

### Issue: Decision buttons not working
**Check**:
- Handler functions are defined
- Status prop is correct
- Loading state managed properly

### Issue: Layout breaks on mobile
**Solution**: Layout automatically adapts! Just ensure content is responsive.

---

## 📚 Full Documentation
- **Complete Guide**: `MEDICAL_REVIEW_UX_SYSTEM_GUIDE.md`
- **Example Implementation**: `ClaimViewMedicalReview.jsx`
- **Components Folder**: `components/medical-review/`

---

**Ready to implement?** Start with the copy-paste template above! 🚀
