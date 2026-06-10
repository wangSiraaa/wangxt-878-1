package com.cargo.uld.repository;

import com.cargo.uld.entity.LoadRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LoadRecordRepository extends JpaRepository<LoadRecord, Long> {
    List<LoadRecord> findByUldIdOrderByCreatedAtDesc(Long uldId);
    List<LoadRecord> findByWaybillIdOrderByCreatedAtDesc(Long waybillId);
    Page<LoadRecord> findByUldId(Long uldId, Pageable pageable);
    Page<LoadRecord> findByWaybillId(Long waybillId, Pageable pageable);
}
