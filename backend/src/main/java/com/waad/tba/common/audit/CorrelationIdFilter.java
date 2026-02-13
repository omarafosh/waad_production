package com.waad.tba.common.audit;

/**
 * Deprecated and replaced by com.waad.tba.common.logging.CorrelationIdFilter.
 * Kept strictly to avoid "file not found" issues if build system is caching it, 
 * but removed @Component to avoid BeanDefinitionStoreException.
 */
public class CorrelationIdFilter {
    // Empty
}
