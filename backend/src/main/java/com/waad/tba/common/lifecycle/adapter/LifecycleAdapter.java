package com.waad.tba.common.lifecycle.adapter;

import com.waad.tba.common.lifecycle.enums.LifecycleAction;
import com.waad.tba.common.lifecycle.dto.LifecycleResult;
import com.waad.tba.common.lifecycle.dto.LifecycleContext;
import com.waad.tba.common.lifecycle.dto.ValidationResult;
import java.util.List;

public interface LifecycleAdapter<T> {
    
    boolean supports(String entityType);
    
    List<LifecycleAction> getAllowedActions(Long entityId);
    
    ValidationResult validate(Long entityId, LifecycleAction action);
    
    LifecycleResult executeAction(Long entityId, LifecycleAction action, LifecycleContext context);
    
    String getCurrentStatus(Long entityId);

    T getEntity(Long entityId);
}
