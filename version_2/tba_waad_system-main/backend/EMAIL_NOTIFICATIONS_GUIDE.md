# 📧 دليل استخدام إشعارات البريد الإلكتروني

## 🎯 القوالب المتاحة

### 1. **إشعار تقديم مطالبة جديدة** (`claim-submitted.html`)
يُرسل تلقائياً عند تقديم مطالبة جديدة للنظام.

**الاستخدام:**
```java
@Autowired
private EmailService emailService;

// عند إنشاء مطالبة جديدة
emailService.sendClaimSubmittedNotification(
    member.getEmail(),                    // sofy.fsh@gmail.com
    member.getFullName(),                 // "أحمد محمد علي"
    claim.getClaimNumber(),               // "CLM-2026-00123"
    claim.getCreatedAt().toString(),      // "2026-01-05"
    provider.getName(),                   // "مستشفى الملك فيصل"
    claim.getAmount().toString(),         // "5000"
    claim.getId().toString()              // "123"
);
```

**محتوى الإشعار:**
- ✅ رقم المطالبة
- ✅ تاريخ التقديم
- ✅ مقدم الخدمة
- ✅ قيمة المطالبة
- ✅ الخطوات القادمة
- ✅ رابط لعرض التفاصيل

---

### 2. **إشعار الموافقة على المطالبة** (`claim-approved.html`)
يُرسل عند موافقة المراجع على المطالبة.

**الاستخدام:**
```java
// عند الموافقة على المطالبة
emailService.sendClaimApprovedNotification(
    member.getEmail(),                    // sofy.fsh@gmail.com
    member.getFullName(),                 // "أحمد محمد علي"
    claim.getClaimNumber(),               // "CLM-2026-00123"
    LocalDate.now().toString(),           // "2026-01-05"
    provider.getName(),                   // "مستشفى الملك فيصل"
    "5000",                               // المبلغ الكلي
    "4000",                               // المبلغ المعتمد
    "1000",                               // التحمل الشخصي
    "80",                                 // نسبة التغطية
    "تحويل بنكي",                        // طريقة الدفع
    "REF-2026-00456",                     // رقم المرجع
    "الحساب البنكي المسجل",             // وجهة الدفع
    claim.getId().toString()              // "123"
);
```

**محتوى الإشعار:**
- 🎉 رسالة تهنئة بالموافقة
- ✅ المبلغ المعتمد (بارز)
- ✅ تفاصيل المطالبة الكاملة
- ✅ معلومات الدفع والتحويل
- ✅ المدة المتوقعة للدفع
- ✅ رابط لعرض التفاصيل

---

### 3. **إشعار رفض المطالبة** (`claim-rejected.html`)
يُرسل عند رفض المطالبة مع توضيح الأسباب.

**الاستخدام:**
```java
// عند رفض المطالبة
emailService.sendClaimRejectedNotification(
    member.getEmail(),                    // sofy.fsh@gmail.com
    member.getFullName(),                 // "أحمد محمد علي"
    claim.getClaimNumber(),               // "CLM-2026-00123"
    LocalDate.now().toString(),           // "2026-01-05"
    provider.getName(),                   // "مستشفى الملك فيصل"
    claim.getAmount().toString(),         // "5000"
    reviewer.getFullName(),               // "د. خالد الأحمد"
    "الخدمة غير مغطاة في البوليصة",     // سبب الرفض
    "يمكن تقديم اعتراض مع مستندات إضافية", // ملاحظات (optional)
    claim.getId().toString()              // "123"
);
```

**محتوى الإشعار:**
- ⚠️ إشعار بالرفض
- ✅ تفاصيل المطالبة
- ✅ سبب الرفض (واضح ومفصل)
- ✅ ملاحظات إضافية
- ✅ كيفية تقديم الاعتراض
- ✅ المستندات المطلوبة للاعتراض
- ✅ رابط لتقديم اعتراض

---

## 🔧 التكامل مع ClaimService

### مثال: إرسال إشعار عند تقديم مطالبة

```java
@Service
public class ClaimService {
    
    @Autowired
    private EmailService emailService;
    
    @Transactional
    public ClaimResponseDto create(ClaimCreateDto dto) {
        // ... إنشاء المطالبة
        Claim savedClaim = claimRepository.save(claim);
        
        // إرسال إشعار تلقائي
        try {
            emailService.sendClaimSubmittedNotification(
                savedClaim.getMember().getEmail(),
                savedClaim.getMember().getFullName(),
                savedClaim.getClaimNumber(),
                savedClaim.getCreatedAt().format(DateTimeFormatter.ISO_DATE),
                savedClaim.getProvider().getName(),
                savedClaim.getAmount().toString(),
                savedClaim.getId().toString()
            );
        } catch (Exception e) {
            log.error("Failed to send email notification: {}", e.getMessage());
            // لا توقف العملية إذا فشل البريد
        }
        
        return claimMapper.toResponseDto(savedClaim);
    }
    
    @Transactional
    public void approveClaim(Long claimId, String reviewerId) {
        Claim claim = claimRepository.findById(claimId)
            .orElseThrow(() -> new ResourceNotFoundException("Claim not found"));
        
        claim.setStatus(ClaimStatus.APPROVED);
        claim.setReviewedBy(reviewerId);
        claim.setReviewedAt(LocalDateTime.now());
        
        Claim approved = claimRepository.save(claim);
        
        // إرسال إشعار الموافقة
        try {
            BigDecimal approvedAmount = approved.getApprovedAmount();
            BigDecimal patientShare = approved.getAmount().subtract(approvedAmount);
            String coveragePercentage = approvedAmount
                .multiply(BigDecimal.valueOf(100))
                .divide(approved.getAmount(), 0, RoundingMode.HALF_UP)
                .toString();
            
            emailService.sendClaimApprovedNotification(
                approved.getMember().getEmail(),
                approved.getMember().getFullName(),
                approved.getClaimNumber(),
                LocalDate.now().toString(),
                approved.getProvider().getName(),
                approved.getAmount().toString(),
                approvedAmount.toString(),
                patientShare.toString(),
                coveragePercentage,
                "تحويل بنكي",
                "REF-" + approved.getId(),
                "الحساب البنكي المسجل",
                approved.getId().toString()
            );
        } catch (Exception e) {
            log.error("Failed to send approval email: {}", e.getMessage());
        }
    }
    
    @Transactional
    public void rejectClaim(Long claimId, String reviewerId, String reason, String notes) {
        Claim claim = claimRepository.findById(claimId)
            .orElseThrow(() -> new ResourceNotFoundException("Claim not found"));
        
        claim.setStatus(ClaimStatus.REJECTED);
        claim.setReviewedBy(reviewerId);
        claim.setReviewedAt(LocalDateTime.now());
        claim.setRejectionReason(reason);
        
        Claim rejected = claimRepository.save(claim);
        
        // إرسال إشعار الرفض
        try {
            User reviewer = userRepository.findById(Long.parseLong(reviewerId))
                .orElse(null);
            
            emailService.sendClaimRejectedNotification(
                rejected.getMember().getEmail(),
                rejected.getMember().getFullName(),
                rejected.getClaimNumber(),
                LocalDate.now().toString(),
                rejected.getProvider().getName(),
                rejected.getAmount().toString(),
                reviewer != null ? reviewer.getFullName() : "فريق المراجعة",
                reason,
                notes,
                rejected.getId().toString()
            );
        } catch (Exception e) {
            log.error("Failed to send rejection email: {}", e.getMessage());
        }
    }
}
```

---

## 🎨 تخصيص القوالب

### تعديل الألوان:
```html
<!-- في ملف HTML -->
<div class="header">
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  <!-- غيّر هذه الألوان حسب هوية شركتك -->
</div>
```

### إضافة لوغو الشركة:
```html
<!-- أضف في header -->
<div class="header">
  <img src="https://yourcompany.com/logo.png" alt="Logo" style="width: 120px;" />
  <h1>عنوان الإشعار</h1>
</div>
```

### تعديل النصوص:
جميع النصوص قابلة للتعديل مباشرة في ملفات HTML.

---

## ✅ اختبار الإشعارات

### 1. اختبار من Postman:

```bash
POST http://localhost:8080/api/test/email/claim-submitted
Content-Type: application/json

{
  "email": "sofy.fsh@gmail.com",
  "memberName": "صوفي أحمد",
  "claimNumber": "CLM-2026-00001",
  "submissionDate": "2026-01-05",
  "providerName": "مستشفى الملك فيصل",
  "claimAmount": "5000",
  "claimId": "1"
}
```

### 2. اختبار مباشر في Java:

```java
@RestController
@RequestMapping("/api/test")
public class EmailTestController {
    
    @Autowired
    private EmailService emailService;
    
    @PostMapping("/email/claim-submitted")
    public ResponseEntity<String> testClaimSubmitted() {
        emailService.sendClaimSubmittedNotification(
            "sofy.fsh@gmail.com",
            "صوفي أحمد",
            "CLM-TEST-001",
            LocalDate.now().toString(),
            "مستشفى الملك فيصل",
            "5000",
            "1"
        );
        return ResponseEntity.ok("Email sent!");
    }
}
```

---

## 🔐 الأمان والخصوصية

- ✅ لا ترسل كلمات مرور في البريد
- ✅ لا ترسل أرقام بطاقات ائتمانية
- ✅ استخدم روابط آمنة (HTTPS)
- ✅ أضف disclaimer في الـ footer
- ✅ احترم GDPR وقوانين حماية البيانات

---

## 📊 الإحصائيات والمتابعة

يمكنك إضافة tracking للإشعارات:

```java
public void sendClaimSubmittedNotification(...) {
    // ... إرسال البريد
    
    // تسجيل الإشعار
    NotificationLog log = NotificationLog.builder()
        .recipientEmail(to)
        .notificationType("CLAIM_SUBMITTED")
        .claimId(claimId)
        .sentAt(LocalDateTime.now())
        .status("SENT")
        .build();
    
    notificationLogRepository.save(log);
}
```

---

## 🚀 الخطوات التالية

1. ✅ تشغيل Backend مع إعدادات SMTP الجديدة
2. ✅ إنشاء مطالبة جديدة واستلام الإشعار
3. ✅ اختبار الموافقة والرفض
4. ✅ تخصيص القوالب حسب هويتك
5. ✅ إضافة المزيد من الإشعارات (زيارات، موافقات مسبقة، إلخ)

---

**جاهز للاستخدام! 🎉**
