package com.waad.tba.modules.reviewer.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.common.dto.PaginationResponse;
import com.waad.tba.modules.reviewer.dto.ReviewerCompanyCreateDto;
import com.waad.tba.modules.reviewer.dto.ReviewerCompanyResponseDto;
import com.waad.tba.modules.reviewer.dto.ReviewerCompanySelectorDto;
import com.waad.tba.modules.reviewer.service.ReviewerCompanyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reviewer-companies")
@RequiredArgsConstructor
@Tag(name = "Reviewer Companies", description = "APIs for managing reviewer companies")
public class ReviewerCompanyController {

        private final ReviewerCompanyService service;

        @GetMapping("/selector")
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_REVIEWER')")
        @Operation(summary = "Get reviewer company selector options", description = "Returns active reviewer companies for dropdown/selector")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Reviewer company options retrieved successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class)))
        })
        public ResponseEntity<ApiResponse<List<ReviewerCompanySelectorDto>>> getSelectorOptions() {
                List<ReviewerCompanySelectorDto> options = service.getSelectorOptions();
                return ResponseEntity.ok(ApiResponse.success(options));
        }

        @GetMapping("/all")
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_REVIEWER')")
        @Operation(summary = "List all reviewer companies", description = "Returns all reviewer companies.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Reviewer companies retrieved successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Bad Request", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Forbidden", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Not Found", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal Server Error", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class)))
        })
        public ResponseEntity<ApiResponse<List<ReviewerCompanyResponseDto>>> getAll() {
                List<ReviewerCompanyResponseDto> list = service.findAll();
                return ResponseEntity.ok(ApiResponse.success(list));
        }

        @GetMapping
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_REVIEWER')")
        @Operation(summary = "Paginate reviewer companies", description = "Returns a page of reviewer companies with pagination and optional search.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Reviewer companies page retrieved successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized request"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal server error")
        })
        public ResponseEntity<ApiResponse<PaginationResponse<ReviewerCompanyResponseDto>>> paginate(
                        @Parameter(name = "page", description = "Page number (1-based)") @RequestParam(defaultValue = "1") int page,
                        @Parameter(name = "size", description = "Page size") @RequestParam(defaultValue = "10") int size,
                        @Parameter(name = "search", description = "Search query") @RequestParam(required = false) String search,
                        @Parameter(name = "sortBy", description = "Sort by field") @RequestParam(defaultValue = "createdAt") String sortBy,
                        @Parameter(name = "sortDir", description = "Sort direction") @RequestParam(defaultValue = "desc") String sortDir) {
                org.springframework.data.domain.Pageable pageable = PageRequest.of(Math.max(0, page - 1), size,
                                org.springframework.data.domain.Sort.by(
                                                org.springframework.data.domain.Sort.Direction.fromString(sortDir),
                                                sortBy));
                Page<ReviewerCompanyResponseDto> pageResult = service.findAllPaginated(pageable, search);
                PaginationResponse<ReviewerCompanyResponseDto> response = PaginationResponse
                                .<ReviewerCompanyResponseDto>builder()
                                .items(pageResult.getContent())
                                .total(pageResult.getTotalElements())
                                .page(page)
                                .size(size)
                                .build();
                return ResponseEntity.ok(ApiResponse.success(response));
        }

        @GetMapping("/count")
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_REVIEWER')")
        @Operation(summary = "Count reviewer companies", description = "Returns total number of reviewer companies")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Total count retrieved successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized request"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal server error")
        })
        public ResponseEntity<ApiResponse<Long>> count() {
                long total = service.count();
                return ResponseEntity.ok(ApiResponse.success(total));
        }

        @GetMapping("/{id:\\d+}")
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_REVIEWER')")
        @Operation(summary = "Get reviewer company by ID", description = "Returns a reviewer company by ID.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Reviewer company retrieved successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Reviewer company not found"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized request"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal server error")
        })
        public ResponseEntity<ApiResponse<ReviewerCompanyResponseDto>> getById(
                        @Parameter(name = "id", description = "Reviewer company ID", required = true) @PathVariable Long id) {
                ReviewerCompanyResponseDto dto = service.findById(id);
                return ResponseEntity.ok(ApiResponse.success(dto));
        }

        @PostMapping
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MANAGE_REVIEWER')")
        @Operation(summary = "Create reviewer company", description = "Creates a new reviewer company.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Reviewer company created successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid request payload"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized request"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal server error")
        })
        public ResponseEntity<ApiResponse<ReviewerCompanyResponseDto>> create(
                        @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "Reviewer company creation payload") @Valid @RequestBody ReviewerCompanyCreateDto dto) {
                ReviewerCompanyResponseDto created = service.create(dto);
                return ResponseEntity.status(HttpStatus.CREATED)
                                .body(ApiResponse.success("Reviewer company created successfully", created));
        }

        @PutMapping("/{id:\\d+}")
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MANAGE_REVIEWER')")
        @Operation(summary = "Update reviewer company", description = "Updates an existing reviewer company.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Reviewer company updated successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Reviewer company not found"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid request payload"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized request"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal server error")
        })
        public ResponseEntity<ApiResponse<ReviewerCompanyResponseDto>> update(
                        @Parameter(name = "id", description = "Reviewer company ID", required = true) @PathVariable Long id,
                        @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "Reviewer company update payload") @Valid @RequestBody ReviewerCompanyCreateDto dto) {
                ReviewerCompanyResponseDto updated = service.update(id, dto);
                return ResponseEntity.ok(ApiResponse.success("Reviewer company updated successfully", updated));
        }

        @DeleteMapping("/{id:\\d+}")
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MANAGE_REVIEWER')")
        @Operation(summary = "Delete reviewer company", description = "Deletes a reviewer company by ID.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Reviewer company deleted successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Reviewer company not found"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized request"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal server error")
        })
        public ResponseEntity<ApiResponse<Void>> delete(
                        @Parameter(name = "id", description = "Reviewer company ID", required = true) @PathVariable Long id) {
                service.delete(id);
                return ResponseEntity.ok(ApiResponse.success("Reviewer company deleted successfully", null));
        }

        @GetMapping("/search")
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_REVIEWER')")
        @Operation(summary = "Search reviewer companies", description = "Search reviewer companies by query string.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Reviewer companies retrieved successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized request"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal server error")
        })
        public ResponseEntity<ApiResponse<List<ReviewerCompanyResponseDto>>> search(
                        @Parameter(name = "query", description = "Search query", required = true) @RequestParam String query) {
                List<ReviewerCompanyResponseDto> list = service.search(query);
                return ResponseEntity.ok(ApiResponse.success(list));
        }
}
