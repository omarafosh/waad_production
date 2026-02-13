package com.waad.tba.common.service;

import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Service;

import java.util.Locale;

/**
 * Centralized service for message localization.
 * Wraps Spring MessageSource to provide easy access to internationalized messages.
 */
@Service
public class ResourceMessageService {

    private final MessageSource messageSource;

    public ResourceMessageService(MessageSource messageSource) {
        this.messageSource = messageSource;
    }

    /**
     * Get message for specified key and current locale.
     * @param key Message key in properties file
     * @return Resolved message
     */
    public String getMessage(String key) {
        return messageSource.getMessage(key, null, LocaleContextHolder.getLocale());
    }

    /**
     * Get message for specified key, current locale and arguments.
     * @param key Message key in properties file
     * @param args Arguments for message placeholders
     * @return Resolved message
     */
    public String getMessage(String key, Object... args) {
        return messageSource.getMessage(key, args, LocaleContextHolder.getLocale());
    }

    /**
     * Get message for specified key and explicit locale.
     * @param key Message key
     * @param locale Target locale
     * @return Resolved message
     */
    public String getMessage(String key, Locale locale) {
        return messageSource.getMessage(key, null, locale);
    }
}
