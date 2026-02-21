# Backend Integration Requirements for Provider Management

## Status Check - Current vs Required

### ✅ Already Implemented (No Action Needed)

1. **getAllowedEmployerIds** - EXISTS in ProviderService
   - Location: `backend/src/main/java/com/waad/tba/modules/provider/service/ProviderService.java:181`
   - Method: `public List<Long> getAllowedEmployerIds(Long providerId)`
   - ⚠️ **MISSING CONTROLLER ENDPOINT** - Service exists but no REST endpoint for Admin panel

2. **Provider Documents** - EXISTS in ProviderDocumentController
   - Location: `backend/src/main/java/com/waad/tba/modules/provider/controller/ProviderDocumentController.java`
   - Endpoints:
     - `GET /api/v1/provider/documents` (for Provider Portal)
     - `GET /api/v1/provider/documents/stats`
   - ⚠️ **PORTAL-ONLY** - These endpoints are designed for Provider Portal (uses JWT providerId), not Admin panel

---

## ❌ Missing Backend Endpoints (ACTION REQUIRED)

### 1. User Management Endpoints

#### A. Get Unassigned Providers
**Frontend Expectation:**
```javascript
// usersService.js
getUnassignedProviders: async () => {
  const response = await axiosServices.get('/api/v1/admin/users/unassigned-providers');
  return response?.data?.data || response?.data || [];
}
```

**Required Backend Implementation:**
```java
// UserController.java
@GetMapping("/unassigned-providers")
@Operation(summary = "Get users without provider assignment")
@PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('INSURANCE_ADMIN')")
public ResponseEntity<ApiResponse<List<UserResponseDto>>> getUnassignedProviders() {
    List<UserResponseDto> users = userService.findUnassignedProviders();
    return ResponseEntity.ok(ApiResponse.success(users));
}
```

**Required Service Method:**
```java
// UserService.java
public List<UserResponseDto> findUnassignedProviders() {
    List<User> users = userRepository.findByProviderIdIsNull();
    return users.stream()
        .map(userMapper::toResponse)
        .collect(Collectors.toList());
}
```

**Required Repository Method:**
```java
// UserRepository.java
List<User> findByProviderIdIsNull();
```

---

#### B. Get Users by Provider ID
**Frontend Expectation:**
```javascript
// usersService.js
getUsersByProvider: async (providerId) => {
  const response = await axiosServices.get(`/api/v1/admin/users/provider/${providerId}`);
  return response?.data?.data || response?.data || [];
}
```

**Required Backend Implementation:**
```java
// UserController.java
@GetMapping("/provider/{providerId}")
@Operation(summary = "Get users assigned to a provider")
@PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('INSURANCE_ADMIN')")
public ResponseEntity<ApiResponse<List<UserResponseDto>>> getUsersByProvider(
        @PathVariable Long providerId) {
    List<UserResponseDto> users = userService.findByProviderId(providerId);
    return ResponseEntity.ok(ApiResponse.success(users));
}
```

**Required Service Method:**
```java
// UserService.java
public List<UserResponseDto> findByProviderId(Long providerId) {
    List<User> users = userRepository.findByProviderId(providerId);
    return users.stream()
        .map(userMapper::toResponse)
        .collect(Collectors.toList());
}
```

**Required Repository Method:**
```java
// UserRepository.java
List<User> findByProviderId(Long providerId);
```

---

### 2. Provider Partner Management Endpoints

#### Get Allowed Employers (Admin Endpoint)
**Frontend Expectation:**
```javascript
// providersService.js
getAllowedEmployerIds: async (id) => {
  const response = await axiosClient.get(`/api/providers/${id}/allowed-employers`);
  return unwrap(response);
}
```

**Current Status:**
- Service method EXISTS: `ProviderService.getAllowedEmployerIds()`
- Endpoint MISSING in ProviderController

**Required Backend Implementation:**
```java
// ProviderController.java
@GetMapping("/{id}/allowed-employers")
@PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('INSURANCE_ADMIN')")
public ResponseEntity<ApiResponse<List<Long>>> getAllowedEmployers(
        @PathVariable Long id) {
    List<Long> employerIds = providerService.getAllowedEmployerIds(id);
    return ResponseEntity.ok(ApiResponse.success("Allowed employers retrieved", employerIds));
}
```

---

### 3. Provider Document Management Endpoints (Admin Panel)

#### A. Get Documents by Provider ID
**Frontend Expectation:**
```javascript
// providersService.js
getDocuments: async (id) => {
  const response = await axiosClient.get(`/api/providers/${id}/documents`);
  return unwrap(response);
}
```

**Current Status:**
- Similar endpoint EXISTS in `ProviderDocumentController` but designed for Provider Portal
- Admin panel needs **provider ID parameter** instead of JWT-based context

**Required Backend Implementation:**
```java
// ProviderController.java or NEW ProviderDocumentAdminController.java
@GetMapping("/{id}/documents")
@PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('INSURANCE_ADMIN')")
public ResponseEntity<ApiResponse<List<ProviderDocumentDto>>> getProviderDocuments(
        @PathVariable Long id,
        @RequestParam(required = false) String type,
        @RequestParam(required = false) String status) {
    List<ProviderDocumentDto> documents = providerDocumentService.getDocumentsByProviderId(id, type, status);
    return ResponseEntity.ok(ApiResponse.success("Documents retrieved", documents));
}
```

---

#### B. Add Document for Provider
**Frontend Expectation:**
```javascript
// providersService.js
addDocument: async (id, formData) => {
  const response = await axiosClient.post(`/api/providers/${id}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return unwrap(response);
}
```

**FormData Structure:**
```javascript
const dto = {
  providerId: id,
  type: 'LICENSE', // LICENSE | COMMERCIAL_REGISTER | TAX_CERTIFICATE | CONTRACT_COPY | OTHER
  fileName: 'license.pdf',
  expiryDate: '2025-12-31',
  notes: 'Optional notes',
  documentNumber: 'DOC-123456'
};
formData.append('data', new Blob([JSON.stringify(dto)], { type: 'application/json' }));
formData.append('file', actualFile); // File object from input
```

**Required Backend Implementation:**
```java
// ProviderController.java
@PostMapping("/{id}/documents")
@PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('INSURANCE_ADMIN')")
public ResponseEntity<ApiResponse<ProviderDocumentDto>> addProviderDocument(
        @PathVariable Long id,
        @RequestPart("data") ProviderDocumentCreateDto dto,
        @RequestPart(value = "file", required = false) MultipartFile file) {
    
    ProviderDocumentDto createdDocument = providerDocumentService.createProviderDocument(id, dto, file);
    return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Document added successfully", createdDocument));
}
```

**Required DTO:**
```java
@Data
public class ProviderDocumentCreateDto {
    @NotNull
    private Long providerId;
    
    @NotBlank
    private String type; // LICENSE, COMMERCIAL_REGISTER, TAX_CERTIFICATE, CONTRACT_COPY, OTHER
    
    @NotBlank
    private String fileName;
    
    private LocalDate expiryDate;
    
    private String notes;
    
    private String documentNumber;
}
```

**Required Service Method:**
```java
// ProviderDocumentService.java
public ProviderDocumentDto createProviderDocument(
        Long providerId, 
        ProviderDocumentCreateDto dto, 
        MultipartFile file) {
    
    // Validate provider exists
    Provider provider = providerRepository.findById(providerId)
        .orElseThrow(() -> new ResourceNotFoundException("Provider not found"));
    
    // Upload file if provided
    String fileUrl = null;
    if (file != null && !file.isEmpty()) {
        fileUrl = fileStorageService.storeFile(file, "provider-documents");
    }
    
    // Create document entity (depends on your existing structure)
    ProviderDocument document = new ProviderDocument();
    document.setProviderId(providerId);
    document.setType(dto.getType());
    document.setFileName(dto.getFileName());
    document.setFileUrl(fileUrl);
    document.setExpiryDate(dto.getExpiryDate());
    document.setNotes(dto.getNotes());
    document.setDocumentNumber(dto.getDocumentNumber());
    document.setUploadedAt(LocalDateTime.now());
    
    ProviderDocument saved = providerDocumentRepository.save(document);
    return mapToDto(saved);
}
```

---

#### C. Delete Document
**Frontend Expectation:**
```javascript
// providersService.js
deleteDocument: async (providerId, docId) => {
  const response = await axiosClient.delete(`/api/providers/${providerId}/documents/${docId}`);
  return unwrap(response);
}
```

**Required Backend Implementation:**
```java
// ProviderController.java
@DeleteMapping("/{providerId}/documents/{docId}")
@PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('INSURANCE_ADMIN')")
public ResponseEntity<ApiResponse<Void>> deleteProviderDocument(
        @PathVariable Long providerId,
        @PathVariable Long docId) {
    
    providerDocumentService.deleteProviderDocument(providerId, docId);
    return ResponseEntity.ok(ApiResponse.success("Document deleted successfully", null));
}
```

**Required Service Method:**
```java
// ProviderDocumentService.java
public void deleteProviderDocument(Long providerId, Long docId) {
    ProviderDocument document = providerDocumentRepository.findById(docId)
        .orElseThrow(() -> new ResourceNotFoundException("Document not found"));
    
    // Security check: ensure document belongs to provider
    if (!document.getProviderId().equals(providerId)) {
        throw new UnauthorizedException("Document does not belong to this provider");
    }
    
    // Delete file from storage
    if (document.getFileUrl() != null) {
        fileStorageService.deleteFile(document.getFileUrl());
    }
    
    providerDocumentRepository.delete(document);
}
```

---

## Implementation Priority

### Critical (Must Implement)
1. **UserController.getUnassignedProviders()** - Required for ProviderCreate/Edit user management
2. **UserController.getUsersByProvider()** - Required for ProviderEdit to display linked user
3. **ProviderController.getAllowedEmployers()** - Required for Partners tab

### High Priority
4. **ProviderController.getProviderDocuments()** - Required for Documents tab display
5. **ProviderController.addProviderDocument()** - Required for Documents tab upload
6. **ProviderController.deleteProviderDocument()** - Required for Documents tab delete

---

## Testing Commands

After implementation, test with:

```bash
# 1. Get unassigned users
curl -X GET http://localhost:8080/api/v1/admin/users/unassigned-providers \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Get users by provider
curl -X GET http://localhost:8080/api/v1/admin/users/provider/1 \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Get allowed employers
curl -X GET http://localhost:8080/api/providers/1/allowed-employers \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Get provider documents
curl -X GET http://localhost:8080/api/providers/1/documents \
  -H "Authorization: Bearer YOUR_TOKEN"

# 5. Add document
curl -X POST http://localhost:8080/api/providers/1/documents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F 'data={"providerId":1,"type":"LICENSE","fileName":"license.pdf","documentNumber":"DOC-123"}' \
  -F 'file=@/path/to/license.pdf'

# 6. Delete document
curl -X DELETE http://localhost:8080/api/providers/1/documents/10 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Response Structure Verification

All endpoints MUST return `ApiResponse<T>` wrapper:

```json
{
  "success": true,
  "message": "Success message in Arabic",
  "data": [...],
  "timestamp": "2025-02-07T15:00:00"
}
```

Frontend services use `unwrap()` helper which expects:
```javascript
const unwrap = (response) => {
  return response?.data?.data || response?.data || [];
};
```

---

## Security Notes

1. All endpoints require `@PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('INSURANCE_ADMIN')")`
2. Provider document operations should validate:
   - Provider exists
   - Document belongs to provider (for delete)
   - File size limits
   - Allowed file types (PDF, JPG, PNG)
3. User assignment operations should validate:
   - User exists
   - Provider exists
   - No circular references

---

## Database Schema Requirements

### If ProviderDocument table doesn't exist:

```sql
CREATE TABLE provider_documents (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL REFERENCES providers(id),
    type VARCHAR(50) NOT NULL, -- LICENSE, COMMERCIAL_REGISTER, TAX_CERTIFICATE, CONTRACT_COPY, OTHER
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500),
    file_path VARCHAR(500),
    document_number VARCHAR(100),
    expiry_date DATE,
    notes TEXT,
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_provider_documents_provider_id ON provider_documents(provider_id);
CREATE INDEX idx_provider_documents_type ON provider_documents(type);
```

---

## Summary

**6 Endpoints Need Implementation:**
1. ✅ `GET /api/v1/admin/users/unassigned-providers`
2. ✅ `GET /api/v1/admin/users/provider/{providerId}`
3. ✅ `GET /api/providers/{id}/allowed-employers` (controller only, service exists)
4. ✅ `GET /api/providers/{id}/documents`
5. ✅ `POST /api/providers/{id}/documents`
6. ✅ `DELETE /api/providers/{providerId}/documents/{docId}`

**Estimated Implementation Time:** 2-3 hours

**Files to Modify:**
- `backend/src/main/java/com/waad/tba/modules/rbac/controller/UserController.java`
- `backend/src/main/java/com/waad/tba/modules/rbac/service/UserService.java`
- `backend/src/main/java/com/waad/tba/modules/rbac/repository/UserRepository.java`
- `backend/src/main/java/com/waad/tba/modules/provider/controller/ProviderController.java`
- `backend/src/main/java/com/waad/tba/modules/provider/service/ProviderDocumentService.java` (may need new methods)
- `backend/src/main/java/com/waad/tba/modules/provider/dto/ProviderDocumentCreateDto.java` (new file)
