package com.waad.tba.modules.rbac.service;

import com.waad.tba.modules.rbac.dto.PermissionCreateDto;
import com.waad.tba.modules.rbac.dto.PermissionResponseDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

/**
 * واجهة خدمة الصلاحيات (Permission Service Interface).
 * تهدف إلى إدارة الصلاحيات المتاحة في النظام وتصنيفها حسب الموديولات.
 */
public interface PermissionService {

    /**
     * جلب كافة الصلاحيات المتاحة في النظام.
     */
    List<PermissionResponseDto> findAll();

    /**
     * جلب تفاصيل صلاحية معينة بواسطة المعرف (ID).
     */
    PermissionResponseDto findById(Long id);

    /**
     * إضافة صلاحية جديدة للنظام.
     */
    PermissionResponseDto create(PermissionCreateDto dto);

    /**
     * تحديث بيانات صلاحية موجودة.
     */
    PermissionResponseDto update(Long id, PermissionCreateDto dto);

    /**
     * حذف صلاحية من النظام (حذف ناعم).
     */
    void delete(Long id);

    /**
     * البحث عن الصلاحيات باستخدام نص بحث.
     */
    List<PermissionResponseDto> search(String query);

    /**
     * جلب الصلاحيات مع ترقيم الصفحات (Pagination).
     */
    Page<PermissionResponseDto> findAllPaginated(Pageable pageable);
}
