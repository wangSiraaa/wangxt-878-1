package com.cargo.uld.repository;

import com.cargo.uld.entity.Uld;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;

@Repository
public interface UldRepository extends JpaRepository<Uld, Long> {
    Optional<Uld> findByUldCode(String uldCode);
    boolean existsByUldCode(String uldCode);
    List<Uld> findByFlightId(Long flightId);
    Page<Uld> findByFlightId(Long flightId, Pageable pageable);

    @Lock(LockModeType.OPTIMISTIC_FORCE_INCREMENT)
    @Query("SELECT u FROM Uld u WHERE u.id = :id")
    Optional<Uld> findByIdWithLock(@Param("id") Long id);

    Page<Uld> findByFlightIdIsNull(Pageable pageable);
}
