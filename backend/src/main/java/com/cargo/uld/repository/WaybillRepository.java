package com.cargo.uld.repository;

import com.cargo.uld.entity.Waybill;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WaybillRepository extends JpaRepository<Waybill, Long>, JpaSpecificationExecutor<Waybill> {
    Optional<Waybill> findByWaybillNo(String waybillNo);
    boolean existsByWaybillNo(String waybillNo);
    Page<Waybill> findByFlightId(Long flightId, Pageable pageable);
    List<Waybill> findByFlightId(Long flightId);
    Page<Waybill> findByCurrentUldId(Long currentUldId, Pageable pageable);
    List<Waybill> findByCurrentUldId(Long currentUldId);
    List<Waybill> findByCurrentUldIdAndLoadedStatus(Long currentUldId, String loadedStatus);
    boolean existsByCurrentUldIdAndLoadedStatus(Long currentUldId, String loadedStatus);
    Optional<Waybill> findFirstByCurrentUldIdAndLoadedStatus(Long currentUldId, String loadedStatus);
}
