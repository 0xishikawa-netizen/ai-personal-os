# ---------- build stage ----------
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app

# Render 等の CI はメモリがタイトなことがある（必要なら調整）
# 無料枠のビルドで OOM する場合は -Xmx512m などに下げる
ENV GRADLE_OPTS="-Xmx768m -XX:MaxMetaspaceSize=256m"

COPY . .
RUN chmod +x ./gradlew \
  && ./gradlew bootJar --no-daemon --stacktrace

# ---------- run stage ----------
FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /app/build/libs/kairos-boot.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
