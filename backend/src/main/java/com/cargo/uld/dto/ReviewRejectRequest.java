package com.cargo.uld.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ReviewRejectRequest {
    @NotBlank(message = "退回原因不能为空")
    private String rejectReason;
    @NotBlank(message = "解锁到的状态不能为空")
    private String unlockToStatus;
    private String remark;
}
