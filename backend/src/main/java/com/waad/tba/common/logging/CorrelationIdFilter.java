package com.waad.tba.common.logging;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.UUID;

/**
 * Filter that adds a unique Correlation ID to each request.
 * This ID is added to the SLF4J MDC (Mapped Diagnostic Context) so it appears in all logs
 * for the current thread, and is sent back to the client in the response header.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter implements Filter {

    public static final String CORRELATION_ID_HEADER = "X-Correlation-ID";
    public static final String MDC_KEY = "correlationId";

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        if (request instanceof HttpServletRequest httpServletRequest && response instanceof HttpServletResponse httpServletResponse) {
            String correlationId = httpServletRequest.getHeader(CORRELATION_ID_HEADER);
            
            if (correlationId == null || correlationId.isEmpty()) {
                correlationId = UUID.randomUUID().toString();
            }

            MDC.put(MDC_KEY, correlationId);
            httpServletResponse.setHeader(CORRELATION_ID_HEADER, correlationId);

            try {
                chain.doFilter(request, response);
            } finally {
                MDC.remove(MDC_KEY);
            }
        } else {
            chain.doFilter(request, response);
        }
    }
}
