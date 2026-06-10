package com.cargo.uld.service;

import com.cargo.uld.common.BusinessException;
import com.cargo.uld.dto.ReviewRecordVO;
import com.cargo.uld.dto.UldDetailVO;
import com.cargo.uld.dto.WaybillVO;
import com.cargo.uld.entity.Flight;
import com.cargo.uld.entity.ReviewRecord;
import com.cargo.uld.entity.Uld;
import com.cargo.uld.entity.Waybill;
import com.cargo.uld.repository.FlightRepository;
import com.cargo.uld.repository.ReviewRecordRepository;
import com.cargo.uld.repository.UldRepository;
import com.cargo.uld.repository.WaybillRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ExportService {

    private final UldService uldService;
    private final UldRepository uldRepository;
    private final FlightRepository flightRepository;
    private final WaybillRepository waybillRepository;
    private final ReviewRecordRepository reviewRecordRepository;

    @Transactional(readOnly = true)
    public byte[] exportUldReport(Long uldId) throws IOException {
        UldDetailVO uldDetail = uldService.getDetail(uldId);

        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("板箱复核报告");

            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle dataStyle = createDataStyle(workbook);

            int rowNum = 0;

            Row titleRow = sheet.createRow(rowNum++);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("航空货站装板复核报告");
            CellStyle titleStyle = workbook.createCellStyle();
            Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 16);
            titleStyle.setFont(titleFont);
            titleStyle.setAlignment(HorizontalAlignment.CENTER);
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(0, 0, 0, 7));

            rowNum++;

            Row infoRow1 = sheet.createRow(rowNum++);
            createInfoCell(infoRow1, 0, "板箱号:", headerStyle);
            createInfoCell(infoRow1, 1, uldDetail.getUldCode(), dataStyle);
            createInfoCell(infoRow1, 2, "板箱类型:", headerStyle);
            createInfoCell(infoRow1, 3, uldDetail.getUldType(), dataStyle);
            createInfoCell(infoRow1, 4, "关联航班:", headerStyle);
            createInfoCell(infoRow1, 5, uldDetail.getFlightNo() != null ? uldDetail.getFlightNo() : "-", dataStyle);
            createInfoCell(infoRow1, 6, "复核状态:", headerStyle);
            createInfoCell(infoRow1, 7, getReviewStatusName(uldDetail.getReviewStatus()), dataStyle);

            Row infoRow2 = sheet.createRow(rowNum++);
            createInfoCell(infoRow2, 0, "限重(kg):", headerStyle);
            createInfoCell(infoRow2, 1, uldDetail.getWeightLimit() != null ? uldDetail.getWeightLimit().toString() : "0", dataStyle);
            createInfoCell(infoRow2, 2, "已装重量(kg):", headerStyle);
            createInfoCell(infoRow2, 3, uldDetail.getCurrentWeight() != null ? uldDetail.getCurrentWeight().toString() : "0", dataStyle);
            createInfoCell(infoRow2, 4, "货邮单数:", headerStyle);
            createInfoCell(infoRow2, 5, String.valueOf(uldDetail.getWaybills() != null ? uldDetail.getWaybills().size() : 0), dataStyle);
            createInfoCell(infoRow2, 6, "导出时间:", headerStyle);
            createInfoCell(infoRow2, 7, LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")), dataStyle);

            rowNum++;

            Row waybillHeaderRow = sheet.createRow(rowNum++);
            String[] waybillHeaders = {"货邮单号", "托运人", "收货人", "件数", "重量(kg)", "货物描述", "危险品", "安检状态", "说明备注"};
            for (int i = 0; i < waybillHeaders.length; i++) {
                Cell cell = waybillHeaderRow.createCell(i);
                cell.setCellValue(waybillHeaders[i]);
                cell.setCellStyle(headerStyle);
            }

            BigDecimal totalWeight = BigDecimal.ZERO;
            int totalPieces = 0;
            if (uldDetail.getWaybills() != null) {
                for (WaybillVO wb : uldDetail.getWaybills()) {
                    Row row = sheet.createRow(rowNum++);
                    createCell(row, 0, wb.getWaybillNo(), dataStyle);
                    createCell(row, 1, wb.getShipper() != null ? wb.getShipper() : "-", dataStyle);
                    createCell(row, 2, wb.getConsignee() != null ? wb.getConsignee() : "-", dataStyle);
                    createCell(row, 3, String.valueOf(wb.getPieces()), dataStyle);
                    createCell(row, 4, wb.getWeight() != null ? wb.getWeight().toString() : "0", dataStyle);
                    createCell(row, 5, wb.getGoodsDescription() != null ? wb.getGoodsDescription() : "-", dataStyle);
                    createCell(row, 6, Boolean.TRUE.equals(wb.getDangerousFlag()) ? "是(" + (wb.getDangerousLevel() != null ? wb.getDangerousLevel() : "") + ")" : "否", dataStyle);
                    createCell(row, 7, getSecurityStatusName(wb.getSecurityStatus()), dataStyle);
                    createCell(row, 8, wb.getRemark() != null ? wb.getRemark() : "-", dataStyle);

                    if (wb.getWeight() != null) {
                        totalWeight = totalWeight.add(wb.getWeight());
                    }
                    totalPieces += wb.getPieces();
                }
            }

            Row summaryRow = sheet.createRow(rowNum++);
            createCell(summaryRow, 0, "合计", headerStyle);
            createCell(summaryRow, 1, "", dataStyle);
            createCell(summaryRow, 2, "", dataStyle);
            createCell(summaryRow, 3, String.valueOf(totalPieces), headerStyle);
            createCell(summaryRow, 4, totalWeight.toString(), headerStyle);
            for (int i = 5; i < 9; i++) {
                createCell(summaryRow, i, "", dataStyle);
            }

            rowNum++;

            Row reviewHeaderRow = sheet.createRow(rowNum++);
            String[] reviewHeaders = {"时间", "操作类型", "操作人", "理论重量(kg)", "实际重量(kg)", "重量差(kg)", "退回原因", "备注"};
            for (int i = 0; i < reviewHeaders.length; i++) {
                Cell cell = reviewHeaderRow.createCell(i);
                cell.setCellValue(reviewHeaders[i]);
                cell.setCellStyle(headerStyle);
            }

            if (uldDetail.getReviewRecords() != null) {
                for (ReviewRecordVO rr : uldDetail.getReviewRecords()) {
                    Row row = sheet.createRow(rowNum++);
                    createCell(row, 0, rr.getCreatedAt() != null ? rr.getCreatedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) : "-", dataStyle);
                    createCell(row, 1, rr.getReviewTypeName() != null ? rr.getReviewTypeName() : rr.getReviewType(), dataStyle);
                    createCell(row, 2, rr.getReviewerName() != null ? rr.getReviewerName() : "-", dataStyle);
                    createCell(row, 3, rr.getExpectedWeight() != null ? rr.getExpectedWeight().toString() : "-", dataStyle);
                    createCell(row, 4, rr.getActualWeight() != null ? rr.getActualWeight().toString() : "-", dataStyle);
                    createCell(row, 5, rr.getWeightDiff() != null ? rr.getWeightDiff().toString() : "-", dataStyle);
                    createCell(row, 6, rr.getRejectReason() != null ? rr.getRejectReason() : "-", dataStyle);
                    createCell(row, 7, rr.getRemark() != null ? rr.getRemark() : "-", dataStyle);
                }
            }

            for (int i = 0; i < 9; i++) {
                sheet.autoSizeColumn(i);
            }

            try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                workbook.write(out);
                return out.toByteArray();
            }
        }
    }

    @Transactional(readOnly = true)
    public byte[] exportFlightReport(Long flightId) throws IOException {
        Flight flight = flightRepository.findById(flightId)
                .orElseThrow(() -> BusinessException.of("航班不存在"));

        List<Uld> ulds = uldRepository.findByFlightId(flightId);

        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("航班装板报告");

            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle dataStyle = createDataStyle(workbook);

            int rowNum = 0;

            Row titleRow = sheet.createRow(rowNum++);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("航班装板汇总报告");
            CellStyle titleStyle = workbook.createCellStyle();
            Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 16);
            titleStyle.setFont(titleFont);
            titleStyle.setAlignment(HorizontalAlignment.CENTER);
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(0, 0, 0, 8));

            rowNum++;

            Row infoRow1 = sheet.createRow(rowNum++);
            createInfoCell(infoRow1, 0, "航班号:", headerStyle);
            createInfoCell(infoRow1, 1, flight.getFlightNo(), dataStyle);
            createInfoCell(infoRow1, 2, "机型:", headerStyle);
            createInfoCell(infoRow1, 3, flight.getAircraftNo() != null ? flight.getAircraftNo() : "-", dataStyle);
            createInfoCell(infoRow1, 4, "航线:", headerStyle);
            createInfoCell(infoRow1, 5, flight.getDeparture() + " → " + flight.getArrival(), dataStyle);
            createInfoCell(infoRow1, 6, "计划起飞:", headerStyle);
            createInfoCell(infoRow1, 7, flight.getScheduledDeparture() != null ? flight.getScheduledDeparture().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")) : "-", dataStyle);
            createInfoCell(infoRow1, 8, "状态:", headerStyle);
            createInfoCell(infoRow1, 9, getFlightStatusName(flight.getStatus()), dataStyle);

            Row infoRow2 = sheet.createRow(rowNum++);
            createInfoCell(infoRow2, 0, "板箱限额:", headerStyle);
            createInfoCell(infoRow2, 1, flight.getTotalUldLimit() != null ? flight.getTotalUldLimit().toString() : "0", dataStyle);
            createInfoCell(infoRow2, 2, "重量限额(kg):", headerStyle);
            createInfoCell(infoRow2, 3, flight.getTotalWeightLimit() != null ? flight.getTotalWeightLimit().toString() : "0", dataStyle);
            createInfoCell(infoRow2, 4, "已配板箱数:", headerStyle);
            createInfoCell(infoRow2, 5, String.valueOf(ulds.size()), dataStyle);
            createInfoCell(infoRow2, 6, "导出时间:", headerStyle);
            createInfoCell(infoRow2, 7, LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")), dataStyle);

            rowNum++;

            Row uldHeaderRow = sheet.createRow(rowNum++);
            String[] uldHeaders = {"板箱号", "类型", "状态", "已装重量(kg)", "限重(kg)", "货邮单数", "复核人", "复核时间", "审核结论"};
            for (int i = 0; i < uldHeaders.length; i++) {
                Cell cell = uldHeaderRow.createCell(i);
                cell.setCellValue(uldHeaders[i]);
                cell.setCellStyle(headerStyle);
            }

            BigDecimal flightTotalWeight = BigDecimal.ZERO;
            int flightTotalWaybills = 0;

            for (Uld uld : ulds) {
                Row row = sheet.createRow(rowNum++);
                createCell(row, 0, uld.getUldCode(), dataStyle);
                createCell(row, 1, uld.getUldType(), dataStyle);
                createCell(row, 2, getReviewStatusName(uld.getReviewStatus()), dataStyle);
                createCell(row, 3, uld.getCurrentWeight() != null ? uld.getCurrentWeight().toString() : "0", dataStyle);
                createCell(row, 4, uld.getWeightLimit() != null ? uld.getWeightLimit().toString() : "0", dataStyle);

                List<Waybill> waybills = waybillRepository.findByCurrentUldIdAndLoadedStatus(uld.getId(), Waybill.LoadedStatus.LOADED);
                createCell(row, 5, String.valueOf(waybills.size()), dataStyle);
                createCell(row, 6, uld.getReviewedBy() != null ? "待查询" : "-", dataStyle);
                createCell(row, 7, uld.getReviewedAt() != null ? uld.getReviewedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")) : "-", dataStyle);

                String reviewConclusion = getReviewConclusion(uld);
                createCell(row, 8, reviewConclusion, dataStyle);

                if (uld.getCurrentWeight() != null) {
                    flightTotalWeight = flightTotalWeight.add(uld.getCurrentWeight());
                }
                flightTotalWaybills += waybills.size();
            }

            Row summaryRow = sheet.createRow(rowNum++);
            createCell(summaryRow, 0, "合计", headerStyle);
            createCell(summaryRow, 1, "", dataStyle);
            createCell(summaryRow, 2, "", dataStyle);
            createCell(summaryRow, 3, flightTotalWeight.toString(), headerStyle);
            createCell(summaryRow, 4, "", dataStyle);
            createCell(summaryRow, 5, String.valueOf(flightTotalWaybills), headerStyle);
            for (int i = 6; i < 9; i++) {
                createCell(summaryRow, i, "", dataStyle);
            }

            for (int i = 0; i < 10; i++) {
                sheet.autoSizeColumn(i);
            }

            try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                workbook.write(out);
                return out.toByteArray();
            }
        }
    }

    private String getReviewConclusion(Uld uld) {
        if (Uld.ReviewStatus.PASSED.equals(uld.getReviewStatus())) {
            return "复核通过";
        } else if (Uld.ReviewStatus.REJECTED.equals(uld.getReviewStatus())) {
            return "复核退回: " + (uld.getRejectReason() != null ? uld.getRejectReason() : "");
        } else if (Uld.ReviewStatus.REVIEWING.equals(uld.getReviewStatus())) {
            return "复核中";
        } else {
            return "待复核";
        }
    }

    private String getReviewStatusName(String status) {
        if ("PASSED".equals(status)) return "复核通过";
        if ("REVIEWING".equals(status)) return "复核中";
        if ("REJECTED".equals(status)) return "复核退回";
        return "待复核";
    }

    private String getSecurityStatusName(String status) {
        if ("PASSED".equals(status)) return "安检通过";
        if ("REJECTED".equals(status)) return "安检拒绝";
        return "待安检";
    }

    private String getFlightStatusName(String status) {
        if ("CREATED".equals(status)) return "已建档";
        if ("LOADING".equals(status)) return "装板中";
        if ("CLOSED".equals(status)) return "已关闭";
        return status;
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        return style;
    }

    private CellStyle createDataStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private void createInfoCell(Row row, int column, String value, CellStyle style) {
        Cell cell = row.createCell(column);
        cell.setCellValue(value);
        cell.setCellStyle(style);
    }

    private void createCell(Row row, int column, String value, CellStyle style) {
        Cell cell = row.createCell(column);
        cell.setCellValue(value);
        cell.setCellStyle(style);
    }
}
