FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app
COPY target/tba-backend-1.0.0.jar app.jar
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["java", "-Xms512m", "-Xmx1024m", \
  "-Dspring.profiles.active=prod", "-jar", "app.jar"]
