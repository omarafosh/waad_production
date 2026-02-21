package com.waad.tba.v3.core.base.infrastructure;

import com.waad.tba.v3.core.base.domain.BaseEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.NoRepositoryBean;

import java.util.List;
import java.util.Optional;

/**
 * Custom base repository for V3 to handle Soft Deletes automatically.
 */
@NoRepositoryBean
public interface BaseRepository<T extends BaseEntity, ID> extends JpaRepository<T, ID> {

    @Override
    @Query("select e from #{#entityName} e where e.active = true")
    List<T> findAll();

    @Override
    @Query("select e from #{#entityName} e where e.id = ?1 and e.active = true")
    Optional<T> findById(ID id);

    @Query("select e from #{#entityName} e where e.id = ?1")
    Optional<T> findByIdIncludingdeleted(ID id);

    @Override
    default void delete(T entity) {
        entity.delete();
        save(entity);
    }

    @Override
    default void deleteById(ID id) {
        findById(id).ifPresent(this::delete);
    }

    @Modifying
    @Query("update #{#entityName} e set e.active = false where e.id = ?1")
    void softDelete(ID id);
}
