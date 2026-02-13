package com.waad.tba.modules.member.controller;

import com.waad.tba.common.entity.Organization;
import com.waad.tba.common.enums.OrganizationType;
import com.waad.tba.common.repository.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/diagnostic")
@RequiredArgsConstructor
public class DiagnosticController {

    private final OrganizationRepository organizationRepository;

    @GetMapping("/employers-dump")
    public ResponseEntity<List<Map<String, Object>>> dumpEmployers() {
        List<Organization> all = organizationRepository.findAll();
        
        List<Map<String, Object>> result = all.stream()
                .filter(o -> o.isActive())
                .map(org -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", org.getId());
                    map.put("name", org.getName());
                    map.put("code", org.getCode());
                    map.put("active", org.isActive());
                    map.put("archived", org.isArchived()); // Assuming archived field exists and getter is isArchived()
                    
                    // Normalize test
                    String normalized = normalizeArabicText(org.getName());
                    map.put("normalizedName", normalized);
                    
                    return map;
                })
                .collect(Collectors.toList());
                
        return ResponseEntity.ok(result);
    }
    
    @GetMapping("/whoami")
    public ResponseEntity<Map<String, Object>> whoAmI() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        Map<String, Object> map = new HashMap<>();
        if (auth == null) {
            map.put("authenticated", false);
            return ResponseEntity.ok(map);
        }
        
        map.put("authenticated", auth.isAuthenticated());
        map.put("principal", auth.getName());
        map.put("authorities", auth.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .collect(Collectors.toList()));
        
        return ResponseEntity.ok(map);
    }
    
    // Copy of our normalization logic to test strict matching
    private String normalizeArabicText(String text) {
        if (text == null) return "";
        
        String input = text.replace("\uFEFF", "") 
                           .replace('\u00A0', ' ')
                           .replace('\u200B', ' ') 
                           .replace("\u0640", ""); 

        String normalized = input.trim().replaceAll("\\s+", " ");

        normalized = normalized.replace('\u0623', '\u0627') 
                               .replace('\u0625', '\u0627') 
                               .replace('\u0622', '\u0627'); 

        normalized = normalized.replace('\u0629', '\u0647'); 

        normalized = normalized.replace('\u0649', '\u064A') 
                               .replace('\u06CC', '\u064A') 
                               .replace('\u064A', '\u064A') 
                               .replace('\u06A9', '\u0643'); 

        normalized = normalized.replaceAll("[\u064B-\u0652\u0653\u0654\u0655\u0670]", "");
        normalized = normalized.replace('\u0671', '\u0627'); 

        return normalized.toLowerCase().trim();
    }
}
