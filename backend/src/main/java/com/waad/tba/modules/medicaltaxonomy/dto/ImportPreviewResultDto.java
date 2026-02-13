package com.waad.tba.modules.medicaltaxonomy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Result of the import preview operation.
 * Shows what will happen if the file is executed.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportPreviewResultDto {
    private int totalRecords;
    private int newServices;
    private int updatedServices;
    private int unchangedServices;
    private int errorCount;

    private List<ImportChangeDto> changes;
}
