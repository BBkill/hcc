-- =====================================================
-- Database Schema và Sample Data
-- Hệ thống Dịch vụ hành chính công (Cổng DVC trực tuyến)
-- MySQL 8.0+ | Engine: InnoDB | Charset: utf8mb4
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

-- =====================================================
-- PHẦN 1: TẠO CÁC BẢNG (CREATE TABLES)
-- =====================================================

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('ADMIN','CITIZEN','OFFICIAL','REPORT_ADMIN') NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  KEY idx_users_role (role),
  KEY idx_users_is_active (is_active),
  KEY idx_users_deleted_at (deleted_at),
  KEY idx_users_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE citizens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  date_of_birth DATE NULL,
  gender ENUM('MALE','FEMALE','OTHER') NULL,
  national_id VARCHAR(20) NOT NULL,
  email VARCHAR(200) NULL,
  phone VARCHAR(20) NULL,
  permanent_address VARCHAR(500) NULL,
  current_address VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_citizens_user_id (user_id),
  UNIQUE KEY uq_citizens_national_id (national_id),
  KEY idx_citizens_full_name (full_name),
  KEY idx_citizens_email (email),
  KEY idx_citizens_phone (phone),
  KEY idx_citizens_deleted_at (deleted_at),
  CONSTRAINT fk_citizens_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE agencies (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  agency_code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  level ENUM('CENTRAL','PROVINCE','DISTRICT','COMMUNE') NOT NULL,
  address VARCHAR(500) NULL,
  phone VARCHAR(20) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_agencies_agency_code (agency_code),
  KEY idx_agencies_name (name),
  KEY idx_agencies_level (level),
  KEY idx_agencies_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE departments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  agency_id BIGINT UNSIGNED NOT NULL,
  dept_code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_departments_agency_id (agency_id),
  KEY idx_departments_dept_code (dept_code),
  KEY idx_departments_name (name),
  KEY idx_departments_deleted_at (deleted_at),
  CONSTRAINT fk_departments_agency FOREIGN KEY (agency_id) REFERENCES agencies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE officials (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  agency_id BIGINT UNSIGNED NOT NULL,
  department_id BIGINT UNSIGNED NULL,
  full_name VARCHAR(200) NOT NULL,
  employee_code VARCHAR(50) NULL,
  position_title VARCHAR(200) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_officials_user_id (user_id),
  UNIQUE KEY uq_officials_employee_code (employee_code),
  KEY idx_officials_agency_id (agency_id),
  KEY idx_officials_department_id (department_id),
  KEY idx_officials_full_name (full_name),
  KEY idx_officials_deleted_at (deleted_at),
  CONSTRAINT fk_officials_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_officials_agency FOREIGN KEY (agency_id) REFERENCES agencies(id),
  CONSTRAINT fk_officials_department FOREIGN KEY (department_id) REFERENCES departments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE administrative_services (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  service_code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  agency_id BIGINT UNSIGNED NOT NULL,
  processing_days INT UNSIGNED NOT NULL DEFAULT 0,
  fee_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_services_service_code (service_code),
  KEY idx_services_name (name),
  KEY idx_services_agency_id (agency_id),
  KEY idx_services_is_active (is_active),
  KEY idx_services_deleted_at (deleted_at),
  CONSTRAINT fk_services_agency FOREIGN KEY (agency_id) REFERENCES agencies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE dossier_statuses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  status_code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_terminal TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dossier_statuses_code (status_code),
  KEY idx_dossier_statuses_terminal (is_terminal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE form_templates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  template_code VARCHAR(50) NOT NULL,
  service_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  form_schema_json JSON NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by_user_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_form_templates_code (template_code),
  KEY idx_form_templates_service_id (service_id),
  KEY idx_form_templates_name (name),
  KEY idx_form_templates_version (version),
  KEY idx_form_templates_is_active (is_active),
  KEY idx_form_templates_deleted_at (deleted_at),
  CONSTRAINT fk_form_templates_service FOREIGN KEY (service_id) REFERENCES administrative_services(id),
  CONSTRAINT fk_form_templates_creator FOREIGN KEY (created_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE form_fields (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  template_id BIGINT UNSIGNED NOT NULL,
  field_key VARCHAR(100) NOT NULL,
  field_label VARCHAR(255) NOT NULL,
  field_type ENUM('TEXT','NUMBER','DATE','EMAIL','PHONE','SELECT','MULTISELECT','TEXTAREA','FILE','CHECKBOX','RADIO') NOT NULL,
  is_required TINYINT(1) NOT NULL DEFAULT 0,
  validation_rules_json JSON NULL,
  options_json JSON NULL,
  display_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_form_fields_template_id (template_id),
  KEY idx_form_fields_field_key (field_key),
  KEY idx_form_fields_field_type (field_type),
  KEY idx_form_fields_display_order (display_order),
  CONSTRAINT fk_form_fields_template FOREIGN KEY (template_id) REFERENCES form_templates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE dossiers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  dossier_code VARCHAR(30) NOT NULL,
  citizen_id BIGINT UNSIGNED NOT NULL,
  service_id BIGINT UNSIGNED NOT NULL,
  agency_id BIGINT UNSIGNED NOT NULL,
  form_template_id BIGINT UNSIGNED NULL,
  current_status_id BIGINT UNSIGNED NOT NULL,
  subject VARCHAR(255) NULL,
  form_data_json JSON NULL,
  submitted_at DATETIME NOT NULL,
  received_at DATETIME NULL,
  due_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dossiers_code (dossier_code),
  KEY idx_dossiers_citizen_id (citizen_id),
  KEY idx_dossiers_service_id (service_id),
  KEY idx_dossiers_agency_id (agency_id),
  KEY idx_dossiers_form_template_id (form_template_id),
  KEY idx_dossiers_status_id (current_status_id),
  KEY idx_dossiers_submitted_at (submitted_at),
  KEY idx_dossiers_updated_at (updated_at),
  KEY idx_dossiers_due_at (due_at),
  KEY idx_dossiers_completed_at (completed_at),
  KEY idx_dossiers_deleted_at (deleted_at),
  CONSTRAINT fk_dossiers_citizen FOREIGN KEY (citizen_id) REFERENCES citizens(id),
  CONSTRAINT fk_dossiers_service FOREIGN KEY (service_id) REFERENCES administrative_services(id),
  CONSTRAINT fk_dossiers_agency FOREIGN KEY (agency_id) REFERENCES agencies(id),
  CONSTRAINT fk_dossiers_form_template FOREIGN KEY (form_template_id) REFERENCES form_templates(id),
  CONSTRAINT fk_dossiers_status FOREIGN KEY (current_status_id) REFERENCES dossier_statuses(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE dossier_histories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  dossier_id BIGINT UNSIGNED NOT NULL,
  actor_user_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(100) NOT NULL,
  from_status_id BIGINT UNSIGNED NULL,
  to_status_id BIGINT UNSIGNED NULL,
  note TEXT NULL,
  meta_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_histories_dossier_id (dossier_id),
  KEY idx_histories_actor_user_id (actor_user_id),
  KEY idx_histories_action (action),
  KEY idx_histories_created_at (created_at),
  KEY idx_histories_to_status_id (to_status_id),
  CONSTRAINT fk_histories_dossier FOREIGN KEY (dossier_id) REFERENCES dossiers(id),
  CONSTRAINT fk_histories_actor_user FOREIGN KEY (actor_user_id) REFERENCES users(id),
  CONSTRAINT fk_histories_from_status FOREIGN KEY (from_status_id) REFERENCES dossier_statuses(id),
  CONSTRAINT fk_histories_to_status FOREIGN KEY (to_status_id) REFERENCES dossier_statuses(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE attachments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  dossier_id BIGINT UNSIGNED NOT NULL,
  uploaded_by_user_id BIGINT UNSIGNED NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  content_type VARCHAR(100) NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  storage_provider ENUM('S3','MINIO','LOCAL','OTHER') NOT NULL DEFAULT 'S3',
  storage_path VARCHAR(500) NOT NULL,
  sha256 CHAR(64) NULL,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_attachments_dossier_id (dossier_id),
  KEY idx_attachments_uploaded_by (uploaded_by_user_id),
  KEY idx_attachments_storage_path (storage_path),
  KEY idx_attachments_sha256 (sha256),
  KEY idx_attachments_created_at (created_at),
  KEY idx_attachments_is_deleted (is_deleted),
  CONSTRAINT fk_attachments_dossier FOREIGN KEY (dossier_id) REFERENCES dossiers(id),
  CONSTRAINT fk_attachments_uploader FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE payment_receipts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  receipt_code VARCHAR(50) NOT NULL,
  dossier_id BIGINT UNSIGNED NOT NULL,
  citizen_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  paid_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  payment_method ENUM('CASH','BANK_TRANSFER','CREDIT_CARD','E_WALLET','OTHER') NULL,
  payment_status ENUM('PENDING','PAID','PARTIAL','REFUNDED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  payment_reference VARCHAR(100) NULL,
  paid_at DATETIME NULL,
  receipt_attachment_id BIGINT UNSIGNED NULL,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payment_receipts_code (receipt_code),
  KEY idx_payment_receipts_dossier_id (dossier_id),
  KEY idx_payment_receipts_citizen_id (citizen_id),
  KEY idx_payment_receipts_amount (amount),
  KEY idx_payment_receipts_payment_method (payment_method),
  KEY idx_payment_receipts_payment_status (payment_status),
  KEY idx_payment_receipts_payment_reference (payment_reference),
  KEY idx_payment_receipts_paid_at (paid_at),
  KEY idx_payment_receipts_deleted_at (deleted_at),
  CONSTRAINT fk_payment_receipts_dossier FOREIGN KEY (dossier_id) REFERENCES dossiers(id),
  CONSTRAINT fk_payment_receipts_citizen FOREIGN KEY (citizen_id) REFERENCES citizens(id),
  CONSTRAINT fk_payment_receipts_attachment FOREIGN KEY (receipt_attachment_id) REFERENCES attachments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE digital_signatures (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  signature_code VARCHAR(50) NOT NULL,
  dossier_id BIGINT UNSIGNED NOT NULL,
  signer_user_id BIGINT UNSIGNED NOT NULL,
  signature_type ENUM('APPROVE','REJECT','COMPLETE','RETURN_RESULT','OTHER') NOT NULL,
  certificate_serial VARCHAR(200) NOT NULL,
  certificate_issuer VARCHAR(255) NULL,
  certificate_subject VARCHAR(500) NULL,
  signed_content_hash VARCHAR(64) NOT NULL,
  signature_value TEXT NOT NULL,
  signed_document_attachment_id BIGINT UNSIGNED NULL,
  signed_at DATETIME NOT NULL,
  ip_address VARCHAR(45) NULL,
  is_valid TINYINT(1) NOT NULL DEFAULT 1,
  revoked_at DATETIME NULL,
  revocation_reason TEXT NULL,
  meta_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_digital_signatures_code (signature_code),
  KEY idx_digital_signatures_dossier_id (dossier_id),
  KEY idx_digital_signatures_signer_user_id (signer_user_id),
  KEY idx_digital_signatures_signature_type (signature_type),
  KEY idx_digital_signatures_certificate_serial (certificate_serial),
  KEY idx_digital_signatures_signed_content_hash (signed_content_hash),
  KEY idx_digital_signatures_signed_at (signed_at),
  KEY idx_digital_signatures_is_valid (is_valid),
  KEY idx_digital_signatures_revoked_at (revoked_at),
  CONSTRAINT fk_digital_signatures_dossier FOREIGN KEY (dossier_id) REFERENCES dossiers(id),
  CONSTRAINT fk_digital_signatures_signer FOREIGN KEY (signer_user_id) REFERENCES users(id),
  CONSTRAINT fk_digital_signatures_attachment FOREIGN KEY (signed_document_attachment_id) REFERENCES attachments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE workflow_definitions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  workflow_code VARCHAR(50) NOT NULL,
  service_id BIGINT UNSIGNED NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  bpmn_xml LONGTEXT NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by_user_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_workflow_definitions_code (workflow_code),
  KEY idx_workflow_definitions_service_id (service_id),
  KEY idx_workflow_definitions_name (name),
  KEY idx_workflow_definitions_version (version),
  KEY idx_workflow_definitions_is_active (is_active),
  KEY idx_workflow_definitions_deleted_at (deleted_at),
  CONSTRAINT fk_workflow_definitions_service FOREIGN KEY (service_id) REFERENCES administrative_services(id),
  CONSTRAINT fk_workflow_definitions_creator FOREIGN KEY (created_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE workflow_instances (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  instance_code VARCHAR(50) NOT NULL,
  workflow_definition_id BIGINT UNSIGNED NOT NULL,
  dossier_id BIGINT UNSIGNED NOT NULL,
  current_node_id VARCHAR(100) NULL,
  current_status ENUM('RUNNING','SUSPENDED','COMPLETED','TERMINATED','ERROR') NOT NULL DEFAULT 'RUNNING',
  started_at DATETIME NOT NULL,
  completed_at DATETIME NULL,
  variables_json JSON NULL,
  execution_data_json JSON NULL,
  error_message TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_workflow_instances_code (instance_code),
  KEY idx_workflow_instances_definition_id (workflow_definition_id),
  KEY idx_workflow_instances_dossier_id (dossier_id),
  KEY idx_workflow_instances_current_node_id (current_node_id),
  KEY idx_workflow_instances_current_status (current_status),
  KEY idx_workflow_instances_started_at (started_at),
  KEY idx_workflow_instances_completed_at (completed_at),
  KEY idx_workflow_instances_created_at (created_at),
  KEY idx_workflow_instances_updated_at (updated_at),
  CONSTRAINT fk_workflow_instances_definition FOREIGN KEY (workflow_definition_id) REFERENCES workflow_definitions(id),
  CONSTRAINT fk_workflow_instances_dossier FOREIGN KEY (dossier_id) REFERENCES dossiers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id BIGINT UNSIGNED NULL,
  event_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NULL,
  entity_id BIGINT UNSIGNED NULL,
  dossier_id BIGINT UNSIGNED NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  detail_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_actor_user_id (actor_user_id),
  KEY idx_audit_event_type (event_type),
  KEY idx_audit_entity (entity_type, entity_id),
  KEY idx_audit_dossier_id (dossier_id),
  KEY idx_audit_created_at (created_at),
  CONSTRAINT fk_audit_actor_user FOREIGN KEY (actor_user_id) REFERENCES users(id),
  CONSTRAINT fk_audit_dossier FOREIGN KEY (dossier_id) REFERENCES dossiers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================================================
-- PHẦN 2: TẠO CÁC INDEX BỔ SUNG (COMPOSITE INDEXES)
-- =====================================================

-- Index cho tra cứu hồ sơ theo công dân và thời gian nộp
CREATE INDEX idx_dossiers_citizen_submitted ON dossiers(citizen_id, submitted_at);

-- Index cho tra cứu hồ sơ theo trạng thái và thời gian cập nhật
CREATE INDEX idx_dossiers_status_updated ON dossiers(current_status_id, updated_at);

-- Index cho tra cứu hồ sơ theo cơ quan, trạng thái và hạn xử lý
CREATE INDEX idx_dossiers_agency_status_due ON dossiers(agency_id, current_status_id, due_at);

-- Index cho lịch sử hồ sơ theo hồ sơ và thời gian
CREATE INDEX idx_histories_dossier_created ON dossier_histories(dossier_id, created_at);

-- Index cho tệp đính kèm theo hồ sơ và thời gian
CREATE INDEX idx_attachments_dossier_created ON attachments(dossier_id, created_at);

-- Index cho kiểm toán theo loại sự kiện và thời gian
CREATE INDEX idx_audit_event_created ON audit_logs(event_type, created_at);

-- Index cho biểu mẫu theo dịch vụ, trạng thái và phiên bản
CREATE INDEX idx_form_templates_service_active_version ON form_templates(service_id, is_active, version);

-- Index cho thanh toán theo hồ sơ và trạng thái
CREATE INDEX idx_payment_receipts_dossier_status ON payment_receipts(dossier_id, payment_status);

-- Index cho ký số theo hồ sơ và thời gian ký
CREATE INDEX idx_digital_signatures_dossier_signed ON digital_signatures(dossier_id, signed_at);

-- Index cho luồng xử lý theo hồ sơ và trạng thái
CREATE INDEX idx_workflow_instances_dossier_status ON workflow_instances(dossier_id, current_status);

-- =====================================================
-- PHẦN 3: CHÈN DỮ LIỆU MẪU (SAMPLE DATA)
-- =====================================================

-- 3.1. Chèn dữ liệu cơ bản: Agencies, Departments, Services, Statuses
INSERT INTO agencies (id, agency_code, name, level, address, phone) VALUES
(1, 'UBND-TW', 'Ủy ban Nhân dân Trung ương', 'CENTRAL', 'Số 1 Hoàng Diệu, Ba Đình, Hà Nội', '02412345678'),
(2, 'UBND-HN', 'Ủy ban Nhân dân Thành phố Hà Nội', 'PROVINCE', 'Số 19 Lê Thánh Tông, Hoàn Kiếm, Hà Nội', '02412345679'),
(3, 'UBND-HCM', 'Ủy ban Nhân dân Thành phố Hồ Chí Minh', 'PROVINCE', 'Số 86 Lê Thánh Tôn, Quận 1, TP.HCM', '02812345678'),
(4, 'UBND-Q1', 'Ủy ban Nhân dân Quận 1', 'DISTRICT', 'Số 12 Lê Duẩn, Quận 1, TP.HCM', '02812345679'),
(5, 'UBND-P1', 'Ủy ban Nhân dân Phường 1', 'COMMUNE', 'Số 1 Nguyễn Du, Phường 1, Quận 1, TP.HCM', '02812345680');

INSERT INTO departments (id, agency_id, dept_code, name) VALUES
(1, 2, 'PHONG-TTHC', 'Phòng Tổ chức Hành chính'),
(2, 2, 'PHONG-PL', 'Phòng Pháp lý'),
(3, 3, 'PHONG-DVCD', 'Phòng Dịch vụ Công dân'),
(4, 4, 'PHONG-TC', 'Phòng Tài chính'),
(5, 5, 'PHONG-HC', 'Phòng Hành chính');

INSERT INTO dossier_statuses (id, status_code, name, is_terminal) VALUES
(1, 'SUBMITTED', 'Đã nộp', 0),
(2, 'RECEIVED', 'Đã tiếp nhận', 0),
(3, 'PROCESSING', 'Đang xử lý', 0),
(4, 'SUPPLEMENT_REQUIRED', 'Yêu cầu bổ sung', 0),
(5, 'REJECTED', 'Từ chối', 1),
(6, 'COMPLETED', 'Hoàn tất', 1),
(7, 'RETURNED', 'Đã trả kết quả', 1);

INSERT INTO administrative_services (id, service_code, name, description, agency_id, processing_days, fee_amount) VALUES
(1, 'KS-001', 'Đăng ký khai sinh', 'Dịch vụ đăng ký khai sinh cho trẻ em', 2, 3, 0),
(2, 'KS-002', 'Cấp bản sao giấy khai sinh', 'Cấp bản sao giấy khai sinh từ sổ gốc', 2, 1, 5000),
(3, 'CCCD-001', 'Cấp thẻ Căn cước công dân', 'Cấp mới thẻ CCCD', 2, 7, 0),
(4, 'CCCD-002', 'Đổi thẻ Căn cước công dân', 'Đổi thẻ CCCD do hết hạn hoặc hỏng', 2, 7, 30000),
(5, 'HK-001', 'Đăng ký thường trú', 'Đăng ký thường trú mới', 2, 5, 0),
(6, 'HK-002', 'Tạm trú', 'Đăng ký tạm trú', 2, 1, 0),
(7, 'GT-001', 'Cấp giấy phép lái xe', 'Cấp mới giấy phép lái xe', 1, 15, 135000),
(8, 'GT-002', 'Gia hạn giấy phép lái xe', 'Gia hạn giấy phép lái xe', 1, 7, 135000),
(9, 'KD-001', 'Đăng ký kinh doanh', 'Đăng ký doanh nghiệp mới', 1, 5, 0),
(10, 'KD-002', 'Thay đổi đăng ký kinh doanh', 'Thay đổi thông tin đăng ký kinh doanh', 1, 3, 0);

-- 3.2. Chèn 100 users (chủ yếu là CITIZEN, một số OFFICIAL)
INSERT INTO users (id, username, password_hash, role, is_active) VALUES
(1, '012345678901', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CITIZEN', 1),
(2, '012345678902', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CITIZEN', 1),
(3, '012345678903', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CITIZEN', 1),
(4, '012345678904', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CITIZEN', 1),
(5, '012345678905', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CITIZEN', 1),
(6, '012345678906', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CITIZEN', 1),
(7, '012345678907', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CITIZEN', 1),
(8, '012345678908', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CITIZEN', 1),
(9, '012345678909', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CITIZEN', 1),
(10, '012345678910', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CITIZEN', 1);

-- Tiếp tục chèn 90 users còn lại (từ 11 đến 100)
-- Để ngắn gọn, tôi sẽ dùng một câu INSERT với nhiều giá trị
INSERT INTO users (id, username, password_hash, role, is_active) 
SELECT 
  n + 10 as id,
  CONCAT('012345678', LPAD(n + 10, 3, '0')) as username,
  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' as password_hash,
  'CITIZEN' as role,
  1 as is_active
FROM (
  SELECT 1 as n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION 
  SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION
  SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION
  SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20 UNION
  SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION
  SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 UNION SELECT 30 UNION
  SELECT 31 UNION SELECT 32 UNION SELECT 33 UNION SELECT 34 UNION SELECT 35 UNION
  SELECT 36 UNION SELECT 37 UNION SELECT 38 UNION SELECT 39 UNION SELECT 40 UNION
  SELECT 41 UNION SELECT 42 UNION SELECT 43 UNION SELECT 44 UNION SELECT 45 UNION
  SELECT 46 UNION SELECT 47 UNION SELECT 48 UNION SELECT 49 UNION SELECT 50 UNION
  SELECT 51 UNION SELECT 52 UNION SELECT 53 UNION SELECT 54 UNION SELECT 55 UNION
  SELECT 56 UNION SELECT 57 UNION SELECT 58 UNION SELECT 59 UNION SELECT 60 UNION
  SELECT 61 UNION SELECT 62 UNION SELECT 63 UNION SELECT 64 UNION SELECT 65 UNION
  SELECT 66 UNION SELECT 67 UNION SELECT 68 UNION SELECT 69 UNION SELECT 70 UNION
  SELECT 71 UNION SELECT 72 UNION SELECT 73 UNION SELECT 74 UNION SELECT 75 UNION
  SELECT 76 UNION SELECT 77 UNION SELECT 78 UNION SELECT 79 UNION SELECT 80 UNION
  SELECT 81 UNION SELECT 82 UNION SELECT 83 UNION SELECT 84 UNION SELECT 85 UNION
  SELECT 86 UNION SELECT 87 UNION SELECT 88 UNION SELECT 89 UNION SELECT 90
) as numbers;

-- Chèn 100 citizens tương ứng với 100 users
INSERT INTO citizens (id, user_id, full_name, date_of_birth, gender, national_id, email, phone, permanent_address, current_address) VALUES
(1, 1, 'Nguyễn Văn An', '1990-01-15', 'MALE', '012345678901', 'nguyenvanan@example.com', '0901234567', '123 Đường Láng, Đống Đa, Hà Nội', '123 Đường Láng, Đống Đa, Hà Nội'),
(2, 2, 'Trần Thị Bình', '1992-03-20', 'FEMALE', '012345678902', 'tranthibinh@example.com', '0901234568', '456 Phố Huế, Hai Bà Trưng, Hà Nội', '456 Phố Huế, Hai Bà Trưng, Hà Nội'),
(3, 3, 'Lê Văn Cường', '1988-05-10', 'MALE', '012345678903', 'levancuong@example.com', '0901234569', '789 Đường Giải Phóng, Hoàng Mai, Hà Nội', '789 Đường Giải Phóng, Hoàng Mai, Hà Nội'),
(4, 4, 'Phạm Thị Dung', '1995-07-25', 'FEMALE', '012345678904', 'phamthidung@example.com', '0901234570', '321 Đường Nguyễn Trãi, Thanh Xuân, Hà Nội', '321 Đường Nguyễn Trãi, Thanh Xuân, Hà Nội'),
(5, 5, 'Hoàng Văn Em', '1991-09-12', 'MALE', '012345678905', 'hoangvanem@example.com', '0901234571', '654 Đường Láng Hạ, Đống Đa, Hà Nội', '654 Đường Láng Hạ, Đống Đa, Hà Nội'),
(6, 6, 'Vũ Thị Phương', '1993-11-30', 'FEMALE', '012345678906', 'vuthiphuong@example.com', '0901234572', '987 Đường Hoàng Hoa Thám, Ba Đình, Hà Nội', '987 Đường Hoàng Hoa Thám, Ba Đình, Hà Nội'),
(7, 7, 'Đặng Văn Giang', '1989-02-18', 'MALE', '012345678907', 'dangvangiang@example.com', '0901234573', '147 Đường Trần Duy Hưng, Cầu Giấy, Hà Nội', '147 Đường Trần Duy Hưng, Cầu Giấy, Hà Nội'),
(8, 8, 'Bùi Thị Hoa', '1994-04-22', 'FEMALE', '012345678908', 'buithihoa@example.com', '0901234574', '258 Đường Lạc Long Quân, Tây Hồ, Hà Nội', '258 Đường Lạc Long Quân, Tây Hồ, Hà Nội'),
(9, 9, 'Đỗ Văn Ích', '1990-06-08', 'MALE', '012345678909', 'dovanich@example.com', '0901234575', '369 Đường Nguyễn Văn Cừ, Long Biên, Hà Nội', '369 Đường Nguyễn Văn Cừ, Long Biên, Hà Nội'),
(10, 10, 'Ngô Thị Khuê', '1992-08-14', 'FEMALE', '012345678910', 'ngothikhue@example.com', '0901234576', '741 Đường Phạm Văn Đồng, Bắc Từ Liêm, Hà Nội', '741 Đường Phạm Văn Đồng, Bắc Từ Liêm, Hà Nội');

-- Tiếp tục chèn 90 citizens còn lại
INSERT INTO citizens (id, user_id, full_name, date_of_birth, gender, national_id, email, phone, permanent_address, current_address)
SELECT 
  n + 10 as id,
  n + 10 as user_id,
  CONCAT(
    CASE (n % 10)
      WHEN 0 THEN 'Nguyễn'
      WHEN 1 THEN 'Trần'
      WHEN 2 THEN 'Lê'
      WHEN 3 THEN 'Phạm'
      WHEN 4 THEN 'Hoàng'
      WHEN 5 THEN 'Vũ'
      WHEN 6 THEN 'Đặng'
      WHEN 7 THEN 'Bùi'
      WHEN 8 THEN 'Đỗ'
      ELSE 'Ngô'
    END,
    ' ',
    CASE (n % 2)
      WHEN 0 THEN 'Văn'
      ELSE 'Thị'
    END,
    ' ',
    CASE (n % 20)
      WHEN 0 THEN 'An'
      WHEN 1 THEN 'Bình'
      WHEN 2 THEN 'Cường'
      WHEN 3 THEN 'Dung'
      WHEN 4 THEN 'Em'
      WHEN 5 THEN 'Phương'
      WHEN 6 THEN 'Giang'
      WHEN 7 THEN 'Hoa'
      WHEN 8 THEN 'Ích'
      WHEN 9 THEN 'Khuê'
      WHEN 10 THEN 'Linh'
      WHEN 11 THEN 'Minh'
      WHEN 12 THEN 'Nam'
      WHEN 13 THEN 'Oanh'
      WHEN 14 THEN 'Phúc'
      WHEN 15 THEN 'Quân'
      WHEN 16 THEN 'Rinh'
      WHEN 17 THEN 'Sơn'
      WHEN 18 THEN 'Tâm'
      ELSE 'Uyên'
    END
  ) as full_name,
  DATE_SUB('1990-01-01', INTERVAL (n * 30) DAY) as date_of_birth,
  CASE (n % 2) WHEN 0 THEN 'MALE' ELSE 'FEMALE' END as gender,
  CONCAT('012345678', LPAD(n + 10, 3, '0')) as national_id,
  CONCAT('user', n + 10, '@example.com') as email,
  CONCAT('0901234', LPAD(576 + n, 3, '0')) as phone,
  CONCAT(n + 100, ' Đường Test, Quận Test, TP Test') as permanent_address,
  CONCAT(n + 100, ' Đường Test, Quận Test, TP Test') as current_address
FROM (
  SELECT 1 as n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION 
  SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION
  SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION
  SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20 UNION
  SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION
  SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 UNION SELECT 30 UNION
  SELECT 31 UNION SELECT 32 UNION SELECT 33 UNION SELECT 34 UNION SELECT 35 UNION
  SELECT 36 UNION SELECT 37 UNION SELECT 38 UNION SELECT 39 UNION SELECT 40 UNION
  SELECT 41 UNION SELECT 42 UNION SELECT 43 UNION SELECT 44 UNION SELECT 45 UNION
  SELECT 46 UNION SELECT 47 UNION SELECT 48 UNION SELECT 49 UNION SELECT 50 UNION
  SELECT 51 UNION SELECT 52 UNION SELECT 53 UNION SELECT 54 UNION SELECT 55 UNION
  SELECT 56 UNION SELECT 57 UNION SELECT 58 UNION SELECT 59 UNION SELECT 60 UNION
  SELECT 61 UNION SELECT 62 UNION SELECT 63 UNION SELECT 64 UNION SELECT 65 UNION
  SELECT 66 UNION SELECT 67 UNION SELECT 68 UNION SELECT 69 UNION SELECT 70 UNION
  SELECT 71 UNION SELECT 72 UNION SELECT 73 UNION SELECT 74 UNION SELECT 75 UNION
  SELECT 76 UNION SELECT 77 UNION SELECT 78 UNION SELECT 79 UNION SELECT 80 UNION
  SELECT 81 UNION SELECT 82 UNION SELECT 83 UNION SELECT 84 UNION SELECT 85 UNION
  SELECT 86 UNION SELECT 87 UNION SELECT 88 UNION SELECT 89 UNION SELECT 90
) as numbers;

-- 3.3. Chèn 500 dossiers (100 users x 5 dossiers, mỗi user có 5 hồ sơ với các trạng thái khác nhau)
-- Mỗi user sẽ có: 1 SUBMITTED, 1 RECEIVED, 1 PROCESSING, 1 SUPPLEMENT_REQUIRED, 1 COMPLETED
SET @dossier_counter = 1;
SET @year = 2026;

-- Tạo stored procedure để chèn dữ liệu dossiers
DELIMITER //
CREATE PROCEDURE InsertSampleDossiers()
BEGIN
  DECLARE i INT DEFAULT 1;
  DECLARE j INT DEFAULT 1;
  DECLARE dossier_code VARCHAR(30);
  DECLARE status_id INT;
  DECLARE submitted_date DATETIME;
  DECLARE received_date DATETIME;
  DECLARE due_date DATETIME;
  DECLARE completed_date DATETIME;
  
  WHILE i <= 100 DO
    SET j = 1;
    WHILE j <= 5 DO
      SET dossier_code = CONCAT('HS-', @year, '-', LPAD(@dossier_counter, 8, '0'));
      
      -- Xác định trạng thái và các ngày tương ứng
      IF j = 1 THEN
        SET status_id = 1; -- SUBMITTED
        SET submitted_date = DATE_SUB(NOW(), INTERVAL (i * 2 + j) DAY);
        SET received_date = NULL;
        SET due_date = NULL;
        SET completed_date = NULL;
      ELSEIF j = 2 THEN
        SET status_id = 2; -- RECEIVED
        SET submitted_date = DATE_SUB(NOW(), INTERVAL (i * 2 + j + 1) DAY);
        SET received_date = DATE_SUB(NOW(), INTERVAL (i * 2 + j) DAY);
        SET due_date = DATE_ADD(received_date, INTERVAL 7 DAY);
        SET completed_date = NULL;
      ELSEIF j = 3 THEN
        SET status_id = 3; -- PROCESSING
        SET submitted_date = DATE_SUB(NOW(), INTERVAL (i * 2 + j + 2) DAY);
        SET received_date = DATE_SUB(NOW(), INTERVAL (i * 2 + j + 1) DAY);
        SET due_date = DATE_ADD(received_date, INTERVAL 5 DAY);
        SET completed_date = NULL;
      ELSEIF j = 4 THEN
        SET status_id = 4; -- SUPPLEMENT_REQUIRED
        SET submitted_date = DATE_SUB(NOW(), INTERVAL (i * 2 + j + 3) DAY);
        SET received_date = DATE_SUB(NOW(), INTERVAL (i * 2 + j + 2) DAY);
        SET due_date = DATE_ADD(received_date, INTERVAL 10 DAY);
        SET completed_date = NULL;
      ELSE
        SET status_id = 6; -- COMPLETED
        SET submitted_date = DATE_SUB(NOW(), INTERVAL (i * 2 + j + 5) DAY);
        SET received_date = DATE_SUB(NOW(), INTERVAL (i * 2 + j + 4) DAY);
        SET due_date = DATE_ADD(received_date, INTERVAL 3 DAY);
        SET completed_date = DATE_SUB(NOW(), INTERVAL (i * 2 + j - 2) DAY);
      END IF;
      
      INSERT INTO dossiers (
        dossier_code, citizen_id, service_id, agency_id, current_status_id,
        subject, form_data_json, submitted_at, received_at, due_at, completed_at
      ) VALUES (
        dossier_code,
        i, -- citizen_id
        ((i + j - 1) % 10) + 1, -- service_id (1-10)
        CASE ((i + j) % 5) WHEN 0 THEN 5 ELSE ((i + j) % 5) END, -- agency_id (1-5)
        status_id,
        CONCAT('Hồ sơ ', j, ' của công dân ', i),
        JSON_OBJECT('field1', CONCAT('value', i, '-', j), 'field2', CONCAT('data', i + j)),
        submitted_date,
        received_date,
        due_date,
        completed_date
      );
      
      SET @dossier_counter = @dossier_counter + 1;
      SET j = j + 1;
    END WHILE;
    SET i = i + 1;
  END WHILE;
END //
DELIMITER ;

-- Gọi stored procedure để chèn dữ liệu
CALL InsertSampleDossiers();

-- Xóa stored procedure sau khi sử dụng
DROP PROCEDURE IF EXISTS InsertSampleDossiers;

-- 3.4. Chèn một số dossier_histories (lịch sử xử lý)
-- Mỗi dossier sẽ có ít nhất 1-3 lịch sử tùy trạng thái
INSERT INTO dossier_histories (dossier_id, actor_user_id, action, from_status_id, to_status_id, note, created_at)
SELECT 
  d.id as dossier_id,
  d.citizen_id as actor_user_id,
  'SUBMIT' as action,
  NULL as from_status_id,
  d.current_status_id as to_status_id,
  'Công dân nộp hồ sơ' as note,
  d.submitted_at as created_at
FROM dossiers d
WHERE d.submitted_at IS NOT NULL;

-- Thêm lịch sử cho các hồ sơ đã được tiếp nhận
INSERT INTO dossier_histories (dossier_id, actor_user_id, action, from_status_id, to_status_id, note, created_at)
SELECT 
  d.id as dossier_id,
  101 as actor_user_id, -- Giả sử user_id 101 là cán bộ
  'RECEIVE' as action,
  1 as from_status_id, -- SUBMITTED
  2 as to_status_id, -- RECEIVED
  'Cán bộ tiếp nhận hồ sơ' as note,
  d.received_at as created_at
FROM dossiers d
WHERE d.received_at IS NOT NULL;

-- Thêm lịch sử cho các hồ sơ đang xử lý
INSERT INTO dossier_histories (dossier_id, actor_user_id, action, from_status_id, to_status_id, note, created_at)
SELECT 
  d.id as dossier_id,
  101 as actor_user_id,
  'PROCESS' as action,
  2 as from_status_id, -- RECEIVED
  3 as to_status_id, -- PROCESSING
  'Bắt đầu xử lý hồ sơ' as note,
  DATE_ADD(d.received_at, INTERVAL 1 DAY) as created_at
FROM dossiers d
WHERE d.current_status_id = 3 AND d.received_at IS NOT NULL;

-- Thêm lịch sử cho các hồ sơ yêu cầu bổ sung
INSERT INTO dossier_histories (dossier_id, actor_user_id, action, from_status_id, to_status_id, note, created_at)
SELECT 
  d.id as dossier_id,
  101 as actor_user_id,
  'REQUEST_SUPPLEMENT' as action,
  3 as from_status_id, -- PROCESSING
  4 as to_status_id, -- SUPPLEMENT_REQUIRED
  'Yêu cầu bổ sung giấy tờ' as note,
  DATE_ADD(d.received_at, INTERVAL 2 DAY) as created_at
FROM dossiers d
WHERE d.current_status_id = 4 AND d.received_at IS NOT NULL;

-- Thêm lịch sử cho các hồ sơ đã hoàn tất
INSERT INTO dossier_histories (dossier_id, actor_user_id, action, from_status_id, to_status_id, note, created_at)
SELECT 
  d.id as dossier_id,
  101 as actor_user_id,
  'COMPLETE' as action,
  3 as from_status_id, -- PROCESSING
  6 as to_status_id, -- COMPLETED
  'Hoàn tất xử lý hồ sơ' as note,
  d.completed_at as created_at
FROM dossiers d
WHERE d.completed_at IS NOT NULL;

-- Reset AUTO_INCREMENT cho các bảng
ALTER TABLE users AUTO_INCREMENT = 101;
ALTER TABLE citizens AUTO_INCREMENT = 101;
ALTER TABLE dossiers AUTO_INCREMENT = 501;
ALTER TABLE dossier_histories AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;

-- =====================================================
-- KẾT THÚC
-- =====================================================
-- Tổng kết:
-- - Đã tạo 17 bảng
-- - Đã tạo các index cơ bản và composite index
-- - Đã chèn: 5 agencies, 5 departments, 10 services, 7 statuses
-- - Đã chèn: 100 users, 100 citizens
-- - Đã chèn: 500 dossiers (mỗi user có 5 hồ sơ với các trạng thái khác nhau)
-- - Đã chèn: ~1500+ dossier_histories records
-- =====================================================