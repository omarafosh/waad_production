package com.waad.tba.modules.medicaltaxonomy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Details of a change detected during import preview.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportChangeDto {
    private String rowNumber;
    private String serviceCode;
    private String serviceName;
    private String category;

    // Change Type: NEW, UPDATE, UNCHANGED, ERROR
    private String changeType;

    private BigDecimal oldPrice;
    private BigDecimal newPrice;

    private String oldName;
    private String newName;

    private String notes;
}
