package org.oreostudios.codewash;

import javax.swing.BorderFactory;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JProgressBar;
import javax.swing.JWindow;
import javax.swing.SwingConstants;
import javax.swing.SwingUtilities;
import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.GraphicsEnvironment;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * GUI desktop bootstrap for the offline bundled OW + LWJGL runtime.
 * Keeps a persistent diagnostic log, reports startup failures to the user
 * and waits for the FIRST PRESENTED FRAME, not merely a GLFW-open success.
 */
public final class NativeLauncher {
    private static final String READY = "CODEWASH_NATIVE_READY";
    private static final List<String> ALIASES =
            List.of("math", "flow", "owunit", "graphics", "engine");
    private static volatile Path logPath;
    private static volatile boolean graphicalRun;

    private NativeLauncher() {}

    public static void main(String[] args) {
        String mode = args.length == 0 ? "run" : args[0];
        graphicalRun = "run".equals(mode);
        try {
            if (!List.of("run", "--self-test", "--check", "--smoke").contains(mode)) {
                throw new IllegalArgumentException("Usage: CodeWashRPG [--self-test|--check|--smoke]");
            }
            if (graphicalRun) initLog();
            launch(mode);
        } catch (Throwable error) {
            log("FATAL: " + error);
            for (StackTraceElement frame : error.getStackTrace()) log("  at " + frame);
            showError("CodeWash RPG could not start: " + error.getMessage());
            System.exit(1);
        }
    }

    private static void launch(String mode) throws Exception {
        Path appDir = appDirectory();
        Path root = appDir.resolve("payload").resolve("ow");
        log("Launcher: " + appDir);
        log("Java: " + System.getProperty("java.version") + " on "
                + System.getProperty("os.name") + " / " + System.getProperty("os.arch"));
        validate(appDir, root);
        // Exercise JVM wildcard classpath construction in the Windows EXE's
        // self-test as well as in normal GUI mode, so CI catches regressions.
        verifyClasspath(appDir);
        if ("--self-test".equals(mode)) {
            log("PASS: packaged native OW runtime, dependencies and assets");
            return;
        }

        JWindow splash = graphicalRun ? showSplash() : null;
        AtomicBoolean ready = new AtomicBoolean(false);
        String script = "--smoke".equals(mode)
                ? "src/engine/battle_lifecycle_smoke.ow"
                : "src/engine/battle_gpu.ow";
        String action = "--check".equals(mode) ? "check" : "run";
        String javaName = isWindows() && graphicalRun ? "javaw.exe"
                : isWindows() ? "java.exe" : "java";
        Path java = Path.of(System.getProperty("java.home"), "bin", javaName);
        if (!Files.isRegularFile(java) && isWindows() && graphicalRun) {
            // Some custom jlink images omit javaw.exe. Fall back to bundled
            // java.exe instead of silently closing the splash on Windows.
            log("Bundled javaw.exe unavailable; falling back to java.exe");
            java = Path.of(System.getProperty("java.home"), "bin", "java.exe");
        }
        if (!Files.isRegularFile(java)) {
            closeSplash(splash);
            throw new IllegalStateException("Bundled Java executable missing: " + java);
        }

        String cp = runtimeClasspath(appDir);
        List<String> command = new ArrayList<>();
        command.add(java.toString());
        if (isMac()) command.add("-XstartOnFirstThread");
        command.add("-Xms64m");
        command.add("-Xmx768m");
        command.add("-Dfile.encoding=UTF-8");
        command.add("-cp");
        command.add(cp);
        command.add("dev.oreo.Main");
        command.add(action);
        command.add(script);
        log("Starting bundled OW: " + action + " " + script);

        Process child;
        try {
            child = new ProcessBuilder(command).directory(root.toFile())
                    .redirectErrorStream(true).start();
        } catch (IOException error) {
            closeSplash(splash);
            throw error;
        }
        log("Game child PID: " + child.pid());

        Thread pump = new Thread(() -> {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                    child.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    log("[OW] " + line);
                    if (READY.equals(line.trim()) && ready.compareAndSet(false, true)) {
                        closeSplash(splash);
                    }
                }
            } catch (IOException error) {
                log("Failed to read game output: " + error);
            }
        }, "ow-runtime-logs");
        pump.setDaemon(true);
        pump.start();
        int code;
        try {
            code = child.waitFor();
            pump.join(2500);
        } finally {
            closeSplash(splash);
        }
        log("Game exited: code=" + code + ", firstFrameReady=" + ready.get());
        if (code != 0 || (graphicalRun && !ready.get())) {
            String problem = code != 0
                    ? "OW Engine / OW Graphics exited with error code " + code
                    : "The game exited before displaying its first frame";
            showError(problem);
            System.exit(code == 0 ? 1 : code);
        }
    }

    /**
     * Java's classpath wildcard is a STRING understood by the JVM, not a
     * filename. On Windows Path.resolve with an asterisk throws InvalidPathException:
     * Illegal char <*> at index 0. Append the wildcard after converting the
     * existing lib directory into a valid platform filesystem path.
     */
    static String runtimeClasspath(Path appDir) {
        String separator = System.getProperty("path.separator");
        String jars = appDir.resolve("lib").toString()
                + java.io.File.separator + "*";
        return appDir.resolve("OwIDE.jar") + separator
                + appDir.resolve("ow-graphics-native.jar") + separator + jars;
    }

    private static void verifyClasspath(Path appDir) {
        String cp = runtimeClasspath(appDir);
        if (!cp.endsWith(java.io.File.separator + "*")
                || !cp.contains("OwIDE.jar")
                || !cp.contains("ow-graphics-native.jar")) {
            throw new IllegalStateException("Invalid packaged JVM classpath");
        }
    }

    private static void initLog() throws IOException {
        String base = isWindows() ? System.getenv("LOCALAPPDATA")
                : System.getProperty("user.home");
        if (base == null || base.isBlank()) base = System.getProperty("user.home", ".");
        Path dir = isWindows()
                ? Path.of(base, "OreoStudios", "CodeWashRPG", "logs")
                : Path.of(base, ".codewash-rpg", "logs");
        Files.createDirectories(dir);
        logPath = dir.resolve("latest.log");
        Files.writeString(logPath, "CodeWash RPG native startup diagnostic\n",
                StandardCharsets.UTF_8, StandardOpenOption.CREATE,
                StandardOpenOption.TRUNCATE_EXISTING);
    }

    private static synchronized void log(String line) {
        System.out.println(line);
        if (logPath != null) {
            try {
                Files.writeString(logPath, line + System.lineSeparator(),
                        StandardCharsets.UTF_8, StandardOpenOption.CREATE,
                        StandardOpenOption.APPEND);
            } catch (IOException error) {
                System.err.println("Failed to write startup log: " + error);
            }
        }
    }

    private static void showError(String reason) {
        if (!graphicalRun || GraphicsEnvironment.isHeadless()) return;
        String location = logPath == null ? "Unavailable" : logPath.toString();
        String details = "";
        String hint = "";
        if (logPath != null && Files.isRegularFile(logPath)) {
            try {
                List<String> lines = Files.readAllLines(logPath, StandardCharsets.UTF_8);
                if (lines.stream().anyMatch(line -> line.contains("Unable to create a GLFW OpenGL 3.3 window"))) {
                    hint = "OpenGL 3.3 window creation failed. Check your GPU drivers, "
                            + "graphics support and Remote Desktop session.\n\n";
                }
                int start = Math.max(0, lines.size() - 10);
                details = String.join("\n", lines.subList(start, lines.size()));
                if (details.length() > 950) details = details.substring(details.length() - 950);
            } catch (IOException ignored) {}
        }
        final String message = reason + "\n\n" + hint
                + "A diagnostic log has been saved to:\n" + location
                + "\n\nLast output:\n" + details
                + "\n\nCopy the log when reporting this error.";
        try {
            // Blocking error dialog so Windows does not silently close.
            SwingUtilities.invokeAndWait(() -> JOptionPane.showMessageDialog(null,
                    message, "CodeWash RPG — Startup Error", JOptionPane.ERROR_MESSAGE));
        } catch (Exception error) {
            log("Unable to show startup dialog: " + error);
        }
    }

    static void validate(Path appDir, Path root) throws IOException {
        for (String name : List.of("native-launcher.jar", "OwIDE.jar",
                "ow-graphics-native.jar")) {
            required(appDir.resolve(name));
        }
        Path libs = appDir.resolve("lib");
        if (!Files.isDirectory(libs)) throw new IOException("Missing native libs: " + libs);
        try (var entries = Files.list(libs)) {
            if (entries.noneMatch(p -> p.toString().endsWith(".jar"))) {
                throw new IOException("No native runtime jars in " + libs);
            }
        }
        required(root.resolve("src/engine/battle_gpu.ow"));
        required(root.resolve("src/engine/battle_lifecycle_smoke.ow"));
        required(root.resolve("dependencies.yml"));
        required(root.resolve("dependencies.lock.yml"));
        for (String alias : ALIASES) {
            Path marker = root.resolve(".ow/deps").resolve(alias).resolve(".ow-resolved");
            required(marker);
            if (!Files.readString(marker).trim().matches("[0-9a-f]{40}")) {
                throw new IOException("Invalid bundled OW dependency revision: " + alias);
            }
        }
        required(root.resolve("assets/native/skills/math_icon.png"));
        required(root.resolve("assets/native/items/egg.png"));
    }

    private static void required(Path file) throws IOException {
        if (!Files.isRegularFile(file)) {
            throw new IOException("Incomplete native package, missing: " + file);
        }
    }

    private static Path appDirectory() throws Exception {
        Path jar = Path.of(NativeLauncher.class.getProtectionDomain()
                .getCodeSource().getLocation().toURI());
        if (!Files.isRegularFile(jar)) {
            throw new IllegalStateException("Run CodeWashRPG from its installed app-image");
        }
        return jar.toAbsolutePath().normalize().getParent();
    }

    private static boolean isWindows() {
        return System.getProperty("os.name", "").toLowerCase().contains("win");
    }

    private static boolean isMac() {
        return System.getProperty("os.name", "").toLowerCase().contains("mac");
    }

    private static JWindow showSplash() {
        if (GraphicsEnvironment.isHeadless()) return null;
        final JWindow[] result = new JWindow[1];
        try {
            SwingUtilities.invokeAndWait(() -> {
                JWindow window = new JWindow();
                JPanel panel = new JPanel(new BorderLayout(0, 12));
                panel.setBackground(new Color(15, 24, 39));
                panel.setBorder(BorderFactory.createEmptyBorder(25, 34, 25, 34));
                JLabel title = new JLabel("CODEWASH RPG", SwingConstants.CENTER);
                title.setForeground(new Color(223, 239, 250));
                title.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 26));
                JLabel description = new JLabel("Loading OW Engine + OW Graphics...",
                        SwingConstants.CENTER);
                description.setForeground(new Color(151, 183, 204));
                JProgressBar spinner = new JProgressBar();
                spinner.setIndeterminate(true);
                panel.add(title, BorderLayout.NORTH);
                panel.add(description, BorderLayout.CENTER);
                panel.add(spinner, BorderLayout.SOUTH);
                window.setContentPane(panel);
                window.setSize(new Dimension(470, 170));
                window.setLocationRelativeTo(null);
                window.setVisible(true);
                result[0] = window;
            });
        } catch (Exception error) {
            log("Splash unavailable: " + error);
        }
        return result[0];
    }

    private static void closeSplash(JWindow window) {
        if (window != null) {
            SwingUtilities.invokeLater(() -> {
                if (window.isDisplayable()) window.dispose();
            });
        }
    }
}
