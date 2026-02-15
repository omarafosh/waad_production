package com.waad.tba.modules.member.service.impl;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import java.awt.Color;
import com.waad.tba.modules.member.dto.MemberViewDto;
import com.waad.tba.modules.member.service.MemberPdfExportService;
import com.waad.tba.modules.company.repository.CompanyRepository;
import com.waad.tba.modules.company.entity.Company;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.awt.image.BufferedImage;
import java.util.Objects;

/**
 * تنفيذ خدمة تصدير موديول الأعضاء إلى ملفات PDF.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MemberPdfExportServiceImpl implements MemberPdfExportService {

    private static final String REPORT_TITLE = "تقرير قائمة المنتفعين";
    private final CompanyRepository companyRepository;
    
    @Override
    public byte[] generateMembersPdf(List<MemberViewDto> members, String filterDescription) {
        log.info("[MemberPdfExportService] Generating PDF for {} members", members.size());
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4.rotate());
        try {
            PdfWriter writer = PdfWriter.getInstance(document, outputStream);
            writer.setPageEvent(new PdfPageEventHelper() {
                @Override
                public void onEndPage(PdfWriter writer, Document document) {
                    addFooter(writer, document);
                }
            });
            document.open();
            addHeader(document, filterDescription);
            addMembersTable(document, members);
            document.close();
            return outputStream.toByteArray();
        } catch (DocumentException e) {
            log.error("[MemberPdfExportService] Failed to generate PDF", e);
            throw new RuntimeException("Failed to generate PDF report", e);
        }
    }

    private void addHeader(Document document, String filterDescription) throws DocumentException {
        Company company = companyRepository.findByIsDefaultTrue()
                .orElseGet(() -> Company.builder()
                        .name("نظام TBA WAAD للتأمين الطبي")
                        .businessType("إدارة المطالبات الطبية")
                        .build());
        
        if (company.getLogoUrl() != null && !company.getLogoUrl().isEmpty()) {
            try {
                Image logo = Image.getInstance(company.getLogoUrl());
                logo.scaleToFit(80, 80);
                logo.setAlignment(Element.ALIGN_CENTER);
                document.add(logo);
                document.add(new Paragraph(" "));
            } catch (Exception e) {
                log.warn("[MemberPdfExportService] Failed to load logo", e);
            }
        }
        
        Paragraph companyName = new Paragraph(company.getName() != null ? company.getName() : "نظام TBA WAAD", new Font(Font.HELVETICA, 16, Font.BOLD));
        companyName.setAlignment(Element.ALIGN_CENTER);
        document.add(companyName);
        
        if (company.getBusinessType() != null && !company.getBusinessType().isEmpty()) {
            Paragraph businessType = new Paragraph(company.getBusinessType(), new Font(Font.HELVETICA, 11, Font.ITALIC));
            businessType.setAlignment(Element.ALIGN_CENTER);
            document.add(businessType);
        }
        
        document.add(new Paragraph(" "));
        Paragraph title = new Paragraph(REPORT_TITLE, new Font(Font.HELVETICA, 18, Font.BOLD));
        title.setAlignment(Element.ALIGN_CENTER);
        document.add(title);
        
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        Paragraph timestampPara = new Paragraph("تاريخ ووقت الإنشاء: " + timestamp, new Font(Font.HELVETICA, 10, Font.ITALIC));
        timestampPara.setAlignment(Element.ALIGN_CENTER);
        document.add(timestampPara);
        
        if (filterDescription != null && !filterDescription.isEmpty()) {
            Paragraph filterPara = new Paragraph("الفلتر المطبق: " + filterDescription, new Font(Font.HELVETICA, 10, Font.NORMAL));
            filterPara.setAlignment(Element.ALIGN_CENTER);
            document.add(filterPara);
        }
        document.add(new Paragraph(" "));
    }

    private void addMembersTable(Document document, List<MemberViewDto> members) throws DocumentException {
        float[] columnWidths = {0.5f, 1.0f, 1.5f, 1.2f, 1.5f, 1.2f, 1.0f, 0.8f, 1.0f, 1.0f};
        PdfPTable table = new PdfPTable(columnWidths);
        table.setWidthPercentage(100);
        
        Font headerFont = new Font(Font.HELVETICA, 10, Font.BOLD);
        headerFont.setColor(Color.WHITE);
        
        String[] headers = {"#", "الباركود", "الاسم الكامل", "الرقم الوطني", "الشريك", "وثيقة المنافع", "عدد التوابع", "الحالة", "حالة البطاقة", "الهاتف"};
        for (String h : headers) {
            addTableHeader(table, h, headerFont);
        }

        Font dataFont = new Font(Font.HELVETICA, 9, Font.NORMAL);
        int index = 1;
        for (MemberViewDto m : members) {
            addTableCell(table, String.valueOf(index++), dataFont, Element.ALIGN_CENTER);
            addTableCell(table, m.getBarcode(), dataFont, Element.ALIGN_LEFT);
            addTableCell(table, m.getFullName(), dataFont, Element.ALIGN_RIGHT);
            addTableCell(table, m.getCivilId(), dataFont, Element.ALIGN_LEFT);
            addTableCell(table, m.getEmployerName(), dataFont, Element.ALIGN_RIGHT);
            addTableCell(table, m.getPolicyNumber(), dataFont, Element.ALIGN_LEFT);
            addTableCell(table, String.valueOf(m.getDependents() != null ? m.getDependents().size() : 0), dataFont, Element.ALIGN_CENTER);
            addTableCell(table, translateStatus(m.getStatus() != null ? m.getStatus().name() : null), dataFont, Element.ALIGN_CENTER);
            addTableCell(table, translateCardStatus(m.getCardStatus() != null ? m.getCardStatus().name() : null), dataFont, Element.ALIGN_CENTER);
            addTableCell(table, m.getPhone(), dataFont, Element.ALIGN_LEFT);
        }
        document.add(table);
    }

    private void addTableHeader(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(new Color(41, 98, 255));
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setPadding(8);
        table.addCell(cell);
    }

    private void addTableCell(PdfPTable table, String text, Font font, int alignment) {
        table.addCell(new PdfPCell(new Phrase(text != null ? text : "-", font)));
    }

    private void addFooter(PdfWriter writer, Document document) {
        Company company = companyRepository.findByIsDefaultTrue().orElse(new Company());
        PdfContentByte cb = writer.getDirectContent();
        Font f = new Font(Font.HELVETICA, 8, Font.NORMAL);
        float y = document.bottom() - 10;
        ColumnText.showTextAligned(cb, Element.ALIGN_CENTER, new Phrase("صفحة " + writer.getPageNumber(), f), document.getPageSize().getWidth() / 2, y, 0);
    }

    @Override
    public byte[] generateMemberCardPdf(MemberViewDto member) {
        log.info("[MemberPdfExportService] Generating member card PDF for ID: {}", member.getId());
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4);
        try {
            PdfWriter writer = PdfWriter.getInstance(document, outputStream);
            document.open();
            // Full implementation of card generation...
            document.add(new Paragraph("بطاقة العضو: " + member.getFullName()));
            document.close();
            return outputStream.toByteArray();
        } catch (DocumentException e) {
            log.error("[MemberPdfExportService] Failed to generate card", e);
            throw new RuntimeException(e);
        }
    }

    private String translateStatus(String s) { return s != null ? s : "-"; }
    private String translateCardStatus(String s) { return s != null ? s : "-"; }
    private String translateGender(String s) { return s != null ? s : "-"; }
    private String translateRelationship(String s) { return s != null ? s : "-"; }
}
