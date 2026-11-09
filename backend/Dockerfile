# 개발: compose.override.yaml이 target: dev로 쓴다
# 소스는 볼륨으로 붙이고, 고친 뒤에는 컨테이너를 다시 시작한다
# 받은 Gradle과 라이브러리는 gradle-cache 볼륨(/root/.gradle)에 남아 두 번째부터는 빠르다
FROM eclipse-temurin:21-jdk AS dev
WORKDIR /app
EXPOSE 8080
# 볼륨으로 붙인 호스트의 gradlew에는 실행 권한이 없을 수 있어 sh로 실행한다
CMD ["sh", "gradlew", "bootRun", "--no-daemon"]

# 의존성: Gradle Wrapper와 라이브러리를 미리 받아 둔다
FROM eclipse-temurin:21-jdk AS deps
WORKDIR /app

# 의존성 정의가 바뀌지 않으면 아래 다운로드 레이어를 캐시에서 재사용한다
COPY gradlew settings.gradle build.gradle ./
COPY gradle ./gradle
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon > /dev/null

# 빌드: 실행 가능한 jar를 만든다
FROM deps AS build
COPY src ./src
# 테스트는 DB가 필요하므로 이미지 빌드에서는 건너뛴다
RUN ./gradlew bootJar --no-daemon -x test

# 실행: JRE만 담은 이미지에 jar만 옮긴다
FROM eclipse-temurin:21-jre AS runner
WORKDIR /app

RUN groupadd --system app && useradd --system --gid app app
# 올린 파일 폴더(볼륨 upload-data)
RUN mkdir -p /app/uploads && chown app:app /app/uploads
# bootJar만 실행했으므로 build/libs에는 jar가 하나만 있다
COPY --from=build /app/build/libs/*.jar app.jar

# DB 접속 정보는 실행할 때 환경 변수로 넘긴다
# 예) SPRING_PROFILES_ACTIVE, SPRING_DATASOURCE_URL, SPRING_DATASOURCE_USERNAME, SPRING_DATASOURCE_PASSWORD
EXPOSE 8080
# 업로드 볼륨은 개발 모드(root로 실행)와 같이 쓰고 DB(db-data)도 같이 쓴다. 개발 모드가 root로 만든 파일·폴더가 있어도 쓸 수 있게
# 시작할 때만 root로 업로드 폴더의 주인을 app으로 맞추고, 앱은 app 사용자로 실행한다(setpriv로 권한을 내린다)
ENTRYPOINT ["sh", "-c", "chown -R app:app /app/uploads && exec setpriv --reuid=app --regid=app --init-groups java -jar app.jar"]
