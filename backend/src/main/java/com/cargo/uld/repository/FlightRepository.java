package com.cargo.uld.repository;

import com.cargo.uld.entity.Flight;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FlightRepository extends JpaRepository<Flight, Long>, JpaSpecificationExecutor<Flight> {
    Optional<Flight> findByFlightNo(String flightNo);
    boolean existsByFlightNo(String flightNo);
    Page<Flight> findByStatusNot(String status, Pageable pageable);
    Page<Flight> findByStatus(String status, Pageable pageable);
}
