package com.waad.tba.modules.member.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.waad.tba.modules.company.entity.Company;
import com.waad.tba.modules.member.dto.MemberViewDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Service dedicated to the low-level generation of PDF documents using OpenPDF.
 */
@Slf4j
@Service
public class MemberPdfGeneratorService {

    public byte[] generateMembersPdf(List<MemberViewDto> members, String filterDescription, Company company) throws DocumentException {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4.rotate());
        
        PdfWriter writer = PdfWriter.getInstance(document, outputStream);
        writer.setPageEvent(new PdfPageEventHelper() {
            @Override
            public void onEndPage(PdfWriter writer, Document document) {
                addFooter(writer, document, company);
            }
        });
        
        document.open();
        addHeader(document, filterDescription, company);
        addMembersTable(document, members);
        document.close();
        
        return outputStream.toByteArray();
    }

    private void addHeader(Document document, String filterDescription, Company company) throws DocumentException {
        // ... (Header logic extracted from original MemberPdfExportService)
        Font companyNameFont = new Font(Font.HELVETICA, 16, Font.BOLD);
        Paragraph companyName = new Paragraph(company.getName() != null ? company.getName() : "TBA WAAD", companyNameFont);
        companyName.setAlignment(Element.ALIGN_CENTER);
        document.add(companyName);

        document.add(new Paragraph(" "));
        Font titleFont = new Font(Font.HELVETICA, 18, Font.BOLD);
        Paragraph title = new Paragraph("تقرير قائمة المنتفعين", titleFont);
        title.setAlignment(Element.ALIGN_CENTER);
        document.add(title);
        
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        Font timestampFont = new Font(Font.HELVETICA, 10, Font.ITALIC);
        Paragraph timestampPara = new Paragraph("تاريخ ووقت الإنشاء: " + timestamp, timestampFont);
        timestampPara.setAlignment(Element.ALIGN_CENTER);
        document.add(timestampPara);

        if (filterDescription != null && !filterDescription.isEmpty()) {
            document.add(new Paragraph("الفلتر المطبق: " + filterDescription, new Font(Font.HELVETICA, 10)));
        }
        document.add(new Paragraph(" "));
    }

    private void addMembersTable(Document document, List<MemberViewDto> members) throws DocumentException {
        float[] columnWidths = {0.5f, 1.0f, 1.5f, 1.2f, 1.5f, 1.2f, 1.0f, 0.8f, 1.0f, 1.0f};
        PdfPTable table = new PdfPTable(columnWidths);
        table.setWidthPercentage(100);
        
        Font headerFont = new Font(Font.HELVETICA, 10, Font.BOLD);
        headerFont.setColor(255, 255, 255);
        
        String[] headers = {"#", "الباركود", "الاسم الكامل", "الرقم الوطني", "الشريك", "وثيقة المنافع", "التابعين", "الحالة", "البطاقة", "الهاتف"};
        for (String h : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
            cell.setBackgroundColor(new Color(41, 98, 255));
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setPadding(5);
            table.addCell(cell);
        }

        Font dataFont = new Font(Font.HELVETICA, 9, Font.NORMAL);
        int index = 1;
        for (MemberViewDto m : members) {
            table.addCell(new Phrase(String.valueOf(index++), dataFont));
            table.addCell(new Phrase(m.getBarcode() != null ? m.getBarcode() : "-", dataFont));
            table.addCell(new Phrase(m.getFullName() != null ? m.getFullName() : "-", dataFont));
            table.addCell(new Phrase(m.getCivilId() != null ? m.getCivilId() : "-", dataFont));
            table.addCell(new Phrase(m.getEmployerName() != null ? m.getEmployerName() : "-", dataFont));
            table.addCell(new Phrase(m.getPolicyNumber() != null ? m.getPolicyNumber() : "-", dataFont));
            table.addCell(new Phrase(String.valueOf(m.getDependents() != null ? m.getDependents().size() : 0), dataFont));
            table.addCell(new Phrase(m.getStatus() != null ? m.getStatus().name() : "-", dataFont));
            table.addCell(new Phrase(m.getCardStatus() != null ? m.getCardStatus().name() : "-", dataFont));
            table.addCell(new Phrase(m.getPhone() != null ? m.getPhone() : "-", dataFont));
        }
        document.add(table);
    }

    private void addFooter(PdfWriter writer, Document document, Company company) {
        PdfContentByte cb = writer.getDirectContent();
        Font footerFont = new Font(Font.HELVETICA, 8, Font.NORMAL);
        float yPosition = document.bottom() - 10;
        
        String text = "© " + LocalDateTime.now().getYear() + " " + (company.getName() != null ? company.getName() : "WAAD") + 
                     " | Page " + writer.getPageNumber();
        ColumnText.showTextAligned(cb, Element.ALIGN_CENTER, new Phrase(text, footerFont), 
                                  document.getPageSize().getWidth() / 2, yPosition, 0);
    }
}
