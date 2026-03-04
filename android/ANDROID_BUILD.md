# Android build – JDK 21

This project uses **Android Gradle Plugin 8.5.2** and **Gradle 8.7**, which support **JDK 21** (including Android Studio’s bundled JBR). No Gradle JDK override is required.

## Building from Android Studio

Use the default **Gradle JDK** (JDK 17 or 21). Sync and run as usual:

1. **File → Sync Project with Gradle Files**
2. **Run** or **Build → Make Project**

## Building from terminal

Use JDK 17 or 21 (e.g. your default `JAVA_HOME`). No `org.gradle.java.home` override is needed.

```bash
cd android
./gradlew --stop   # optional: clear old daemons after changing JDK
./gradlew clean
./gradlew :app:assembleDebug
```

Or from the project root: `npx react-native run-android`.
