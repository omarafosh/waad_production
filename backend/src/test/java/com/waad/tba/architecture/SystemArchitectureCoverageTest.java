package com.waad.tba.architecture;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("System-wide architecture coverage tests")
class SystemArchitectureCoverageTest {

    private static final Path MAIN_JAVA_ROOT = Paths.get("src", "main", "java", "com", "waad", "tba", "modules");
    private static final Pattern PUBLIC_METHOD_PATTERN = Pattern.compile("public\\s+[\\w<>\\[\\], ?]+\\s+\\w+\\s*\\(");

    private static List<Path> findJavaFiles(Path root) throws IOException {
        if (!Files.exists(root)) {
            return List.of();
        }
        try (Stream<Path> stream = Files.walk(root)) {
            return stream
                    .filter(Files::isRegularFile)
                    .filter(path -> path.toString().endsWith(".java"))
                    .toList();
        }
    }

    @Test
    @DisplayName("all controllers expose at least one API endpoint mapping")
    void allControllersExposeMappings() throws IOException {
        List<Path> javaFiles = findJavaFiles(MAIN_JAVA_ROOT);
        List<String> invalidControllers = new ArrayList<>();
        List<String> missingApiPrefix = new ArrayList<>();
        int discoveredControllers = 0;

        for (Path javaFile : javaFiles) {
            String content = Files.readString(javaFile, StandardCharsets.UTF_8);
            if (!content.contains("@RestController")) {
                continue;
            }
            discoveredControllers++;

            boolean hasClassLevelMapping = content.contains("@RequestMapping(");
            boolean hasMethodMapping = content.contains("@GetMapping(")
                    || content.contains("@PostMapping(")
                    || content.contains("@PutMapping(")
                    || content.contains("@DeleteMapping(")
                    || content.contains("@PatchMapping(");

            if (!(hasClassLevelMapping && hasMethodMapping)) {
                invalidControllers.add(javaFile.toString());
            }

            int requestMappingIndex = content.indexOf("@RequestMapping(\"");
            if (requestMappingIndex >= 0) {
                int pathStart = requestMappingIndex + "@RequestMapping(\"".length();
                int pathEnd = content.indexOf("\"", pathStart);
                if (pathEnd > pathStart) {
                    String path = content.substring(pathStart, pathEnd);
                    if (!path.startsWith("/api")) {
                        missingApiPrefix.add(javaFile + " -> " + path);
                    }
                }
            }
        }

        invalidControllers.sort(Comparator.naturalOrder());
        missingApiPrefix.sort(Comparator.naturalOrder());

        assertTrue(discoveredControllers > 0, "No controllers found under modules package");
        assertTrue(missingApiPrefix.isEmpty(),
                "Controllers with non-/api base path:\n" + String.join("\n", missingApiPrefix));
        assertTrue(invalidControllers.isEmpty(),
                "Controllers missing class/request mappings:\n" + String.join("\n", invalidControllers));
    }

    @Test
    @DisplayName("all services expose at least one public method")
    void allServicesExposePublicBehavior() throws IOException {
        List<Path> javaFiles = findJavaFiles(MAIN_JAVA_ROOT);
        List<String> servicesWithoutPublicMethods = new ArrayList<>();
        int discoveredServices = 0;

        for (Path javaFile : javaFiles) {
            String content = Files.readString(javaFile, StandardCharsets.UTF_8);
            if (!content.contains("@Service")) {
                continue;
            }
            discoveredServices++;

                boolean hasPublicMethod = PUBLIC_METHOD_PATTERN.matcher(content).find();

            if (!hasPublicMethod) {
                servicesWithoutPublicMethods.add(javaFile.toString());
            }
        }

        servicesWithoutPublicMethods.sort(Comparator.naturalOrder());

        assertTrue(discoveredServices > 0, "No services found under modules package");
        assertTrue(servicesWithoutPublicMethods.isEmpty(),
                "Services without public methods:\n" + String.join("\n", servicesWithoutPublicMethods));
    }
}
