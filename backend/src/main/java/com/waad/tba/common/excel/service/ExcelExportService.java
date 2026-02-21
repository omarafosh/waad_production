package com.waad.tba.common.excel.service;

import java.io.IOException;
import java.util.List;
import java.util.function.Function;

/**
 * Generic service for exporting data to Excel format.
 */
public interface ExcelExportService {

    /**
     * Exports a list of items to an Excel file represented as a byte array.
     *
     * @param items          The list of objects to export
     * @param headers        The display names of the columns (header row)
     * @param valueExtractors Functions to extract strings from the items for each column
     * @param sheetName      The name of the Excel sheet
     * @param <T>            The type of the item being exported
     * @return byte array containing the Excel file
     * @throws IOException if an error occurs during workbook generation
     */
    <T> byte[] generateExcel(List<T> items, List<String> headers, List<Function<T, String>> valueExtractors, String sheetName) throws IOException;

}
