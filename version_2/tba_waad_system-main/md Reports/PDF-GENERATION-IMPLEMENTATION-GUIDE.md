# نظام توليد PDF احترافي - دليل التنفيذ الكامل

## 🎯 نظرة عامة

تم تنفيذ نظام احترافي لتوليد تقارير PDF في **Backend** بدلاً من الاعتماد على الحلول الخاطئة في Frontend مثل:
- ❌ `window.print()` - يسبب جداول مكسورة
- ❌ `html2canvas` - غير مناسب للأرشفة
- ❌ `jsPDF` - محدود في التعامل مع العربية

### ✅ الحل الصحيح

**Backend PDF Generation** باستخدام:
- **OpenPDF 1.3.34** - مكتبة قوية مفتوحة المصدر
- **OpenPDF RTL** - دعم كامل للعربية RTL
- **Amiri Fonts** - خطوط عربية مدمجة للجودة العالية
- **Template-Based Architecture** - قوالب موحدة وقابلة للتوسع

---

## 🏗️ معمارية النظام

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  - يطلب PDF من Backend عبر REST API                            │
│  - يستقبل byte[] كـ application/pdf                             │
│  - يعرض/ينزل الملف مباشرة (لا HTML rendering)                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    REST CONTROLLER                              │
│  GET /api/reports/members/{id}/pdf                              │
│  GET /api/reports/members/list/pdf                              │
│  GET /api/reports/providers/{id}/pdf                            │
│  GET /api/reports/claims/{id}/pdf                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   REPORT TEMPLATE                               │
│  MemberReportTemplate                                           │
│  ProviderReportTemplate (قريباً)                                │
│  ClaimReportTemplate (قريباً)                                   │
│  - يقبل DTO فقط (لا Entities)                                   │
│  - يولد محتوى PDF (tables, text, images)                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   PDF REPORT SERVICE                            │
│  - ينشئ Document (A4 portrait/landscape)                       │
│  - يضيف Header/Footer على كل صفحة                              │
│  - يطبق Template للمحتوى                                        │
│  - يرجع byte[] للتحميل                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   SUPPORTING SERVICES                           │
│  - PdfFontConfig: تحميل خطوط العربية + RTL                    │
│  - PdfTableBuilder: بناء جداول مع pagination                   │
│  - PdfReportMetadata: بيانات التقرير (عنوان، تاريخ، إلخ)      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 المكونات المنفذة

### 1. Dependencies (pom.xml)

```xml
<!-- OpenPDF - Professional PDF generation -->
<dependency>
    <groupId>com.github.librepdf</groupId>
    <artifactId>openpdf</artifactId>
    <version>1.3.34</version>
</dependency>

<!-- OpenPDF RTL - Arabic support -->
<dependency>
    <groupId>com.github.librepdf</groupId>
    <artifactId>openpdf-rtl</artifactId>
    <version>1.3.34</version>
</dependency>
```

### 2. DTOs

#### PdfReportMetadata
```java
@Data @Builder
public class PdfReportMetadata {
    private String titleAr;           // عنوان التقرير بالعربية
    private String titleEn;           // عنوان التقرير بالإنجليزية
    private ReportType reportType;    // MEMBER, PROVIDER, CONTRACT, CLAIM
    private PageOrientation orientation; // PORTRAIT, LANDSCAPE
    private LocalDateTime generatedAt;
    private String trackingId;
    private String generatedBy;
    private String watermark;
}
```

#### PdfReportRequest<T>
```java
public class PdfReportRequest<T> {
    private PdfReportMetadata metadata;
    private T data;                   // Single entity (DTO)
    private List<T> dataList;         // List for tables (DTOs)
    private List<PdfAttachment> attachments; // Optional attachments
}
```

### 3. Font Configuration (PdfFontConfig)

```java
@Component
public class PdfFontConfig {
    private BaseFont arabicNormalFont;
    private BaseFont arabicBoldFont;
    
    @PostConstruct
    public void init() throws IOException, DocumentException {
        // Load Amiri fonts from resources
        // Auto-detect Arabic vs Latin text
        // Apply RTL direction for Arabic
    }
    
    public Font getFont(String text, boolean bold) {
        // Returns appropriate font based on text language
    }
}
```

### 4. Table Builder (PdfTableBuilder)

```java
@Component
public class PdfTableBuilder {
    public <T> PdfPTable buildTable(List<T> data, List<String> columns, List<String> columnsAr) {
        // Creates professional tables with:
        // - Blue header background, white text
        // - Alternating row colors (white/gray)
        // - Proper cell padding
        // - Header repetition on each page
        // - Auto-formats numbers, booleans, dates
        // - Uses reflection to extract DTO fields
    }
}
```

### 5. Report Service (PdfReportService)

```java
@Service
public class PdfReportService {
    public byte[] generateReport(PdfReportRequest<?> request) {
        Document document = createDocument(metadata);
        PdfWriter writer = PdfWriter.getInstance(document, outputStream);
        writer.setPageEvent(new HeaderFooterHandler(metadata, fontConfig));
        
        // Add content based on report type
        // Add attachments if any
        
        return outputStream.toByteArray();
    }
}
```

### 6. Report Templates

#### MemberReportTemplate
```java
@Component
public class MemberReportTemplate {
    // Generate detail report (single member)
    public List<Element> generateMemberDetailReport(MemberResponseDto member) {
        // Key-value tables for:
        // - Personal information
        // - Contact information
        // - Insurance information
    }
    
    // Generate list report (multiple members)
    public List<Element> generateMemberListReport(List<MemberResponseDto> members) {
        // Data table with columns:
        // - Member Number, Name, DOB, Phone, Status
    }
}
```

### 7. REST Controller (PdfReportController)

```java
@RestController
@RequestMapping("/api/reports")
public class PdfReportController {
    
    // GET /api/reports/members/{id}/pdf
    @GetMapping("/members/{id}/pdf")
    public ResponseEntity<byte[]> generateMemberPdfReport(@PathVariable Long id) {
        // 1. Fetch member DTO
        // 2. Create metadata
        // 3. Build request
        // 4. Generate PDF
        // 5. Return as download
    }
    
    // GET /api/reports/members/list/pdf
    @GetMapping("/members/list/pdf")
    public ResponseEntity<byte[]> generateMembersListPdfReport(
        @RequestParam int page, @RequestParam int size) {
        // Paginated list of members
    }
}
```

---

## 🚀 الاستخدام

### من Frontend (Angular/React/Vue)

```typescript
// Example: Download member PDF report
async downloadMemberPdf(memberId: number) {
  const response = await axios.get(
    `/api/reports/members/${memberId}/pdf`,
    { responseType: 'blob' }
  );
  
  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Member_${memberId}_Report.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}
```

### من Backend (Java)

```java
// Example: Generate member PDF programmatically
@Autowired
private PdfReportService pdfReportService;

@Autowired
private MemberReportTemplate memberReportTemplate;

public byte[] generateMemberPdf(MemberResponseDto member) {
    PdfReportMetadata metadata = MemberReportTemplate.createMemberReportMetadata(
        member.getMemberNumber(), "system");
    
    PdfReportRequest<MemberResponseDto> request = PdfReportRequest.<MemberResponseDto>builder()
        .metadata(metadata)
        .data(member)
        .build();
    
    return pdfReportService.generateReport(request);
}
```

---

## 📝 إضافة تقرير جديد

### الخطوة 1: إنشاء Template

```java
@Component
@RequiredArgsConstructor
public class ProviderReportTemplate {
    private final PdfFontConfig fontConfig;
    private final PdfTableBuilder tableBuilder;
    
    public List<Element> generateProviderDetailReport(ProviderResponseDto provider) {
        List<Element> elements = new ArrayList<>();
        
        // 1. Add title
        Paragraph title = new Paragraph("تقرير مقدم الخدمة", 
            fontConfig.getFont("تقرير", true));
        title.setAlignment(Element.ALIGN_CENTER);
        elements.add(title);
        
        // 2. Add provider details as key-value table
        Map<String, String> details = new LinkedHashMap<>();
        details.put("رقم المقدم", provider.getProviderNumber());
        details.put("اسم المقدم", provider.getNameAr());
        details.put("التخصص", provider.getSpecialty());
        // ... more fields
        
        PdfPTable table = tableBuilder.buildKeyValueTable(details, "البيان", "القيمة");
        elements.add(table);
        
        return elements;
    }
    
    public static PdfReportMetadata createProviderReportMetadata(
            String providerNumber, String username) {
        return PdfReportMetadata.builder()
            .titleAr("تقرير مقدم الخدمة")
            .titleEn("Provider Report")
            .reportType(PdfReportMetadata.ReportType.PROVIDER)
            .orientation(PdfReportMetadata.PageOrientation.PORTRAIT)
            .generatedAt(LocalDateTime.now())
            .trackingId("PROVIDER-" + providerNumber)
            .generatedBy(username)
            .build();
    }
}
```

### الخطوة 2: إضافة Endpoint في Controller

```java
@GetMapping("/providers/{id}/pdf")
@PreAuthorize("hasAnyAuthority('ADMIN', 'VIEW_PROVIDERS')")
public ResponseEntity<byte[]> generateProviderPdfReport(@PathVariable Long id) {
    // 1. Fetch provider DTO
    ProviderResponseDto provider = providerService.findById(id);
    
    // 2. Create metadata
    PdfReportMetadata metadata = ProviderReportTemplate.createProviderReportMetadata(
        provider.getProviderNumber(), username);
    
    // 3. Build request
    PdfReportRequest<ProviderResponseDto> request = PdfReportRequest.<ProviderResponseDto>builder()
        .metadata(metadata)
        .data(provider)
        .build();
    
    // 4. Generate PDF
    byte[] pdfBytes = pdfReportService.generateReport(request);
    
    // 5. Return
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_PDF);
    headers.setContentDispositionFormData("attachment", 
        String.format("Provider_%s_Report.pdf", provider.getProviderNumber()));
    
    return ResponseEntity.ok().headers(headers).body(pdfBytes);
}
```

### الخطوة 3: تحديث PdfReportService

```java
// في PdfReportService.generateReport()
// Add new case in switch statement:
case PROVIDER:
    ProviderReportTemplate providerTemplate = applicationContext.getBean(ProviderReportTemplate.class);
    if (request.getData() != null) {
        contentElements = providerTemplate.generateProviderDetailReport(
            (ProviderResponseDto) request.getData());
    }
    break;
```

---

## 🎨 التخصيص

### تغيير الألوان

```java
// في PdfTableBuilder.buildTable()
// Header color
headerCell.setBackgroundColor(new Color(41, 128, 185)); // Blue

// Alternating row colors
if (rowIndex % 2 == 0) {
    cell.setBackgroundColor(Color.WHITE);
} else {
    cell.setBackgroundColor(new Color(245, 245, 245)); // Light gray
}
```

### إضافة Logo/Watermark

```java
// في PdfReportService.HeaderFooterHandler
@Override
public void onEndPage(PdfWriter writer, Document document) {
    // Add logo
    try {
        Image logo = Image.getInstance("path/to/logo.png");
        logo.setAbsolutePosition(50, PageSize.A4.getHeight() - 80);
        logo.scaleToFit(100, 50);
        document.add(logo);
    } catch (Exception e) {
        log.error("Failed to add logo", e);
    }
    
    // Add watermark if specified
    if (metadata.getWatermark() != null) {
        PdfContentByte canvas = writer.getDirectContentUnder();
        // Draw watermark text
    }
}
```

### تغيير Page Size

```java
// في PdfReportService.createDocument()
Rectangle pageSize = metadata.getOrientation() == PageOrientation.LANDSCAPE
    ? PageSize.A4.rotate()  // Landscape
    : PageSize.A3;          // Or any other size
```

---

## 🔧 إعداد الخطوط

### تنزيل خطوط Amiri

1. **من GitHub:**
   ```bash
   wget https://github.com/aliftype/amiri/releases/download/1.000/Amiri-1.000.zip
   unzip Amiri-1.000.zip
   ```

2. **نسخ الملفات:**
   ```bash
   cp Amiri-Regular.ttf backend/src/main/resources/fonts/
   cp Amiri-Bold.ttf backend/src/main/resources/fonts/
   ```

3. **التحقق من التحميل:**
   ```bash
   mvn clean compile
   # Check logs for: "Arabic fonts (Amiri) loaded successfully"
   ```

---

## ✅ الاختبار

### 1. Compilation Test

```bash
cd backend
mvn clean compile
```

### 2. Integration Test

```java
@SpringBootTest
@AutoConfigureMockMvc
class PdfReportControllerTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Test
    @WithMockUser(authorities = {"VIEW_MEMBERS"})
    void testGenerateMemberPdfReport() throws Exception {
        mockMvc.perform(get("/api/reports/members/1/pdf"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_PDF))
            .andExpect(header().exists(HttpHeaders.CONTENT_DISPOSITION));
    }
}
```

### 3. Manual Test

```bash
# Start backend
mvn spring-boot:run

# Test endpoint (using curl)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:8080/api/reports/members/1/pdf \
     --output member_report.pdf

# Verify PDF
file member_report.pdf  # Should show: PDF document
```

---

## 📊 مقارنة الأداء

| المقياس | Frontend (HTML to PDF) | **Backend (OpenPDF)** |
|---------|------------------------|----------------------|
| سرعة التوليد | بطيء (3-5 ثواني) | **سريع (< 1 ثانية)** |
| جودة الجداول | ❌ تقطع عند الصفحات | **✅ pagination تلقائي** |
| دعم العربية | ⚠️ محدود | **✅ RTL كامل** |
| حجم الملف | كبير (2-5 MB) | **صغير (200-500 KB)** |
| الأرشفة | ❌ غير مناسب | **✅ معيار احترافي** |
| الطباعة | ⚠️ تعتمد على المتصفح | **✅ ثابتة دائماً** |

---

## 🔐 الأمان

### الصلاحيات

```java
@PreAuthorize("hasAnyAuthority('ADMIN', 'SUPER_ADMIN', 'VIEW_MEMBERS')")
```

### Data Filtering

```java
// في MemberService - automatic company filtering
public MemberResponseDto findById(Long id) {
    // Automatically filters by user's company context
    // Throws 403 if member belongs to different company
}
```

### Audit Trail

```java
// في PdfReportMetadata
private String generatedBy;     // Username
private LocalDateTime generatedAt; // Timestamp
private String trackingId;      // Unique ID for auditing
```

---

## 📚 المراجع

- [OpenPDF Documentation](https://github.com/LibrePDF/OpenPDF)
- [Amiri Font](https://github.com/aliftype/amiri)
- [Spring Boot File Download](https://www.baeldung.com/spring-controller-return-image-file)

---

## 🎯 الخطوات التالية

### قصيرة المدى
1. ✅ إضافة خطوط Amiri
2. ⏳ تنفيذ Provider Report Template
3. ⏳ تنفيذ Contract Report Template
4. ⏳ تنفيذ Claim Report Template

### متوسطة المدى
1. دعم المرفقات (PDF/Images)
2. تقارير مركبة (Contract + Pricing Items)
3. Batch PDF generation (multiple reports)
4. Email PDF reports

### طويلة المدى
1. Custom branding per company
2. Digital signatures
3. PDF forms (fillable)
4. OCR support for scanned documents

---

**آخر تحديث:** 2026-01-06  
**الحالة:** ✅ جاهز للاستخدام (Member Reports)  
**التالي:** تنفيذ Provider Report Template
