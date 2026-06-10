-- 航空货站装板复核系统 - 数据库初始化脚本

CREATE DATABASE IF NOT EXISTS cargo_uld DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cargo_uld;

-- 用户表
CREATE TABLE IF NOT EXISTS sys_user (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(64) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    real_name VARCHAR(64) NOT NULL,
    role VARCHAR(32) NOT NULL COMMENT 'OPERATOR-货站操作员, INSPECTOR-安检员, REVIEWER-复核员, SUPERVISOR-航班主管',
    enabled TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 航班表
CREATE TABLE IF NOT EXISTS flight (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    flight_no VARCHAR(32) NOT NULL UNIQUE COMMENT '航班号',
    aircraft_no VARCHAR(32) COMMENT '飞机注册号',
    departure VARCHAR(16) NOT NULL COMMENT '出发站',
    arrival VARCHAR(16) NOT NULL COMMENT '到达站',
    scheduled_departure DATETIME NOT NULL COMMENT '计划起飞时间',
    status VARCHAR(32) NOT NULL DEFAULT 'CREATED' COMMENT 'CREATED-已建档, LOADING-装板中, CLOSED-已关闭',
    total_uld_limit INT DEFAULT 0 COMMENT '总板箱限额',
    total_weight_limit DECIMAL(12,2) DEFAULT 0 COMMENT '总重量限额(kg)',
    closed_at DATETIME COMMENT '关闭时间',
    closed_by BIGINT COMMENT '关闭人',
    created_by BIGINT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_flight_no (flight_no),
    INDEX idx_status (status),
    INDEX idx_scheduled_dep (scheduled_departure)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 板箱表
CREATE TABLE IF NOT EXISTS uld (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    uld_code VARCHAR(32) NOT NULL UNIQUE COMMENT '板箱号',
    uld_type VARCHAR(16) NOT NULL COMMENT '板箱类型 PMC/AKE等',
    flight_id BIGINT COMMENT '所属航班',
    weight_limit DECIMAL(12,2) NOT NULL COMMENT '限重(kg)',
    current_weight DECIMAL(12,2) DEFAULT 0 COMMENT '当前已装重量(kg)',
    tare_weight DECIMAL(12,2) DEFAULT 0 COMMENT '板箱自重(kg)',
    review_status VARCHAR(32) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING-待复核, REVIEWING-复核中, PASSED-复核通过, REJECTED-复核退回',
    locked TINYINT(1) DEFAULT 0 COMMENT '是否锁定 0-否 1-是',
    reject_reason VARCHAR(500) COMMENT '退回原因',
    reviewed_by BIGINT COMMENT '复核人',
    reviewed_at DATETIME COMMENT '复核时间',
    created_by BIGINT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version INT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号',
    INDEX idx_flight_id (flight_id),
    INDEX idx_uld_code (uld_code),
    INDEX idx_review_status (review_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 货邮单表
CREATE TABLE IF NOT EXISTS waybill (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    waybill_no VARCHAR(64) NOT NULL UNIQUE COMMENT '货邮单号',
    flight_id BIGINT COMMENT '所属航班',
    shipper VARCHAR(128) COMMENT '托运人',
    consignee VARCHAR(128) COMMENT '收货人',
    pieces INT NOT NULL COMMENT '件数',
    weight DECIMAL(12,2) NOT NULL COMMENT '重量(kg)',
    volume DECIMAL(12,4) COMMENT '体积(m3)',
    goods_description VARCHAR(500) COMMENT '货物描述',
    dangerous_flag TINYINT(1) DEFAULT 0 COMMENT '危险品标记 0-否 1-是',
    dangerous_level VARCHAR(8) COMMENT '危险品等级',
    security_status VARCHAR(32) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING-待安检, PASSED-安检通过, REJECTED-安检拒绝',
    inspected_by BIGINT COMMENT '安检人',
    inspected_at DATETIME COMMENT '安检时间',
    security_remark VARCHAR(500) COMMENT '安检备注',
    loaded_status VARCHAR(32) NOT NULL DEFAULT 'UNLOADED' COMMENT 'UNLOADED-未装, LOADED-已装, UNLOADED_REVIEW-已装后卸下',
    current_uld_id BIGINT COMMENT '当前所在板箱',
    locked TINYINT(1) DEFAULT 0 COMMENT '是否锁定 0-否 1-是',
    created_by BIGINT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_waybill_no (waybill_no),
    INDEX idx_flight_id (flight_id),
    INDEX idx_current_uld_id (current_uld_id),
    INDEX idx_loaded_status (loaded_status),
    INDEX idx_security_status (security_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 装板记录表
CREATE TABLE IF NOT EXISTS load_record (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    waybill_id BIGINT NOT NULL,
    uld_id BIGINT NOT NULL,
    operation_type VARCHAR(16) NOT NULL COMMENT 'LOAD-装板, UNLOAD-卸下',
    pieces INT NOT NULL,
    weight DECIMAL(12,2) NOT NULL,
    operator_id BIGINT NOT NULL,
    remark VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_waybill_id (waybill_id),
    INDEX idx_uld_id (uld_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 复核记录表
CREATE TABLE IF NOT EXISTS review_record (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    uld_id BIGINT NOT NULL,
    review_type VARCHAR(16) NOT NULL COMMENT 'SUBMIT-提交复核, PASS-复核通过, REJECT-复核退回',
    expected_weight DECIMAL(12,2) COMMENT '理论重量',
    actual_weight DECIMAL(12,2) COMMENT '实际复核重量',
    weight_diff DECIMAL(12,2) COMMENT '重量差',
    reviewer_id BIGINT NOT NULL,
    reject_reason VARCHAR(500) COMMENT '退回原因',
    unlock_to_status VARCHAR(32) COMMENT '解锁到的状态',
    remark VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_uld_id (uld_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 操作审计日志
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    username VARCHAR(64) NOT NULL,
    operation VARCHAR(64) NOT NULL COMMENT '操作类型',
    target_type VARCHAR(32) COMMENT '操作对象类型 FLIGHT/WAYBILL/ULD',
    target_id BIGINT COMMENT '操作对象ID',
    before_content TEXT COMMENT '变更前内容 JSON',
    after_content TEXT COMMENT '变更后内容 JSON',
    ip_address VARCHAR(64),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_operation (operation),
    INDEX idx_target (target_type, target_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 初始化用户数据 (密码都是 123456，BCrypt 编码)
INSERT INTO sys_user (username, password, real_name, role) VALUES
('operator1', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '张三', 'OPERATOR'),
('operator2', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '李四', 'OPERATOR'),
('inspector1', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '王五', 'INSPECTOR'),
('inspector2', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '赵六', 'INSPECTOR'),
('reviewer1', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '钱七', 'REVIEWER'),
('reviewer2', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '孙八', 'REVIEWER'),
('supervisor1', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '周九', 'SUPERVISOR');

-- 初始化示例航班数据
INSERT INTO flight (flight_no, aircraft_no, departure, arrival, scheduled_departure, status, total_uld_limit, total_weight_limit, created_by) VALUES
('CA1234', 'B-1234', 'PEK', 'SHA', '2026-06-11 08:30:00', 'LOADING', 12, 20000.00, 7),
('MU5678', 'B-5678', 'SHA', 'CAN', '2026-06-11 14:00:00', 'CREATED', 10, 18000.00, 7),
('CZ9012', 'B-9012', 'CAN', 'PEK', '2026-06-12 09:00:00', 'CREATED', 15, 22000.00, 7);

-- 初始化示例板箱数据 (flight_id=1 对应 CA1234)
INSERT INTO uld (uld_code, uld_type, flight_id, weight_limit, current_weight, tare_weight, review_status, locked, created_by) VALUES
('PMC-1001', 'PMC', 1, 5000.00, 0.00, 120.00, 'PENDING', 0, 1),
('PMC-1002', 'PMC', 1, 5000.00, 0.00, 120.00, 'PENDING', 0, 1),
('AKE-2001', 'AKE', 1, 3000.00, 0.00, 80.00, 'PENDING', 0, 1),
('AKE-2002', 'AKE', 1, 3000.00, 0.00, 80.00, 'PENDING', 0, 1),
('PMC-1003', 'PMC', NULL, 5000.00, 0.00, 120.00, 'PENDING', 0, 1);

-- 初始化示例货邮单数据 (flight_id=1 对应 CA1234)
INSERT INTO waybill (waybill_no, flight_id, shipper, consignee, pieces, weight, volume, goods_description, dangerous_flag, dangerous_level, security_status, inspected_by, inspected_at, loaded_status, current_uld_id, locked, created_by) VALUES
('999-12345678', 1, '北京科技有限公司', '上海贸易有限公司', 20, 800.00, 2.5000, '电子产品-笔记本电脑', 0, NULL, 'PASSED', 3, '2026-06-10 10:00:00', 'UNLOADED', NULL, 0, 1),
('999-12345679', 1, '北京服装有限公司', '上海时尚集团', 50, 600.00, 3.0000, '服装-秋冬季外套', 0, NULL, 'PASSED', 3, '2026-06-10 10:30:00', 'UNLOADED', NULL, 0, 1),
('999-12345680', 1, '北京化工研究院', '上海检测中心', 5, 200.00, 0.5000, '实验室试剂', 1, 'CLASS 3', 'PENDING', NULL, NULL, 'UNLOADED', NULL, 0, 1),
('999-12345681', 1, '北京食品公司', '上海餐饮集团', 100, 1200.00, 4.0000, '速冻食品-饺子', 0, NULL, 'PASSED', 4, '2026-06-10 11:00:00', 'UNLOADED', NULL, 0, 1),
('999-12345682', 1, '北京图书发行', '上海新华书店', 200, 500.00, 1.8000, '图书-教材', 0, NULL, 'PENDING', NULL, NULL, 'UNLOADED', NULL, 0, 1),
('999-12345683', 1, '北京精密仪器', '上海研究所', 2, 1500.00, 0.8000, '精密测量仪器', 1, 'CLASS 9', 'PENDING', NULL, NULL, 'UNLOADED', NULL, 0, 1);
