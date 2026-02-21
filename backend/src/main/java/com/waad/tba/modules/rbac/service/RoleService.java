package com.waad.tba.modules.rbac.service;

import com.waad.tba.modules.rbac.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

/**
 * واجهة خدمة الأدوار (Role Service Interface).
 * تهدف إلى إدارة أدوار النظام وربطها بالصلاحيات.
 */
public interface RoleService {

    /**
     * جلب كافة الأدوار المتاحة في النظام.
     */
    List<RoleResponseDto> findAll();

    /**
     * جلب تفاصيل دور معين بواسطة المعرف (ID).
     */
    RoleResponseDto findById(Long id);

    /**
     * إنشاء دور جديد في النظام.
     */
    RoleResponseDto create(RoleCreateDto dto);

    /**
     * تحديث بيانات دور موجود.
     */
    RoleResponseDto update(Long id, RoleCreateDto dto);

    /**
     * حذف دور من النظام (حذف ناعم).
     */
    void delete(Long id);

    /**
     * البحث عن الأدوار باستخدام نص بحث.
     */
    List<RoleResponseDto> search(String query);

    /**
     * جلب الأدوار مع ترقيم الصفحات (Pagination).
     */
    Page<RoleResponseDto> findAllPaginated(Pageable pageable);

    /**
     * تعيين أو تحديث الصلاحيات المرتبطة بدور معين.
     */
    RoleResponseDto assignPermissions(Long roleId, AssignPermissionsDto dto);
}
