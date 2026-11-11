FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /workspace/apps/api/gaia-workflow
COPY apps/api/gaia-workflow/ /workspace/apps/api/gaia-workflow/
RUN mvn -B -pl gaia-workflow-app -am package -DskipTests

FROM eclipse-temurin:17-jre-jammy

RUN apt-get update \
    && apt-get install --no-install-recommends -y curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system gaia \
    && useradd --system --gid gaia --home-dir /data --create-home gaia \
    && chown gaia:gaia /data

COPY --from=build /workspace/apps/api/gaia-workflow/gaia-workflow-app/target/gaia-workflow-app-0.0.1-SNAPSHOT.jar /opt/gaia/app.jar

WORKDIR /data
USER gaia

EXPOSE 48080
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=12 \
  CMD curl --fail --silent http://localhost:48080/api/health || exit 1

ENTRYPOINT ["java", "-jar", "/opt/gaia/app.jar"]
